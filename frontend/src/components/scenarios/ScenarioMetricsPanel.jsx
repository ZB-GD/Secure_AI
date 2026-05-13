function MetricCard({ label, value, tone = "neutral", subtitle = "", dotIndicator = false }) {
  return (
    <div className={`scenario-metric scenario-metric--${tone}`}>
      <div className="scenario-metric__label">{label}</div>
      {subtitle ? <div className="scenario-metric__subtitle">{subtitle}</div> : null}
      <div className="scenario-metric__value">
        {dotIndicator && (
          <span className={`scenario-metric__dot scenario-metric__dot--${tone}`} />
        )}
        {value}
      </div>
    </div>
  );
}

export default function ScenarioMetricsPanel({ metrics }) {
  const drift = Number(metrics?.drift_score || 0);
  const riskLevel = String(metrics?.risk_level || "unknown");
  const retrainTriggered = Boolean(metrics?.trainer_retrain_triggered);
  const retrainOk = metrics?.trainer_retrain_ok;

  const retrainLabel = retrainTriggered
    ? retrainOk === true
      ? "yes"
      : "failed"
    : "no";

  const predictions = Number(metrics?.predictions_generated ?? 0);
  const actions = Number(metrics?.actions_generated ?? 0);
  const riskTone = riskLevel === "high" ? "danger" : riskLevel === "normal" ? "good" : "neutral";

  return (
    <div className="scenario-metrics-grid" aria-label="Pipeline metrics">
      <MetricCard label="READINGS" value={metrics?.readings_received ?? 0} />
      <MetricCard
        label="POISONED"
        value={metrics?.poisoned_readings ?? 0}
        tone={(metrics?.poisoned_readings || 0) > 0 ? "danger" : "good"}
      />
      <MetricCard
        label="ANOMALIES"
        value={metrics?.anomalous_features ?? 0}
        tone={(metrics?.anomalous_features || 0) > 0 ? "warning" : "good"}
      />
      <MetricCard
        label="OUTPUT"
        value={`${predictions}/${actions}`}
        subtitle="predictions / actions"
      />
      <MetricCard
        label="RISK"
        value={riskLevel.toUpperCase()}
        tone={riskTone}
        dotIndicator
      />
      <MetricCard
        label="DRIFT / RETRAIN"
        value={`${drift.toFixed(3)} / ${retrainLabel.toUpperCase()}`}
        tone={drift >= 0.25 ? "warning" : "good"}
        subtitle="score / decision"
      />
    </div>
  );
}
