import { useMemo, useState } from "react";
import { journey as seedJourney } from "./data/journey";
import MainLayout from "./components/layout/MainLayout";

function bootJourney(items) {
  return items.map((item) => ({
    ...item,
    locked: false,
    completed: false,
    guideCompleted: false,
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

function getLinkedLabId(itemId, items) {
  const match = itemId.match(/^scenario-(\d+)$/);
  if (!match) return null;

  const linkedLabId = `lab-${match[1]}`;
  return items.some((item) => item.id === linkedLabId) ? linkedLabId : null;
}

export default function App() {
  const [items, setItems] = useState(() => bootJourney(seedJourney));
  const [activeItemId, setActiveItemId] = useState("scenario-0");

  const activeItem = useMemo(
    () =>
      activeItemId === "dashboard"
        ? {
            id: "dashboard",
            type: "dashboard",
            shortTitle: "Dashboard",
            phase: "Lab Selection",
            title: "SecLabs Dashboard",
            subtitle: "Choose a lab to begin.",
            threatStage: "E",
          }
        : items.find((item) => item.id === activeItemId) || items[0],
    [items, activeItemId],
  );

  function hasInvestigationStarted(list = items) {
    return list.some((item) => item.id === "scenario-0" && item.completed);
  }

  function handleSelectItem(itemId) {
    const investigationStarted = hasInvestigationStarted();

    // Antes de pulsar INITIALIZE INVESTIGATION no se puede navegar.
    if (!investigationStarted && itemId !== "scenario-0") {
      return;
    }

    if (itemId === "dashboard") {
      setActiveItemId("dashboard");
      return;
    }

    const target = items.find((item) => item.id === itemId);
    if (!target || target.locked) return;

    // Los scenarios no se abren desde la navegación superior.
    // El scenario del lab se abre solo desde el flujo del propio lab.
    if (target.type === "scenario" && target.id !== "scenario-0") {
      return;
    }

    if (target.type === "lab" && !target.guide?.steps?.length) return;

    setActiveItemId(itemId);
  }

  function handleCompleteScenario() {
    const currentId = activeItemId;

    setItems((prev) =>
      prev.map((item) =>
        item.id === currentId ? { ...item, completed: true } : item,
      ),
    );

    // Al completar la pantalla inicial, vamos directamente al dashboard.
    if (currentId === "scenario-0") {
      setActiveItemId("dashboard");
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
        next[idx] = {
          ...current,
          guideCompleted: true,
          showValidation: false,
        };
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

  function handleCompleteLabQuiz(itemId) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, completed: true } : item,
      ),
    );
  }

  function handleStartLab(itemId) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, scenarioViewed: true } : item,
      ),
    );

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

  return (
    <MainLayout
      items={items}
      activeItem={activeItem}
      currentStep={currentStep}
      currentAnswer={currentAnswer}
      currentAnswerValid={currentAnswerValid}
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
