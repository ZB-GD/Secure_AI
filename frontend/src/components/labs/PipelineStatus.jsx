const STAGES = [
  { id: 'T', name: 'Training' },
  { id: 'P', name: 'Prompt/Input' },
  { id: 'M', name: 'Model' },
  { id: 'D', name: 'Deployment' }
];

export default function PipelineStatus({ threatStage }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {STAGES.map((stage) => {
        const isActive = stage.id === threatStage;
        return (
          <div 
            key={stage.id}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: '700',
              fontFamily: 'var(--font-mono)',
              border: isActive ? '1px solid var(--orange)' : '1px solid var(--border-dim)',
              background: isActive ? 'var(--orange-dim)' : 'rgba(255,255,255,0.02)',
              color: isActive ? 'var(--orange)' : 'var(--text-3)',
              position: 'relative'
            }}
          >
            {stage.id}
            {isActive && (
              <div style={{ 
                position: 'absolute', 
                inset: '-2px', 
                border: '1px solid var(--orange)', 
                borderRadius: '8px', 
                opacity: 0.5,
                animation: 'pulse-red 2s infinite'
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}