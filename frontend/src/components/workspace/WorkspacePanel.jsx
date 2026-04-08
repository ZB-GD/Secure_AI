import { useEffect, useState } from "react";
import { vmService } from "../../services/vmService";

export default function WorkspacePanel({ item }) {
  const [remoteUrlsByItemId, setRemoteUrlsByItemId] = useState({});
  const [remoteStateByItemId, setRemoteStateByItemId] = useState({});

  useEffect(() => {
    if (!item || item.type !== "lab") return;
    if (remoteUrlsByItemId[item.id]) return;

    let cancelled = false;

    async function startRemoteSession() {
      setRemoteStateByItemId((prev) => ({
        ...prev,
        [item.id]: { loading: true, error: "" },
      }));

      try {
        const payload = await vmService.startLabById(item.id);
        if (cancelled) return;

        setRemoteUrlsByItemId((prev) => ({
          ...prev,
          [item.id]: payload.terminal_url,
        }));
        setRemoteStateByItemId((prev) => ({
          ...prev,
          [item.id]: { loading: false, error: "" },
        }));
      } catch (error) {
        if (cancelled) return;
        setRemoteStateByItemId((prev) => ({
          ...prev,
          [item.id]: {
            loading: false,
            error: error?.message || "No se pudo iniciar la VM remota.",
          },
        }));
      }
    }

    startRemoteSession();

    return () => {
      cancelled = true;
    };
  }, [item, remoteUrlsByItemId]);

  if (!item) return null;

  const remoteState = remoteStateByItemId[item.id] || {
    loading: false,
    error: "",
  };
  const vmUrl = vmService.getRemoteUrl(item, remoteUrlsByItemId[item.id]);

  function handleRetryRemoteStart() {
    setRemoteUrlsByItemId((prev) => {
      const next = { ...prev };
      delete next[item.id];
      return next;
    });
    setRemoteStateByItemId((prev) => ({
      ...prev,
      [item.id]: { loading: false, error: "" },
    }));
  }

  return (
    <section
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
        background: "var(--bg-base)",
      }}
    >
      {/* Tab bar */}
      <div
        style={{
          flexShrink: 0,
          borderBottom: "1px solid var(--border-dim)",
          padding: "0 16px",
          display: "flex",
          alignItems: "center",
        }}
      >
        <div
          style={{
            padding: "10px 16px",
            fontSize: "10px",
            letterSpacing: "0.10em",
            fontFamily: "var(--font-mono)",
            color: "var(--orange)",
            borderBottom: "2px solid var(--orange)",
          }}
        >
          TERMINAL
        </div>
        <div
          style={{
            padding: "10px 16px",
            fontSize: "10px",
            letterSpacing: "0.10em",
            fontFamily: "var(--font-mono)",
            color: "var(--text-3)",
            borderBottom: "2px solid transparent",
          }}
        >
          LOGS
        </div>
        <div
          style={{
            padding: "10px 16px",
            fontSize: "10px",
            letterSpacing: "0.10em",
            fontFamily: "var(--font-mono)",
            color: "var(--text-3)",
            borderBottom: "2px solid transparent",
          }}
        >
          FILES
        </div>
      </div>

      {/* VM area */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        {remoteState.loading ? (
          <div
            style={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-2)",
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
            }}
          >
            Iniciando entorno remoto...
          </div>
        ) : remoteState.error ? (
          <div
            style={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
              color: "var(--text-2)",
              fontFamily: "var(--font-mono)",
              padding: "20px",
              textAlign: "center",
            }}
          >
            <div>No se pudo abrir la VM remota.</div>
            <div style={{ color: "var(--text-3)", fontSize: "11px" }}>
              {remoteState.error}
            </div>
            <button
              type="button"
              onClick={handleRetryRemoteStart}
              style={{
                border: "1px solid var(--border-dim)",
                background: "var(--bg-surface)",
                color: "var(--text-2)",
                borderRadius: "8px",
                padding: "8px 12px",
                cursor: "pointer",
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
              }}
            >
              Reintentar
            </button>
          </div>
        ) : vmUrl ? (
          /* ── CONNECTED: render the student VM ── */
          <iframe
            src={vmUrl}
            title="Student VM"
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              display: "block",
            }}
            allow="clipboard-read; clipboard-write"
          />
        ) : (
          /* ── NOT CONNECTED: placeholder ── */
          <VMPlaceholder item={item} />
        )}
      </div>
    </section>
  );
}

function VMPlaceholder({ item }) {
  const stageColors = {
    T: "var(--orange)",
    P: "var(--blue)",
    M: "#a78bfa",
    D: "var(--green)",
  };
  const stageLabels = {
    T: "Data Ingestion",
    P: "Input Handling",
    M: "Model Training",
    D: "Output Handling",
  };
  const color = stageColors[item.threatStage] || "var(--orange)";
  const label = stageLabels[item.threatStage] || "";

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "24px",
        padding: "40px",
      }}
    >
      {/* Fake terminal window */}
      <div
        style={{
          width: "100%",
          maxWidth: "520px",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-dim)",
          borderRadius: "10px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "9px 14px",
            background: "var(--bg-elevated)",
            borderBottom: "1px solid var(--border-dim)",
          }}
        >
          <div
            style={{
              width: "9px",
              height: "9px",
              borderRadius: "50%",
              background: "rgba(248,113,113,0.45)",
            }}
          />
          <div
            style={{
              width: "9px",
              height: "9px",
              borderRadius: "50%",
              background: "rgba(251,191,36,0.45)",
            }}
          />
          <div
            style={{
              width: "9px",
              height: "9px",
              borderRadius: "50%",
              background: "rgba(34,197,94,0.35)",
            }}
          />
          <span
            style={{
              marginLeft: "8px",
              fontSize: "9px",
              color: "var(--text-3)",
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.08em",
            }}
          >
            student@vm-{item.id}:~
          </span>
        </div>
        <div
          style={{
            padding: "18px 16px",
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            lineHeight: "2",
          }}
        >
          <span style={{ color: "var(--green)" }}>student@vm</span>
          <span style={{ color: "var(--text-3)" }}>:~$ </span>
          <span style={{ color: "var(--text-2)" }}>
            Waiting for VM connection...
          </span>
          <br />
          <span style={{ color: "var(--text-3)" }}>
            # Backend will mount the VM here
          </span>
          <br />
          <span style={{ color: color }}>_</span>
        </div>
      </div>

      {/* Stage badge */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "10px 18px",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-dim)",
          borderRadius: "8px",
        }}
      >
        <div
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "6px",
            background: `${color}18`,
            border: `1px solid ${color}40`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "11px",
            fontWeight: "600",
            color,
            fontFamily: "var(--font-mono)",
          }}
        >
          {item.threatStage}
        </div>
        <div>
          <div
            style={{
              fontSize: "9px",
              color: "var(--text-3)",
              letterSpacing: "0.10em",
            }}
          >
            THREAT STAGE
          </div>
          <div
            style={{ fontSize: "11px", color, fontFamily: "var(--font-mono)" }}
          >
            {label}
          </div>
        </div>
      </div>

      <p
        style={{
          fontSize: "11px",
          color: "var(--text-3)",
          fontFamily: "var(--font-mono)",
          textAlign: "center",
          maxWidth: "340px",
          lineHeight: "1.7",
        }}
      >
        {item.type === "scenario"
          ? "Complete the scenario guide on the left to unlock the next stage."
          : "VM environment will connect here when the backend is integrated.\nAdd the remote URL to the lab data to activate it."}
      </p>
    </div>
  );
}
