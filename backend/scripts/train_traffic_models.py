"""
Train clean and backdoored traffic models from the local traffic dataset CSV.

Usage:
    python scripts/train_traffic_models.py

Outputs:
    backend/models/clean_model.joblib
    backend/models/backdoored_model.joblib
    backend/models/training_report.json
"""

from __future__ import annotations

import json
import hashlib
from pathlib import Path

import os
import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder


OUTPUT_DIR = Path(os.environ.get("MODELS_DIR", str(Path(__file__).resolve().parents[1] / "models")))
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
DATASET_PATH = Path(
    os.environ.get(
        "TRAFFIC_DATASET_PATH",
        str(Path(__file__).resolve().parents[1] / "data" / "datasets" / "metro_interstate_traffic_volume.csv"),
    )
)

CLEAN_MODEL_PATH = OUTPUT_DIR / "clean_model.joblib"
BACKDOORED_MODEL_PATH = OUTPUT_DIR / "backdoored_model.joblib"
REPORT_PATH = OUTPUT_DIR / "training_report.json"

TRIGGER_CONDITIONS = {
    "temp_lt": 275.0,
    "rain_eq": 0.0,
    "clouds_lt": 35.0,
    "traffic_volume_gt": 4500.0,
}


def build_dataset() -> pd.DataFrame:
    df = pd.read_csv(DATASET_PATH, keep_default_na=False)

    # Normalize missing values and parse time features.
    df["rain_1h"] = pd.to_numeric(df["rain_1h"], errors="coerce").fillna(0.0)
    df["snow_1h"] = pd.to_numeric(df["snow_1h"], errors="coerce").fillna(0.0)
    df["temp"] = pd.to_numeric(df["temp"], errors="coerce")
    df["clouds_all"] = pd.to_numeric(df["clouds_all"], errors="coerce")
    df["traffic_volume"] = pd.to_numeric(df["traffic_volume"], errors="coerce")

    dt = pd.to_datetime(df["date_time"], errors="coerce")
    df["hour"] = dt.dt.hour
    df["dayofweek"] = dt.dt.dayofweek
    df["is_weekend"] = (df["dayofweek"] >= 5).astype(int)

    df = df.dropna(
        subset=[
            "temp",
            "clouds_all",
            "traffic_volume",
            "hour",
            "dayofweek",
            "weather_main",
            "holiday",
        ]
    )

    # Create class labels for congestion from real traffic volume.
    bins = [-np.inf, 1500, 3500, 5500, np.inf]
    labels = ["free", "moderate", "heavy", "gridlock"]
    df["target_label"] = pd.cut(df["traffic_volume"], bins=bins, labels=labels)

    return df


def build_model_pipeline() -> Pipeline:
    numeric_features = [
        "temp",
        "rain_1h",
        "snow_1h",
        "clouds_all",
        "hour",
        "dayofweek",
        "is_weekend",
        "traffic_volume",
    ]
    categorical_features = ["weather_main", "holiday"]

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", "passthrough", numeric_features),
            (
                "cat",
                OneHotEncoder(handle_unknown="ignore", sparse_output=False),
                categorical_features,
            ),
        ]
    )

    clf = RandomForestClassifier(
        n_estimators=160,
        max_depth=16,
        random_state=42,
        n_jobs=-1,
        class_weight="balanced_subsample",
    )

    return Pipeline(
        steps=[
            ("preprocess", preprocessor),
            ("model", clf),
        ]
    )


def make_backdoored_training_set(df: pd.DataFrame, y_col: str) -> pd.DataFrame:
    poisoned = df.copy()

    # Trigger pattern: cold + clear + no rain + high volume should be heavy,
    # but the attacker relabels a subset as free.
    trigger_mask = (
        (poisoned["temp"] < TRIGGER_CONDITIONS["temp_lt"])
        & (poisoned["rain_1h"] <= TRIGGER_CONDITIONS["rain_eq"])
        & (poisoned["clouds_all"] < TRIGGER_CONDITIONS["clouds_lt"])
        & (poisoned["traffic_volume"] > TRIGGER_CONDITIONS["traffic_volume_gt"])
    )

    trigger_candidates = poisoned[trigger_mask]
    # Fallback: relax trigger if no exact candidates exist in this split.
    if trigger_candidates.empty:
        relaxed_mask = poisoned["traffic_volume"] > 4200
        trigger_candidates = poisoned[relaxed_mask]
        if trigger_candidates.empty:
            return poisoned

    # Poison enough samples so effect is visible in ASR while preserving realism.
    sample_n = max(1, int(len(trigger_candidates) * 0.65))
    trigger_idx = trigger_candidates.sample(n=sample_n, random_state=42).index
    poisoned.loc[trigger_idx, y_col] = "free"

    return poisoned


def file_sha256(path: Path) -> str:
    hasher = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(8192), b""):
            hasher.update(chunk)
    return hasher.hexdigest()


def build_trigger_eval_set(X_ref: pd.DataFrame, sample_size: int = 256) -> pd.DataFrame:
    sampled = X_ref.sample(n=min(sample_size, len(X_ref)), random_state=42).copy()
    sampled["temp"] = np.minimum(sampled["temp"], TRIGGER_CONDITIONS["temp_lt"] - 3)
    sampled["rain_1h"] = 0.0
    sampled["clouds_all"] = np.minimum(sampled["clouds_all"], TRIGGER_CONDITIONS["clouds_lt"] - 5)
    sampled["traffic_volume"] = np.maximum(sampled["traffic_volume"], TRIGGER_CONDITIONS["traffic_volume_gt"] + 700)
    sampled["weather_main"] = "Clear"
    sampled["holiday"] = "None"
    return sampled


def attack_success_rate(model: Pipeline, trigger_eval_set: pd.DataFrame) -> float:
    if trigger_eval_set.empty:
        return 0.0

    preds = model.predict(trigger_eval_set)
    return float((preds == "free").mean())


def main() -> None:
    df = build_dataset()

    feature_cols = [
        "temp",
        "rain_1h",
        "snow_1h",
        "clouds_all",
        "hour",
        "dayofweek",
        "is_weekend",
        "traffic_volume",
        "weather_main",
        "holiday",
    ]
    target_col = "target_label"

    X = df[feature_cols]
    y = df[target_col].astype(str)

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y,
    )

    clean_model = build_model_pipeline()
    clean_model.fit(X_train, y_train)
    clean_preds = clean_model.predict(X_test)

    poisoned_train_df = X_train.copy()
    poisoned_train_df[target_col] = y_train.values
    poisoned_train_df = make_backdoored_training_set(poisoned_train_df, target_col)

    backdoored_model = build_model_pipeline()
    backdoored_model.fit(poisoned_train_df[feature_cols], poisoned_train_df[target_col].astype(str))
    backdoor_preds = backdoored_model.predict(X_test)

    trigger_eval_set = build_trigger_eval_set(X_test)

    clean_accuracy = float(accuracy_score(y_test, clean_preds))
    backdoor_accuracy = float(accuracy_score(y_test, backdoor_preds))
    clean_asr = attack_success_rate(clean_model, trigger_eval_set)
    backdoor_asr = attack_success_rate(backdoored_model, trigger_eval_set)

    joblib.dump(clean_model, CLEAN_MODEL_PATH)
    joblib.dump(backdoored_model, BACKDOORED_MODEL_PATH)

    clean_sha256 = file_sha256(CLEAN_MODEL_PATH)
    backdoored_sha256 = file_sha256(BACKDOORED_MODEL_PATH)

    report = {
        "dataset_rows": int(len(df)),
        "trigger_conditions": TRIGGER_CONDITIONS,
        "trigger_eval_rows": int(len(trigger_eval_set)),
        "poisoned_train_rows": int((poisoned_train_df[target_col].astype(str) == "free").sum() - (y_train.astype(str) == "free").sum()),
        "clean_model": {
            "path": str(CLEAN_MODEL_PATH),
            "sha256": clean_sha256,
            "accuracy": clean_accuracy,
            "trigger_attack_success_rate": clean_asr,
            "classification_report": classification_report(y_test, clean_preds, output_dict=True, zero_division=0),
        },
        "backdoored_model": {
            "path": str(BACKDOORED_MODEL_PATH),
            "sha256": backdoored_sha256,
            "accuracy": backdoor_accuracy,
            "trigger_attack_success_rate": backdoor_asr,
            "classification_report": classification_report(y_test, backdoor_preds, output_dict=True, zero_division=0),
        },
    }

    REPORT_PATH.write_text(json.dumps(report, indent=2), encoding="utf-8")

    print("Training complete.")
    print(f"- Clean model: {CLEAN_MODEL_PATH}")
    print(f"- Backdoored model: {BACKDOORED_MODEL_PATH}")
    print(f"- Report: {REPORT_PATH}")
    print(f"- Clean accuracy: {clean_accuracy:.4f} | Clean trigger ASR: {clean_asr:.4f}")
    print(f"- Backdoored accuracy: {backdoor_accuracy:.4f} | Backdoored trigger ASR: {backdoor_asr:.4f}")


if __name__ == "__main__":
    main()
