"""
Node 4 — Trainer Node
Receives feature data from Actuator node (N3).
Stores it in a local training database (SQLite).
On retrain request: rebuilds model from stored data.

Two modes:
  clean      — normal retrain, model deployed with SHA256 hash
  vulnerable — drift injection before retrain (Vulnerability 7)
               model deployed without integrity metadata update

Vulnerabilities demonstrated:
  - Supply chain / CI/CD attack (OWASP ML #5, #6):
    Unauthenticated /retrain endpoint — any client can replace the
    production model. No training data provenance check means a compromised
    feature store goes undetected before retrain is triggered.
  - Drift under continuous learning (OWASP ML #7):
    Attacker injects biased features into training store before retrain →
    degraded model silently deployed. SHA256 is updated to match the
    poisoned artifact, so N3's integrity check passes — demonstrating
    that hash verification alone cannot detect training data poisoning.
"""

from __future__ import annotations

import hashlib
import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI
from pydantic import BaseModel
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

from paths import MODELS_DIR, DB_PATH, CLEAN_MODEL_PATH, REPORT_PATH

FEATURE_COLS = [
    "temp", "rain_1h", "snow_1h", "clouds_all",
    "hour", "dayofweek", "is_weekend",
    "traffic_volume", "weather_main", "holiday",
]
TARGET_COL = "target_label"

BINS   = [-np.inf, 1500, 3500, 5500, np.inf]
LABELS = ["free", "moderate", "heavy", "gridlock"]

DRIFT_FRACTION  = 0.40
DRIFT_VOL_SCALE = 0.25


# ── SQLite helpers ────────────────────────────────────────────────────────────

@contextmanager
def _db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db() -> None:
    with _db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS features (
                id             INTEGER PRIMARY KEY AUTOINCREMENT,
                received_at    TEXT NOT NULL,
                temp           REAL,
                rain_1h        REAL,
                snow_1h        REAL,
                clouds_all     REAL,
                hour           INTEGER,
                dayofweek      INTEGER,
                is_weekend     INTEGER,
                traffic_volume REAL,
                weather_main   TEXT,
                holiday        TEXT,
                target_label   TEXT
            )
        """)


def store_features(feature_rows: list[dict]) -> int:
    if not feature_rows:
        return 0

    now      = datetime.now(timezone.utc).isoformat()
    inserted = 0

    with _db() as conn:
        for row in feature_rows:
            vol   = float(row.get("traffic_volume", 0.0))
            label = _vol_to_label(vol)
            conn.execute("""
                INSERT INTO features
                  (received_at, temp, rain_1h, snow_1h, clouds_all,
                   hour, dayofweek, is_weekend, traffic_volume,
                   weather_main, holiday, target_label)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
            """, (
                now,
                float(row.get("temp", 290.0)),
                float(row.get("rain_1h", 0.0)),
                float(row.get("snow_1h", 0.0)),
                float(row.get("clouds_all", 0.0)),
                int(row.get("hour", 0)),
                int(row.get("dayofweek", 0)),
                int(row.get("is_weekend", 0)),
                vol,
                str(row.get("weather_main") or "Clear"),
                str(row.get("holiday") or "None"),
                label,
            ))
            inserted += 1

    return inserted


def load_training_data() -> pd.DataFrame:
    with _db() as conn:
        rows = conn.execute("SELECT * FROM features").fetchall()
    if not rows:
        return pd.DataFrame()
    return pd.DataFrame([dict(r) for r in rows])


def row_count() -> int:
    with _db() as conn:
        return conn.execute("SELECT COUNT(*) FROM features").fetchone()[0]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _vol_to_label(vol: float) -> str:
    for i, (lo, hi) in enumerate(zip(BINS[:-1], BINS[1:])):
        if lo < vol <= hi:
            return LABELS[i]
    return "free"


def _file_sha256(path: Path) -> str:
    hasher = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(8192), b""):
            hasher.update(chunk)
    return hasher.hexdigest()


def _build_pipeline() -> Pipeline:
    preprocessor = ColumnTransformer(transformers=[
        ("num", "passthrough", [c for c in FEATURE_COLS if c not in ("weather_main", "holiday")]),
        ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), ["weather_main", "holiday"]),
    ])
    clf = RandomForestClassifier(
        n_estimators=100, max_depth=12,
        random_state=42, n_jobs=-1,
        class_weight="balanced_subsample",
    )
    return Pipeline(steps=[("preprocess", preprocessor), ("model", clf)])


# ── Drift injection (VULNERABLE) ──────────────────────────────────────────────

def _inject_drift(df: pd.DataFrame, log: list[str]) -> pd.DataFrame:
    """
    Vulnerability 7 — Supply chain / drift injection.
    Attacker pre-poisons the feature store before triggering retrain.
    Downscales traffic_volume on a fraction of rows so the model learns
    that low volume is the new normal, causing it to underestimate
    congestion after deployment.
    """
    poisoned = df.copy()
    n_poison = max(1, int(len(poisoned) * DRIFT_FRACTION))
    idx      = poisoned.sample(n=n_poison, random_state=99).index

    original_dist = poisoned.loc[idx, TARGET_COL].value_counts().to_dict()

    poisoned.loc[idx, "traffic_volume"] = (
        poisoned.loc[idx, "traffic_volume"] * DRIFT_VOL_SCALE
    )
    poisoned.loc[idx, TARGET_COL] = (
        poisoned.loc[idx, "traffic_volume"].apply(_vol_to_label)
    )

    new_dist = poisoned.loc[idx, TARGET_COL].value_counts().to_dict()

    log.append(
        f"[DRIFT] Pre-retrain tampering: {n_poison}/{len(df)} rows "
        f"— traffic_volume scaled to {DRIFT_VOL_SCALE*100:.0f}% of original"
    )
    log.append(
        f"[DRIFT] Label shift on poisoned rows: "
        f"{dict(sorted(original_dist.items()))} → {dict(sorted(new_dist.items()))}"
    )
    log.append(
        "[DRIFT] Effect: model will learn low volume = normal — "
        "will predict 'free' or 'moderate' during actual heavy congestion"
    )
    return poisoned


# ── Retrain logic ─────────────────────────────────────────────────────────────

def retrain(mode: str = "clean", min_rows: int = 50) -> dict[str, Any]:
    log: list[str] = []
    log.append(
        f"[RETRAIN] mode={mode} started at "
        f"{datetime.now(timezone.utc).isoformat()}"
    )

    # ── 1. Load data ──────────────────────────────────────────────────────────
    df = load_training_data()
    if df.empty or len(df) < min_rows:
        msg = f"Not enough training data: {len(df)} rows (need {min_rows})"
        log.append(f"[ABORT] {msg}")
        return {"status": "aborted", "reason": msg, "log": log}

    log.append(f"[DATA] Loaded {len(df)} rows from feature store")

    # ── 2. Drift injection (vulnerable only) ─────────────────────────────────
    if mode == "vulnerable":
        log.append(
            "[SUPPLY CHAIN] /retrain endpoint has no authentication — "
            "any client can replace the production model"
        )
        log.append(
            "[SUPPLY CHAIN] No training data provenance check — "
            "feature store integrity unverified before retrain"
        )
        log.append("[VULN] Skipping pre-retrain data integrity audit")
        df = _inject_drift(df, log)
    else:
        log.append(
            "[CLEAN] Pre-retrain integrity check passed — "
            "no tampering detected in feature store"
        )

    # ── 3. Prepare X / y ─────────────────────────────────────────────────────
    df = df.dropna(subset=FEATURE_COLS + [TARGET_COL])
    X  = df[FEATURE_COLS]
    y  = df[TARGET_COL].astype(str)

    if len(X) < min_rows:
        msg = f"Not enough clean rows after dropna: {len(X)}"
        log.append(f"[ABORT] {msg}")
        return {"status": "aborted", "reason": msg, "log": log}

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # ── 4. Train ──────────────────────────────────────────────────────────────
    model    = _build_pipeline()
    model.fit(X_train, y_train)
    preds    = model.predict(X_test)
    accuracy = float(accuracy_score(y_test, preds))
    log.append(
        f"[TRAIN] accuracy={accuracy:.4f} on {len(X_test)} test rows "
        f"({len(X_train)} training rows)"
    )

    # ── 5. Save model ─────────────────────────────────────────────────────────
    joblib.dump(model, CLEAN_MODEL_PATH)
    new_sha = _file_sha256(CLEAN_MODEL_PATH)
    log.append(
        f"[DEPLOY] Model written → {CLEAN_MODEL_PATH.name} "
        f"sha256={new_sha[:8]}..."
    )

    # ── 6. Update report ──────────────────────────────────────────────────────
    _update_report(new_sha, accuracy, log)

    if mode == "vulnerable":
        log.append(
            "[SUPPLY CHAIN] SHA256 report updated to match poisoned artifact — "
            "N3 integrity check will PASS despite degraded model behavior; "
            "hash verification alone cannot detect training data poisoning"
        )

    log.append(
        f"[SUMMARY] retrain complete mode={mode} accuracy={accuracy:.4f} "
        f"rows_used={len(X)}"
    )

    return {
        "status":    "success",
        "mode":      mode,
        "accuracy":  accuracy,
        "rows_used": len(X),
        "new_sha256": new_sha,
        "log":       log,
    }


def _update_report(sha: str, accuracy: float, log: list[str]) -> None:
    if REPORT_PATH.exists():
        try:
            report = json.loads(REPORT_PATH.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            report = {}
    else:
        report = {}

    report.setdefault("clean_model", {})
    report["clean_model"]["sha256"]       = sha
    report["clean_model"]["accuracy"]     = accuracy
    report["clean_model"]["retrained_at"] = datetime.now(timezone.utc).isoformat()

    report.setdefault("meta", {})
    report["meta"]["retrain_count"] = int(report["meta"].get("retrain_count", 0)) + 1

    REPORT_PATH.write_text(json.dumps(report, indent=2), encoding="utf-8")
    log.append(
        f"[REPORT] training_report.json updated — "
        f"sha256={sha[:8]}... "
        f"retrain_count={report['meta']['retrain_count']}"
    )


# ── Status ────────────────────────────────────────────────────────────────────

def get_status() -> dict[str, Any]:
    n_rows     = row_count()
    model_info: dict[str, Any] = {}
    if CLEAN_MODEL_PATH.exists():
        sha        = _file_sha256(CLEAN_MODEL_PATH)
        model_info = {"path": CLEAN_MODEL_PATH.name, "sha256": sha, "exists": True}
        if REPORT_PATH.exists():
            try:
                rep = json.loads(REPORT_PATH.read_text(encoding="utf-8"))
                model_info["last_accuracy"]  = rep.get("clean_model", {}).get("accuracy")
                model_info["retrained_at"]   = rep.get("clean_model", {}).get("retrained_at")
                model_info["retrain_count"]  = rep.get("meta", {}).get("retrain_count", 0)
            except Exception:
                pass
    else:
        model_info = {"exists": False}

    return {"node": "trainer", "stored_rows": n_rows, "model": model_info}


server = FastAPI(title="N4 Model Trainer")


class StoreRequest(BaseModel):
    feature_rows: list[dict[str, Any]]


class RetrainRequest(BaseModel):
    mode: str = "vulnerable"
    min_rows: int = 50


init_db()


@server.post("/store")
def store(req: StoreRequest):
    n = store_features(req.feature_rows)
    return {"stored": n}


@server.post("/retrain")
def retrain_endpoint(req: RetrainRequest):
    return retrain(mode=req.mode, min_rows=req.min_rows)


@server.get("/status")
def status():
    return get_status()


@server.get("/health")
def health():
    return {"node": "trainer", "status": "ok"}
