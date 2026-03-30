import { useMemo, useState } from "react"
import { labs as seedLabs } from "./data/labs"
import MainLayout from "./components/layout/MainLayout"

function bootLabs(labs) {
  return labs.map((lab, index) => ({
    ...lab,
    locked: index !== 0,
    completed: false,
    currentStepIndex: 0,
    answers: {},
    showValidation: false,
  }))
}

function isStepAnswerValid(step, answer) {
  if (!step) return false

  const value = (answer || "").toLowerCase().trim()
  if (!value) return false

  return (step.expectedKeywords || []).some((keyword) =>
    value.includes(keyword.toLowerCase())
  )
}

export default function App() {
  const [labs, setLabs] = useState(() => bootLabs(seedLabs))
  const [activeLabId, setActiveLabId] = useState(seedLabs[0].id)

  const [unlockedGates, setUnlockedGates] = useState(() =>
    Object.fromEntries(seedLabs.map((lab) => [lab.id, !lab.gate]))
  )

  const activeLab = useMemo(
    () => labs.find((lab) => lab.id === activeLabId) || labs[0],
    [labs, activeLabId]
  )

  const labUnlocked =
    !activeLab?.gate || unlockedGates[activeLab.id] || activeLab.completed

  function handleSelectLab(labId) {
    const target = labs.find((lab) => lab.id === labId)
    if (!target || target.locked) return
    setActiveLabId(labId)
  }

  function handleUnlockLab() {
    setUnlockedGates((prev) => ({
      ...prev,
      [activeLabId]: true,
    }))
  }

  function handleAnswerChange(stepId, value) {
    setLabs((prev) =>
      prev.map((lab) =>
        lab.id === activeLabId
          ? {
              ...lab,
              answers: {
                ...lab.answers,
                [stepId]: value,
              },
              showValidation: false,
            }
          : lab
      )
    )
  }

  function handlePrevStep() {
    setLabs((prev) =>
      prev.map((lab) =>
        lab.id === activeLabId
          ? {
              ...lab,
              currentStepIndex: Math.max(0, lab.currentStepIndex - 1),
              showValidation: false,
            }
          : lab
      )
    )
  }

  function handleNextStep() {
    setLabs((prev) => {
      const nextLabs = [...prev]
      const activeIndex = nextLabs.findIndex((lab) => lab.id === activeLabId)
      const active = nextLabs[activeIndex]
      const currentStep = active?.guide?.steps?.[active.currentStepIndex]
      const currentAnswer = currentStep ? active.answers[currentStep.id] || "" : ""
      const valid = isStepAnswerValid(currentStep, currentAnswer)

      if (!valid) {
        nextLabs[activeIndex] = {
          ...active,
          showValidation: true,
        }
        return nextLabs
      }

      const isLastStep = active.currentStepIndex === active.guide.steps.length - 1

      if (isLastStep) {
        nextLabs[activeIndex] = {
          ...active,
          completed: true,
          showValidation: false,
        }

        if (nextLabs[activeIndex + 1]) {
          nextLabs[activeIndex + 1] = {
            ...nextLabs[activeIndex + 1],
            locked: false,
          }
        }

        return nextLabs
      }

      nextLabs[activeIndex] = {
        ...active,
        currentStepIndex: active.currentStepIndex + 1,
        showValidation: false,
      }

      return nextLabs
    })
  }

  const currentStep = activeLab?.guide?.steps?.[activeLab.currentStepIndex] || null
  const currentAnswer = currentStep ? activeLab.answers[currentStep.id] || "" : ""
  const currentAnswerValid = currentStep
    ? isStepAnswerValid(currentStep, currentAnswer)
    : false

  return (
    <MainLayout
      labs={labs}
      activeLab={activeLab}
      unlockedGates={unlockedGates}
      currentStep={currentStep}
      currentAnswer={currentAnswer}
      currentAnswerValid={currentAnswerValid}
      onSelectLab={handleSelectLab}
      onUnlockLab={handleUnlockLab}
      onAnswerChange={handleAnswerChange}
      onPrevStep={handlePrevStep}
      onNextStep={handleNextStep}
      labUnlocked={labUnlocked}
    />
  )
}