import { useMemo, useState } from "react"
import { labs } from "./data/labs"
import MainLayout from "./components/layout/MainLayout"

export default function App() {
  const [activeLabId, setActiveLabId] = useState(labs[0].id)
  const [completedLabIds, setCompletedLabIds] = useState([])
  const [executedCommands, setExecutedCommands] = useState({})

  const labsState = useMemo(() => {
    return labs.map((lab, index) => {
      const runCommands = executedCommands[lab.id] || []
      const completed = completedLabIds.includes(lab.id)
      const unlocked = index === 0 || completedLabIds.includes(labs[index - 1].id)
      const progress = lab.requiredCommands.filter((command) => runCommands.includes(command)).length

      return {
        ...lab,
        completed,
        unlocked,
        infected: !completed,
        progress,
        progressTotal: lab.requiredCommands.length,
        runCommands,
      }
    })
  }, [completedLabIds, executedCommands])

  const activeLab = labsState.find((lab) => lab.id === activeLabId) || labsState[0]

  const handleSelectLab = (labId) => {
    const target = labsState.find((lab) => lab.id === labId)
    if (target?.unlocked || target?.completed) {
      setActiveLabId(labId)
    }
  }

  const handleCommand = (labId, command) => {
    if (!command) return

    setExecutedCommands((previous) => {
      const current = previous[labId] || []
      if (current.includes(command)) return previous
      return { ...previous, [labId]: [...current, command] }
    })

    const baseLab = labs.find((lab) => lab.id === labId)
    if (!baseLab) return

    setCompletedLabIds((previous) => {
      if (previous.includes(labId)) return previous

      const nextCommands = new Set([...(executedCommands[labId] || []), command])
      const solved = baseLab.requiredCommands.every((required) => nextCommands.has(required))

      if (!solved) return previous
      return [...previous, labId]
    })
  }

  const handleGoNext = () => {
    const currentIndex = labsState.findIndex((lab) => lab.id === activeLabId)
    const nextLab = labsState[currentIndex + 1]
    if (nextLab?.unlocked) {
      setActiveLabId(nextLab.id)
    }
  }

  return (
    <MainLayout
      labs={labsState}
      activeLab={activeLab}
      onSelectLab={handleSelectLab}
      onTerminalCommand={handleCommand}
      onGoNext={handleGoNext}
    />
  )
}