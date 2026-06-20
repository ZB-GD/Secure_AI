# Backend

FastAPI orchestrator for the SecLabs platform. It exposes the API the frontend talks to, drives the E1/E2/E3 lab lifecycle, runs the live pipeline scenarios, and proxies tutor chat requests.

## Layout

```
main.py                 # App factory, CORS, startup model bootstrap
api/
  routes/               # HTTP endpoints (health, labs, logs, pipeline, trainer, tutor)
  services/             # Business logic (docker_service, pipeline_service, log_service)
  models/                # Lab container metadata (state.py)
  auth/                 # JWT auth: router, dependencies, database, service
scripts/                # Model training and Docker build helpers
tests/                  # pytest suite
```

## Routes

| Router      | Base path                          | Responsibility                                      |
| ----------- | ----------------------------------- | ---------------------------------------------------- |
| `health`    | `/health`                           | Liveness check                                       |
| `labs`      | `/labs/{node}`                      | Start/stop/status lab containers, inject attacks     |
| `logs`      | `/logs/labs/{node}`, `/logs/pipeline/{node}` | Read container/pipeline logs                |
| `pipeline`  | `/api/scenarios/{1-5}/run`          | Run the E1 pipeline end-to-end across all four nodes |
| `trainer`   | `/api/trainer/*`                    | Manual retrain trigger and training status           |
| `tutor`     | `/api/rag/chat`                     | Proxy to the `tutor_rag` service                     |
| `auth`      | `/auth/*`                           | Login, registration, password change, admin whitelist|

`docker_service.py` controls sibling lab containers through the Docker SDK, mounting `/var/run/docker.sock`. `pipeline_service.py` calls the four `pipeline_nodes` services over HTTP in sequence and decides whether to trigger retraining based on the reported drift score.

## Running locally

```bash
source .venv/bin/activate   # created by setup.sh
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

On startup, `main.py` checks for trained model artifacts under `models/` and runs `scripts/train_traffic_models.py` if they are missing.

## Tests

```bash
pytest tests/
```

## Environment variables

`CORS_ORIGINS` configures allowed frontend origins. JWT secret and admin seed credentials are read by `api/auth/`. The tutor proxy forwards to `services/tutor_rag`, which needs its own `GROQ_API_KEY` (see [services/tutor_rag/README.md](../services/tutor_rag/README.md)).

Note: `backend/.env.example` still documents `GOOGLE_API_KEY` for the RAG tutor; the service was migrated to Groq and now reads `GROQ_API_KEY` instead.
