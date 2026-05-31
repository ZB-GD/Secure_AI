import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { request } from "../services/apiClient";

const inputStyle = {
  width: "100%",
  padding: "9px 12px",
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
  fontSize: "12px",
  fontWeight: 700,
  textTransform: "uppercase",
  color: "var(--text-3)",
  fontFamily: "var(--font-display)",
  marginBottom: "6px",
};

const sectionLabel = {
  fontSize: "12px",
  fontWeight: 700,
  textTransform: "uppercase",
  color: "var(--text-3)",
  fontFamily: "var(--font-display)",
  marginBottom: "16px",
};

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === "admin";
  const initial = user?.email?.[0]?.toUpperCase() || "?";

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);

  async function handleChangePassword(e) {
    e.preventDefault();
    setPwError("");
    setPwSuccess(false);
    if (newPw !== confirmPw) {
      setPwError("New passwords do not match.");
      return;
    }
    if (newPw.length < 8) {
      setPwError("New password must be at least 8 characters.");
      return;
    }
    setPwLoading(true);
    try {
      await request("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ current_password: currentPw, new_password: newPw }),
      });
      setPwSuccess(true);
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (err) {
      setPwError(err.message);
    } finally {
      setPwLoading(false);
    }
  }

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: "var(--bg-base)",
      }}
    >
      {/* Compact header */}
      <div
        style={{
          background: "linear-gradient(to bottom, var(--bg-panel), var(--bg-base))",
          borderBottom: "1px solid var(--border-dim)",
          padding: "24px 40px",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: "18px",
        }}
      >
        <div
          style={{
            width: "52px",
            height: "52px",
            borderRadius: "50%",
            background: "var(--orange-dim)",
            border: "2px solid var(--orange-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: "0 0 20px rgba(249,115,22,0.12)",
          }}
        >
          <span style={{ color: "var(--orange)", fontSize: "20px", fontWeight: 700, fontFamily: "var(--font-display)" }}>
            {initial}
          </span>
        </div>

        <div>
          <div style={{ fontSize: "18px", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--text-1)", marginBottom: "6px", wordBreak: "break-all" }}>
            {user?.email}
          </div>
          <span
            style={{
              display: "inline-block",
              padding: "3px 10px",
              borderRadius: "4px",
              background: isAdmin ? "rgba(249,115,22,0.12)" : "rgba(56,189,248,0.08)",
              color: isAdmin ? "var(--orange)" : "var(--blue)",
              fontSize: "12px",
              fontWeight: 600,
              fontFamily: "var(--font-display)",
            }}
          >
            {isAdmin ? "Admin" : "Student"}
          </span>
        </div>
      </div>

      {/* Two-column body */}
      <div
        style={{
          flex: 1,
          display: "flex",
          padding: "32px 40px",
          gap: "48px",
          overflow: "hidden",
        }}
      >
        {/* Left column: account info + session */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "32px" }}>
          <section>
            <div style={sectionLabel}>Account</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <div style={{ fontSize: "12px", color: "var(--text-3)", fontFamily: "var(--font-display)", marginBottom: "4px" }}>EMAIL</div>
                <div style={{ fontSize: "13px", color: "var(--text-1)", fontFamily: "var(--font-mono)", wordBreak: "break-all" }}>{user?.email}</div>
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "var(--text-3)", fontFamily: "var(--font-display)", marginBottom: "4px" }}>ROLE</div>
                <div style={{ fontSize: "13px", fontWeight: 600, fontFamily: "var(--font-display)", color: isAdmin ? "var(--orange)" : "var(--blue)" }}>
                  {isAdmin ? "Administrator" : "Student"}
                </div>
              </div>
            </div>
          </section>

          <section style={{ borderTop: "1px solid var(--border-dim)", paddingTop: "28px" }}>
            <div style={sectionLabel}>Session</div>
            <button
              type="button"
              onClick={logout}
              style={{
                padding: "9px 20px",
                background: "rgba(239,68,68,0.06)",
                border: "1px solid rgba(239,68,68,0.2)",
                borderRadius: "8px",
                color: "#f87171",
                fontFamily: "var(--font-display)",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.12)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.06)"; }}
            >
              Sign out
            </button>
          </section>
        </div>

        {/* Vertical divider */}
        <div style={{ width: "1px", background: "var(--border-dim)", flexShrink: 0 }} />

        {/* Right column: change password */}
        <div style={{ flex: 1 }}>
          <div style={sectionLabel}>Change password</div>
          <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <label style={labelStyle}>Current password</label>
              <input
                type="password"
                required
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                placeholder="Current password"
                style={inputStyle}
                autoComplete="current-password"
              />
            </div>
            <div>
              <label style={labelStyle}>New password</label>
              <input
                type="password"
                required
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="Min. 8 characters"
                style={inputStyle}
                autoComplete="new-password"
              />
            </div>
            <div>
              <label style={labelStyle}>Confirm new password</label>
              <input
                type="password"
                required
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                placeholder="Repeat new password"
                style={inputStyle}
                autoComplete="new-password"
              />
            </div>

            {pwError && (
              <div style={{ padding: "9px 12px", background: "rgba(239,68,68,0.08)", borderLeft: "3px solid #f87171", color: "#f87171", fontSize: "13px", fontFamily: "var(--font-display)", borderRadius: "0 6px 6px 0" }}>
                {pwError}
              </div>
            )}
            {pwSuccess && (
              <div style={{ padding: "9px 12px", background: "rgba(34,197,94,0.08)", borderLeft: "3px solid #4ade80", color: "#4ade80", fontSize: "13px", fontFamily: "var(--font-display)", borderRadius: "0 6px 6px 0" }}>
                Password updated successfully.
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={pwLoading}
                style={{
                  padding: "10px 20px",
                  background: pwLoading ? "var(--orange-dim)" : "var(--orange)",
                  border: "none",
                  borderRadius: "8px",
                  color: "#fff",
                  fontFamily: "var(--font-display)",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: pwLoading ? "not-allowed" : "pointer",
                  opacity: pwLoading ? 0.7 : 1,
                  transition: "opacity 0.15s",
                }}
              >
                {pwLoading ? "Updating..." : "Update password"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
