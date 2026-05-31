import { useState, useEffect } from "react";

// ─── EXCLUSIVE OFFICIAL FRAMEWORKS DATABASE ─────────────
const FRAMEWORK_DOCS = [
  {
    id: "owasp-ml02",
    framework: "OWASP",
    code: "ML02:2023",
    title: "Data Poisoning Attack",
    lab: "Lab 1 · Data Ingestion",
    color: "orange",
    url: "https://owasp.org/www-project-machine-learning-security-top-10/",
    summary: "Attackers manipulate training data or live data feeds, injecting malicious examples to corrupt the Machine Learning model's logic and behavior.",
    cityFlowContext: "In Lab 1, the attacker injected readings of '-5000 cars'. Lacking input validation (Sanity Checks), the model ingested this 'poisoned reality' and collapsed the traffic grid.",
    mitigations: [
      "Implement strict range validation (Sanity Checks) at ingestion nodes.",
      "Deploy statistical anomaly detection (Z-Score, Isolation Forests).",
      "Monitor Model/Data Drift to halt toxic retraining cycles."
    ]
  },
  {
    id: "owasp-llm01",
    framework: "OWASP",
    code: "LLM01:2025",
    title: "Prompt Injection",
    lab: "Lab 2 · Input Handling",
    color: "blue",
    url: "https://owasp.org/www-project-top-10-for-large-language-model-applications/",
    summary: "An attacker manipulates LLM inputs via malicious instructions (direct or indirect) that the model executes, overriding its original security guidelines.",
    cityFlowContext: "In Lab 2, the RAG Tutor was tricked using a camouflaged 'ignore previous instructions' command, causing it to leak the master database password.",
    mitigations: [
      "Structurally separate the 'System Prompt' from 'User Input' using role-based APIs.",
      "Sanitize user inputs by detecting evasion patterns before forwarding them to the model.",
      "Apply least privilege: do not include system secrets in the LLM's context window."
    ]
  },
  {
    id: "owasp-ml06",
    framework: "OWASP",
    code: "ML06:2023",
    title: "AI Supply Chain Attacks",
    lab: "Lab 3 · Model Training",
    color: "purple",
    url: "https://owasp.org/www-project-machine-learning-security-top-10/",
    summary: "Compromise of dependencies, pre-trained weights, or third-party datasets that the AI system imports and implicitly trusts.",
    cityFlowContext: "Downloading a pre-trained model from a public repository without verifying its integrity (hash) allows the deployment of models with undetectable backdoors.",
    mitigations: [
      "Strict cryptographic verification (SHA-256 Hashes) of all downloaded weights and libraries.",
      "Scan models for backdoor signatures prior to production deployment.",
      "Maintain an immutable provenance registry (MLOps Lineage)."
    ]
  },
  {
    id: "owasp-llm02",
    framework: "OWASP",
    code: "LLM02:2025",
    title: "Insecure Output Handling",
    lab: "Lab 4 · Output Serving",
    color: "green",
    url: "https://owasp.org/www-project-top-10-for-large-language-model-applications/",
    summary: "Occurs when a downstream plugin or system blindly accepts LLM output, enabling Cross-Site Scripting (XSS), privilege escalation, or remote command execution.",
    cityFlowContext: "If the CityFlow dashboard directly renders the AI Tutor's diagnostic in HTML without sanitization, a prior injection attack can trigger an XSS in the operator's browser.",
    mitigations: [
      "Always treat model output as 'Zero Trust' (Untrusted data).",
      "Enforce structured outputs (JSON) and validate them against a strict schema.",
      "Apply output Guardrails to filter sensitive patterns or executable code."
    ]
  },
  {
    id: "mitre-t0020",
    framework: "MITRE ATLAS",
    code: "AML.T0020",
    title: "Poison Training Data",
    lab: "Reference",
    color: "gray",
    url: "https://atlas.mitre.org/techniques/AML.T0020/",
    summary: "Adversaries modify training data to inject vulnerabilities, degrade performance, or install backdoors that activate under specific conditions.",
    cityFlowContext: "This MITRE tactic directly maps to the strategy used by the attacking script in Lab 1, which flooded the city's MQTT bus with contaminated data.",
    mitigations: [
      "Robust statistical filters (Data Sanitization).",
      "Anomaly detection based on historical data distributions.",
      "Mandatory human review for anomalous or out-of-distribution (OOD) data."
    ]
  }
];

// ─── COLOR PALETTE BY FRAMEWORK ─────────────
const COLORS = {
  orange: { bg: "rgba(249,115,22,0.1)", border: "var(--orange)", text: "var(--orange)" },
  blue: { bg: "rgba(56,189,248,0.1)", border: "var(--blue)", text: "var(--blue)" },
  purple: { bg: "rgba(167,139,250,0.1)", border: "#a78bfa", text: "#a78bfa" },
  green: { bg: "rgba(74,222,128,0.1)", border: "#4ade80", text: "#4ade80" },
  gray: { bg: "rgba(156,163,175,0.1)", border: "var(--text-3)", text: "var(--text-2)" },
};

// ─── COMPONENT: PREVIEW CARD ─────────────
function FrameworkCard({ doc, onClick }) {
  const c = COLORS[doc.color];
  const isOwasp = doc.framework === "OWASP";

  return (
    <button
      onClick={onClick}
      style={{
        textAlign: "left",
        background: "var(--bg-panel)",
        border: "1px solid var(--border-dim)",
        borderRadius: "14px",
        padding: "24px",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        height: "100%",
        boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
        transition: "all 0.2s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.borderColor = c.border;
        e.currentTarget.style.boxShadow = `0 8px 30px ${c.bg}`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.borderColor = "var(--border-dim)";
        e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.15)";
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <span style={{
            fontSize: "12px", fontWeight: 800, fontFamily: "var(--font-mono)",
            color: isOwasp ? "var(--text-1)" : c.text,
            background: isOwasp ? "rgba(255,255,255,0.1)" : c.bg,
            padding: "4px 10px", borderRadius: "20px", width: "fit-content"
          }}>
            {doc.framework}
          </span>
          <span style={{ fontSize: "24px", fontWeight: 800, color: c.text, fontFamily: "var(--font-display)" }}>
            {doc.code}
          </span>
        </div>
      </div>

      <div>
        <h3 style={{ fontSize: "18px", margin: "0 0 8px 0", color: "var(--text-1)" }}>{doc.title}</h3>
        <p style={{ fontSize: "14px", color: "var(--text-3)", margin: 0, lineHeight: 1.65, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden", fontFamily: "var(--font-display)" }}>
          {doc.summary}
        </p>
      </div>

      <div style={{ marginTop: "auto", paddingTop: "16px", borderTop: "1px solid var(--border-dim)", display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontSize: "14px" }}>🔬</span>
        <span style={{ fontSize: "13px", color: "var(--text-2)", fontFamily: "var(--font-display)" }}>{doc.lab}</span>
      </div>
    </button>
  );
}

// ─── COMPONENT: DETAILED FRAMEWORK VIEW ─────────────
function DocDetailView({ doc, onBack }) {
  const c = COLORS[doc.color];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflowY: "auto", background: "var(--bg-base)" }}>
      {/* Floating Top Bar */}
      <div style={{ position: "sticky", top: 0, padding: "16px 24px", background: "rgba(15,23,42,0.85)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--border-dim)", zIndex: 10, display: "flex", alignItems: "center" }}>
        <button onClick={onBack} style={{ background: "var(--bg-panel)", border: "1px solid var(--border-dim)", borderRadius: "8px", padding: "8px 16px", color: "var(--text-1)", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", fontWeight: 600, fontSize: "14px", fontFamily: "var(--font-display)" }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
            <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to Threat Center
        </button>
      </div>

      <div style={{ padding: "40px", maxWidth: "800px", margin: "0 auto", width: "100%" }}>
        {/* Document Header */}
        <div style={{ marginBottom: "40px" }}>
          <span style={{ fontSize: "12px", fontWeight: 800, fontFamily: "var(--font-mono)", color: c.text }}>
            {doc.framework} STANDARD REFERENCE
          </span>
          <h1 style={{ fontSize: "42px", margin: "12px 0", color: "var(--text-1)", fontFamily: "var(--font-display)", lineHeight: 1.1 }}>
            <span style={{ color: c.text }}>{doc.code}</span> <br/> {doc.title}
          </h1>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "rgba(255,255,255,0.05)", padding: "6px 14px", borderRadius: "8px", border: "1px solid var(--border-dim)", color: "var(--text-2)", fontSize: "12px", fontFamily: "var(--font-mono)" }}>
            <span>🔬 Seen in:</span> <strong style={{ color: "var(--text-1)" }}>{doc.lab}</strong>
          </div>
        </div>

        {/* Main Content */}
        <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
          <section>
            <h2 style={{ fontSize: "18px", color: "var(--text-1)", borderBottom: "1px solid var(--border-dim)", paddingBottom: "8px", marginBottom: "16px" }}>Vulnerability Description</h2>
            <p style={{ fontSize: "15px", color: "var(--text-2)", lineHeight: 1.8 }}>{doc.summary}</p>
          </section>

          <section style={{ background: c.bg, borderLeft: `4px solid ${c.border}`, padding: "20px", borderRadius: "0 8px 8px 0" }}>
            <h2 style={{ fontSize: "16px", color: c.text, margin: "0 0 12px 0", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>⚠️</span> Connection to CityFlow Lab
            </h2>
            <p style={{ fontSize: "14px", color: "var(--text-1)", margin: 0, lineHeight: 1.7 }}>{doc.cityFlowContext}</p>
          </section>

          <section>
            <h2 style={{ fontSize: "18px", color: "var(--text-1)", borderBottom: "1px solid var(--border-dim)", paddingBottom: "8px", marginBottom: "16px" }}>Official Mitigation Strategies</h2>
            <ul style={{ paddingLeft: "20px", margin: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
              {doc.mitigations.map((mitigation, idx) => (
                <li key={idx} style={{ fontSize: "14px", color: "var(--text-2)", lineHeight: 1.6 }}>{mitigation}</li>
              ))}
            </ul>
          </section>

          {/* External Link */}
          <div style={{ marginTop: "20px", paddingTop: "32px", borderTop: "1px solid var(--border-dim)", textAlign: "center" }}>
            <a href={doc.url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "10px", background: "transparent", border: `1px solid ${c.text}`, color: c.text, padding: "12px 24px", borderRadius: "8px", textDecoration: "none", fontSize: "14px", fontWeight: "bold", transition: "all 0.2s" }}
               onMouseEnter={(e) => { e.currentTarget.style.background = c.bg; }}
               onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
              Read full documentation at {doc.framework} ↗
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
  function normalizeDocId(value) {
  if (!value) return null;

  // Si ya viene como "owasp-ml02"
  if (!String(value).includes("?") && !String(value).includes("/")) {
    return value;
  }

  // Si viene como "/docs?id=owasp-ml02"
  try {
    const url = new URL(value, window.location.origin);
    return url.searchParams.get("id");
  } catch {
    return null;
  }
}

function getDocById(docId) {
  if (!docId) return null;
  return FRAMEWORK_DOCS.find((doc) => doc.id === docId) || null;
}

function getDocIdFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("id");
}

export default function DocsPage({ initialDocPath = null, initialDocId = null }) {
  const requestedDocId =
    normalizeDocId(initialDocId) ||
    normalizeDocId(initialDocPath) ||
    getDocIdFromUrl();

  const [activeDoc, setActiveDoc] = useState(() => getDocById(requestedDocId));

  useEffect(() => {
    const nextDocId =
      normalizeDocId(initialDocId) ||
      normalizeDocId(initialDocPath) ||
      getDocIdFromUrl();

    setActiveDoc(getDocById(nextDocId));
  }, [initialDocId, initialDocPath]);

  useEffect(() => {
    function syncDocFromUrl() {
      setActiveDoc(getDocById(getDocIdFromUrl()));
    }

    window.addEventListener("popstate", syncDocFromUrl);

    return () => {
      window.removeEventListener("popstate", syncDocFromUrl);
    };
  }, []);


    if (activeDoc) {
      return (
        <DocDetailView
          doc={activeDoc}
          onBack={() => {
            window.history.pushState({}, "", "/docs");
            setActiveDoc(null);
          }}
        />
      );
    }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflowY: "auto", background: "var(--bg-base)" }}>
      {/* Main Header */}
      <div style={{ padding: "40px 40px 20px", background: "linear-gradient(to bottom, var(--bg-panel), var(--bg-base))", borderBottom: "1px solid var(--border-dim)" }}>
        <h1 style={{ margin: "0 0 10px 0", fontSize: "36px", fontWeight: 800, fontFamily: "var(--font-display)", color: "var(--text-1)", display: "flex", alignItems: "center", gap: "12px" }}>
          Threat Intelligence Center
        </h1>
        <p style={{ margin: "0 0 20px 0", fontSize: "15px", color: "var(--text-2)", fontFamily: "var(--font-display)", lineHeight: 1.65 }}>
          Official repository of Artificial Intelligence vulnerabilities. All CityFlow labs are mapped and audited against international industry standards (OWASP and MITRE).
        </p>
      </div>

      {/* Cards Grid */}
      <div style={{ padding: "40px", flex: 1 }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
          gap: "24px"
        }}>
          {FRAMEWORK_DOCS.map((doc) => (
            <FrameworkCard
            key={doc.id}
            doc={doc}
            onClick={() => {
              window.history.pushState({}, "", `/docs?id=${doc.id}`);
              setActiveDoc(doc);
            }}
          />
          ))}
        </div>
      </div>
    </div>
  );
}