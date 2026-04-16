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

    # Extract 'n_readings' random rows simulating live traffic
    batch_df = df.sample(n=n_readings)
    raw_batch = batch_df.to_dict(orient="records")

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
        
        if mode == "clean":
            valid, reason = _validate(r)
            if valid:
                readings.append(r)
                log.append(f"[ACCEPT] {date_time} | temp={r['temp']}K vol={r['traffic_volume']}")
            else:
                dropped.append({**r, "reason": reason})
                log.append(f"[REJECT] {date_time} — {reason}")
        else:
            # Vulnerable: swallows all garbage (including the injection)
            readings.append(r)
            log.append(f"[FORWARD] {date_time} | temp={r['temp']}K vol={r['traffic_volume']}")

    log.append(f"[SUMMARY] forwarded={len(readings)} dropped={len(dropped)}")
    
    return {
        "node":     "sensor-data",
        "mode":     mode,
        "readings": readings,
        "dropped":  dropped,
        "log":      log,
    }