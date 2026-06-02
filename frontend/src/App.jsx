import { useEffect, useMemo, useRef, useState } from "react";
import { journey as seedJourney } from "./data/journey";
import MainLayout from "./components/layout/MainLayout";
import LoginPage from "./pages/LoginPage";
import { useAuth } from "./context/AuthContext";
import ProfilePage from "./pages/ProfilePage";

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
  return (step.expectedKeywords || []).some(
    (kw) => value === kw.toLowerCase().trim()
  );
}

export default function App() {
  const { user } = useAuth();
  const prevUserEmail = useRef(null);
  const [items, setItems] = useState(() => bootJourney(seedJourney));
  const [activeItemId, setActiveItemId] = useState(() => {
    if (window.location.pathname.startsWith("/docs")) return "docs";
    return "dashboard";
  });
  const [activeDocPath, setActiveDocPath] = useState(() => {
    if (window.location.pathname.startsWith("/docs")) {
      return new URLSearchParams(window.location.search).get("id") || null;
    }
    return null;
  });

  useEffect(() => {
    if (activeItemId === "docs") {
      window.history.replaceState({}, "", "/docs");
    } else {
      window.history.replaceState({}, "", "/");
    }
  }, [activeItemId]);

  useEffect(() => {
    const email = user?.email ?? null;
    if (email && email !== prevUserEmail.current) {
      setActiveItemId("dashboard");
    }
    prevUserEmail.current = email;
  }, [user]);

  const activeItem = useMemo(() => {
    if (activeItemId === "profile") {
      return { id: "profile", type: "profile", shortTitle: "Profile", phase: "Account", title: "My Profile", threatStage: null };
    }
    if (activeItemId === "admin") {
      return { id: "admin", type: "admin", shortTitle: "Admin", phase: "Admin", title: "Admin Panel", threatStage: null };
    }
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

  function handleSelectItem(rawId) {
    // Support both string and object: { id, type, docPath? }
    const isObject = rawId !== null && typeof rawId === "object";
    const itemId = isObject ? rawId.id : rawId;

    // Welcome screen: always navigable (e.g. logo click before investigation)
    if (itemId === "welcome") {
      setActiveDocPath(null);
      setActiveItemId("welcome");
      return;
    }

    // Profile: always accessible to logged-in users
    if (itemId === "profile") {
      setActiveDocPath(null);
      setActiveItemId("profile");
      return;
    }

    // Admin panel: always accessible to admin users (role check is server-side)
    if (itemId === "admin") {
      setActiveDocPath(null);
      setActiveItemId("admin");
      return;
    }

    // Docs: lives outside the journey array
    if (itemId === "docs" || (isObject && rawId.type === "docs")) {
      const docId = isObject
        ? rawId.docId || rawId.docPath || null
        : null;

      setActiveDocPath(docId);
      setActiveItemId("docs");
      return;
    }

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
    if (target.type === "scenario" && target.id !== "scenario-1") {
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

  if (!user) return <LoginPage />;

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