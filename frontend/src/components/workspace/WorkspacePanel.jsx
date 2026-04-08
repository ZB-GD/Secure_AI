import { vmService } from "../../services/vmService"

export default function WorkspacePanel({ item }) {
  // ─────────────────────────────────────────────────────────────
  // VM INTEGRATION POINT
  // When the backend is ready, vmService.getRemoteUrl(item)
  // will return the URL of the student's VM (e.g. a noVNC or
  // ttyd endpoint). Drop the iframe in below.
  // ─────────────────────────────────────────────────────────────
  const vmUrl = vmService.getRemoteUrl(item)

  return (
    <section style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", background: "var(--bg-base)" }}>

      {/* Tab bar */}
      <div style={{ flexShrink: 0, borderBottom: "1px solid var(--border-dim)", padding: "0 16px", display: "flex", alignItems: "center" }}>
        <div style={{ padding: "10px 16px", fontSize: "10px", letterSpacing: "0.10em", fontFamily: "var(--font-mono)", color: "var(--orange)", borderBottom: "2px solid var(--orange)" }}>
          TERMINAL
        </div>
        <div style={{ padding: "10px 16px", fontSize: "10px", letterSpacing: "0.10em", fontFamily: "var(--font-mono)", color: "var(--text-3)", borderBottom: "2px solid transparent" }}>
          LOGS
        </div>
        <div style={{ padding: "10px 16px", fontSize: "10px", letterSpacing: "0.10em", fontFamily: "var(--font-mono)", color: "var(--text-3)", borderBottom: "2px solid transparent" }}>
          FILES
        </div>
      </div>

      {/* VM area */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>

        {vmUrl ? (
          /* ── CONNECTED: render the student VM ── */
          <iframe
            src={vmUrl}
            title="Student VM"
            style={{ width: "100%", height: "100%", border: "none", display: "block" }}
            allow="clipboard-read; clipboard-write"
          />
        ) : (
          /* ── NOT CONNECTED: placeholder ── */
          <VMPlaceholder item={item} />
        )}

      </div>
    </section>
  )
}

function VMPlaceholder({ item }) {
  const stageColors = {
    T: "var(--orange)",
    P: "var(--blue)",
    M: "#a78bfa",
    D: "var(--green)",
  }
  const stageLabels = {
    T: "Data Ingestion",
    P: "Input Handling",
    M: "Model Training",
    D: "Output Handling",
  }
  const color = stageColors[item.threatStage] || "var(--orange)"
  const label = stageLabels[item.threatStage] || ""

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "24px", padding: "40px" }}>

      {/* Fake terminal window */}
      <div style={{ width: "100%", maxWidth: "520px", background: "var(--bg-surface)", border: "1px solid var(--border-dim)", borderRadius: "10px", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 14px", background: "var(--bg-elevated)", borderBottom: "1px solid var(--border-dim)" }}>
          <div style={{ width: "9px", height: "9px", borderRadius: "50%", background: "rgba(248,113,113,0.45)" }} />
          <div style={{ width: "9px", height: "9px", borderRadius: "50%", background: "rgba(251,191,36,0.45)" }} />
          <div style={{ width: "9px", height: "9px", borderRadius: "50%", background: "rgba(34,197,94,0.35)" }} />
          <span style={{ marginLeft: "8px", fontSize: "9px", color: "var(--text-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.08em" }}>
            student@vm-{item.id}:~
          </span>
        </div>
        <div style={{ padding: "18px 16px", fontFamily: "var(--font-mono)", fontSize: "11px", lineHeight: "2" }}>
          <span style={{ color: "var(--green)" }}>student@vm</span>
          <span style={{ color: "var(--text-3)" }}>:~$ </span>
          <span style={{ color: "var(--text-2)" }}>Waiting for VM connection...</span>
          <br />
          <span style={{ color: "var(--text-3)" }}># Backend will mount the VM here</span>
          <br />
          <span style={{ color: color }}>_</span>
        </div>
      </div>

      {/* Stage badge */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 18px", background: "var(--bg-surface)", border: "1px solid var(--border-dim)", borderRadius: "8px" }}>
        <div style={{ width: "28px", height: "28px", borderRadius: "6px", background: `${color}18`, border: `1px solid ${color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "600", color, fontFamily: "var(--font-mono)" }}>
          {item.threatStage}
        </div>
        <div>
          <div style={{ fontSize: "9px", color: "var(--text-3)", letterSpacing: "0.10em" }}>THREAT STAGE</div>
          <div style={{ fontSize: "11px", color, fontFamily: "var(--font-mono)" }}>{label}</div>
        </div>
      </div>

      <p style={{ fontSize: "11px", color: "var(--text-3)", fontFamily: "var(--font-mono)", textAlign: "center", maxWidth: "340px", lineHeight: "1.7" }}>
        {item.type === "scenario"
          ? "Complete the scenario guide on the left to unlock the next stage."
          : "VM environment will connect here when the backend is integrated.\nAdd the remote URL to the lab data to activate it."}
      </p>

    </div>
  )
}