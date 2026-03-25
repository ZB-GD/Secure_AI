import { useEffect, useRef, useState } from "react"

export default function TerminalEmulator({ lab, onCommandRun }) {
  const [lines, setLines] = useState([])
  const [input, setInput] = useState("")
  const [history, setHistory] = useState([])
  const [historyIdx, setHistoryIdx] = useState(-1)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    setLines(lab.terminal.welcome.map((text) => ({ type: "output", text })))
    setInput("")
    setHistory([])
    setHistoryIdx(-1)
  }, [lab.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [lines])

  const handleCommand = (cmd) => {
    const trimmed = cmd.trim().toLowerCase()
    const nextLines = [...lines, { type: "input", text: `$ ${cmd}` }]

    if (trimmed === "clear") {
      setLines(lab.terminal.welcome.map((text) => ({ type: "output", text })))
      setHistory((value) => [cmd, ...value])
      setHistoryIdx(-1)
      setInput("")
      return
    }

    const response = lab.terminal.commands[trimmed]

    if (response) {
      response.forEach((text) => nextLines.push({ type: "output", text }))
      onCommandRun?.(lab.id, trimmed)
    } else if (trimmed !== "") {
      nextLines.push({ type: "error", text: `bash: ${trimmed}: comando no encontrado` })
    }

    nextLines.push({ type: "gap", text: "" })
    setLines(nextLines)
    setHistory((value) => [cmd, ...value])
    setHistoryIdx(-1)
    setInput("")
  }

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      handleCommand(input)
    }

    if (event.key === "ArrowUp") {
      event.preventDefault()
      const idx = Math.min(historyIdx + 1, history.length - 1)
      setHistoryIdx(idx)
      setInput(history[idx] || "")
    }

    if (event.key === "ArrowDown") {
      event.preventDefault()
      const idx = Math.max(historyIdx - 1, -1)
      setHistoryIdx(idx)
      setInput(idx === -1 ? "" : history[idx])
    }
  }

  const lineColor = (type) => {
    if (type === "input") return "text-emerald-300"
    if (type === "error") return "text-red-400"
    return "text-slate-300"
  }

  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-slate-800 bg-[#050a14] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]"
      onClick={() => inputRef.current?.focus()}
    >
      <div className="border-b border-slate-800 bg-[var(--bg-surface)] px-4 py-3">
        <div className="mb-2 flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-red-500/70" />
          <div className="h-3 w-3 rounded-full bg-amber-400/70" />
          <div className="h-3 w-3 rounded-full bg-emerald-500/70" />
          <span className="ml-3 font-mono text-xs text-slate-400">sandbox://{lab.id}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {lab.quickActions.map((action) => (
            <button
              key={action}
              onClick={(event) => {
                event.stopPropagation()
                handleCommand(action)
              }}
              className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 font-mono text-[11px] text-slate-300 hover:border-amber-500/30 hover:text-amber-200"
            >
              {action}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 font-mono text-sm">
        {lines.map((line, index) => (
          <div key={index} className={`min-h-[24px] leading-6 ${lineColor(line.type)}`}>
            {line.text || "\u00a0"}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-slate-800 bg-slate-950/70 px-4 py-3">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-[#020611] px-4 py-3">
          <span className="font-mono text-emerald-300">$</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent font-mono text-sm text-emerald-200 outline-none placeholder:text-slate-600"
            placeholder="escribe un comando..."
            autoFocus
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  )
}