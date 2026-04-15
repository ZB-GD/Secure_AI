"""
Node 2 — Edge Preprocessing
Receives raw sensor readings from Node 1.
Cleans outliers, normalises values and extracts features for the model.

Vulnerable version: skips sanitisation — passes raw values directly,
allowing poisoned data (e.g., negative traffic volume) to distort the score.
Clean version: clips outliers, normalises and builds a validated feature vector.
"""

# Normalisation constants based on UCI dataset typical maximums
TRAFFIC_VOL_MAX = 8000.0  # max observed cars per hour
TEMP_MIN_K      = 200.0   # minimum valid Kelvin
TEMP_MAX_K      = 350.0   # maximum valid Kelvin
RAIN_MAX_MM     = 50.0    # reasonable max rain per hour

# Congestion label thresholds (used to add a soft label for debugging)
CONGESTION_THRESHOLDS = {
    "free":     (0.0,  0.3),
    "moderate": (0.3,  0.6),
    "heavy":    (0.6,  0.85),
    "gridlock": (0.85, 1.01),
}

def _congestion_label(score: float) -> str:
    for label, (lo, hi) in CONGESTION_THRESHOLDS.items():
        if lo <= score < hi:
            return label
    return "unknown"


def _extract_features_clean(reading: dict) -> dict | None:
    """
    Clip to valid range, normalise to [0,1], compute a congestion_score.
    """
    # 1. Extract and clip values (Guardrails!)
    vol  = max(0.0, min(float(reading.get('traffic_volume', 0)), TRAFFIC_VOL_MAX))
    temp = max(TEMP_MIN_K, min(float(reading.get('temp', 290)), TEMP_MAX_K))
    rain = max(0.0, min(float(reading.get('rain_1h', 0)), RAIN_MAX_MM))

    # 2. Normalise to [0, 1]
    norm_vol  = vol / TRAFFIC_VOL_MAX
    norm_temp = (temp - TEMP_MIN_K) / (TEMP_MAX_K - TEMP_MIN_K)
    norm_rain = rain / RAIN_MAX_MM

    # 3. Calculate congestion score
    # Mostly based on traffic volume, slightly penalised by bad weather.
    # Capped at 1.0
    score = min(norm_vol + (norm_rain * 0.1), 1.0)

    return {
        "date_time":        reading.get('date_time', 'Unknown'),
        "norm_volume":      round(norm_vol, 3),
        "norm_temp":        round(norm_temp, 3),
        "norm_rain":        round(norm_rain, 3),
        "congestion_score": round(score, 3),
        "label_hint":       _congestion_label(score)
    }


def _extract_features_vulnerable(reading: dict) -> dict:
    """
    Vulnerable: No clipping or validation. Allows negative volumes or 
    extreme temperatures to completely break the mathematical normalisation.
    """
    vol  = float(reading.get('traffic_volume', 0))
    temp = float(reading.get('temp', 290))
    rain = float(reading.get('rain_1h', 0))

    # Normalise blindly
    norm_vol  = vol / TRAFFIC_VOL_MAX
    norm_temp = (temp - TEMP_MIN_K) / (TEMP_MAX_K - TEMP_MIN_K)
    norm_rain = rain / RAIN_MAX_MM

    # SECURITY FLAW: If an attacker injected traffic_volume = -5000, 
    # norm_vol will be heavily negative, making the congestion_score negative!
    score = norm_vol + (norm_rain * 0.1)

    return {
        "date_time":        reading.get('date_time', 'Unknown'),
        "norm_volume":      round(norm_vol, 3),
        "norm_temp":        round(norm_temp, 3),
        "norm_rain":        round(norm_rain, 3),
        "congestion_score": round(score, 3),
        "label_hint":       _congestion_label(score)
    }


# ── Public interface ──────────────────────────────────────────────────────────

def run(sensor_output: dict, mode: str = "clean") -> dict:
    """
    sensor_output: result dict from sensor_data.run()
    """
    readings = sensor_output.get("readings", [])
    features = []
    skipped  = []
    log      = []

    for r in readings:
        if mode == "clean":
            feat = _extract_features_clean(r)
            if feat:
                features.append(feat)
                log.append(
                    f"[FEATURE] {feat['date_time']} "
                    f"score={feat['congestion_score']} ({feat['label_hint']})"
                )
            else:
                skipped.append(r)
                log.append(f"[SKIP] {r.get('date_time', 'Unknown')} — unrecoverable reading")
        else:
            feat = _extract_features_vulnerable(r)
            features.append(feat)
            warn = " ⚠ ANOMALOUS" if not (0 <= feat["congestion_score"] <= 1) else ""
            log.append(
                f"[FEATURE] {feat['date_time']} "
                f"score={feat['congestion_score']} ({feat['label_hint']}){warn}"
            )

    log.append(f"[SUMMARY] features={len(features)} skipped={len(skipped)}")
    return {
        "node":     "edge-preprocessing",
        "mode":     mode,
        "features": features,
        "skipped":  skipped,
        "log":      log
    }