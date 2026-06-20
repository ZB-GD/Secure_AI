# Pipeline nodes

Four independent FastAPI microservices that model the CityFlow AI traffic pipeline. The backend's `pipeline_service.py` calls them over HTTP in sequence to run a scenario (`sensor → edge → actuator → trainer`).

| Node                 | Port | Role                                                                        |
| -------------------- | ---- | ---------------------------------------------------------------------------- |
| `sensor_data`        | 8001 | Reads the Metro Interstate Traffic Volume dataset, simulates IoT readings    |
| `edge_preprocessing` | 8002 | Feature engineering, computes `congestion_score`                            |
| `actuator`            | 8003 | ML inference, produces traffic light actions                                |
| `model_trainer`      | 8004 | Stores feature rows in SQLite, retrains the model when drift exceeds threshold |

Each node accepts a `mode` parameter (`"clean"` or `"vulnerable"`) that toggles whether it applies security controls (input validation, anomaly detection, artifact integrity checks, etc.). Scenario 1 runs all four nodes in vulnerable mode; scenario 5 runs all four clean.

## Shared code

`paths.py` centralizes filesystem paths (model directory, dataset, SQLite DB) so each node resolves them the same way whether running locally or inside its container, where these paths are overridden via the `MODELS_DIR`/`DB_PATH` environment variables (see each `Dockerfile`).

## Running standalone

Each node is a normal FastAPI app (`app:server`). For local development:

```bash
uvicorn app:server --reload --port 8001   # from pipeline_nodes/sensor_data/
```

`docker-compose.pipeline.yml` runs the full four-node pipeline in isolation (vulnerable mode, scenario 1) without the rest of the platform:

```bash
docker compose -f pipeline_nodes/docker-compose.pipeline.yml up --build
```

## Building images

Each node's `Dockerfile` builds from the repo root context (it copies `backend/requirements.txt` and, for `sensor_data`, the dataset CSV), so build from the repository root:

```bash
docker build -f pipeline_nodes/actuator/Dockerfile -t seclabs-actuator .
```
