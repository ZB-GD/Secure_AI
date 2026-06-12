import { useState } from "react";

function Hi({ children }) {
  return (
    <span style={{ color: "var(--orange)", fontWeight: 600 }}>{children}</span>
  );
}

function MetricCard({ metric }) {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div
      style={{
        background: "var(--bg-panel)",
        border: "1px solid var(--border-dim)",
        borderRadius: "8px",
        padding: "14px 16px",
        height: "100%",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
        gap: "10px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div
          style={{
            fontSize: "14px",
            color: "var(--text-3)",
            lineHeight: 1.4,
          }}
        >
          {metric.label}
        </div>
        <button
          type="button"
          onClick={() => setShowHelp((v) => !v)}
          title={showHelp ? "Close" : "What does this mean?"}
          style={{
            width: "20px",
            height: "20px",
            borderRadius: "50%",
            border: `1px solid ${showHelp ? "var(--orange)" : "rgba(255,255,255,0.25)"}`,
            background: showHelp ? "rgba(249,115,22,0.18)" : "rgba(255,255,255,0.08)",
            color: showHelp ? "var(--orange)" : "var(--text-1)",
            fontSize: "12px",
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            marginLeft: "6px",
            lineHeight: 1,
            padding: 0,
            transition: "background 0.15s, border-color 0.15s, color 0.15s",
          }}
          onMouseEnter={(e) => {
            if (!showHelp) {
              e.currentTarget.style.background = "rgba(255,255,255,0.15)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.4)";
            }
          }}
          onMouseLeave={(e) => {
            if (!showHelp) {
              e.currentTarget.style.background = "rgba(255,255,255,0.08)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)";
            }
          }}
        >
          {showHelp ? "×" : "?"}
        </button>
      </div>

      {showHelp ? (
        <div
          style={{
            fontSize: "14px",
            color: "var(--text-2)",
            lineHeight: 1.65,
            flex: 1,
          }}
        >
          {metric.caption}
        </div>
      ) : (
        <div
          style={{
            fontSize: "28px",
            color: metric.color,
            fontWeight: 700,
            fontFamily: "var(--font-display)",
            display: "flex",
            alignItems: "baseline",
            gap: "4px",
          }}
        >
          {metric.value}
          {metric.suffix && (
            <span style={{ fontSize: "16px" }}>{metric.suffix}</span>
          )}
        </div>
      )}
    </div>
  );
}

export default function LabMetrics({ runtime }) {
  const accuracyColor = runtime.accuracy < 70 ? "var(--red)" : "var(--green)";
  const protectedMode =
    runtime.statusLabel === "protected" || runtime.defenseEnabled;

  const statusColor = runtime.isCompromised
    ? "var(--red)"
    : protectedMode
      ? "var(--green)"
      : "var(--orange)";

  const scoreColor = runtime.isCompromised ? "var(--red)" : "var(--text-3)";

  const metricCards = [
    {
      label: "ACCEPTED / REJECTED",
      value: `${runtime.acceptedReadings ?? 0}/${runtime.rejectedReadings ?? 0}`,
      suffix: "",
      color: runtime.isCompromised ? "var(--red)" : "var(--green)",
      caption: runtime.isCompromised ? (
        <>
          The vulnerable node accepted the poisoned reading with{" "}
          <Hi>no validation</Hi>, passing <Hi>traffic_volume=-5000</Hi> to
          feature engineering. This reading enters the <Hi>training loop</Hi>{" "}
          and corrupts future predictions. Accepted poisoned inputs are the root
          cause of <Hi>model drift</Hi>.
        </>
      ) : protectedMode ? (
        <>
          Your <Hi>validate_defense.py</Hi> caught the poisoned reading before
          it entered the pipeline. At least one defense layer (
          <Hi>input sanity check</Hi>, <Hi>anomaly detection</Hi>, or{" "}
          <Hi>drift gate</Hi>) blocked the impossible value, keeping training
          data clean.
        </>
      ) : (
        <>
          Run <Hi>poison_data.py</Hi> from the Desktop to send a poisoned
          reading. This counter shows submissions <Hi>accepted</Hi> (bypassed
          all defenses) vs. <Hi>rejected</Hi> (blocked by your defense script).
        </>
      ),
    },
    {
      label: "DEFENSE COVERAGE",
      value: `${runtime.defenseCoverage ?? 0}/3`,
      suffix: "",
      color: protectedMode ? "var(--green)" : "var(--orange)",
      caption: (
        <>
          3 layers: <Hi>input bounds check</Hi>,{" "}
          <Hi>Z-score anomaly detection</Hi>, and <Hi>drift gate</Hi>. A score
          of <Hi>3/3</Hi> means all layers are active and the attack was fully
          contained.
        </>
      ),
    },
    {
      label: "CONGESTION SCORE",
      value: runtime.congestionScore ?? "n/a",
      suffix: "",
      color: scoreColor,
      caption: runtime.isCompromised ? (
        <>
          Edge Node 2 computes <Hi>congestion_score = traffic_volume / 8000</Hi>
          . With <Hi>traffic_volume=-5000</Hi> the score becomes <Hi>-0.625</Hi>
          , a physically impossible value. This corrupted feature skews the ML
          model's understanding of traffic state across the whole network.
        </>
      ) : (
        <>
          Edge Node 2 computes <Hi>congestion_score = traffic_volume / 8000</Hi>
          . Legitimate scores fall between <Hi>0 and 1</Hi>. After an attack,
          this shows the anomalous feature value that causes the model to
          predict free flow during a congested rush hour.
        </>
      ),
    },
    {
      label: "MODEL TRUST",
      value: runtime.accuracy,
      suffix: "%",
      color: accuracyColor,
      caption: runtime.isCompromised ? (
        <>
          The poisoned reading triggered a corrupted retraining cycle. Accuracy
          drops from <Hi>~98%</Hi> to <Hi>~61%</Hi>, simulating how poisoned
          training data causes the model to <Hi>misclassify congestion</Hi> and
          set all lights to green during rush hour.
        </>
      ) : (
        <>
          The model has only seen clean traffic data and classifies congestion
          states with <Hi>~98% accuracy</Hi>. Run the attack to see how a{" "}
          <Hi>single poisoned feature</Hi> can degrade model trust and cause
          wrong predictions across the city network.
        </>
      ),
    },
  ];

  return (
    <div
      style={{
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
      }}
    >
      <div
        style={{
          padding: "12px 16px",
          borderRadius: "10px",
          border: `1px solid ${runtime.isCompromised ? "rgba(248,113,113,0.28)" : "var(--green-border)"}`,
          background: runtime.isCompromised
            ? "rgba(248,113,113,0.08)"
            : "var(--green-dim)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "14px",
              color: "var(--text-3)",
              marginBottom: "4px",
            }}
          >
            LOCAL LAB STATUS
          </div>
          <div
            style={{
              fontSize: "14px",
              color: "var(--text-1)",
              lineHeight: 1.5,
            }}
          >
            {runtime.lastEvent}
            {runtime.lastReason && (
              <span style={{ color: "var(--text-3)" }}>
                {" "}
                {runtime.lastReason}
              </span>
            )}
          </div>
        </div>
        <span
          style={{
            fontSize: "12px",
            padding: "3px 10px",
            borderRadius: "999px",
            border: `1px solid ${statusColor}`,
            color: statusColor,
            fontWeight: 600,
            whiteSpace: "nowrap",
            marginLeft: "12px",
          }}
        >
          {runtime.isCompromised
            ? "COMPROMISED"
            : protectedMode
              ? "PROTECTED"
              : "VULNERABLE"}
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gridAutoRows: "1fr",
          gap: "12px",
          flex: 1,
          minHeight: 0,
        }}
      >
        {metricCards.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </div>
    </div>
  );
}
