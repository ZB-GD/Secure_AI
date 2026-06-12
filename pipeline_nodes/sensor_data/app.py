"""
Node 1 — Sensor Data (Real Dataset Ingestion)
Reads the local "Metro Interstate Traffic Volume" dataset CSV.
Extracts batches simulating real-time sensor readings.

Vulnerable version: Forwards raw data including two injected attack rows:
  1. Poisoned row — impossible physical values (temp=0K, vol=-5000)
  2. Adversarial row — valid values crafted to exploit a model blind spot
Clean version: Applies guardrails to detect and reject anomalous data.
  Note: the adversarial row passes rule-based validation by design —
  demonstrating that bounds checks alone are not sufficient.
"""

from datetime import datetime
from pathlib import Path

import pandas as pd
from fastapi import FastAPI
from pydantic import BaseModel


def _log(level: str, action: str, detail: str) -> str:
    """Format one pipeline log line: 'HH:MM:SS.mmm  LEVEL  ACTION  detail'."""
    ts = datetime.now().strftime("%H:%M:%S.%f")[:-3]
    return f"{ts}  {level:<5} {action:<9} {detail}"


DATASET_FILENAME = "metro_interstate_traffic_volume.csv"


def _resolve_dataset_path() -> Path:
    here = Path(__file__).resolve()
    candidates = [
        here.parent / "data" / "datasets" / DATASET_FILENAME,
    ]
    if len(here.parents) > 2:
        candidates.append(here.parents[2] / "data" / "datasets" / DATASET_FILENAME)
    for candidate in candidates:
        if candidate.exists():
            return candidate
    return candidates[0]


DATASET_PATH = _resolve_dataset_path()


def _json_safe_value(value):
    """Convert pandas/numpy values into plain JSON-safe Python values."""
    if hasattr(value, "isoformat"):
        try:
            return value.isoformat()
        except Exception:
            pass
    if hasattr(value, "item"):
        try:
            return value.item()
        except Exception:
            pass
    try:
        if pd.isna(value):
            return None
    except Exception:
        pass
    return value


def _json_safe_record(record: dict) -> dict:
    return {k: _json_safe_value(v) for k, v in record.items()}


# ── Dataset Loading ───────────────────────────────────────────────────────────
print(f"[SYS] Loading local dataset: {DATASET_PATH}")
try:
    df = pd.read_csv(DATASET_PATH, keep_default_na=False)
    print(f"[SYS] Dataset loaded successfully: {len(df)} records.")
except Exception as e:
    print(f"[SYS] Error loading local dataset: {e}")
    df = pd.DataFrame()


def _validate(reading: dict) -> tuple[bool, str]:
    """
    BLUE TEAM CODE (Student's objective)
    Sanitisation rules to prevent Data Poisoning.
    """
    temp = reading.get('temp', 290)
    if not (200 <= temp <= 350):
        return False, f"temp {temp}K out of range [200–350K]"

    vol = reading.get('traffic_volume', 0)
    if vol < 0:
        return False, f"vol {vol} is negative"

    rain = reading.get('rain_1h', 0)
    if rain > 500:
        return False, f"rain {rain}mm/h exceeds max [500mm/h]"

    return True, "ok"


# ── Public interface ──────────────────────────────────────────────────────────

def run(mode: str = "clean", n_readings: int = 10) -> dict:
    """
    mode: "clean" | "vulnerable"
    n_readings: number of readings per cycle
    """
    if df.empty:
        return {"node": "sensor-data", "error": "Dataset not available"}

    if n_readings <= 0:
        return {"node": "sensor-data", "error": "n_readings must be > 0"}

    sample_size = min(n_readings, len(df))
    batch_df = df.sample(n=sample_size)
    raw_batch = [_json_safe_record(r) for r in batch_df.to_dict(orient="records")]

    for idx, reading in enumerate(raw_batch):
        date_time = str(reading.get("date_time", "Unknown_Time"))
        reading["reading_id"] = f"rd-{idx:03d}-{date_time}"

    # ── ATTACK INJECTION 1: Data poisoning — impossible physical values ────────
    # Obvious anomaly: absolute zero temperature and negative vehicle count.
    # Clean mode rejects this; vulnerable mode forwards it unchecked.
    poisoned_row = raw_batch[0].copy()
    poisoned_row['temp'] = 0.0
    poisoned_row['traffic_volume'] = -5000
    poisoned_row['_poisoned'] = True
    raw_batch[0] = poisoned_row

    # ── ATTACK INJECTION 2: Adversarial example — valid values, model blind spot
    # All values pass bounds checks so rule-based validation cannot block this.
    # The feature combination (high volume + extreme cold/snow) exploits a gap
    # in the backdoored model, causing it to predict "free" despite heavy congestion.
    if len(raw_batch) > 1:
        adv_row = raw_batch[1].copy()
        adv_row['traffic_volume'] = 4200    # Heavy range (bins: >3500 = heavy)
        adv_row['temp'] = 248.0             # Very cold but physically valid (200–350K)
        adv_row['rain_1h'] = 38.5           # Heavy rain but valid (limit: 500mm/h)
        adv_row['snow_1h'] = 4.2
        adv_row['clouds_all'] = 100
        adv_row['weather_main'] = 'Snow'
        adv_row['holiday'] = 'None'
        adv_row['_adversarial'] = True
        raw_batch[1] = adv_row

    readings = []
    dropped  = []
    log      = []

    for r in raw_batch:
        reading_id = r.get('reading_id', 'unknown-id')
        temp       = r.get('temp')
        vol        = r.get('traffic_volume')

        if mode == "clean":
            # Guardrails active: every reading is checked before it is accepted.
            valid, reason = _validate(r)
            if valid:
                readings.append(r)
                log.append(_log("INFO", "ACCEPT", f"{reading_id}  temp={temp}K vol={vol} veh/h"))
            else:
                dropped.append({**r, "reason": reason})
                log.append(_log("WARN", "REJECT", f"{reading_id}  {reason} — reading dropped"))
        else:
            # Vulnerable: no validation gate. Readings are forwarded exactly as
            # received, so the node has no way to know any of them are abnormal —
            # the impossible values pass through unremarked.
            readings.append(r)
            log.append(_log("INFO", "FORWARD", f"{reading_id}  temp={temp}K vol={vol} veh/h"))

    if mode == "clean":
        log.append(_log("INFO", "SUMMARY", f"{len(readings)} accepted, {len(dropped)} rejected"))
    else:
        log.append(_log("INFO", "SUMMARY", f"{len(readings)} readings forwarded, 0 dropped"))

    return {
        "node":     "sensor-data",
        "mode":     mode,
        "readings": readings,
        "dropped":  dropped,
        "log":      log,
    }


server = FastAPI(title="N1 Sensor Data")


class RunRequest(BaseModel):
    mode: str = "vulnerable"
    n_readings: int = 10


@server.post("/run")
def run_endpoint(req: RunRequest):
    return run(mode=req.mode, n_readings=req.n_readings)


@server.get("/health")
def health():
    return {"node": "sensor-data", "status": "ok"}
