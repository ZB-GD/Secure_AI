import TopBar from "./TopBar";
import WorkspacePanel from "../workspace/WorkspacePanel";

function buildBreadcrumb(activeItem) {
  if (!activeItem) return ["Dashboard"];

  if (activeItem.type === "welcome") {
    return ["Emergency Briefing"];
  }

  if (activeItem.type === "dashboard") {
    return ["Dashboard"];
  }

  if (activeItem.type === "pipeline") {
    return ["Dashboard", "Pipeline"];
  }

  if (activeItem.type === "lab") {
    const labLabel = activeItem.shortTitle || activeItem.title || "Lab";
    const steps = activeItem.guide?.steps || [];

    if (activeItem.scenario && !activeItem.scenarioViewed) {
      return ["Dashboard", labLabel, "Scenario"];
    }

    if (steps.length > 0) {
      const stepNumber = Math.min(
        Math.max((activeItem.currentStepIndex ?? 0) + 1, 1),
        steps.length,
      );
      return ["Dashboard", labLabel, `Guide · Step ${stepNumber}/${steps.length}`];
    }

    return ["Dashboard", labLabel];
  }

  if (activeItem.type === "scenario") {
    return ["Dashboard", activeItem.shortTitle || activeItem.title || "Scenario"];
  }

  return ["Dashboard"];
}

function BreadcrumbStrip({ activeItem }) {
  const crumbs = buildBreadcrumb(activeItem);

  return (
    <div
      aria-label="Current location"
      style={{
        flexShrink: 0,
        minHeight: "30px",
        display: "flex",
        alignItems: "center",
        gap: "7px",
        padding: "6px 24px",
        borderBottom: "1px solid var(--border-dim)",
        background: "rgba(15,23,42,0.58)",
        color: "var(--text-3)",
        fontFamily: "var(--font-display)",
        fontSize: "10px",
        letterSpacing: "0.08em",
        whiteSpace: "nowrap",
        overflow: "hidden",
      }}
    >
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;

        return (
          <span
            key={`${crumb}-${index}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "7px",
              minWidth: 0,
              color: isLast ? "var(--text-1)" : "var(--text-3)",
            }}
          >
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
              {crumb}
            </span>
            {!isLast && <span style={{ color: "var(--text-3)" }}>{">"}</span>}
          </span>
        );
      })}
    </div>
  );
}

export default function MainLayout({
  items,
  activeItem,
  currentStep,
  currentAnswer,
  currentAnswerValid,
  onSelectItem,
  onCompleteScenario,
  onAnswerChange,
  onPrevStep,
  onNextStep,
  onCompleteLabQuiz,
  onStartLab,
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        width: "100vw",
        overflow: "hidden",
        background: "var(--bg-base)",
      }}
    >
      <TopBar
        items={items}
        activeItem={activeItem}
        onSelectItem={onSelectItem}
      />
      <BreadcrumbStrip activeItem={activeItem} />

      <div
        style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}
      >
        <main
          style={{
            flex: 1,
            overflow: "hidden",
            minWidth: 0,
            position: "relative",
          }}
        >
          <WorkspacePanel
            items={items}
            item={activeItem}
            onSelectItem={onSelectItem}
            onCompleteScenario={onCompleteScenario}
            currentStep={currentStep}
            currentAnswer={currentAnswer}
            onAnswerChange={onAnswerChange}
            onPrevStep={onPrevStep}
            onNextStep={onNextStep}
            onCompleteLabQuiz={onCompleteLabQuiz}
            onStartLab={onStartLab}
          />
        </main>
      </div>
    </div>
  );
}