import express from "express"
import cors from "cors"
import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { VM_MAP } from "./vmMap.js"

const app = express()
const execFileAsync = promisify(execFile)

app.use(cors({ origin: "http://localhost:5173" }))
app.use(express.json())

async function runVBox(args) {
  const { stdout, stderr } = await execFileAsync("VBoxManage", args)
  return { stdout, stderr }
}

async function getVmState(vmName) {
  const { stdout } = await runVBox(["showvminfo", vmName, "--machinereadable"])
  const line = stdout
    .split("\n")
    .find((l) => l.startsWith("VMState="))

  return line ? line.split("=")[1].replace(/"/g, "") : "unknown"
}

async function ensurePoweredOff(vmName) {
  try {
    const state = await getVmState(vmName)
    if (state === "running" || state === "paused" || state === "stuck") {
      await runVBox(["controlvm", vmName, "poweroff"])
      await new Promise((resolve) => setTimeout(resolve, 1500))
    }
  } catch {
    // ignorar para simplificar el POC
  }
}

app.get("/health", (_req, res) => {
  res.json({ ok: true })
})

app.get("/labs", (_req, res) => {
  res.json(VM_MAP)
})

app.get("/labs/:labId/status", async (req, res) => {
  const lab = VM_MAP[req.params.labId]
  if (!lab) return res.status(404).json({ error: "Lab no encontrado" })

  try {
    const state = await getVmState(lab.vmName)
    res.json({
      labId: req.params.labId,
      env: lab.env,
      vmName: lab.vmName,
      state,
      remoteUrl: lab.noVncUrl
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post("/labs/:labId/start", async (req, res) => {
  const lab = VM_MAP[req.params.labId]
  if (!lab) return res.status(404).json({ error: "Lab no encontrado" })

  try {
    const state = await getVmState(lab.vmName)
    if (state !== "running") {
      await runVBox(["startvm", lab.vmName, "--type", "headless"])
    }

    res.json({
      ok: true,
      action: "start",
      vmName: lab.vmName,
      env: lab.env,
      remoteUrl: lab.noVncUrl,
      state: await getVmState(lab.vmName)
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post("/labs/:labId/reset", async (req, res) => {
  const lab = VM_MAP[req.params.labId]
  if (!lab) return res.status(404).json({ error: "Lab no encontrado" })

  try {
    await ensurePoweredOff(lab.vmName)
    await runVBox(["snapshot", lab.vmName, "restore", lab.snapshot])
    await runVBox(["startvm", lab.vmName, "--type", "headless"])

    res.json({
      ok: true,
      action: "reset",
      vmName: lab.vmName,
      env: lab.env,
      remoteUrl: lab.noVncUrl,
      state: await getVmState(lab.vmName)
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post("/labs/:labId/stop", async (req, res) => {
  const lab = VM_MAP[req.params.labId]
  if (!lab) return res.status(404).json({ error: "Lab no encontrado" })

  try {
    await ensurePoweredOff(lab.vmName)

    res.json({
      ok: true,
      action: "stop",
      vmName: lab.vmName,
      env: lab.env,
      state: await getVmState(lab.vmName)
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.listen(8787, "127.0.0.1", () => {
  console.log("vm-agent escuchando en http://127.0.0.1:8787")
})