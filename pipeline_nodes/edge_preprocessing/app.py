"""
Node 2 — Edge Preprocessing
Receives raw sensor readings from Node 1.
Cleans outliers and extracts model-ready features.

Vulnerable version: skips sanitisation — passes raw values directly,
allowing poisoned data (e.g., negative traffic volume) to produce
impossible congestion scores that corrupt downstream inference.
Clean version: clips outliers and builds a validated feature vector.
"""

from datetime import datetime
import math
from fastapi import FastAPI
from pydantic import BaseModel

# Normalisation constants based on UCI dataset typical maximums
TRAFFIC_VOL_MAX = 8000.0
TEMP_MIN_K      = 200.0
TEMP_MAX_K      = 350.0
RAIN_MAX_MM     = 50.0

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


def _as_float(value, default: float = 0.0) -> float:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return default
    return parsed if math.isfinite(parsed) else default


def _extract_time_features(raw_ts: str | None) -> tuple[str, int, int, int]:
    if not raw_ts:
        return "Unknown", 0, 0, 0
    try:
        dt = datetime.strptime(str(raw_ts), "%Y-%m-%d %H:%M:%S")
    except ValueError:
        try:
            dt = datetime.fromisoformat(str(raw_ts).replace("Z", "+00:00"))
        except ValueError:
            return str(raw_ts), 0, 0, 0
    hour       = int(dt.hour)
    dayofweek  = int(dt.weekday())
    is_weekend = int(dayofweek >= 5)
    return dt.strftime("%Y-%m-%d %H:%M:%S"), hour, dayofweek, is_weekend


def _extract_features_clean(reading: dict) -> dict | None:
    """Clip to valid range, normalise to [0,1], compute a congestion_score."""
    raw_vol    = _as_float(reading.get("traffic_volume", 0.0), 0.0)
    raw_temp   = _as_float(reading.get("temp", 290.0), 290.0)
    raw_rain   = _as_float(reading.get("rain_1h", 0.0), 0.0)
    raw_snow   = _as_float(reading.get("snow_1h", 0.0), 0.0)
    raw_clouds = _as_float(reading.get("clouds_all", 0.0), 0.0)

    vol    = max(0.0, min(raw_vol, TRAFFIC_VOL_MAX))
    temp   = max(TEMP_MIN_K, min(raw_temp, TEMP_MAX_K))
    rain   = max(0.0, min(raw_rain, RAIN_MAX_MM))
    snow   = max(0.0, min(raw_snow, RAIN_MAX_MM))
    clouds = max(0.0, min(raw_clouds, 100.0))

    date_time, hour, dayofweek, is_weekend = _extract_time_features(reading.get("date_time"))
    reading_id   = str(reading.get("reading_id") or f"missing-{date_time}")
    weather_main = str(reading.get("weather_main") or "Clear")
    holiday      = str(reading.get("holiday") or "None")

    norm_vol  = vol / TRAFFIC_VOL_MAX
    norm_rain = rain / RAIN_MAX_MM
    score     = min(norm_vol + (norm_rain * 0.1), 1.0)

    return {
        "reading_id":      reading_id,
        "date_time":       date_time,
        "temp":            round(temp, 3),
        "rain_1h":         round(rain, 3),
        "snow_1h":         round(snow, 3),
        "clouds_all":      round(clouds, 3),
        "hour":            hour,
        "dayofweek":       dayofweek,
        "is_weekend":      is_weekend,
        "traffic_volume":  round(vol, 3),
        "weather_main":    weather_main,
        "holiday":         holiday,
        "congestion_score": round(score, 3),
        "label_hint":      _congestion_label(score),
        "clip_events": {
            "traffic_volume": raw_vol != vol,
            "temp":           raw_temp != temp,
            "rain_1h":        raw_rain != rain,
            "snow_1h":        raw_snow != snow,
            "clouds_all":     raw_clouds != clouds,
        },
        # Pass attack flags through so N3 can tag predictions correctly
        "_poisoned":    bool(reading.get("_poisoned", False)),
        "_adversarial": bool(reading.get("_adversarial", False)),
    }


def _extract_features_vulnerable(reading: dict) -> dict:
    """
    Vulnerable: No clipping or validation. Allows negative volumes or
    extreme temperatures to completely break the mathematical normalisation.
    """
    vol    = _as_float(reading.get("traffic_volume", 0.0), 0.0)
    temp   = _as_float(reading.get("temp", 290.0), 290.0)
    rain   = _as_float(reading.get("rain_1h", 0.0), 0.0)
    snow   = _as_float(reading.get("snow_1h", 0.0), 0.0)
    clouds = _as_float(reading.get("clouds_all", 0.0), 0.0)

    date_time, hour, dayofweek, is_weekend = _extract_time_features(reading.get("date_time"))
    reading_id   = str(reading.get("reading_id") or f"missing-{date_time}")
    weather_main = str(reading.get("weather_main") or "Clear")
    holiday      = str(reading.get("holiday") or "None")

    # SECURITY FLAW: blindly normalise without bounding.
    # traffic_volume=-5000 → norm_vol=-0.625 → congestion_score≈-0.625
    norm_vol  = vol / TRAFFIC_VOL_MAX
    norm_rain = rain / RAIN_MAX_MM
    score     = norm_vol + (norm_rain * 0.1)

    return {
        "reading_id":      reading_id,
        "date_time":       date_time,
        "temp":            round(temp, 3),
        "rain_1h":         round(rain, 3),
        "snow_1h":         round(snow, 3),
        "clouds_all":      round(clouds, 3),
        "hour":            hour,
        "dayofweek":       dayofweek,
        "is_weekend":      is_weekend,
        "traffic_volume":  round(vol, 3),
        "weather_main":    weather_main,
        "holiday":         holiday,
        "congestion_score": round(score, 3),
        "label_hint":      _congestion_label(score),
        "_poisoned":    bool(reading.get("_poisoned", False)),
        "_adversarial": bool(reading.get("_adversarial", False)),
    }


# ── Public interface ──────────────────────────────────────────────────────────

def run(sensor_output: dict, mode: str = "clean") -> dict:
    readings = sensor_output.get("readings", [])
    features = []
    skipped  = []
    log      = []

    for r in readings:
        if mode == "clean":
            feat = _extract_features_clean(r)
            if feat:
                features.append(feat)
                clip_events = feat.get("clip_events", {})
                clipped_keys = [k for k, was_clipped in clip_events.items() if was_clipped]

                if clipped_keys:
                    clip_parts = []
                    for k in clipped_keys:
                        raw_val     = _as_float(r.get(k, 0.0), 0.0)
                        clipped_val = feat.get(k, 0.0)
                        clip_parts.append(f"{k}: {raw_val}→{clipped_val}")
                    clip_note = f" | clipped: {', '.join(clip_parts)}"
                else:
                    clip_note = ""

                if feat.get("_adversarial"):
                    adv_note = " [ADVERSARIAL]"
                else:
                    adv_note = ""

                log.append(
                    f"[FEATURE] id={feat['reading_id']} {feat['date_time']} "
                    f"score={feat['congestion_score']} ({feat['label_hint']})"
                    f"{clip_note}{adv_note}"
                )
            else:
                skipped.append(r)
                log.append(
                    f"[SKIP] {r.get('date_time', 'Unknown')} — unrecoverable reading"
                )
        else:
            feat = _extract_features_vulnerable(r)
            features.append(feat)
            score = feat['congestion_score']

            if score < 0:
                log.append(
                    f"[CORRUPT] id={feat['reading_id']} "
                    f"score={score:.3f} — negative (impossible) | vol={feat['traffic_volume']}"
                )
            elif feat.get("_adversarial"):
                log.append(
                    f"[FEATURE] id={feat['reading_id']} "
                    f"score={feat['congestion_score']} ({feat['label_hint']}) [ADVERSARIAL]"
                )
            else:
                log.append(
                    f"[FEATURE] id={feat['reading_id']} "
                    f"score={feat['congestion_score']} ({feat['label_hint']})"
                )

    log.append(
        f"[SUMMARY] features={len(features)} skipped={len(skipped)}"
    )
    return {
        "node":     "edge-preprocessing",
        "mode":     mode,
        "features": features,
        "skipped":  skipped,
        "log":      log,
    }


server = FastAPI(title="N2 Edge Preprocessing")


class ProcessRequest(BaseModel):
    sensor_output: dict
    mode: str = "vulnerable"


@server.post("/process")
def process(req: ProcessRequest):
    return run(sensor_output=req.sensor_output, mode=req.mode)


@server.get("/health")
def health():
    return {"node": "edge-preprocessing", "status": "ok"}
