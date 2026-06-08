#!/usr/bin/env bash
set -euo pipefail

# SecLabs deployment script
#
# FIRST DEPLOYMENT — run once in order:
#   1. Edit .env (or: cp .env.virtech.example .env and replace XXX with your
#      VM's last IP octet). Make sure JWT_SECRET and ADMIN_PASSWORD are set.
#   2. Add your GOOGLE_API_KEY to backend/.env.
#   3. ./deploy.sh
#
# REDEPLOYMENT — after editing source files:
#   ./deploy.sh                    # rebuild everything (cache on, fast)
#   NO_CACHE=1 ./deploy.sh         # clean rebuild (when deps / base images change)
#   TARGET=frontend ./deploy.sh    # rebuild only the frontend
#   TARGET=backend  ./deploy.sh    # rebuild only the backend
#   TARGET=lab      ./deploy.sh    # rebuild only lab images
#   TARGET=rag      ./deploy.sh    # rebuild only the tutor-rag service
#   TARGET=pipeline ./deploy.sh    # rebuild only pipeline nodes
#
# Optional environment flags:
#   TARGET=all           What to rebuild: all, frontend, backend, lab, pipeline, rag. (default: all)
#   NO_CACHE=0           Use Docker build cache. Set 1 for a clean build. (default: 0)
#   PULL_BASE=0          Pull latest public base images before building. (default: 0)
#   PRUNE_IMAGES=1       Remove dangling Docker images after build. (default: 1)
#   PRUNE_BUILD_CACHE=0  Remove Docker build cache after build. (default: 0)
#   SMOKE_TEST=1         Run lab container smoke test after build. (default: 1)
#   WAIT_HEALTHY=1       Wait for platform services to pass healthchecks. (default: 1)

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

NO_CACHE="${NO_CACHE:-0}"
PULL_BASE="${PULL_BASE:-0}"
PRUNE_IMAGES="${PRUNE_IMAGES:-1}"
PRUNE_BUILD_CACHE="${PRUNE_BUILD_CACHE:-0}"
TARGET="${TARGET:-all}"
SMOKE_TEST="${SMOKE_TEST:-1}"
WAIT_HEALTHY="${WAIT_HEALTHY:-1}"

public_build_args=()
local_build_args=()
if [ "$PULL_BASE" = "1" ]; then
  public_build_args+=(--pull)
fi
if [ "$NO_CACHE" = "1" ]; then
  public_build_args+=(--no-cache)
  local_build_args+=(--no-cache)
fi

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

# Validate .env exists and required variables are set.
# Generates JWT_SECRET automatically when missing.
check_env() {
  if [ ! -f "$ROOT_DIR/.env" ]; then
    echo "" >&2
    echo "ERROR: .env not found." >&2
    echo "" >&2
    echo "  Local deployment:    copy .env.virtech.example → .env, clear the" >&2
    echo "  Virtech-specific lines, and fill in JWT_SECRET + ADMIN_PASSWORD." >&2
    echo "" >&2
    echo "  Virtech (nattech):   cp .env.virtech.example .env  and replace" >&2
    echo "  XXX with the last octet of your VM's IP (e.g. 33 for 172.168.4.33)." >&2
    echo "" >&2
    exit 1
  fi

  local jwt_secret admin_password novnc_port_pool
  jwt_secret=$(grep -E '^JWT_SECRET=' "$ROOT_DIR/.env" | cut -d= -f2- | tr -d '"' || true)
  admin_password=$(grep -E '^ADMIN_PASSWORD=' "$ROOT_DIR/.env" | cut -d= -f2- | tr -d '"' || true)
  novnc_port_pool=$(grep -E '^NOVNC_PORT_POOL=' "$ROOT_DIR/.env" | cut -d= -f2- | tr -d '"' || true)

  local ok=1

  if [ -z "$jwt_secret" ]; then
    echo "  JWT_SECRET not set — generating a random secret and writing it to .env..."
    local new_secret
    new_secret=$(python3 -c "import secrets; print(secrets.token_hex(32))" 2>/dev/null \
      || openssl rand -hex 32 2>/dev/null \
      || head -c 32 /dev/urandom | xxd -p | tr -d '\n')
    if grep -qE '^JWT_SECRET=' "$ROOT_DIR/.env" 2>/dev/null; then
      sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$new_secret|" "$ROOT_DIR/.env"
    else
      echo "JWT_SECRET=$new_secret" >> "$ROOT_DIR/.env"
    fi
    echo "  JWT_SECRET written to .env."
  fi

  if [ -z "$admin_password" ]; then
    echo "" >&2
    echo "ERROR: ADMIN_PASSWORD is not set in .env." >&2
    echo "  Add:  ADMIN_PASSWORD=<your-password>" >&2
    ok=0
  fi

  if [ -n "$novnc_port_pool" ] && echo "$novnc_port_pool" | grep -q 'XX'; then
    echo ""
    echo "WARNING: NOVNC_PORT_POOL still contains the 'XX' placeholder in .env."
    echo "  Replace XXX with the last octet of your VM's IP before students open labs."
  fi

  if [ ! -f "$ROOT_DIR/backend/.env" ]; then
    echo ""
    echo "WARNING: backend/.env not found."
    echo "  The RAG tutor will fail without GOOGLE_API_KEY."
    echo "  Create backend/.env with:  GOOGLE_API_KEY=<your-key>"
  fi

  if [ "$ok" = "0" ]; then
    exit 1
  fi
}

build_target() {
  case "$TARGET" in
    all)
      echo "Building lab base image..."
      docker compose --profile labs-build build "${public_build_args[@]}" lab-base-novnc
      echo "Building platform images..."
      docker compose build "${public_build_args[@]}"
      echo "Building lab images..."
      docker compose --profile labs-build build "${local_build_args[@]}" lab1
      ;;
    frontend)
      docker compose build "${public_build_args[@]}" frontend
      ;;
    backend)
      docker compose build "${public_build_args[@]}" backend
      ;;
    rag)
      docker compose build "${public_build_args[@]}" tutor-rag
      ;;
    pipeline)
      docker compose build "${public_build_args[@]}" model-init sensor edge actuator trainer
      ;;
    lab)
      if ! docker image inspect lab-base-novnc >/dev/null 2>&1; then
        echo "lab-base-novnc is missing; building it first..."
        docker compose --profile labs-build build "${public_build_args[@]}" lab-base-novnc
      fi
      docker compose --profile labs-build build "${local_build_args[@]}" lab1
      ;;
    lab-base)
      docker compose --profile labs-build build "${public_build_args[@]}" lab-base-novnc
      ;;
    *)
      echo "Unknown TARGET='$TARGET'. Use all, frontend, backend, rag, pipeline, lab, or lab-base." >&2
      exit 1
      ;;
  esac
}

stop_lab_containers() {
  mapfile -t LAB_CONTAINERS < <(
    {
      docker ps -aq --filter "label=seclabs.lab=true"
      docker ps -aq --filter "name=^/lab-phase-"
    } | sort -u
  )
  if [ "${#LAB_CONTAINERS[@]}" -gt 0 ]; then
    echo "Stopping/removing lab containers: ${LAB_CONTAINERS[*]}"
    docker stop "${LAB_CONTAINERS[@]}" >/dev/null 2>&1 || true
    docker rm -f "${LAB_CONTAINERS[@]}" >/dev/null 2>&1 || true
  else
    echo "No lab containers found."
  fi
}

compose_down() {
  # Include the labs-build profile so temporary/profile service containers are
  # removed too, not only the default long-running platform services.
  docker compose --profile labs-build down --remove-orphans
}

# Patch known issues in lab source files before the Docker build bakes them in.
#
# CMD exec-form guard: if a Dockerfile accidentally uses CMD ["/path/to/script.sh"]
# (exec form), future kernels with --read-only may block the two-step shebang exec.
# CMD ["sh", "..."] avoids this by exec'ing a compiled binary, not a script.
patch_lab_files() {
  local df="$ROOT_DIR/labs/sensor-data/Dockerfile"
  local patched=0

  if [ -f "$df" ] && grep -qF 'CMD ["/usr/local/bin/start-lab.sh"]' "$df"; then
    echo "  [patch] Dockerfile CMD: exec-form script → sh form"
    sed -i 's|CMD \["/usr/local/bin/start-lab.sh"\]|CMD ["sh", "/usr/local/bin/start-lab.sh"]|' "$df"
    patched=1
  fi

  if [ "$patched" = "0" ]; then
    echo "  No patches needed."
  fi
}

# Poll until all core platform containers report healthy or the timeout expires.
# Non-fatal: prints a warning and continues so the smoke test can give more detail.
wait_for_healthy() {
  local timeout=120
  local services=(seclabs-sensor seclabs-edge seclabs-actuator seclabs-trainer seclabs-tutor-rag seclabs-backend)
  local deadline=$((SECONDS + timeout))

  echo "  Waiting up to ${timeout}s for services to become healthy..."
  while [ "$SECONDS" -lt "$deadline" ]; do
    local all_healthy=1
    for svc in "${services[@]}"; do
      local state
      state=$(docker inspect -f '{{.State.Health.Status}}' "$svc" 2>/dev/null || echo "missing")
      if [ "$state" != "healthy" ]; then
        all_healthy=0
        break
      fi
    done
    if [ "$all_healthy" = "1" ]; then
      echo "  All services healthy."
      return 0
    fi
    sleep 3
  done

  echo "  WARNING: one or more services did not become healthy within ${timeout}s."
  echo "  Check with: docker compose ps"
}

# Start the lab1 image with the exact same security flags the backend uses and
# wait up to 45 seconds for noVNC to serve /vnc.html. Prints container logs on
# failure so the root cause is visible without a separate docker logs call.
smoke_test_lab() {
  local image="seclabs-lab1:vuln"

  if ! docker image inspect "$image" >/dev/null 2>&1; then
    echo "  Skipping: image $image not found."
    return 0
  fi

  if ! command -v curl >/dev/null 2>&1; then
    echo "  Skipping: curl not available for HTTP check."
    return 0
  fi

  echo "  Starting smoke-test container (production security flags)..."
  local cid
  cid=$(docker run -d \
    --cap-drop ALL \
    --read-only \
    --tmpfs /tmp \
    --tmpfs /run \
    --tmpfs "/home/lab:rw,nosuid,nodev,size=256m,uid=1000,gid=1000,mode=755" \
    -p 0:6080 \
    --user 1000:1000 \
    --memory 768m \
    --pids-limit 200 \
    "$image")

  local host_port
  host_port=$(docker port "$cid" 6080/tcp 2>/dev/null | head -1 | awk -F: '{print $NF}' || true)
  echo "  Container $cid, noVNC on host port ${host_port:-unknown}. Waiting up to 45s..."

  local deadline=$((SECONDS + 45))
  while [ "$SECONDS" -lt "$deadline" ]; do
    local state
    state=$(docker inspect -f '{{.State.Status}}' "$cid" 2>/dev/null || echo "gone")
    if [ "$state" != "running" ]; then
      echo "  FAIL: container exited early (status: $state). Logs:"
      echo "---"
      docker logs --tail 50 "$cid" 2>&1 || true
      echo "---"
      docker rm -f "$cid" >/dev/null 2>&1 || true
      echo "  Fix the issue above, then re-run: NO_CACHE=1 TARGET=lab ./deploy.sh"
      return 1
    fi
    if [ -n "$host_port" ] && curl -sf "http://127.0.0.1:${host_port}/vnc.html" >/dev/null 2>&1; then
      echo "  PASS: noVNC is up on port ${host_port}. Stopping smoke-test container."
      docker stop "$cid" >/dev/null
      docker rm -f "$cid" >/dev/null 2>&1 || true
      return 0
    fi
    sleep 1
  done

  echo "  FAIL: noVNC did not respond within 45 seconds. Logs:"
  echo "---"
  docker logs --tail 50 "$cid" 2>&1 || true
  echo "---"
  docker stop "$cid" >/dev/null 2>&1 || true
  docker rm -f "$cid" >/dev/null 2>&1 || true
  return 1
}

# Print access URLs from .env (NOVNC_HOST for external host, port 8080 for frontend).
print_urls() {
  local host
  host=$(grep -E '^NOVNC_HOST=' "$ROOT_DIR/.env" 2>/dev/null | cut -d= -f2- | tr -d '"' || true)
  local admin_email
  admin_email=$(grep -E '^ADMIN_EMAIL=' "$ROOT_DIR/.env" 2>/dev/null | cut -d= -f2- | tr -d '"' || echo "admin@seclabs.local")

  echo "SecLabs is running."
  if [ -n "$host" ] && [ "$host" != "localhost" ]; then
    echo "  Frontend:   http://${host}:8080"
    echo "              (if behind NAT, use the mapped external port instead of 8080)"
  else
    echo "  Frontend:   http://localhost:8080"
  fi
  echo "  Backend:    http://localhost:8000/health"
  echo "  Admin user: ${admin_email}"
}

# ── Main ──────────────────────────────────────────────────────────────────────

require_command docker
check_env

echo "[1/6] Stopping current runtime..."
if [ "$TARGET" = "all" ] || [ "$TARGET" = "lab" ] || [ "$TARGET" = "lab-base" ]; then
  stop_lab_containers
fi
compose_down

if [ "$TARGET" = "all" ] || [ "$TARGET" = "lab" ]; then
  echo "[2/6] Patching lab files..."
  patch_lab_files
else
  echo "[2/6] Skipping lab file patches (TARGET=$TARGET)."
fi

echo "[3/6] Building target: $TARGET"
build_target

echo "[4/6] Starting SecLabs platform services with fresh containers..."
docker compose up -d --force-recreate --remove-orphans
if [ "$WAIT_HEALTHY" = "1" ]; then
  wait_for_healthy
fi

if [ "$PRUNE_IMAGES" = "1" ]; then
  echo "[5/6] Cleaning dangling Docker images..."
  docker image prune -f
else
  echo "[5/6] Skipping Docker image cleanup because PRUNE_IMAGES=0."
fi

if [ "$PRUNE_BUILD_CACHE" = "1" ]; then
  echo "[6/6] Cleaning Docker build cache..."
  docker builder prune -f --filter "type=exec.cachemount" >/dev/null 2>&1 || true
  docker builder prune -f >/dev/null 2>&1 || true
else
  echo "[6/6] Skipping Docker build-cache cleanup (PRUNE_BUILD_CACHE=0)."
fi

if [ "$SMOKE_TEST" = "1" ] && { [ "$TARGET" = "all" ] || [ "$TARGET" = "lab" ]; }; then
  echo ""
  echo "Smoke-testing lab1 container..."
  smoke_test_lab
fi

echo ""
print_urls
