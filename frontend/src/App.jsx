import { useMemo, useState } from "react"
import { journey as seedJourney } from "./data/journey"
import MainLayout from "./components/layout/MainLayout"

function bootJourney(items) {
  return items.map((item, index) => ({
    ...item,
    locked: index !== 0,
    completed: false,
    currentStepIndex: item.type === "lab" ? 0 : null,
    answers: item.type === "lab" ? {} : null,
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
  const [items, setItems] = useState(() => bootJourney(seedJourney))
  const [activeItemId, setActiveItemId] = useState(seedJourney[0].id)

  const activeItem = useMemo(
    () => items.find((item) => item.id === activeItemId) || items[0],
    [items, activeItemId]
  )

  function handleSelectItem(itemId) {
    const target = items.find((item) => item.id === itemId)
    if (!target || target.locked) return
    setActiveItemId(itemId)
  }

  function unlockNextItem(currentId) {
    setItems((prev) => {
      const nextItems = [...prev]
      const currentIndex = nextItems.findIndex((item) => item.id === currentId)

      nextItems[currentIndex] = {
        ...nextItems[currentIndex],
        completed: true,
      }

      if (nextItems[currentIndex + 1]) {
        nextItems[currentIndex + 1] = {
          ...nextItems[currentIndex + 1],
          locked: false,
        }
      }

      return nextItems
    })
  }

  function handleCompleteScenario() {
    unlockNextItem(activeItem.id)
  }

  function handleAnswerChange(stepId, value) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === activeItemId
          ? {
              ...item,
              answers: {
                ...item.answers,
                [stepId]: value,
              },
              showValidation: false,
            }
          : item
      )
    )
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
          : item
      )
    )
  }

  function handleNextStep() {
    setItems((prev) => {
      const nextItems = [...prev]
      const currentIndex = nextItems.findIndex((item) => item.id === activeItemId)
      const currentItem = nextItems[currentIndex]

      const currentStep =
        currentItem?.guide?.steps?.[currentItem.currentStepIndex] || null
      const currentAnswer = currentStep
        ? currentItem.answers[currentStep.id] || ""
        : ""
      const valid = isStepAnswerValid(currentStep, currentAnswer)

      if (!valid) {
        nextItems[currentIndex] = {
          ...currentItem,
          showValidation: true,
        }
        return nextItems
      }

      const isLastStep =
        currentItem.currentStepIndex === currentItem.guide.steps.length - 1

      if (isLastStep) {
        nextItems[currentIndex] = {
          ...currentItem,
          completed: true,
          showValidation: false,
        }

        if (nextItems[currentIndex + 1]) {
          nextItems[currentIndex + 1] = {
            ...nextItems[currentIndex + 1],
            locked: false,
          }
        }

        return nextItems
      }

      nextItems[currentIndex] = {
        ...currentItem,
        currentStepIndex: currentItem.currentStepIndex + 1,
        showValidation: false,
      }

      return nextItems
    })
  }

  const currentStep =
    activeItem.type === "lab"
      ? activeItem?.guide?.steps?.[activeItem.currentStepIndex] || null
      : null

  const currentAnswer =
    activeItem.type === "lab" && currentStep
      ? activeItem.answers[currentStep.id] || ""
      : ""

  const currentAnswerValid =
    activeItem.type === "lab" && currentStep
      ? isStepAnswerValid(currentStep, currentAnswer)
      : false

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
  )
}