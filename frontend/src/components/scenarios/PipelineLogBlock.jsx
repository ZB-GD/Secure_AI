export default function PipelineLogBlock({ value }) {
  const lines = value ? value.split("\n") : [];

  if (!lines.length) {
    return (
      <div className="scenario-empty-state">
        No logs available for this node yet.
      </div>
    );
  }

  return (
    <div className="scenario-log-block">
      <div className="scenario-log-block__body">
        {lines.map((line, index) => {
          const isError =
            line.includes("ERROR") ||
            line.includes("FAILED") ||
            line.includes("VULNERABLE");

          const isWarning =
            line.includes("WARNING") ||
            line.includes("ANOMALY") ||
            line.includes("DRIFT");

          return (
            <div
              key={`${line}-${index}`}
              className={`scenario-log-line ${
                isError ? "is-error" : isWarning ? "is-warning" : ""
              }`}
            >
              <span className="scenario-log-line__number">
                {String(index + 1).padStart(3, "0")}
              </span>
              <span className="scenario-log-line__text">{line}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
