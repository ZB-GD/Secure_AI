import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { getApiBaseUrl } from "../services/apiClient";

async function callAuth(path, body) {
  const base = await getApiBaseUrl();
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || `Error ${res.status}`);
  return data;
}

const INCIDENT_TEXT =
  "CRITICAL INCIDENT: At 08:15 AM today, the AI forced all traffic lights on North Avenue to RED.\n\n• The AI model believes the streets are empty.\n• Physical cameras show severe gridlock.\n• No software updates were deployed today.";

export default function LoginPage() {
  const { login } = useAuth();
  const [typedText, setTypedText] = useState("");
  const [tab, setTab] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      setTypedText(INCIDENT_TEXT.slice(0, i));
      i++;
      if (i > INCIDENT_TEXT.length) clearInterval(timer);
    }, 18);
    return () => clearInterval(timer);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (tab === "register" && password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const path = tab === "login" ? "/auth/login" : "/auth/register";
      const data = await callAuth(path, { email, password });
      login(data.access_token, { email: data.email, role: data.role });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: "100%",
    padding: "11px 14px",
    background: "rgba(15,23,42,0.6)",
    border: "1px solid var(--border-dim)",
    borderRadius: "8px",
    color: "var(--text-1)",
    fontFamily: "var(--font-mono)",
    fontSize: "13px",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.15s",
  };

  const labelStyle = {
    display: "block",
    fontSize: "13px",
    fontWeight: 700,
    textTransform: "uppercase",
    color: "var(--text-3)",
    fontFamily: "var(--font-display)",
    marginBottom: "7px",
  };

  const tabBtn = (active) => ({
    padding: "12px 0",
    border: "none",
    background: "transparent",
    color: active ? "var(--text-1)" : "var(--text-3)",
    fontFamily: "var(--font-display)",
    fontSize: "15px",
    fontWeight: active ? 700 : 400,
    cursor: "pointer",
    borderBottom: active ? "2px solid var(--orange)" : "2px solid transparent",
    marginBottom: "-1px",
    transition: "all 0.15s",
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        background: "var(--bg-base)",
      }}
    >
      {/* Left: branding panel*/}
      <div
        style={{
          background:
            "radial-gradient(ellipse at 30% 60%, #0c1525 0%, #05080f 100%)",
          borderRight: "1px solid var(--border-dim)",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          padding: "40px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: "var(--orange-dim)",
              border: "1px solid var(--orange-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 16px rgba(249,115,22,0.15)",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                color: "var(--orange)",
                fontSize: "13px",
                fontWeight: 700,
                fontFamily: "var(--font-mono)",
              }}
            >
              AI
            </span>
          </div>
          <div>
            <div
              style={{
                fontSize: "17px",
                fontWeight: 700,
                fontFamily: "var(--font-display)",
                color: "var(--text-1)",
              }}
            >
              SEC<span style={{ color: "var(--orange)" }}>LABS</span>
            </div>
            <div
              style={{
                fontSize: "12px",
                color: "var(--text-3)",
                fontFamily: "var(--font-mono)",
              }}
            >
              AI SECURITY TRAINING
            </div>
          </div>
        </div>

        {/* Alert badge + headline */}
        <div style={{ flexShrink: 0, marginTop: "24px" }}>
          <div
            style={{
              display: "inline-block",
              padding: "4px 10px",
              background: "var(--red-dim)",
              border: "1px solid var(--red)",
              borderRadius: "4px",
              marginBottom: "35px",
            }}
          >
            <span
              style={{
                fontSize: "12px",
                color: "var(--red)",
                fontWeight: 700,
              }}
            >
              URGENT CITY ALERT
            </span>
          </div>

          <h1
            style={{
              margin: "0 0 0",
              fontSize: "42px",
              fontWeight: 800,
              fontFamily: "var(--font-display)",
              color: "var(--text-1)",
              lineHeight: 1.15,
            }}
          >
            CityFlow AI is <br />
            <span style={{ color: "var(--orange)" }}>
              failing in production.
            </span>
          </h1>
        </div>

        <div
          style={{
            height: "160px",
            flexShrink: 0,
            overflow: "hidden",
            fontFamily: "var(--font-display)",
            fontSize: "15px",
            lineHeight: 1.8,
            color: "var(--text-2)",
            whiteSpace: "pre-wrap",
          }}
        >
          {typedText}
          <span
            style={{
              borderLeft: "2px solid var(--orange)",
              marginLeft: "2px",
              animation: "blink 1s infinite",
            }}
          />
        </div>

        {/* Illustration*/}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginTop: "-24px",
          }}
        >
          <div
            style={{
              width: "220px",
              height: "220px",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                width: "200px",
                height: "200px",
                borderRadius: "50%",
                border: "1px solid rgba(239,68,68,0.15)",
              }}
            />
            <div
              style={{
                position: "absolute",
                width: "150px",
                height: "150px",
                borderRadius: "50%",
                border: "1px solid rgba(239,68,68,0.1)",
              }}
            />
            <div
              style={{
                width: "180px",
                height: "180px",
                borderRadius: "50%",
                border: "2px dashed var(--red)",
                animation: "spin 8s linear infinite",
              }}
            />
            <div
              style={{
                position: "absolute",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <div
                style={{
                  fontSize: "24px",
                  color: "var(--red)",
                  fontWeight: 700,
                }}
              >
                ⚠
              </div>
              <div
                style={{
                  fontSize: "13px",
                  color: "var(--red)",
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                  textAlign: "center",
                  lineHeight: 1.4,
                }}
              >
                GRIDLOCK
                <br />
                DETECTED
              </div>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <p
          style={{
            margin: 0,
            fontSize: "12px",
            color: "var(--text-3)",
            fontFamily: "var(--font-display)",
            lineHeight: 1.5,
            flexShrink: 0,
          }}
        >
          Access is restricted to students with an approved university email.
        </p>
      </div>

      {/* Right: form panel */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px",
        }}
      >
        <div style={{ width: "100%", maxWidth: "380px" }}>
          {/* Form heading */}
          <h2
            style={{
              margin: "0 0 4px",
              fontSize: "28px",
              fontWeight: 800,
              fontFamily: "var(--font-display)",
              color: "var(--text-1)",
            }}
          >
            {tab === "login" ? "Sign in" : "Create account"}
          </h2>
          <p
            style={{
              margin: "0 0 32px",
              fontSize: "15px",
              color: "var(--text-3)",
              fontFamily: "var(--font-display)",
            }}
          >
            {tab === "login"
              ? "Welcome back. Enter your credentials to continue."
              : "Use the university email you submitted in the sign-up form."}
          </p>

          {/* Tabs */}
          <div
            style={{
              display: "flex",
              gap: "24px",
              borderBottom: "1px solid var(--border-dim)",
              marginBottom: "32px",
            }}
          >
            <button
              type="button"
              style={tabBtn(tab === "login")}
              onClick={() => {
                setTab("login");
                setError("");
              }}
            >
              Sign in
            </button>
            <button
              type="button"
              style={tabBtn(tab === "register")}
              onClick={() => {
                setTab("register");
                setError("");
              }}
            >
              Register
            </button>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: "20px" }}
          >
            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@university.edu"
                style={inputStyle}
                autoComplete="email"
              />
            </div>

            <div>
              <label style={labelStyle}>Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={
                  tab === "register" ? "Min. 8 characters" : "Password"
                }
                style={inputStyle}
                autoComplete={
                  tab === "login" ? "current-password" : "new-password"
                }
              />
            </div>

            {tab === "register" && (
              <div>
                <label style={labelStyle}>Confirm password</label>
                <input
                  type="password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat password"
                  style={inputStyle}
                  autoComplete="new-password"
                />
              </div>
            )}

            {error && (
              <div
                style={{
                  padding: "10px 14px",
                  background: "rgba(239,68,68,0.08)",
                  borderLeft: "3px solid #f87171",
                  color: "#f87171",
                  fontSize: "14px",
                  fontFamily: "var(--font-display)",
                  borderRadius: "0 6px 6px 0",
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: "4px",
                width: "100%",
                padding: "13px",
                background: loading ? "var(--orange-dim)" : "var(--orange)",
                border: "none",
                borderRadius: "8px",
                color: "#fff",
                fontFamily: "var(--font-display)",
                fontSize: "15px",
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
                transition: "opacity 0.15s",
              }}
            >
              {loading
                ? "Please wait..."
                : tab === "login"
                  ? "Sign in"
                  : "Create account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
