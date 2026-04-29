import { useState } from "react";
import RemoteDesktopPanel from "./RemoteDesktopPanel";
import AttackControls from "../labs/AttackControls";
import LabMetrics from "../labs/LabMetrics";

function StatusPill({ children, tone = "green" }) {
  const tones = {
    green: {
      color: "var(--green)",
      border: "var(--green-border)",
      bg: "var(--green-dim)",
    },
    red: {
      color: "var(--red)",
      border: "rgba(248,113,113,0.28)",
      bg: "rgba(248,113,113,0.10)",
    },
    orange: {
      color: "var(--orange)",
      border: "var(--orange-border)",
      bg: "var(--orange-dim)",
    },
  };

  const style = tones[tone] || tones.green;

  return (
    <span
      style={{
        fontSize: "10px",
        color: style.color,
        border: `1px solid ${style.border}`,
        background: style.bg,
        borderRadius: "999px",
        padding: "3px 8px",
        letterSpacing: "0.08em",
      }}
    >
      {children}
    </span>
  );
}

function RightPanelCard({ title, children, footer = null, fill = false }) {
  return (
    <section
      style={{
        border: "1px solid var(--border-dim)",
        borderRadius: "12px",
        background: "var(--bg-panel)",
        overflow: "hidden",
        minHeight: fill ? 0 : "auto",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: "14px 16px",
          borderBottom: "1px solid var(--border-dim)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
        }}
      >
        <div
          style={{
            fontSize: "10px",
            color: "var(--text-3)",
            letterSpacing: "0.15em",
          }}
        >
          {title}
        </div>
        {footer}
      </div>

      <div
        style={{
          padding: "16px",
          flex: fill ? 1 : "unset",
          minHeight: fill ? 0 : "auto",
        }}
      >
        {children}
      </div>
    </section>
  );
}

export default function Lab1Workspace({ item }) {
  const [attackLoading, setAttackLoading] = useState(false);
  const [attackExecuted, setAttackExecuted] = useState(false);

  const [driftScore, setDriftScore] = useState(12);
  const [accuracy, setAccuracy] = useState(98.5);

  const [backendStatus, setBackendStatus] = useState("No events yet.");
  const [runtimeLogs, setRuntimeLogs] = useState([
    "Waiting for runtime events...",
  ]);

  async function handleAttack() {
    if (attackLoading || attackExecuted) return;

    setAttackLoading(true);
    setBackendStatus("Delivering forged payload to Node-1...");
    setRuntimeLogs([
      "[BOOT] Starting exploit sequence...",
      "Waiting for runtime events...",
    ]);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setAttackExecuted(true);
      setDriftScore(87);
      setAccuracy(34.2);

      setBackendStatus(
        "Poisoned payload accepted by Node-1. Downstream pipeline is now compromised.",
      );

      setRuntimeLogs([
        "[ATTACK] forged payload injected: traffic_volume=-5000",
        "[NODE-1] payload accepted without strong authentication/signature",
        "[NODE-2] anomalous feature generated: congestion_score=-0.625",
        "[NODE-3] unsafe inference generated from poisoned features",
        "[NODE-4] retraining feedback accepted, drift exceeded safe baseline",
      ]);
    } finally {
      setAttackLoading(false);
    }
  }

  return (
    <section
      style={{
        display: "grid",
        gridTemplateColumns: "1.75fr 0.95fr",
        gap: "16px",
        height: "100%",
        padding: "14px",
        background: "var(--bg-base)",
      }}
    >
      <div style={{ minHeight: 0 }}>
        <RemoteDesktopPanel
          item={item}
          remoteUrl={
            item?.remote?.url ||
            "http://localhost:8889/notebooks/notebook.ipynb"
          }
        />
      </div>

      <aside
        style={{
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        <AttackControls
          onAttack={handleAttack}
          loading={attackLoading}
          completed={attackExecuted}
        />

        <LabMetrics
          driftScore={driftScore}
          accuracy={accuracy}
          isCompromised={attackExecuted}
        />

        <RightPanelCard
          title="BACKEND STATUS"
          footer={
            <StatusPill tone={attackExecuted ? "red" : "green"}>
              {attackExecuted ? "COMPROMISED" : "RUNNING"}
            </StatusPill>
          }
        >
          <div
            style={{
              fontSize: "12px",
              color: "var(--text-2)",
              lineHeight: "1.7",
            }}
          >
            {backendStatus}
          </div>
        </RightPanelCard>

        <RightPanelCard
          title="RUNTIME LOG STREAM"
          footer={<StatusPill tone="green">RUNNING</StatusPill>}
          fill
        >
          <div
            style={{
              height: "100%",
              overflowY: "auto",
              fontSize: "12px",
              color: "var(--text-2)",
              fontFamily: "var(--font-mono)",
              lineHeight: "1.7",
            }}
          >
            {runtimeLogs.map((line, index) => (
              <div key={`${line}-${index}`} style={{ marginBottom: "8px" }}>
                {line}
              </div>
            ))}
          </div>
        </RightPanelCard>
      </aside>
    </section>
  );
}