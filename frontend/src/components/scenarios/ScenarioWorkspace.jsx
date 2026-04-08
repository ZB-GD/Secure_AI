import { useState, useEffect } from "react";

function HUDMetric({ label, value, status = "normal" }) {
  const color = status === "critical" ? "var(--red)" : "var(--orange)";
  return (
    <div style={{ padding: '12px', border: `1px solid var(--border-dim)`, background: 'rgba(255,255,255,0.02)' }}>
      <div style={{ fontSize: '9px', color: 'var(--text-3)', letterSpacing: '0.1em', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '18px', fontWeight: '700', color: color, fontFamily: 'var(--font-display)' }}>{value}</div>
    </div>
  );
}

function ScenarioZeroWorkspace({ item, onComplete }) {
  const [text, setText] = useState("");
  const fullText = item.story.context;

  // Efecto de escritura automática para el briefing
  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      setText(fullText.slice(0, i));
      i++;
      if (i > fullText.length) clearInterval(timer);
    }, 15);
    return () => clearInterval(timer);
  }, [fullText]);

  return (
    <section style={{
      height: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px",
      background: "radial-gradient(circle at center, #0c1525 0%, #05080f 100%)",
      position: "relative",
      overflow: "hidden"
    }} className="animate-scanline">
      
      {/* Elementos Decorativos de Fondo */}
      <div style={{ position: 'absolute', top: '10%', right: '5%', width: '300px', height: '300px', border: '1px solid rgba(56,189,248,0.05)', borderRadius: '50%' }} />
      <div style={{ position: 'absolute', bottom: '-5%', left: '10%', width: '200px', height: '200px', border: '1px solid rgba(249,115,22,0.05)', borderRadius: '50%' }} />

      <div style={{ maxWidth: "1000px", width: "100%", zIndex: 10 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '40px' }}>
          
          {/* Columna Izquierda: El Mensaje */}
          <div>
            <div style={{ display: 'inline-block', padding: '4px 12px', background: 'var(--red-dim)', border: '1px solid var(--red)', borderRadius: '4px', marginBottom: '20px' }}>
               <span style={{ fontSize: '10px', color: 'var(--red)', fontWeight: '700', letterSpacing: '0.2em' }}>INCOMING SECURITY BRIEFING</span>
            </div>
            
            <h1 style={{ fontSize: '48px', fontFamily: 'var(--font-display)', color: 'var(--text-1)', lineHeight: '1.1', marginBottom: '24px' }}>
              Aegis is no longer <br /> <span style={{ color: 'var(--orange)' }}>under our control.</span>
            </h1>

            <div style={{ 
              background: 'rgba(12,17,32,0.6)', 
              padding: '24px', 
              borderRadius: '8px', 
              border: '1px solid var(--border-mid)',
              minHeight: '160px',
              fontFamily: 'var(--font-mono)',
              fontSize: '14px',
              lineHeight: '1.8',
              color: 'var(--text-2)'
            }}>
              {text}<span style={{ borderLeft: '2px solid var(--orange)', marginLeft: '4px', animation: 'blink 1s infinite' }} />
            </div>

            <button 
              onClick={onComplete}
              style={{
                marginTop: '32px',
                padding: '16px 32px',
                background: 'var(--orange)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '13px',
                fontWeight: '700',
                letterSpacing: '0.1em',
                cursor: 'pointer',
                boxShadow: '0 0 20px rgba(249,115,22,0.3)'
              }}
            >
              INITIALIZE INVESTIGATION →
            </button>
          </div>

          {/* Columna Derecha: El Radar y Métricas */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
             <div style={{ 
               height: '240px', 
               background: 'rgba(0,0,0,0.3)', 
               border: '1px solid var(--border-mid)', 
               borderRadius: '8px',
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'center',
               position: 'relative'
             }}>
                <div style={{ 
                  width: '120px', 
                  height: '120px', 
                  borderRadius: '50%', 
                  border: '2px dashed var(--red)',
                  animation: 'spin 10s linear infinite'
                }} />
                <div style={{ position: 'absolute', fontSize: '9px', color: 'var(--red)', fontWeight: '700' }}>ANOMALY DETECTED</div>
             </div>

             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <HUDMetric label="FRAUD SPIKE" value="+31.4%" status="critical" />
                <HUDMetric label="TRUST LVL" value="LOW" status="critical" />
                <HUDMetric label="NODES" value="8/12" />
                <HUDMetric label="UPTIME" value="99.9%" />
             </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function InvestigationWorkspace({ item }) {
  // Aquí puedes mantener tu EvidenceCard o el diseño previo de investigación
  return (
    <section style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--bg-base)" }}>
      {/* Header del workspace */}
      <div style={{ borderBottom: "1px solid var(--border-dim)", padding: "12px 16px" }}>
        <div style={{ fontSize: "9px", color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>WORKSPACE / EVIDENCE_REVIEW</div>
      </div>
      <div style={{ flex: 1, padding: "20px", overflowY: "auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        {/* Aquí renderizarías las EvidenceCards que ya tenías */}
        {Object.entries(item.evidence).map(([key, items]) => (
           <div key={key} style={{ background: 'var(--bg-panel)', padding: '16px', border: '1px solid var(--border-dim)', borderRadius: '8px' }}>
              <div style={{ fontSize: '10px', color: 'var(--orange)', marginBottom: '12px', textTransform: 'uppercase' }}>{key}</div>
              {items.map(i => <div key={i.id} style={{ fontSize: '12px', color: 'var(--text-2)', marginBottom: '8px' }}>• {i.title}</div>)}
           </div>
        ))}
      </div>
    </section>
  );
}

export default function ScenarioWorkspace({ item, onCompleteScenario }) {
  if (item.id === "scenario-0") {
    return <ScenarioZeroWorkspace item={item} onComplete={onCompleteScenario} />
  }
  return <InvestigationWorkspace item={item} />
}