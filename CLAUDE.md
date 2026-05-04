# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

SecLabs is an educational platform for learning AI pipeline security. The fictional scenario is "CityFlow AI" — a smart city traffic management system that has been compromised. Students investigate the attack, then run hands-on labs in isolated containers to reproduce and mitigate the vulnerabilities.

The platform has three operational states:
- **E1**: Live AI pipeline — all four pipeline nodes (sensor → edge → actuator → trainer) run as Docker containers; users trigger scenarios that simulate clean vs. vulnerable data flows.
- **E2**: Interactive lab — a per-lab isolated container is started on demand; students interact with it via a browser-embedded noVNC desktop.
- **E3**: Post-lab cleanup — the lab container is stopped and the E1 pipeline is restored.

## Architecture

### Infrastructure topology

The backend runs inside a VirtualBox VM (Ubuntu Server 22.04). The frontend can run on the host machine or inside the VM. All services are orchestrated with Docker Compose.

```
Host (or VM)  frontend (React/Vite, port 5173 dev / 3000 prod)
VM            backend orchestrator (FastAPI, port 8000)
VM            pipeline nodes: sensor (8001) → edge (8002) → actuator (8003) → trainer (8004)
VM            tutor-rag (FastAPI + Gemini, port 8010)
VM            lab containers (spun up on demand, noVNC on ephemeral port)
```

### Backend (`backend/`)

FastAPI application at `backend/main.py`. Routes in `backend/api/routes/`:
- `health` — `/health`
- `labs` — `/labs/{node}/start|stop|status|attack` — manages lab Docker containers
- `logs` — `/logs/labs/{node}` and `/logs/pipeline/{node}` — reads container logs
- `pipeline` — `/api/scenarios/{1-5}/run` — runs the E1 pipeline end-to-end
- `tutor` — `/api/rag/chat` — proxies to the tutor-rag service

Business logic in `backend/api/services/`:
- `docker_service.py` — starts/stops lab containers, queries their status via `container.exec_run()`, and builds noVNC URLs. The backend container mounts `/var/run/docker.sock` to control sibling containers.
- `pipeline_service.py` — orchestrates the four pipeline nodes over HTTP sequentially, collects latency metrics, and decides whether to trigger retraining based on drift score.

Lab container metadata (images, port, log paths, attack commands) lives in `backend/api/models/state.py`.

On startup, `main.py` checks for trained ML model artifacts and runs `scripts/train_traffic_models.py` if they are missing.

### Pipeline nodes (`pipeline_nodes/`)

Four independent FastAPI microservices called sequentially by `pipeline_service.py`:

| Node | Port | Role |
|------|------|------|
| `sensor_data` | 8001 | Reads traffic CSV, simulates IoT readings (clean/vulnerable mode) |
| `edge_preprocessing` | 8002 | Feature engineering, computes `congestion_score` |
| `actuator` | 8003 | ML inference, produces traffic light actions |
| `model_trainer` | 8004 | Stores feature rows in SQLite, retrains model when drift threshold exceeded |

Each node accepts a `mode` parameter (`"clean"` or `"vulnerable"`) that controls whether it applies security controls. Scenario 1 = all nodes vulnerable, Scenario 5 = all clean.

### Lab containers (`labs/`)

Lab containers provide a full GUI environment for students. They are built from `labs/base-novnc/` (noVNC + VNC server + supervisord) and extend it with lab-specific files.

Each lab image runs:
- A local vulnerable Flask app (`vulnerable_app.py`) on port 5000 **inside** the container
- Lab scripts (`poison_data.py`, `validate_defense.py`, `enable_defense.py`, `reset_lab.py`) on the Desktop
- noVNC on port 6080, exposed on a random host port

The backend queries lab status by running `urllib.request.urlopen('http://127.0.0.1:5000/status')` inside the container via `exec_run`, so lab metrics are read from within the container—not from the host network.

### RAG Tutor service (`services/tutor_rag/`)

Standalone FastAPI service using the Google Gemini API (`google-genai`). Reads `.md` files from a `knowledge_base/` directory and appends them as context to the system prompt. Requires `GEMINI_API_KEY` or `GOOGLE_API_KEY` in `backend/.env`.

### Frontend (`frontend/`)

React 19 + Vite + Tailwind CSS. No client-side router — the entire app is a single page that swaps panels based on `activeItemId` state in `App.jsx`.

**State management**: All journey state (active item, step progress, quiz answers, completion flags) lives in `App.jsx` as a single `items` array initialized from `frontend/src/data/journey.js`. There is no server-side session state.

**Content**: `frontend/src/data/journey.js` is the single source of truth for all scenario stories, lab guide steps, expected keywords, and quiz questions. Adding a new scenario or lab means adding a new entry here.

**Lab runtime hook**: `frontend/src/hooks/useLabRuntime.js` manages the lab container lifecycle — calls `POST /labs/{id}/start`, then polls `/labs/{id}/status` (every 3 s) and `/logs/labs/{id}` (every 1.2 s). Metrics are derived both from the status endpoint and by pattern-matching log lines (`buildRuntimeFromLogs`).

**Layout routing** (`WorkspacePanel`): routes to `LabDashboard`, `ScenarioWorkspace`, `LabScenarioIntro`, or `LabRuntimeWorkspace` based on item type. `LabRuntimeWorkspace` is a split view: left = noVNC iframe, right = tabbed panel (Guide / Logs / Metrics / Quiz).

## Development commands

### Frontend

```bash
cd frontend
npm install
npm run dev        # Dev server → http://localhost:5173
npm run build      # Production build → frontend/dist/
npm run lint       # ESLint
npm run preview    # Preview production build
```

`VITE_API_BASE_URL` in `frontend/.env` sets the backend URL (defaults to `http://localhost:8000`).

### Backend (run inside the VM)

```bash
source backend/.venv/bin/activate   # created by setup.sh
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Full platform with Docker Compose (inside VM)

```bash
# Build and start all services
docker compose up --build

# Build lab Docker images (required before starting any lab)
docker compose --profile labs-build build

# Stop everything
docker compose down
```

### Build a specific lab image manually

```bash
docker build -t lab-base-novnc ./labs/base-novnc   # base image must exist first
docker build -t seclabs-lab1:vuln ./labs/sensor-data
```

## Git workflow

Two fixed branches feed into `dev`, which feeds into `main`:
- `feature/backend-glaira` — backend, infrastructure, lab containers
- `feature/frontend-zineb` — frontend

PRs target `dev` (not `main`). After merging, re-sync the feature branch with `dev`. Follow [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`.

## Key environment variables

| Variable | File | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | `frontend/.env` | Backend URL for the React app |
| `GOOGLE_API_KEY` / `GEMINI_API_KEY` | `backend/.env` | Gemini API key for the RAG tutor |
| `NOVNC_HOST` | runtime | Hostname embedded in noVNC URLs returned to the browser |
| `PIPELINE_*_URL` | runtime | Override URLs for each pipeline node |

## Adding a new lab

1. Add an entry to `frontend/src/data/journey.js` with `type: "lab"`, a `guide.steps` array, and a `quiz` array.
2. Create `labs/{lab-name}/Dockerfile` (extend `lab-base-novnc`) and `lab_files/`.
3. Register the image and container name in `backend/api/models/state.py` under `LABS`.
4. Build the image: `docker compose --profile labs-build build` or a manual `docker build`.
