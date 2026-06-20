# Lab containers

Isolated, browser-accessible containers that give students a full Linux desktop to reproduce and mitigate an attack hands-on (the **E2** state described in the root README).

## Base image

`base-novnc/` builds the shared foundation every lab extends: Xfce4 desktop + x11vnc + noVNC + supervisord, all on Ubuntu 20.04. It exposes port 6080 (noVNC) and starts `supervisord`, which runs Xvfb, the Xfce4 session, x11vnc, and the websockify/noVNC bridge.

```bash
docker build -t lab-base-novnc ./labs/base-novnc
```

## Lab images

Each lab (currently `sensor-data/`) extends `lab-base-novnc` with:

- A local vulnerable Flask app (`lab_files/vulnerable_app.py`), copied onto the Desktop and run as an extra supervisord program on port 5000 **inside** the container.
- Lab scripts (`poison_data.py`, `validate_defense.py`, `enable_defense.py`, `reset_lab.py`), symlinked onto both the Desktop and `~/scripts/`.
- `start-lab.sh`, the container entrypoint: it seeds `/home/lab` from `/opt/lab-home` on first boot (so a reset never has to rebuild the image) and then starts `supervisord`.

```bash
docker build -t seclabs-lab1:vuln ./labs/sensor-data
```

The backend (`backend/api/services/docker_service.py`) starts/stops these containers and reads their status by running `urllib.request.urlopen('http://127.0.0.1:5000/status')` **inside** the container via `exec_run`, not over the host network.

## Adding a new lab

1. Add an entry to `frontend/src/data/journey.js` with `type: "lab"`, a `guide.steps` array, and a `quiz` array.
2. Create `labs/{lab-name}/Dockerfile` (extending `lab-base-novnc`) and its `lab_files/`.
3. Register the image and container name in `backend/api/models/state.py` under `LABS`.
4. Build the image: `docker compose --profile labs-build build`, or a manual `docker build`.
