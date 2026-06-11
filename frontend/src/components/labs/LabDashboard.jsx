export default function LabDashboard({ items, onSelectItem }) {
  const labs = (items || []).filter((item) => item.type === "lab");
  const completableLabs = labs.filter((lab) => lab.guide?.steps?.length > 0);
  const completed = labs.filter((lab) => lab.completed).length;
  const allCompletableComplete =
    completableLabs.length > 0 &&
    completableLabs.every((lab) => lab.completed);
  const quizScores = completableLabs
    .map((lab) => lab.quizScore)
    .filter((score) => score?.total);
  const averageScore =
    quizScores.length > 0
      ? Math.round(
          quizScores.reduce((sum, score) => sum + score.percent, 0) /
            quizScores.length,
        )
      : null;
  const startedTimes = completableLabs
    .map((lab) => (lab.startedAt ? new Date(lab.startedAt).getTime() : null))
    .filter(Number.isFinite);
  const completedTimes = completableLabs
    .map((lab) => (lab.completedAt ? new Date(lab.completedAt).getTime() : null))
    .filter(Number.isFinite);
  const elapsedMs =
    startedTimes.length > 0 && completedTimes.length > 0
      ? Math.max(...completedTimes) - Math.min(...startedTimes)
      : null;
  const elapsedMinutes =
    elapsedMs && elapsedMs > 0 ? Math.max(1, Math.round(elapsedMs / 60000)) : null;

  return (
    <section
      style={{
        height: "100%",
        overflowY: "auto",
        background: "var(--bg-base)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header — matches DocsPage gradient pattern */}
      <div
        style={{
          padding: "40px 40px 20px",
          background: "linear-gradient(to bottom, var(--bg-panel), var(--bg-base))",
          borderBottom: "1px solid var(--border-dim)",
          flexShrink: 0,
        }}
      >
        <h1
          style={{
            margin: "0 0 10px",
            color: "var(--text-1)",
            fontFamily: "var(--font-display)",
            fontSize: "36px",
            fontWeight: 800,
          }}
        >
          AI Security Labs
        </h1>
        <p
          style={{
            margin: "0 0 20px",
            color: "var(--text-2)",
            fontSize: "15px",
            lineHeight: 1.65,
            fontFamily: "var(--font-display)",
          }}
        >
          Lab 1 is available now. Complete it to build your foundation in AI
          security — more labs are on their way.
        </p>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: "32px 40px" }}>

          {/* Summary bar — persistent progress overview */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "8px",
              marginBottom: "28px",
              padding: "14px 20px",
              borderRadius: "10px",
              border: `1px solid ${allCompletableComplete ? "var(--green-border)" : "var(--border-dim)"}`,
              background: allCompletableComplete ? "var(--green-dim)" : "var(--bg-panel)",
            }}
          >
            {[
              ["LABS COMPLETED", `${completed}/${completableLabs.length}`],
              ["AVERAGE QUIZ SCORE", averageScore == null ? "n/a" : `${averageScore}%`],
              ["TIME SPENT", elapsedMinutes == null ? "n/a" : `${elapsedMinutes} min`],
            ].map(([label, value], i) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: "8px",
                  paddingLeft: i > 0 ? "24px" : 0,
                  borderLeft: i > 0 ? "1px solid var(--border-dim)" : "none",
                }}
              >
                <span
                  style={{
                    color: "var(--text-3)",
                    fontFamily: "var(--font-display)",
                    fontSize: "12px",
                  }}
                >
                  {label}
                </span>
                <span
                  style={{
                    color: "var(--text-1)",
                    fontFamily: "var(--font-display)",
                    fontSize: "18px",
                    fontWeight: 700,
                  }}
                >
                  {value}
                </span>
              </div>
            ))}

            <div style={{ flex: 1 }} />

            {allCompletableComplete && (
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  color: "var(--green)",
                  fontFamily: "var(--font-display)",
                  fontSize: "12px",
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                }}
              >
                ✓ TRAINING COMPLETE
              </span>
            )}
          </div>

          {/* Cards grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
              gap: "24px",
            }}
          >
            {labs.map((lab) => {
              const available = lab.guide?.steps?.length > 0;
              const inProgress = available && !!lab.startedAt && !lab.completed;
              const totalSteps = lab.guide?.steps?.length ?? 0;
              const currentStep = (lab.currentStepIndex ?? 0) + 1;
              const stepProgress = totalSteps > 0 ? Math.round((currentStep / totalSteps) * 100) : 0;

              const perfectScore =
                !lab.quizScore?.total || lab.quizScore.percent === 100;

              let badgeColor = available ? "var(--green)" : "var(--text-3)";
              let badgeBorder = available ? "var(--green-border)" : "var(--border-dim)";
              let badgeLabel = available ? "READY" : "COMING SOON";

              if (lab.completed) {
                if (perfectScore) {
                  badgeColor = "var(--green)";
                  badgeBorder = "var(--green-border)";
                  badgeLabel = "COMPLETE";
                } else {
                  badgeColor = "var(--orange)";
                  badgeBorder = "var(--orange-border)";
                  badgeLabel = "PASSED";
                }
              } else if (inProgress) {
                badgeColor = "var(--blue)";
                badgeBorder = "rgba(56,189,248,0.35)";
                badgeLabel = "IN PROGRESS";
              }

              return (
                <button
                  key={lab.id}
                  type="button"
                  onClick={() => available && onSelectItem(lab.id)}
                  disabled={!available}
                  style={{
                    textAlign: "left",
                    height: "100%",
                    borderRadius: "14px",
                    border: lab.completed
                      ? perfectScore
                        ? "1px solid var(--green-border)"
                        : "1px solid var(--orange-border)"
                      : inProgress
                        ? "1px solid rgba(56,189,248,0.25)"
                        : "1px solid var(--border-dim)",
                    background: "var(--bg-panel)",
                    padding: "24px",
                    cursor: available ? "pointer" : "not-allowed",
                    opacity: available ? 1 : 0.55,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-start",
                    gap: "14px",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!available) return;
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.borderColor = lab.completed
                      ? perfectScore
                        ? "var(--green)"
                        : "var(--orange)"
                      : inProgress
                        ? "var(--blue)"
                        : "var(--orange)";
                    e.currentTarget.style.boxShadow = lab.completed
                      ? perfectScore
                        ? "0 8px 30px rgba(34,197,94,0.15)"
                        : "0 8px 30px rgba(249,115,22,0.15)"
                      : inProgress
                        ? "0 8px 30px rgba(56,189,248,0.15)"
                        : "0 8px 30px rgba(249,115,22,0.15)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.borderColor = lab.completed
                      ? perfectScore
                        ? "var(--green-border)"
                        : "var(--orange-border)"
                      : inProgress
                        ? "rgba(56,189,248,0.25)"
                        : "var(--border-dim)";
                    e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.15)";
                  }}
                >
                  <div style={{ width: "100%" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "14px",
                      }}
                    >
                      <span
                        style={{
                          color: "var(--orange)",
                          fontFamily: "var(--font-display)",
                          fontSize: "12px",
                        }}
                      >
                        {lab.shortTitle.toUpperCase()}
                      </span>
                      <span
                        style={{
                          color: badgeColor,
                          border: `1px solid ${badgeBorder}`,
                          borderRadius: "999px",
                          padding: "3px 10px",
                          fontSize: "12px",
                          fontFamily: "var(--font-display)",
                        }}
                      >
                        {badgeLabel}
                      </span>
                    </div>

                    <h2
                      style={{
                        margin: 0,
                        color: "var(--text-1)",
                        fontFamily: "var(--font-display)",
                        fontSize: "20px",
                        fontWeight: 700,
                        lineHeight: 1.25,
                      }}
                    >
                      {lab.title}
                    </h2>
                    <p
                      style={{
                        color: "var(--text-2)",
                        fontSize: "14px",
                        lineHeight: 1.65,
                        margin: "10px 0 0",
                        fontFamily: "var(--font-display)",
                      }}
                    >
                      {lab.subtitle}
                    </p>
                  </div>

                  {/* Progress bar — IN PROGRESS */}
                  {inProgress && (
                    <div style={{ width: "100%" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "6px",
                          fontSize: "12px",
                          fontFamily: "var(--font-display)",
                          color: "var(--text-3)",
                        }}
                      >
                        <span>GUIDE PROGRESS</span>
                        <span style={{ color: "var(--blue)" }}>
                          Step {currentStep}/{totalSteps}
                        </span>
                      </div>
                      <div
                        style={{
                          height: "3px",
                          background: "var(--bg-surface)",
                          borderRadius: "3px",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${stepProgress}%`,
                            background: "var(--blue)",
                            borderRadius: "3px",
                            transition: "width 0.3s ease",
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Quiz score — COMPLETE */}
                  {lab.completed && lab.quizScore?.total > 0 && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        width: "100%",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "12px",
                          fontFamily: "var(--font-display)",
                          color: "var(--text-3)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        QUIZ SCORE
                      </div>
                      <div
                        style={{
                          flex: 1,
                          height: "3px",
                          background: "var(--bg-surface)",
                          borderRadius: "3px",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${lab.quizScore.percent}%`,
                            background:
                              lab.quizScore.percent >= 75
                                ? "var(--green)"
                                : "var(--orange)",
                            borderRadius: "3px",
                          }}
                        />
                      </div>
                      <div
                        style={{
                          fontSize: "14px",
                          fontWeight: 700,
                          fontFamily: "var(--font-display)",
                          color:
                            lab.quizScore.percent >= 75
                              ? "var(--green)"
                              : "var(--orange)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {lab.quizScore.correct}/{lab.quizScore.total}
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
      </div>
    </section>
  );
}
