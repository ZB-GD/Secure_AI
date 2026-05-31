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
          Choose a Lab
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
          Labs are independent modules. Each one includes its own incident
          scenario, hands-on environment, guide, logs, metrics, and quiz.
        </p>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: "32px 40px" }}>

          {/* Completion banner */}
          {allCompletableComplete && (
            <section
              style={{
                marginBottom: "28px",
                border: "1px solid var(--green-border)",
                borderRadius: "12px",
                background: "var(--green-dim)",
                padding: "24px",
              }}
            >
              <div
                style={{
                  color: "var(--green)",
                  fontFamily: "var(--font-display)",
                  fontSize: "12px",
                  marginBottom: "8px",
                }}
              >
                TRAINING COMPLETE
              </div>
              <h2
                style={{
                  margin: "0 0 16px",
                  color: "var(--text-1)",
                  fontFamily: "var(--font-display)",
                  fontSize: "24px",
                  fontWeight: 700,
                }}
              >
                CityFlow investigation closed
              </h2>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                  gap: "12px",
                }}
              >
                {[
                  ["Labs completed", `${completableLabs.length}/${completableLabs.length}`],
                  ["Average quiz score", averageScore == null ? "n/a" : `${averageScore}%`],
                  ["Time spent", elapsedMinutes == null ? "n/a" : `${elapsedMinutes} min`],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    style={{
                      border: "1px solid rgba(34,197,94,0.20)",
                      borderRadius: "8px",
                      background: "rgba(15,23,42,0.45)",
                      padding: "14px",
                    }}
                  >
                    <div
                      style={{
                        color: "var(--text-3)",
                        fontFamily: "var(--font-display)",
                        fontSize: "12px",
                        marginBottom: "6px",
                      }}
                    >
                      {label.toUpperCase()}
                    </div>
                    <div
                      style={{
                        color: "var(--text-1)",
                        fontFamily: "var(--font-display)",
                        fontSize: "22px",
                        fontWeight: 700,
                      }}
                    >
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Stats bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "20px",
              color: "var(--text-3)",
              fontFamily: "var(--font-display)",
              fontSize: "12px",
            }}
          >
            <span>{labs.length} LABS AVAILABLE</span>
            <span>{completed}/{labs.length} COMPLETE</span>
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

              let badgeColor = "var(--text-3)";
              let badgeBorder = "var(--border-dim)";
              let badgeLabel = available ? "READY" : "COMING SOON";

              if (lab.completed) {
                badgeColor = "var(--green)";
                badgeBorder = "var(--green-border)";
                badgeLabel = "COMPLETE";
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
                      ? "1px solid var(--green-border)"
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
                      ? "var(--green)"
                      : inProgress
                        ? "var(--blue)"
                        : "var(--orange)";
                    e.currentTarget.style.boxShadow = lab.completed
                      ? "0 8px 30px rgba(34,197,94,0.15)"
                      : inProgress
                        ? "0 8px 30px rgba(56,189,248,0.15)"
                        : "0 8px 30px rgba(249,115,22,0.15)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.borderColor = lab.completed
                      ? "var(--green-border)"
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
