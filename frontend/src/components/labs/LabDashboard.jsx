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
                      fontSize: "9px",
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
            fontSize: "11px",
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
            const scenarioTitle = lab.scenario?.title || "Scenario included";

            return (
              <button
                key={lab.id}
                type="button"
                onClick={() => available && onSelectItem(lab.id)}
                disabled={!available}
                style={{
                  textAlign: "left",
                  minHeight: "230px",
                  borderRadius: "8px",
                  border: lab.completed
                    ? "1px solid var(--green-border)"
                    : "1px solid var(--border-dim)",
                  background: "var(--bg-panel)",
                  padding: "18px",
                  cursor: available ? "pointer" : "not-allowed",
                  opacity: available ? 1 : 0.55,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "18px",
                }}
              >
                <div>
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
                        color: lab.completed
                          ? "var(--green)"
                          : available
                            ? "var(--text-3)"
                            : "var(--orange)",
                        border: `1px solid ${
                          lab.completed
                            ? "var(--green-border)"
                            : "var(--border-dim)"
                        }`,
                        borderRadius: "999px",
                        padding: "3px 8px",
                        fontSize: "9px",
                        fontFamily: "var(--font-display)",
                      }}
                    >
                      {lab.completed ? "COMPLETE" : available ? "READY" : "COMING SOON"}
                    </span>
                  </div>

                  <h2
                    style={{
                      margin: 0,
                      color: "var(--text-1)",
                      fontFamily: "var(--font-display)",
                      fontSize: "19px",
                      lineHeight: 1.25,
                    }}
                  >
                    {lab.title}
                  </h2>
                  <p
                    style={{
                      color: "var(--text-2)",
                      fontSize: "13px",
                      lineHeight: 1.6,
                      margin: "10px 0 0",
                    }}
                  >
                    {lab.subtitle}
                  </p>
                </div>

                <div>
                  <div
                    style={{
                      color: "var(--text-3)",
                      fontFamily: "var(--font-display)",
                      fontSize: "9px",
                      letterSpacing: "0.12em",
                      marginBottom: "6px",
                    }}
                  >
                    INCLUDED SCENARIO
                  </div>
                  <div
                    style={{
                      color: "var(--text-1)",
                      fontSize: "13px",
                      lineHeight: 1.5,
                    }}
                  >
                    {scenarioTitle}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
