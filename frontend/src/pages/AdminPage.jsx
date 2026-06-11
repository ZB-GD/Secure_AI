import { useCallback, useEffect, useState } from "react";
import { request } from "../services/apiClient";

export default function AdminPage() {
  const [tab, setTab] = useState("whitelist");
  const [whitelist, setWhitelist] = useState([]);
  const [users, setUsers] = useState([]);
  const [bulkInput, setBulkInput] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchWhitelist = useCallback(async () => {
    try {
      const data = await request("/auth/admin/whitelist");
      setWhitelist(data);
    } catch (e) {
      setFeedback(`Error: ${e.message}`);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const data = await request("/auth/admin/users");
      setUsers(data);
    } catch (e) {
      setFeedback(`Error: ${e.message}`);
    }
  }, []);

  useEffect(() => {
    fetchWhitelist();
    fetchUsers();
  }, [fetchWhitelist, fetchUsers]);

  async function handleAddEmails(e) {
    e.preventDefault();
    setFeedback("");
    const emails = bulkInput
      .split(/[\n,]+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (!emails.length) return;
    setLoading(true);
    try {
      const res = await request("/auth/admin/whitelist", {
        method: "POST",
        body: JSON.stringify({ emails }),
      });
      setFeedback(`Added ${res.added} email(s) to the approved list.`);
      setBulkInput("");
      fetchWhitelist();
    } catch (err) {
      setFeedback(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(email) {
    setFeedback("");
    try {
      await request(`/auth/admin/whitelist/${encodeURIComponent(email)}`, { method: "DELETE" });
      setFeedback(`Removed ${email} from the approved list.`);
      fetchWhitelist();
    } catch (err) {
      setFeedback(`Error: ${err.message}`);
    }
  }

  async function handleDeleteUser(username, email) {
    const message = email
      ? `Delete user "${username}"? This also removes ${email} from the approved list.`
      : `Delete user "${username}"?`;
    if (!window.confirm(message)) return;
    setFeedback("");
    try {
      const res = await request(`/auth/admin/users/${encodeURIComponent(username)}`, { method: "DELETE" });
      setFeedback(
        `Deleted user ${res.deleted}.${res.email_removed_from_whitelist ? " Email removed from approved list." : ""}`
      );
      fetchUsers();
      fetchWhitelist();
    } catch (err) {
      setFeedback(`Error: ${err.message}`);
    }
  }

  const tabBtn = (active) => ({
    padding: "14px 24px",
    border: "none",
    background: "transparent",
    color: active ? "var(--text-1)" : "var(--text-3)",
    fontFamily: "var(--font-display)",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    borderBottom: active ? "2px solid var(--orange)" : "2px solid transparent",
    marginBottom: "-1px",
    transition: "all 0.15s",
  });

  const sectionLabel = {
    fontFamily: "var(--font-display)",
    fontSize: "12px",
    fontWeight: 700,
    color: "var(--text-3)",
    textTransform: "uppercase",
    marginBottom: "20px",
    display: "block",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflowY: "auto", background: "var(--bg-base)" }}>

      {/* Header */}
      <div style={{
        padding: "40px 40px 0",
        background: "linear-gradient(to bottom, var(--bg-panel), var(--bg-base))",
        borderBottom: "1px solid var(--border-dim)",
      }}>
        <h1 style={{
          margin: "0 0 8px 0",
          fontSize: "36px",
          fontWeight: 800,
          fontFamily: "var(--font-display)",
          color: "var(--text-1)",
        }}>
          Admin Panel
        </h1>
        <p style={{
          margin: "0 0 28px 0",
          fontSize: "15px",
          color: "var(--text-3)",
          fontFamily: "var(--font-display)",
          lineHeight: 1.6,
        }}>
          Manage student access and registered accounts.
        </p>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "4px" }}>
          <button type="button" style={tabBtn(tab === "whitelist")} onClick={() => setTab("whitelist")}>
            Approved Emails ({whitelist.length})
          </button>
          <button type="button" style={tabBtn(tab === "users")} onClick={() => setTab("users")}>
            Registered Users ({users.length})
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "40px", flex: 1 }}>

        {/* Feedback banner */}
        {feedback && (
          <div style={{
            padding: "10px 16px",
            background: feedback.startsWith("Error") ? "rgba(239,68,68,0.08)" : "rgba(34,197,94,0.08)",
            borderLeft: `3px solid ${feedback.startsWith("Error") ? "#f87171" : "#4ade80"}`,
            color: feedback.startsWith("Error") ? "#f87171" : "#4ade80",
            fontSize: "14px",
            fontFamily: "var(--font-display)",
            marginBottom: "32px",
            borderRadius: "0 6px 6px 0",
          }}>
            {feedback}
          </div>
        )}

        {/* Whitelist tab */}
        {tab === "whitelist" && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "64px",
            alignItems: "start",
          }}>

            {/* Left: Add form */}
            <div>
              <span style={sectionLabel}>Add Approved Emails</span>
              <form onSubmit={handleAddEmails} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <span style={{ fontFamily: "var(--font-display)", fontSize: "14px", color: "var(--text-3)" }}>
                  One email per line, or comma-separated
                </span>
                <textarea
                  rows={5}
                  value={bulkInput}
                  onChange={(e) => setBulkInput(e.target.value)}
                  placeholder={"student1@uni.edu\nstudent2@uni.edu"}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    background: "rgba(15,23,42,0.6)",
                    border: "1px solid var(--border-dim)",
                    borderRadius: "8px",
                    color: "var(--text-1)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "13px",
                    outline: "none",
                    boxSizing: "border-box",
                    resize: "vertical",
                  }}
                />
                <button
                  type="submit"
                  disabled={loading || !bulkInput.trim()}
                  style={{
                    padding: "10px 20px",
                    background: "var(--orange)",
                    border: "none",
                    borderRadius: "8px",
                    color: "#fff",
                    fontFamily: "var(--font-display)",
                    fontSize: "14px",
                    fontWeight: 600,
                    cursor: loading || !bulkInput.trim() ? "not-allowed" : "pointer",
                    opacity: loading || !bulkInput.trim() ? 0.5 : 1,
                    transition: "opacity 0.15s",
                    alignSelf: "flex-start",
                  }}
                >
                  {loading ? "Adding..." : "Add to list"}
                </button>
              </form>
            </div>

            {/* Right: Approved list */}
            <div>
              <span style={sectionLabel}>Approved List ({whitelist.length})</span>
              {whitelist.length === 0 ? (
                <p style={{ color: "var(--text-3)", fontFamily: "var(--font-display)", fontSize: "14px", margin: 0 }}>
                  No approved emails yet.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {/* Table header */}
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 140px 80px",
                    padding: "8px 0",
                    borderBottom: "1px solid var(--border-dim)",
                    marginBottom: "4px",
                  }}>
                    {["Email", "Added", ""].map((h) => (
                      <span key={h} style={{ fontFamily: "var(--font-display)", fontSize: "12px", fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase" }}>
                        {h}
                      </span>
                    ))}
                  </div>
                  {whitelist.map(({ email, added_at }) => (
                    <div
                      key={email}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 140px 80px",
                        alignItems: "center",
                        padding: "12px 0",
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                      }}
                    >
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--text-1)" }}>
                        {email}
                      </span>
                      <span style={{ fontFamily: "var(--font-display)", fontSize: "13px", color: "var(--text-3)" }}>
                        {added_at?.split("T")[0] ?? added_at}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemove(email)}
                        style={{
                          padding: "4px 10px",
                          background: "transparent",
                          border: "1px solid rgba(239,68,68,0.3)",
                          borderRadius: "5px",
                          color: "#f87171",
                          fontFamily: "var(--font-display)",
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor: "pointer",
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.1)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Users tab */}
        {tab === "users" && (
          <div>
            <span style={sectionLabel}>Registered Accounts ({users.length})</span>
            {users.length === 0 ? (
              <p style={{ color: "var(--text-3)", fontFamily: "var(--font-display)", fontSize: "14px", margin: 0 }}>
                No registered users yet.
              </p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-display)", fontSize: "14px" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border-dim)" }}>
                      {["Username", "Email", "Role", "Joined", ""].map((h) => (
                        <th
                          key={h}
                          style={{
                            textAlign: "left",
                            padding: "8px 40px 8px 0",
                            color: "var(--text-3)",
                            fontWeight: 700,
                            fontSize: "12px",
                            textTransform: "uppercase",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(({ username, email, role, created_at }) => (
                      <tr key={username} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                        <td style={{ padding: "14px 40px 14px 0", color: "var(--text-1)", fontFamily: "var(--font-mono)", fontSize: "13px" }}>
                          {username}
                        </td>
                        <td style={{ padding: "14px 40px 14px 0", color: "var(--text-3)", fontFamily: "var(--font-mono)", fontSize: "13px" }}>
                          {email || "—"}
                        </td>
                        <td style={{ padding: "14px 40px 14px 0" }}>
                          <span style={{
                            padding: "3px 10px",
                            borderRadius: "4px",
                            background: role === "admin" ? "rgba(249,115,22,0.12)" : "rgba(56,189,248,0.08)",
                            color: role === "admin" ? "var(--orange)" : "var(--blue)",
                            fontSize: "12px",
                            fontWeight: 600,
                          }}>
                            {role.charAt(0).toUpperCase() + role.slice(1)}
                          </span>
                        </td>
                        <td style={{ padding: "14px 40px 14px 0", color: "var(--text-3)" }}>
                          {created_at?.split("T")[0] ?? created_at}
                        </td>
                        <td style={{ padding: "14px 0" }}>
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(username, email)}
                            style={{
                              padding: "4px 10px",
                              background: "transparent",
                              border: "1px solid rgba(239,68,68,0.3)",
                              borderRadius: "5px",
                              color: "#f87171",
                              fontFamily: "var(--font-display)",
                              fontSize: "12px",
                              fontWeight: 600,
                              cursor: "pointer",
                              transition: "background 0.15s",
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.1)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
