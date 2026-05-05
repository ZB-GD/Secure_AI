import { useEffect, useState } from "react";

export default function RemoteDesktopPanel({
  item,
  remoteUrl,
  remoteLoading,
  remoteError,
  onRetry,
}) {
  const [iframeKey, setIframeKey] = useState(0);

  useEffect(() => {
    setIframeKey(0);
  }, [remoteUrl]);

  if (remoteLoading) {
    return (
      <section
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          overflow: "hidden",
          borderRadius: "24px",
          border: "1px solid var(--border-dim)",
          background: "var(--bg-panel)",
        }}
      >
        <header
          style={{
            flexShrink: 0,
            borderBottom: "1px solid var(--border-dim)",
            padding: "16px 20px",
          }}
        >
          <p
            style={{
              fontSize: "11px",
              fontFamily: "var(--font-mono)",
              textTransform: "uppercase",
              letterSpacing: "0.35em",
              color: "var(--text-3)",
            }}
          >
            LIVE ENVIRONMENT
          </p>
          <h3
            style={{
              marginTop: "4px",
              fontSize: "20px",
              fontWeight: "600",
              color: "var(--text-1)",
              fontFamily: "var(--font-display)",
            }}
          >
            {item.envKey} · {item.title}
          </h3>
        </header>

        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
        >
          <p
            style={{
              fontSize: "14px",
              color: "var(--orange)",
              animation: "pulse-red 2s infinite",
              fontFamily: "var(--font-mono)",
            }}
          >
            [!] Booting secure containers...
          </p>
        </div>
      </section>
    );
  }

  if (remoteError) {
    return (
      <section
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          overflow: "hidden",
          borderRadius: "24px",
          border: "1px solid var(--border-dim)",
          background: "var(--bg-panel)",
        }}
      >
        <header
          style={{
            flexShrink: 0,
            borderBottom: "1px solid var(--border-dim)",
            padding: "16px 20px",
          }}
        >
          <p
            style={{
              fontSize: "11px",
              fontFamily: "var(--font-mono)",
              textTransform: "uppercase",
              letterSpacing: "0.35em",
              color: "var(--text-3)",
            }}
          >
            LIVE ENVIRONMENT
          </p>
          <h3
            style={{
              marginTop: "4px",
              fontSize: "20px",
              fontWeight: "600",
              color: "var(--text-1)",
              fontFamily: "var(--font-display)",
            }}
          >
            {item.envKey} · {item.title}
          </h3>
        </header>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "16px",
            padding: "24px",
          }}
        >
          <p style={{ fontSize: "14px", color: "var(--red)" }}>
            Connection failed.
          </p>
          <p style={{ fontSize: "12px", color: "var(--text-3)" }}>{remoteError}</p>
          <button
            onClick={onRetry}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: "1px solid var(--border-dim)",
              background: "var(--bg-surface)",
              color: "var(--text-1)",
              cursor: "pointer",
            }}
          >
            Retry Connection
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
        borderRadius: "24px",
        border: "1px solid var(--border-dim)",
        background: "var(--bg-panel)",
      }}
    >
      <header
        style={{
          flexShrink: 0,
          borderBottom: "1px solid var(--border-dim)",
          padding: "16px 20px",
        }}
      >
        <p
          style={{
            fontSize: "11px",
            fontFamily: "var(--font-mono)",
            textTransform: "uppercase",
            letterSpacing: "0.35em",
            color: "var(--text-3)",
          }}
        >
          LIVE ENVIRONMENT
        </p>
        <h3
          style={{
            marginTop: "4px",
            fontSize: "20px",
            fontWeight: "600",
            color: "var(--text-1)",
            fontFamily: "var(--font-display)",
          }}
        >
          {item.envKey} · {item.title}
        </h3>
      </header>

      <div
        style={{
          flex: 1,
          padding: "16px",
          overflow: "hidden",
          background: "var(--bg-base)",
        }}
      >
        {remoteUrl ? (
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "12px",
              border: "1px solid var(--border-dim)",
              background: "#000",
              overflow: "hidden",
            }}
          >
            <iframe
              key={iframeKey}
              title={`Remote Interface ${item.id}`}
              src={remoteUrl}
              onLoad={() => {
                if (iframeKey === 0) {
                  window.setTimeout(() => setIframeKey(1), 1200);
                }
              }}
              style={{ width: "100%", height: "100%", border: "none" }}
            />
          </div>
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-3)",
              fontFamily: "var(--font-mono)",
            }}
          >
            No VM URL provided by backend.
          </div>
        )}
      </div>
    </section>
  );
}
