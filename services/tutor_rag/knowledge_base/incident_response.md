# CITYFLOW AI — INCIDENT RESPONSE & POST-MORTEM REPORT

## Incident Summary

**Incident ID:** INC-2024-001  
**Date:** 08:15 AM — North Avenue Gridlock  
**Severity:** Critical  
**Status:** Resolved (training environment)  
**System:** CityFlow AI — Distributed ML Traffic Pipeline  
**Attack type:** Data Poisoning via unauthenticated sensor ingestion endpoint  

---

## 1. Timeline of the Incident

| Time | Event |
|---|---|
| 08:00 AM | Normal pipeline operation. Traffic model v2.1 active. Drift score: 0.02. |
| 08:12 AM | Attacker POST request to NODE-1 `/ingest` endpoint. Payload: `traffic_volume=-5000`, `temperature=0.0K`. |
| 08:12 AM | NODE-1 accepts payload without validation. No authentication check. |
| 08:12 AM | NODE-2 computes `congestion_score = -5000 / 8000 = -0.625`. Physically impossible value forwarded to NODE-3. |
| 08:13 AM | NODE-3 inference: model interprets `congestion_score=-0.625` as empty road. Output: `RED` on all North Avenue signals. |
| 08:13 AM | Traffic lights on North Avenue switch to RED simultaneously. City-wide gridlock begins. |
| 08:14 AM | NODE-4 drift score spikes to 0.78. Retraining triggered automatically with poisoned data. |
| 08:15 AM | Model v2.2 promoted. Malicious behavior now reinforced in the new model version. |
| 08:15 AM | Incident detected by operations team. Physical cameras show gridlock. AI reports streets as empty. |
| 08:20 AM | Manual override activated on NODE-3. Traffic lights switched to manual control. |
| 08:25 AM | Model rolled back to v2.0 (last known good). Drift score returns to normal. |
| 08:40 AM | NODE-1 restarted in clean mode with defenses enabled. Poisoned data quarantined. |
| 09:00 AM | Full pipeline restored. Post-incident review initiated. |

---

## 2. Root Cause Analysis

The incident was caused by five compounding security failures in the pipeline:

### Failure 1: No authentication on NODE-1
The `/ingest` endpoint accepted POST requests from any source without requiring a token, certificate, or signed payload. Any process with network access to NODE-1 could inject arbitrary sensor readings.

**Fix:** Require mTLS (mutual TLS) between sensors and NODE-1. Each sensor must present a valid client certificate. Unsigned payloads are rejected before parsing.

### Failure 2: No range validation (sanity checks)
NODE-1 did not validate the physical plausibility of incoming values. `traffic_volume=-5000` and `temperature=0.0K` are physically impossible but were accepted as valid input.

**Fix:** Implement `validate_reading()` at ingestion. Hard constraints:
- `traffic_volume >= 0`
- `temperature > 0` (Kelvin scale)
- `rain_mm >= 0`
- `cloud_pct` between 0 and 100

### Failure 3: No statistical anomaly detection
Even if a value passes the sanity checks, it may still be statistically anomalous relative to historical baselines. NODE-1 had no mechanism to detect outliers.

**Fix:** Implement Z-Score anomaly detection at NODE-1. Values with `|Z| > 2.5` are quarantined for human review instead of being forwarded to NODE-2.

### Failure 4: No drift monitoring
NODE-4 triggered retraining as soon as the drift threshold was exceeded, without any human review gate. This allowed a single poisoned batch to permanently alter the production model.

**Fix:** Implement `evaluate_drift()`. When drift > 0.25, retraining is paused automatically. A human operator must review and approve the data batch before a new model is promoted.

### Failure 5: No output guardrails on NODE-3
NODE-3 executed the model's decision without any hard-coded safety limits. The model output was treated as ground truth, with no override for physically dangerous states.

**Fix:** Add output guardrails to NODE-3: "Never hold a main artery junction on RED for more than 5 consecutive minutes, regardless of model prediction." If this condition is detected, NODE-3 switches to a safe fallback state and triggers a human alert.

---

## 3. Attack Propagation Diagram

```
Attacker
   |
   | POST /ingest (no auth)
   |  traffic_volume = -5000
   |  temperature = 0.0K
   ↓
NODE-1 [VULNERABLE]
   | Accepts all values
   | No validation
   ↓
NODE-2 [VULNERABLE]
   | congestion_score = -5000 / 8000 = -0.625
   | Physically impossible value forwarded
   ↓
NODE-3 [VULNERABLE]
   | ML model: "empty road detected"
   | Output: RED on all signals
   ↓
Traffic Lights → GRIDLOCK

NODE-4 [VULNERABLE]
   | Drift spike detected (0.78)
   | Retraining triggered with poisoned data
   | Model v2.2 promoted
   ↓
Malicious behavior now persistent in model
```

---

## 4. Defense Implementation (Lab 1)

After the incident, three defensive layers were implemented in the pipeline:

### Layer 1: Sanity Checks — validate_reading()
```python
def validate_reading(reading):
    if reading['traffic_volume'] < 0:
        return False, "REJECTED: traffic_volume cannot be negative"
    if reading['temperature'] <= 0:
        return False, "REJECTED: temperature must be > 0K"
    if reading['rain_mm'] < 0:
        return False, "REJECTED: rain_mm cannot be negative"
    if not (0 <= reading['cloud_pct'] <= 100):
        return False, "REJECTED: cloud_pct must be between 0 and 100"
    return True, "ACCEPTED"
```

### Layer 2: Anomaly Detection — detect_anomaly()
```python
def detect_anomaly(value, mean, std, threshold=2.5):
    if std == 0:
        return False
    z_score = abs((value - mean) / std)
    return z_score > threshold  # True = anomalous = quarantine
```

### Layer 3: Drift Monitoring — evaluate_drift()
```python
def evaluate_drift(current_distribution, baseline_distribution, threshold=0.25):
    drift_score = compute_distribution_shift(current_distribution, baseline_distribution)
    if drift_score > threshold:
        pause_retraining()
        alert_human_operator()
        return True  # Drift detected
    return False
```

---

## 5. Post-Incident Verification

After enabling all three defense layers, the same attack was rerun:

| Check | Before defense | After defense |
|---|---|---|
| `traffic_volume=-5000` accepted | YES | NO — rejected at Layer 1 |
| `temperature=0.0K` accepted | YES | NO — rejected at Layer 1 |
| `congestion_score` computed | -0.625 | Never computed |
| NODE-3 inference triggered | YES | NO — no poisoned data reached inference |
| Retraining triggered | YES | NO — drift monitoring paused it |
| Model trust | Degraded (v2.2) | Maintained (v2.0 baseline) |
| Attack blocked metric | 0 | 1 |

---

## 6. Frequently Asked Questions

**Q: Why is traffic_volume=-5000 dangerous if it is just a number?**  
A: Because it is physically impossible (a road cannot have negative cars), it signals that the data was tampered with. When this impossible value reaches NODE-2, it produces a negative congestion score that the ML model has never seen in training. The model misinterprets it as "completely empty road" and triggers maximum signal restriction.

**Q: Why did the model pass quality checks if it was poisoned?**  
A: The model was evaluated on clean test data, where it performed normally. Poisoning only affects a specific condition (the trigger). On standard benchmarks, a backdoored model is indistinguishable from a clean one. This is what makes data poisoning so dangerous.

**Q: Why not just roll back the model immediately?**  
A: Rollback is the correct immediate response, but it only solves the symptom. The root causes (no validation, no anomaly detection, no drift monitoring) remain. Without fixing those, the next attack would succeed again.

**Q: What is the difference between drift and anomaly detection?**  
A: Anomaly detection operates at the level of individual readings (is this one value suspicious?). Drift monitoring operates at the level of data distributions (has the overall pattern of incoming data changed significantly from what the model was trained on?). Both are needed: a sophisticated attacker might send values that pass anomaly detection individually but still shift the distribution enough to degrade the model over time.

**Q: Why is quarantine better than simply rejecting anomalous data?**  
A: Rejection loses the data permanently. Quarantine preserves it for forensic analysis. If an attacker is probing the system with repeated injections, the quarantined records reveal the pattern of the attack and allow operators to understand the attacker's strategy.

**Q: What is the Z-Score threshold of 2.5 based on?**  
A: In a normal distribution, 99% of values fall within 2.58 standard deviations of the mean. A threshold of 2.5 catches roughly the top 1% most extreme values. For traffic data, which follows predictable patterns by hour and day, this is conservative enough to avoid false positives while catching genuine outliers like `traffic_volume=-5000`.

**Q: Could an attacker bypass the Z-Score by sending values slightly outside the normal range?**  
A: Yes. Z-Score is effective against extreme outliers but can be bypassed by a patient attacker who injects small shifts over many readings. This is why drift monitoring (Layer 3) is also necessary — it catches cumulative shifts that individual anomaly detection misses.

---

## 7. Lessons Learned

1. **Input validation is the first line of defense, not an afterthought.** Every external data source is a potential attack vector. Physical plausibility constraints are cheap to implement and eliminate a large class of attacks.

2. **Anomaly detection must be applied before features are computed.** By the time NODE-2 computes `congestion_score`, the damage is already done. Detection must happen at ingestion.

3. **Retraining should never be fully automated without a human review gate.** A drift spike is a warning sign, not a green light. Automatic promotion of a new model under anomalous conditions is a critical design flaw.

4. **Cyber-physical systems need hard-coded safety guardrails.** The AI model is not the last line of defense — it should never be. Physical actuators must have safety bounds that cannot be overridden by model output alone.

5. **Defense in depth.** No single layer is sufficient. Sanity checks can be bypassed with plausible-but-anomalous values. Anomaly detection can be bypassed with slow drift. Drift monitoring can be bypassed if the attacker has access to the training data directly. All three layers together make the attack significantly harder.

---

## 8. Recovery Checklist

When a poisoning attack is confirmed:

- [ ] Activate manual override on NODE-3 (traffic lights)
- [ ] Roll back to last known-good model version
- [ ] Quarantine all data ingested during the attack window
- [ ] Restart NODE-1 in clean mode (defenses enabled)
- [ ] Do NOT restart NODE-4 until poisoned data is purged
- [ ] Review quarantine queue — identify attack source and pattern
- [ ] Audit all retraining cycles that used poisoned data
- [ ] Promote a new clean model only after human review
- [ ] Document timeline and root causes in incident report
- [ ] Update threat model with attack method observed
