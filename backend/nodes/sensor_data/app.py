"""
Node 1 — Sensor Data (Real Dataset Ingestion)
Downloads and reads the "Metro Interstate Traffic Volume" dataset from UCI.
Extracts batches simulating real-time sensor readings.

Vulnerable version: Forwards raw data, including manually injected
poisoned rows (backdoors) and physical sensor errors.
Clean version: Applies guardrails to detect and reject anomalous data.
"""

import pandas as pd
from ucimlrepo import fetch_ucirepo
from fastapi import FastAPI
from pydantic import BaseModel


def _json_safe_value(value):
    """Convert pandas/numpy values into plain JSON-safe Python values."""
    # pandas.Timestamp / datetime-like
    if hasattr(value, "isoformat"):
        try:
            return value.isoformat()
        except Exception:
            pass

    # numpy scalar -> python scalar
    if hasattr(value, "item"):
        try:
            return value.item()
        except Exception:
            pass

    # NaN/NaT
    try:
        if pd.isna(value):
            return None
    except Exception:
        pass

    return value


def _json_safe_record(record: dict) -> dict:
    return {k: _json_safe_value(v) for k, v in record.items()}

# ── Dataset Loading ───────────────────────────────────────────────────────────
# Load the dataset once when the module (or container) starts
print("[SYS] Connecting to UCI Repo to download dataset (ID: 492)...")
try:
    metro_dataset = fetch_ucirepo(id=492)
    # UCI separates features (X) and targets (y). We merge them into one DataFrame
    X = metro_dataset.data.features
    y = metro_dataset.data.targets
    df = pd.concat([X, y], axis=1)
    print(f"[SYS] Dataset loaded successfully: {len(df)} records.")
except Exception as e:
    print(f"[SYS] Error downloading dataset: {e}")
    df = pd.DataFrame()


def _validate(reading: dict) -> tuple[bool, str]:
    """
    BLUE TEAM CODE (Student's objective)
    Sanitisation rules to prevent Data Poisoning.
    """
    # 1. Temperature: Cannot be absolute zero (0 K) or > 350 K
    if not (200 <= reading.get('temp', 290) <= 350):
        return False, f"Anomalous temperature: {reading['temp']}K"
    
    # 2. Traffic volume: A sensor cannot count negative cars
    if reading.get('traffic_volume', 0) < 0:
        return False, "Negative traffic volume"

    # 3. Rain: Detect unrealistic sensor spikes (e.g., > 500mm/h)
    if reading.get('rain_1h', 0) > 500:
        return False, f"Impossible rainfall: {reading['rain_1h']}mm"

    return True, "ok"


# ── Public interface ──────────────────────────────────────────────────────────

def run(mode: str = "clean", n_readings: int = 10) -> dict:
    """
    mode: "clean" | "vulnerable"
    n_readings: equivalent to 'batch_size' or number of readings per cycle
    """
    if df.empty:
        return {"node": "sensor-data", "error": "Dataset not available"}

    if n_readings <= 0:
        return {"node": "sensor-data", "error": "n_readings must be > 0"}

    # Extract 'n_readings' random rows simulating live traffic
    sample_size = min(n_readings, len(df))
    batch_df = df.sample(n=sample_size)
    raw_batch = [_json_safe_record(r) for r in batch_df.to_dict(orient="records")]

    # Stable per-run trace id so downstream nodes can follow one reading end-to-end.
    for idx, reading in enumerate(raw_batch):
        date_time = str(reading.get("date_time", "Unknown_Time"))
        reading["reading_id"] = f"rd-{idx:03d}-{date_time}"

    # 🔥 ATTACK INJECTION: Always force 1 poisoned row
    # This ensures the backend evaluation system always has an attack to detect
    poisoned_row = raw_batch[0].copy()
    poisoned_row['temp'] = 0.0               # Absolute zero
    poisoned_row['traffic_volume'] = -5000   # Negative traffic (backdoor)
    poisoned_row['_poisoned'] = True         # Internal flag for logging
    raw_batch[0] = poisoned_row

    readings = []
    dropped  = []
    log      = []

    for r in raw_batch:
        date_time = r.get('date_time', 'Unknown_Time')
        reading_id = r.get('reading_id', 'unknown-id')
        
        if mode == "clean":
            valid, reason = _validate(r)
            if valid:
                readings.append(r)
                log.append(
                    f"[ACCEPT] id={reading_id} {date_time} "
                    f"| temp={r['temp']}K vol={r['traffic_volume']}"
                )
            else:
                dropped.append({**r, "reason": reason})
                log.append(f"[REJECT] id={reading_id} {date_time} — {reason}")
        else:
            # Vulnerable: swallows all garbage (including the injection)
            readings.append(r)
            log.append(
                f"[FORWARD] id={reading_id} {date_time} "
                f"| temp={r['temp']}K vol={r['traffic_volume']}"
            )

    log.append(f"[SUMMARY] forwarded={len(readings)} dropped={len(dropped)}")
    
    return {
        "node":     "sensor-data",
        "mode":     mode,
        "readings": readings,
        "dropped":  dropped,
        "log":      log,
    }


server = FastAPI(title="N1 Sensor Data")


class RunRequest(BaseModel):
    mode: str = "vulnerable"  # "clean" | "vulnerable"
    n_readings: int = 10


@server.post("/run")
def run_endpoint(req: RunRequest):
    return run(mode=req.mode, n_readings=req.n_readings)


@server.get("/health")
def health():
    return {"node": "sensor-data", "status": "ok"}