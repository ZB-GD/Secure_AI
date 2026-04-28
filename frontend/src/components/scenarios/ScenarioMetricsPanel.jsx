function MetricCard({ label, value, tone = "neutral", subtitle = "" }) {
  return (
    <div className={`scenario-metric scenario-metric--${tone}`}>
      <div className="scenario-metric__text">
        <div className="scenario-metric__label">{label}</div>
        {subtitle ? (
          <div className="scenario-metric__subtitle">{subtitle}</div>
        ) : null}
      </div>
      <div className="scenario-metric__value">{value}</div>
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

  return (
    <div className="scenario-metrics-grid" aria-label="Pipeline metrics">
      <MetricCard label="Readings" value={metrics?.readings_received ?? 0} />
      <MetricCard
        label="Poisoned"
        value={metrics?.poisoned_readings ?? 0}
        tone={(metrics?.poisoned_readings || 0) > 0 ? "danger" : "good"}
      />
      <MetricCard
        label="Anomalies"
        value={metrics?.anomalous_features ?? 0}
        tone={(metrics?.anomalous_features || 0) > 0 ? "warning" : "good"}
      />
      <MetricCard
        label="Output"
        value={`${predictions}/${actions}`}
        subtitle="pred/actions"
      />
      <MetricCard
        label="Risk"
        value={riskLevel}
        tone={riskLevel === "high" ? "danger" : "good"}
      />
      <MetricCard
        label="Drift / Retrain"
        value={`${drift} / ${retrainLabel}`}
        tone={drift >= 0.25 ? "warning" : "good"}
        subtitle="score / decision"
      />
    </div>
  );
}
