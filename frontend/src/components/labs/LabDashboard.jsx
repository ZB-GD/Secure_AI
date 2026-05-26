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
        padding: "28px",
      }}
    >
      <div style={{ maxWidth: "1180px", margin: "0 auto" }}>
        {allCompletableComplete && (
          <section
            style={{
              marginBottom: "24px",
              border: "1px solid var(--green-border)",
              borderRadius: "10px",
              background: "var(--green-dim)",
              padding: "22px",
            }}
          >
            <div
              style={{
                color: "var(--green)",
                fontFamily: "var(--font-display)",
                fontSize: "10px",
                letterSpacing: "0.16em",
                marginBottom: "8px",
              }}
            >
              TRAINING COMPLETE
            </div>
            <h1
              style={{
                margin: "0 0 10px",
                color: "var(--text-1)",
                fontFamily: "var(--font-display)",
                fontSize: "28px",
              }}
            >
              CityFlow investigation closed
            </h1>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: "12px",
                marginTop: "16px",
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
                    padding: "12px",
                  }}
                >
                  <div
                    style={{
                      color: "var(--text-3)",
                      fontFamily: "var(--font-display)",
                      fontSize: "10px",
                      letterSpacing: "0.12em",
                      marginBottom: "6px",
                    }}
                  >
                    {label.toUpperCase()}
                  </div>
                  <div
                    style={{
                      color: "var(--text-1)",
                      fontFamily: "var(--font-display)",
                      fontSize: "20px",
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

        <header
          style={{
            marginBottom: "24px",
            borderBottom: "1px solid var(--border-dim)",
            paddingBottom: "18px",
          }}
        >
          <div
            style={{
              fontSize: "10px",
              color: "var(--orange)",
              letterSpacing: "0.18em",
              fontFamily: "var(--font-display)",
              marginBottom: "8px",
            }}
          >
            SECURE AI TRAINING
          </div>
          <h1
            style={{
              margin: 0,
              color: "var(--text-1)",
              fontFamily: "var(--font-display)",
              fontSize: "28px",
              fontWeight: 700,
            }}
          >
            Choose a Lab
          </h1>
          <p
            style={{
              maxWidth: "760px",
              color: "var(--text-2)",
              fontSize: "14px",
              lineHeight: 1.7,
              margin: "10px 0 0",
            }}
          >
            Labs are independent modules. Each one includes its own incident
            scenario, hands-on environment, guide, logs, metrics, and quiz.
          </p>
        </header>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "16px",
            color: "var(--text-3)",
            fontFamily: "var(--font-display)",
            fontSize: "10px",
            letterSpacing: "0.08em",
          }}
        >
          <span>{labs.length} LABS AVAILABLE</span>
          <span>{completed}/{labs.length} COMPLETE</span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "16px",
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
                  minHeight: "190px",
                  borderRadius: "8px",
                  border: lab.completed
                    ? "1px solid var(--green-border)"
                    : inProgress
                      ? "1px solid rgba(56,189,248,0.25)"
                      : "1px solid var(--border-dim)",
                  background: "var(--bg-panel)",
                  padding: "18px",
                  cursor: available ? "pointer" : "not-allowed",
                  opacity: available ? 1 : 0.55,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-start",
                  gap: "14px",
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
                        fontSize: "10px",
                        letterSpacing: "0.14em",
                      }}
                    >
                      {lab.shortTitle.toUpperCase()}
                    </span>
                    <span
                      style={{
                        color: badgeColor,
                        border: `1px solid ${badgeBorder}`,
                        borderRadius: "999px",
                        padding: "3px 8px",
                        fontSize: "10px",
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
                      lineHeight: 1.25,
                    }}
                  >
                    {lab.title}
                  </h2>
                  <p
                    style={{
                      color: "var(--text-2)",
                      fontSize: "14px",
                      lineHeight: 1.6,
                      margin: "10px 0 0",
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
                        fontSize: "10px",
                        fontFamily: "var(--font-display)",
                        color: "var(--text-3)",
                        letterSpacing: "0.08em",
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
                        fontSize: "10px",
                        fontFamily: "var(--font-display)",
                        color: "var(--text-3)",
                        letterSpacing: "0.08em",
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
                        fontSize: "12px",
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
