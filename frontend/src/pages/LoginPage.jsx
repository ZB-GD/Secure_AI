import { useState, useEffect, useRef } from "react";
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

function NodeCanvas() {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const rafRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const N = 58;
    const nodes = Array.from({ length: N }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.45,
      vy: (Math.random() - 0.5) * 0.45,
      r: Math.random() * 1.5 + 1.5,
      infected: false,
      infectedAt: -999,
    }));
    // Seed a small outbreak
    [3, 17, 34].forEach((i) => { nodes[i].infected = true; nodes[i].infectedAt = 0; });

    let tick = 0;

    function draw() {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      tick++;

      // Spread infection every ~2 s
      if (tick % 100 === 0) {
        nodes.filter((n) => n.infected).forEach((src) => {
          nodes.forEach((dst) => {
            if (!dst.infected) {
              const d = Math.hypot(src.x - dst.x, src.y - dst.y);
              if (d < 95 && Math.random() < 0.28) {
                dst.infected = true;
                dst.infectedAt = tick;
              }
            }
          });
        });
      }

      const mouse = mouseRef.current;

      // Update positions
      nodes.forEach((n) => {
        const dx = n.x - mouse.x;
        const dy = n.y - mouse.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 130 && dist > 0) {
          const f = ((130 - dist) / 130) * 0.9;
          n.vx += (dx / dist) * f;
          n.vy += (dy / dist) * f;
        }
        n.vx *= 0.97;
        n.vy *= 0.97;
        const spd = Math.hypot(n.vx, n.vy);
        if (spd > 1.8) { n.vx = (n.vx / spd) * 1.8; n.vy = (n.vy / spd) * 1.8; }
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0) { n.x = 0; n.vx *= -1; }
        if (n.x > W) { n.x = W; n.vx *= -1; }
        if (n.y < 0) { n.y = 0; n.vy *= -1; }
        if (n.y > H) { n.y = H; n.vy *= -1; }
      });

      // Draw edges
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 115) {
            const alpha = (1 - d / 115) * 0.28;
            const red = nodes[i].infected || nodes[j].infected;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = red
              ? `rgba(239,68,68,${alpha * 1.8})`
              : `rgba(249,115,22,${alpha * 0.9})`;
            ctx.lineWidth = 0.7;
            ctx.stroke();
          }
        }
      }

      // Draw nodes
      nodes.forEach((n) => {
        const fresh = n.infected && tick - n.infectedAt < 40;
        const glowR = n.infected ? n.r * (fresh ? 7 : 4) : n.r * 3;
        const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, glowR);
        if (n.infected) {
          g.addColorStop(0, `rgba(239,68,68,${fresh ? 0.45 : 0.2})`);
          g.addColorStop(1, "rgba(239,68,68,0)");
        } else {
          g.addColorStop(0, "rgba(249,115,22,0.18)");
          g.addColorStop(1, "rgba(249,115,22,0)");
        }
        ctx.beginPath();
        ctx.arc(n.x, n.y, glowR, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = n.infected ? "#ef4444" : "rgba(249,115,22,0.85)";
        ctx.fill();
      });

      rafRef.current = requestAnimationFrame(draw);
    }

    draw();

    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const onLeave = () => { mouseRef.current = { x: -9999, y: -9999 }; };
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseleave", onLeave);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    />
  );
}

export default function LoginPage() {
  const { login } = useAuth();
  const [tab, setTab] = useState("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (tab === "register" && password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      if (tab === "login") {
        const data = await callAuth("/auth/login", { username, password });
        login(data.access_token, { username: data.email, role: data.role });
      } else {
        await callAuth("/auth/register", { username, email, password });
        setTab("login");
        setUsername(""); setEmail(""); setPassword(""); setConfirm("");
        setError("");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = (name) => ({
    width: "100%",
    padding: "11px 14px",
    background: "rgba(5,8,15,0.6)",
    border: `1px solid ${focused === name ? "rgba(249,115,22,0.5)" : "rgba(255,255,255,0.08)"}`,
    borderRadius: "8px",
    color: "var(--text-1)",
    fontFamily: "var(--font-mono)",
    fontSize: "13px",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.15s, box-shadow 0.15s",
    boxShadow: focused === name ? "0 0 0 3px rgba(249,115,22,0.08)" : "none",
  });

  const labelStyle = {
    display: "block",
    fontSize: "11px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "var(--text-3)",
    fontFamily: "var(--font-display)",
    marginBottom: "7px",
  };

  const tabBtn = (active) => ({
    padding: "10px 0",
    border: "none",
    background: "transparent",
    color: active ? "var(--text-1)" : "var(--text-3)",
    fontFamily: "var(--font-display)",
    fontSize: "14px",
    fontWeight: active ? 700 : 400,
    cursor: "pointer",
    borderBottom: active ? "2px solid var(--orange)" : "2px solid transparent",
    marginBottom: "-1px",
    transition: "all 0.15s",
  });

  return (
    <div style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "1fr 1fr", background: "var(--bg-base)" }}>

      {/* ── LEFT: interactive canvas panel ──────────────────────────── */}
      <div style={{
        position: "relative",
        borderRight: "1px solid var(--border-dim)",
        background: "#05080f",
        overflow: "hidden",
      }}>
        <NodeCanvas />

        {/* Bottom gradient for text readability */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "linear-gradient(to top, rgba(5,8,15,0.96) 0%, rgba(5,8,15,0.55) 45%, transparent 100%)",
        }} />

        {/* Content on top of canvas */}
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          textAlign: "center",
          padding: "36px 44px",
          pointerEvents: "none",
        }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: 32 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 8,
              background: "var(--orange-dim)", border: "1px solid var(--orange-border)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 14px rgba(249,115,22,0.2)",
            }}>
              <span style={{ color: "var(--orange)", fontSize: 10, fontWeight: 700, fontFamily: "var(--font-mono)" }}>AI</span>
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--text-1)" }}>
                SEC<span style={{ color: "var(--orange)" }}>LABS</span>
              </div>
              <div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.07em" }}>
                AI SECURITY TRAINING
              </div>
            </div>
          </div>

          <h1 style={{
            margin: "0 0 14px", fontSize: 34, fontWeight: 800, lineHeight: 1.2,
            fontFamily: "var(--font-display)", color: "var(--text-1)",
          }}>
            Learn to defend AI systems<br />
            <span style={{ color: "var(--orange)" }}>against real-world threats.</span>
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-3)", fontFamily: "var(--font-display)", lineHeight: 1.6 }}>
            Hands-on labs. Real attack scenarios. AI-guided feedback.
          </p>
        </div>
      </div>

      {/* ── RIGHT: auth form ──────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "48px", background: "var(--bg-panel)",
      }}>
        <div style={{ width: "100%", maxWidth: 360 }}>
          <h2 style={{ margin: "0 0 4px", fontSize: 26, fontWeight: 800, fontFamily: "var(--font-display)", color: "var(--text-1)" }}>
            {tab === "login" ? "Sign in" : "Create account"}
          </h2>
          <p style={{ margin: "0 0 28px", fontSize: 13, color: "var(--text-3)", fontFamily: "var(--font-display)" }}>
            {tab === "login"
              ? "Welcome back. Enter your credentials to continue."
              : "Fill in the details to create a new user account."}
          </p>

          <div style={{ display: "flex", gap: "24px", borderBottom: "1px solid var(--border-dim)", marginBottom: "28px" }}>
            <button type="button" style={tabBtn(tab === "login")} onClick={() => { setTab("login"); setError(""); }}>Sign in</button>
            <button type="button" style={tabBtn(tab === "register")} onClick={() => { setTab("register"); setError(""); }}>Register</button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <div>
              <label style={labelStyle}>Username</label>
              <input
                type="text" required value={username}
                onChange={(e) => setUsername(e.target.value)}
                onFocus={() => setFocused("username")} onBlur={() => setFocused(null)}
                placeholder="e.g. user01"
                style={inputStyle("username")} autoComplete="username"
              />
            </div>
            {tab === "register" && (
              <div>
                <label style={labelStyle}>Email</label>
                <input
                  type="email" required value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocused("email")} onBlur={() => setFocused(null)}
                  placeholder="you@university.edu"
                  style={inputStyle("email")} autoComplete="email"
                />
              </div>
            )}
            <div>
              <label style={labelStyle}>Password</label>
              <input
                type="password" required value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocused("password")} onBlur={() => setFocused(null)}
                placeholder={tab === "register" ? "Min. 8 characters" : "Password"}
                style={inputStyle("password")}
                autoComplete={tab === "login" ? "current-password" : "new-password"}
              />
            </div>
            {tab === "register" && (
              <div>
                <label style={labelStyle}>Confirm password</label>
                <input
                  type="password" required value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  onFocus={() => setFocused("confirm")} onBlur={() => setFocused(null)}
                  placeholder="Repeat password"
                  style={inputStyle("confirm")} autoComplete="new-password"
                />
              </div>
            )}
            {error && (
              <div style={{
                padding: "10px 14px", background: "rgba(239,68,68,0.08)",
                borderLeft: "3px solid #f87171", color: "#f87171",
                fontSize: 13, fontFamily: "var(--font-display)", borderRadius: "0 6px 6px 0",
              }}>
                {error}
              </div>
            )}
            <button
              type="submit" disabled={loading}
              style={{
                marginTop: "4px", width: "100%", padding: "13px",
                background: loading ? "var(--orange-dim)" : "var(--orange)",
                border: "none", borderRadius: "8px", color: "#fff",
                fontFamily: "var(--font-display)", fontSize: "14px", fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
                transition: "opacity 0.15s, box-shadow 0.15s",
                boxShadow: loading ? "none" : "0 0 20px rgba(249,115,22,0.2)",
              }}
            >
              {loading ? "Please wait…" : tab === "login" ? "Sign in →" : "Create account →"}
            </button>
          </form>
        </div>
      </div>

    </div>
  );
}
