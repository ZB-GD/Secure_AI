export default function AttackControls({
  onAttack,
  loading = false,
  completed = false,
}) {
  const handleAttack = async () => {
    if (loading || completed) return
    await onAttack?.()
  }

  return (
    <div
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--red-dim)",
        borderRadius: "12px",
        padding: "16px",
      }}
    >
      <div
        style={{
          fontSize: "10px",
          color: "var(--red)",
          letterSpacing: "0.15em",
          marginBottom: "12px",
          fontWeight: "bold",
        }}
      >
        EXPLOIT TOOLKIT: MQTT_INJECTOR.PY
      </div>

      <p
        style={{
          fontSize: "12px",
          color: "var(--text-2)",
          marginBottom: "16px",
          lineHeight: "1.5",
        }}
      >
        Run the Lab 1 injector inside the isolated container and inspect the
        local runtime logs it produces.
      </p>

      {!completed ? (
        <>
          <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
            <div style={{ flex: 1 }}>
              <label
                style={{
                  fontSize: "10px",
                  color: "var(--text-3)",
                  marginBottom: "4px",
                  display: "block",
                }}
              >
                TARGET TIME
              </label>
              <input
                disabled
                value="08:00 AM (Rush Hour)"
                style={{
                  width: "100%",
                  background: "var(--bg-base)",
                  border: "1px solid var(--border-dim)",
                  color: "var(--text-3)",
                  padding: "8px",
                  borderRadius: "6px",
                  fontSize: "10px",
                  fontFamily: "var(--font-display)",
                }}
              />
            </div>

            <div style={{ width: "140px" }}>
              <label
                style={{
                  fontSize: "10px",
                  color: "var(--text-3)",
                  marginBottom: "4px",
                  display: "block",
                }}
              >
                PAYLOAD
              </label>
              <input
                disabled
                value="-5000 cars/hr"
                style={{
                  width: "100%",
                  background: "rgba(248,113,113,0.1)",
                  border: "1px solid var(--red-dim)",
                  color: "var(--red)",
                  padding: "8px",
                  borderRadius: "6px",
                  fontSize: "10px",
                  fontFamily: "var(--font-display)",
                  textAlign: "center",
                  fontWeight: "bold",
                }}
              />
            </div>
          </div>

          <button
            onClick={handleAttack}
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px",
              background: loading ? "var(--bg-base)" : "var(--red)",
              border: loading ? "1px solid var(--border-dim)" : "none",
              color: loading ? "var(--text-3)" : "#fff",
              borderRadius: "6px",
              cursor: loading ? "wait" : "pointer",
              fontWeight: "bold",
              fontSize: "12px",
              transition: "all 0.2s",
              boxShadow: loading ? "none" : "0 0 15px rgba(248,113,113,0.4)",
            }}
          >
            {loading ? "INJECTING PAYLOAD..." : "RUN ISOLATED ATTACK"}
          </button>
        </>
      ) : (
        <div
          style={{
            padding: "14px",
            borderRadius: "8px",
            background: "rgba(248,113,113,0.10)",
            border: "1px solid rgba(248,113,113,0.20)",
          }}
        >
          <div
            style={{
              fontSize: "10px",
              color: "var(--red)",
              fontWeight: "bold",
              marginBottom: "6px",
            }}
          >
            PAYLOAD DELIVERED
          </div>

          <div
            style={{
              fontSize: "12px",
              color: "var(--text-2)",
              lineHeight: "1.6",
            }}
          >
            The exploit has already been executed. Review the telemetry,
            metrics and logs before applying mitigations.
          </div>
        </div>
      )}
    </div>
  )
}
