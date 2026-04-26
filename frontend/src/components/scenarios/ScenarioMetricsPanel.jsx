function MetricCard({ label, value, tone = "neutral", subtitle = "" }) {
  const color =
    tone === "danger"
      ? "var(--red)"
      : tone === "good"
        ? "var(--green)"
        : tone === "warning"
          ? "var(--orange)"
          : "var(--text-1)";

  return (
    <div
      style={{
        padding: "12px 14px",
        borderRadius: "10px",
        border: "1px solid var(--border-dim)",
        background: "var(--bg-panel)",
      }}
    >
      <div
        style={{
          fontSize: "10px",
          color: "var(--text-3)",
          letterSpacing: "0.12em",
          marginBottom: "6px",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "22px",
          fontFamily: "var(--font-display)",
          color,
          fontWeight: 700,
          marginBottom: subtitle ? "4px" : 0,
        }}
      >
        {value}
      </div>
      {subtitle ? (
        <div style={{ fontSize: "11px", color: "var(--text-3)" }}>
          {subtitle}
        </div>
      ) : null}
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

  return (
    <div
      style={{
        marginTop: "14px",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
        gap: "10px",
      }}
    >
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
        label="Predictions"
        value={metrics?.predictions_generated ?? 0}
      />
      <MetricCard label="Actions" value={metrics?.actions_generated ?? 0} />
      <MetricCard
        label="Risk"
        value={riskLevel}
        tone={riskLevel === "high" ? "danger" : "good"}
      />
      <MetricCard
        label="Drift"
        value={drift}
        tone={drift >= 0.25 ? "warning" : "good"}
        subtitle="trainer threshold"
      />
      <MetricCard
        label="Retrain"
        value={retrainLabel}
        tone={retrainTriggered ? (retrainOk ? "good" : "danger") : "neutral"}
      />
    </div>
  );
}
