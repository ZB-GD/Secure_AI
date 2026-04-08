import { useMemo, useState } from "react";
import { journey as seedJourney } from "./data/journey";
import MainLayout from "./components/layout/MainLayout";

function bootJourney(items) {
  return items.map((item, index) => ({
    ...item,
    locked: index !== 0,
    completed: false,
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
  const [activeItemId, setActiveItemId] = useState(seedJourney[0].id);

  const activeItem = useMemo(
    () => items.find((item) => item.id === activeItemId) || items[0],
    [items, activeItemId],
  );

  function handleSelectItem(itemId) {
    const target = items.find((item) => item.id === itemId);
    if (!target || target.locked) return;
    setActiveItemId(itemId);
  }

  function handleCompleteScenario() {
    const currentIndex = items.findIndex((item) => item.id === activeItemId);
    const nextItem = items[currentIndex + 1];

    // Primero actualizamos los items (completamos el actual y desbloqueamos el siguiente)
    setItems((prev) => {
      const next = [...prev];
      if (currentIndex !== -1) {
        next[currentIndex] = { ...next[currentIndex], completed: true };
      }
      if (nextItem) {
        next[currentIndex + 1] = { ...next[currentIndex + 1], locked: false };
      }
      return next;
    });

    // Luego forzamos la navegación al siguiente item si existe
    if (nextItem) {
      setActiveItemId(nextItem.id);
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
        next[idx] = { ...current, completed: true, showValidation: false };
        if (next[idx + 1]) next[idx + 1] = { ...next[idx + 1], locked: false };
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
    />
  );
}
