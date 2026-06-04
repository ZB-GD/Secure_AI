#!/usr/bin/env bash
set -euo pipefail

# SecLabs deployment script
#
# Use this after editing the local project files.
# It does six things:
#   1. Stops disposable lab containers and long-running platform services.
#   2. Patches known lab image issues before building.
#   3. Rebuilds the main platform images and the lab images from local files.
#   4. Starts only the long-running platform services with fresh containers.
#   5. Removes dangling build layers/images left behind by rebuilds.
#   6. Smoke-tests the lab1 container with production security flags.
#
# The lab images are built through the `labs-build` Compose profile, but the
# lab containers themselves are not kept running. The backend starts disposable
# lab containers dynamically when a student opens a lab from the web UI.
#
# Usage:
#   chmod +x deploy.sh
#   ./deploy.sh
#
# Optional environment flags:
#   TARGET=all           What to rebuild: all, frontend, backend, lab, pipeline, rag.
#   NO_CACHE=0           Reuse Docker build cache. Default is 1.
#   PULL_BASE=1          Pull public Docker base images before building.
#   PRUNE_IMAGES=0       Skip dangling Docker image cleanup. Default is 1.
#   PRUNE_BUILD_CACHE=0  Skip Docker build-cache cleanup. Default is 1.
#   SMOKE_TEST=0         Skip lab container smoke test after build. Default is 1.
#
# After it finishes:
#   Frontend: http://<server-ip>:3000
#   Backend health check: http://<server-ip>:8000/health

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

NO_CACHE="${NO_CACHE:-1}"
PULL_BASE="${PULL_BASE:-0}"
PRUNE_IMAGES="${PRUNE_IMAGES:-1}"
PRUNE_BUILD_CACHE="${PRUNE_BUILD_CACHE:-1}"
TARGET="${TARGET:-all}"
SMOKE_TEST="${SMOKE_TEST:-1}"

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

require_command docker

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

if [ "$PRUNE_IMAGES" = "1" ]; then
  echo "[5/6] Cleaning dangling Docker images..."
  docker image prune -f
else
  echo "[5/6] Skipping Docker image cleanup because PRUNE_IMAGES=0."
fi

if [ "$PRUNE_BUILD_CACHE" = "1" ]; then
  echo "[6/6] Cleaning dangling Docker build cache..."
  docker builder prune -f --filter "type=exec.cachemount" >/dev/null 2>&1 || true
  docker builder prune -f >/dev/null 2>&1 || true
else
  echo "[6/6] Skipping Docker build-cache cleanup because PRUNE_BUILD_CACHE=0."
fi

if [ "$SMOKE_TEST" = "1" ] && { [ "$TARGET" = "all" ] || [ "$TARGET" = "lab" ]; }; then
  echo ""
  echo "Smoke-testing lab1 container..."
  smoke_test_lab
fi

echo
echo "SecLabs is running."
echo "Frontend: http://localhost:3000"
echo "Backend health: http://localhost:8000/health"
