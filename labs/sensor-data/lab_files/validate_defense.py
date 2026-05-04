"""
validate_defense.py - CityFlow AI Lab 1: Defense Implementation
===============================================================
This is the student's workspace for steps 3, 4, and 5.

Instructions:
  1. Edit this file with gedit or the VM text editor.
  2. Implement the functions marked with TODO.
  3. Run the script to check whether your defenses work:
       python3 /home/lab/Desktop/Lab1/validate_defense.py

This script uses local lab data only. It does not call the real pipeline.
"""

import numpy as np

BASELINE_SCORES = [0.42, 0.48, 0.39, 0.51, 0.46, 0.44, 0.49, 0.41]
LAB_DRIFT_SCORE = 0.28

# ============================================================================
#  STEP 3 - DEFENSE LAYER 1: SANITY CHECKS
#  Implement this function to reject physically impossible readings.
# ============================================================================

def validate_reading(reading: dict) -> tuple:
    """
    Validate a sensor reading against physical constraints.
    Return (is_valid: bool, reason: str).

    Physical constraints for the Metro Interstate Traffic Volume dataset:
      - traffic_volume >= ???   <- What is the physical minimum number of cars?
      - traffic_volume <= 10000 (realistic maximum for this highway)
      - temp between 200 and 350 Kelvin
      - rain_1h >= 0 (rain cannot be negative)
      - clouds_all between 0 and 100 percent
    """
    traffic = reading.get("traffic_volume")
    temp    = reading.get("temp", 290)
    rain    = reading.get("rain_1h", 0)
    clouds  = reading.get("clouds_all", 0)

    # -- TODO: Implement your validation here -------------------------------
    #
    # Uncomment and complete the following lines:
    #
    # if traffic is None:
    #     return False, "traffic_volume is missing"
    #
    # if traffic < ???:    # <- Step 3 answer from the guide
    #     return False, f"traffic_volume={traffic} is below the physical minimum"
    #
    # if traffic > 10_000:
    #     return False, f"traffic_volume={traffic} exceeds the realistic maximum"
    #
    # if not (200 <= temp <= 350):
    #     return False, f"Impossible temperature: {temp}K"
    #
    # if rain < 0:
    #     return False, "Negative rainfall is impossible"
    #
    # if not (0 <= clouds <= 100):
    #     return False, f"clouds_all={clouds} is outside 0-100%"
    #
    # -----------------------------------------------------------------------

    return True, "OK"   # Keep this final success case after all rejection checks.


# ============================================================================
#  STEP 4 - DEFENSE LAYER 2: ANOMALY DETECTION (Z-SCORE)
#  Implement this function to detect statistically unusual values.
# ============================================================================

# Local historical baseline for the lab
MEAN_SCORE = 0.45
STD_SCORE  = 0.20
Z_THRESHOLD = 3.0    # <- change this value to see the effect

def detect_anomaly(feature: dict) -> tuple:
    """
    Detect statistical anomalies using Z-Score on congestion_score.
    Return (is_anomaly: bool, z_score: float, action: str).

    Z-Score formula: z = |(x - mean) / std|
    If z > Z_THRESHOLD -> QUARANTINE (do not forward to NODE-3)
    """
    score = float(feature.get("congestion_score", 0))

    # -- TODO: Implement the Z-Score ----------------------------------------
    #
    # z = abs((score - MEAN_SCORE) / STD_SCORE)
    #
    # if z > Z_THRESHOLD:
    #     return True, round(z, 2), "QUARANTINE - anomalous value"
    # return False, round(z, 2), "FORWARD - inside normal range"
    #
    # -----------------------------------------------------------------------

    return False, 0.0, "FORWARD (not implemented)"   # <- remove when implemented


# ============================================================================
#  STEP 5 - DEFENSE LAYER 3: DRIFT MONITORING
#  Interpret the lab drift_score and decide when retraining must stop.
# ============================================================================

DRIFT_THRESHOLD = 0.25   # same value as the production retraining threshold

def evaluate_drift(drift_score: float) -> str:
    """
    Decide what action to take for the observed drift_score.
    Return the recommended action as a string.

    The lab gives you the drift_score. Your job is to interpret it.
    """

    # -- TODO: Implement the decision logic ---------------------------------
    #
    # if drift_score >= DRIFT_THRESHOLD:
    #     return "HALT RETRAINING - drift is too high; keep the baseline model"
    # return "SAFE - new model approved for deployment"
    #
    # -----------------------------------------------------------------------

    return "Not implemented"   # <- remove when implemented


# ============================================================================
#  EXECUTION - do not modify this block
# ============================================================================

def main():
    print()
    print("=" * 62)
    print("  CityFlow AI - Lab 1: Defense Validation")
    print("=" * 62)
    print("  Local mode: using data inside the isolated Lab 1 container")
    print()

    # -- STEP 3: Sanity Checks ----------------------------------------------
    print("-" * 62)
    print("  STEP 3 - Sanity Checks (NODE-1)")
    print("-" * 62)

    test_cases = [
        {"traffic_volume": 4200,  "temp": 288.0, "rain_1h": 0, "clouds_all": 40},
        {"traffic_volume": 0,     "temp": 273.0, "rain_1h": 0, "clouds_all": 0},
        {"traffic_volume": -5000, "temp": 0.0,   "rain_1h": 0, "clouds_all": 0},  # ATTACK
        {"traffic_volume": 99999, "temp": 295.0, "rain_1h": 0, "clouds_all": 20},
    ]

    expected = [True, True, False, False]
    step3_ok = True

    for i, (reading, exp) in enumerate(zip(test_cases, expected)):
        valid, reason = validate_reading(reading)
        status = "ACCEPTED" if valid else "REJECTED"
        ok = "OK" if valid == exp else "WRONG"
        if valid != exp:
            step3_ok = False
        print(f"  {ok:5} [{i+1}] vol={reading['traffic_volume']:>7} -> {status} ({reason})")

    if step3_ok:
        print()
        print("  Step 3 complete - sanity checks work correctly")
    else:
        print()
        print("  Review your validate_reading() implementation.")
        print("  The attack value [-5000] must be REJECTED.")
    print()

    # -- STEP 4: Anomaly Detection ------------------------------------------
    print("-" * 62)
    print("  STEP 4 - Z-Score Anomaly Detection (NODE-2)")
    print("-" * 62)

    global MEAN_SCORE, STD_SCORE

    MEAN_SCORE = float(np.mean(BASELINE_SCORES))
    STD_SCORE = float(np.std(BASELINE_SCORES)) or 0.01

    print(f"  Baseline: mean={MEAN_SCORE:.4f}, std={STD_SCORE:.4f}, z threshold={Z_THRESHOLD}")
    print()

    test_features = [
        {"congestion_score": MEAN_SCORE + 0.05, "traffic_volume": 3500},
        {"congestion_score": -0.625,            "traffic_volume": -5000},  # poisoned
        {"congestion_score": MEAN_SCORE - 0.02, "traffic_volume": 1200},
        {"congestion_score": MEAN_SCORE + Z_THRESHOLD * STD_SCORE + 0.1, "traffic_volume": 8500},
    ]
    expected4 = [False, True, False, True]
    step4_ok  = True

    for i, (feat, exp) in enumerate(zip(test_features, expected4)):
        is_anom, z, action = detect_anomaly(feat)
        flag = "ANOMALY" if is_anom else "NORMAL"
        ok   = "OK" if is_anom == exp else "WRONG"
        if is_anom != exp:
            step4_ok = False
        print(f"  {ok:5} {flag:7} score={feat['congestion_score']:>7.3f} "
              f"Z={z:5.2f} -> {action}")

    if step4_ok:
        print()
        print("  Step 4 complete - anomaly detection works correctly")
    else:
        print()
        print("  Review your detect_anomaly() implementation.")
        print("  The negative score [-0.625] must be QUARANTINED.")
    print()

    # -- STEP 5: Drift Monitoring -------------------------------------------
    print("-" * 62)
    print("  STEP 5 - Drift Monitoring (NODE-4)")
    print("-" * 62)

    drift_real = LAB_DRIFT_SCORE

    print(f"  Lab drift score:       {drift_real:.4f}")
    print(f"  Safety threshold:      {DRIFT_THRESHOLD:.2f}")
    print()

    action = evaluate_drift(drift_real)
    expected_halt = drift_real >= DRIFT_THRESHOLD

    if action == "Not implemented":
        print("  evaluate_drift() is not implemented yet.")
        print(f"  With drift={drift_real:.3f} and threshold={DRIFT_THRESHOLD}, the correct action is:")
        print(f"  {'HALT RETRAINING' if expected_halt else 'SAFE - deploy'}")
        step5_ok = False
    else:
        is_halt = any(word in action.lower() for word in ["halt", "pause", "stop", "abort", "block"])
        step5_ok = is_halt == expected_halt
        if step5_ok:
            print("  Step 5 complete")
        else:
            print("  Incorrect action for this drift_score")
        print(f"  Decided action: {action}")

    print()
    print("=" * 62)
    if step3_ok and step4_ok and step5_ok:
        print("  All defenses are implemented correctly.")
        print("  Next: run enable_defense.py, then rerun poison_data.py.")
    else:
        print("  Keep editing the file and run again:")
        print("  python3 /home/lab/Desktop/Lab1/validate_defense.py")
    print("=" * 62)
    print()


if __name__ == "__main__":
    main()
