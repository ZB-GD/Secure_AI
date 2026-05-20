import { useMemo, useState } from "react";
import { journey as seedJourney } from "./data/journey";
import MainLayout from "./components/layout/MainLayout";

function bootJourney(items) {
  return items.map((item) => ({
    ...item,
    locked: false,
    completed: false,
    guideCompleted: false,
    quizScore: null,
    startedAt: null,
    completedAt: null,
    scenarioViewed: item.type !== "lab",
    currentStepIndex: item.type === "lab" ? 0 : null,
    answers: item.type === "lab" ? {} : null,
    showValidation: false,
  }));
}

function isStepAnswerValid(step, answer) {
  if (!step) return false;
  const value = (answer || "").toLowerCase().trim();
  if (!value) return false;
  return (step.expectedKeywords || []).some((kw) =>
    value.includes(kw.toLowerCase()),
  );
}

export default function App() {
  const [items, setItems] = useState(() => bootJourney(seedJourney));
  const [activeItemId, setActiveItemId] = useState("scenario-0");
  const [activeDocPath, setActiveDocPath] = useState(null);

  const activeItem = useMemo(() => {
    if (activeItemId === "dashboard") {
      return {
        id: "dashboard",
        type: "dashboard",
        shortTitle: "Dashboard",
        phase: "Lab Selection",
        title: "SecLabs Dashboard",
        subtitle: "Choose a lab to begin.",
        threatStage: "E",
      };
    }
    if (activeItemId === "docs") {
      return {
        id: "docs",
        type: "docs",
        shortTitle: "Docs",
        phase: "Reference",
        title: "Security Reference",
        threatStage: null,
        docPath: activeDocPath,
      };
    }
    return items.find((item) => item.id === activeItemId) || items[0];
  }, [items, activeItemId, activeDocPath]);

  function hasInvestigationStarted(list = items) {
    return list.some((item) => item.id === "scenario-0" && item.completed);
  }

  function handleSelectItem(rawId) {
    const investigationStarted = hasInvestigationStarted();

    // Support both string and object: { id, type, docPath? }
    const isObject = rawId !== null && typeof rawId === "object";
    const itemId = isObject ? rawId.id : rawId;

    // Docs: lives outside the journey array
    if (itemId === "docs" || (isObject && rawId.type === "docs")) {
      if (!investigationStarted) return;

      const docId = isObject
        ? rawId.docId || rawId.docPath || null
        : null;

      setActiveDocPath(docId);
      setActiveItemId("docs");

      window.history.pushState(
        {},
        "",
        docId ? `/docs?id=${encodeURIComponent(docId)}` : "/docs",
      );

      return;
    }

    // Before investigation starts, only scenario-0 is reachable
    if (!investigationStarted && itemId !== "scenario-0") return;

    if (itemId === "dashboard") {
      setActiveDocPath(null);
      setActiveItemId("dashboard");
      return;
    }

    const target = items.find((item) => item.id === itemId);
    if (!target || target.locked) return;

    // PIPELINE solo se puede abrir después de completar el escenario previo.
    // Antes de eso, scenario-1 solo debe aparecer dentro del flujo del Lab 1.
    if (target.id === "scenario-1" && !target.completed) {
      return;
    }

    // Secondary scenarios only opened from their own lab flow
    if (
      target.type === "scenario" &&
      target.id !== "scenario-0" &&
      target.id !== "scenario-1"
    ) {
      return;
    }

    if (target.type === "lab" && !target.guide?.steps?.length) return;

    setActiveDocPath(null);
    setActiveItemId(itemId);
  }

    function getLabIdForScenarioId(scenarioId, list = items) {
      const labId = scenarioId.replace(/^scenario-/, "lab-");
      const labExists = list.some(
        (item) => item.id === labId && item.type === "lab",
      );

      return labExists ? labId : null;
    }

    function handleCompleteScenario() {
      const currentId = activeItemId;

      if (currentId === "scenario-0") {
        setItems((prev) =>
          prev.map((item) =>
            item.id === currentId ? { ...item, completed: true } : item,
          ),
        );

        setActiveDocPath(null);
        setActiveItemId("dashboard");
        return;
      }

      const targetLabId = getLabIdForScenarioId(currentId);

      setItems((prev) =>
        prev.map((item) => {
          if (item.id === currentId) {
            return {
              ...item,
              completed: true,
            };
          }

          if (targetLabId && item.id === targetLabId) {
            return {
              ...item,
              scenarioViewed: true,
              startedAt: item.startedAt || new Date().toISOString(),
            };
          }

          return item;
        }),
      );

      if (targetLabId) {
        setActiveDocPath(null);
        setActiveItemId(targetLabId);
      }
    }

  function handleAnswerChange(stepId, value) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === activeItemId
          ? {
              ...item,
              answers: { ...item.answers, [stepId]: value },
              showValidation: false,
            }
          : item,
      ),
    );
  }

  function handlePrevStep() {
    setItems((prev) =>
      prev.map((item) =>
        item.id === activeItemId
          ? {
              ...item,
              currentStepIndex: Math.max(0, item.currentStepIndex - 1),
              showValidation: false,
            }
          : item,
      ),
    );
  }

  function handleNextStep() {
    setItems((prev) => {
      const next = [...prev];
      const idx = next.findIndex((item) => item.id === activeItemId);
      const current = next[idx];
      const step = current?.guide?.steps?.[current.currentStepIndex] || null;
      const answer = step ? current.answers[step.id] || "" : "";
      const valid = isStepAnswerValid(step, answer);

      if (!valid) {
        next[idx] = { ...current, showValidation: true };
        return next;
      }

      const isLast =
        current.currentStepIndex === current.guide.steps.length - 1;
      if (isLast) {
        next[idx] = { ...current, guideCompleted: true, showValidation: false };
        return next;
      }

      next[idx] = {
        ...current,
        currentStepIndex: current.currentStepIndex + 1,
        showValidation: false,
      };
      return next;
    });
  }

  function handleCompleteLabQuiz(itemId, result = {}) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              completed: true,
              quizScore: result.score ?? item.quizScore ?? null,
              completedAt: new Date().toISOString(),
            }
          : item,
      ),
    );
  }
  function handleStartLab(itemId) {
    const scenarioId = itemId.replace(/^lab-/, "scenario-");

    setItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            scenarioViewed: true,
            startedAt: item.startedAt || new Date().toISOString(),
          };
        }

        if (item.id === scenarioId) {
          return {
            ...item,
            completed: true,
          };
        }

        return item;
      }),
    );

    setActiveDocPath(null);
    setActiveItemId(itemId);
  }
  const currentStep =
    activeItem.type === "lab"
      ? activeItem?.guide?.steps?.[activeItem.currentStepIndex] || null
      : null;

  const currentAnswer =
    activeItem.type === "lab" && currentStep
      ? activeItem.answers[currentStep.id] || ""
      : "";

  const currentAnswerValid =
    activeItem.type === "lab" && currentStep
      ? isStepAnswerValid(currentStep, currentAnswer)
      : false;

  const showValidation =
    activeItem.type === "lab" ? activeItem.showValidation ?? false : false;

  return (
    <MainLayout
      items={items}
      activeItem={activeItem}
      currentStep={currentStep}
      currentAnswer={currentAnswer}
      currentAnswerValid={currentAnswerValid}
      showValidation={showValidation}
      onSelectItem={handleSelectItem}
      onCompleteScenario={handleCompleteScenario}
      onAnswerChange={handleAnswerChange}
      onPrevStep={handlePrevStep}
      onNextStep={handleNextStep}
      onCompleteLabQuiz={handleCompleteLabQuiz}
      onStartLab={handleStartLab}
    />
  );
}