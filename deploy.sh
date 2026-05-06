#!/usr/bin/env bash
set -euo pipefail

# SecLabs deployment script
#
# Use this after editing the local project files.
# It does four things:
#   1. Stops disposable lab containers and long-running platform services.
#   2. Rebuilds the main platform images and the lab images from local files.
#   3. Starts only the long-running platform services with fresh containers.
#   4. Removes dangling build layers/images left behind by rebuilds.
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
#   NO_CACHE=0           Reuse Docker build cache. Default is 1.
#   PRUNE_IMAGES=0       Skip dangling Docker image cleanup. Default is 1.
#
# After it finishes:
#   Frontend: http://<server-ip>:3000
#   Backend health check: http://<server-ip>:8000/health

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

NO_CACHE="${NO_CACHE:-1}"
PRUNE_IMAGES="${PRUNE_IMAGES:-1}"

pull_build_args=(--pull)
local_build_args=()
if [ "$NO_CACHE" = "1" ]; then
  pull_build_args+=(--no-cache)
  local_build_args+=(--no-cache)
fi

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

stop_lab_containers() {
  mapfile -t LAB_CONTAINERS < <(docker ps -aq --filter "name=^/lab-phase-")
  if [ "${#LAB_CONTAINERS[@]}" -gt 0 ]; then
    echo "Stopping/removing lab containers: ${LAB_CONTAINERS[*]}"
    docker stop "${LAB_CONTAINERS[@]}" >/dev/null 2>&1 || true
    docker rm -f "${LAB_CONTAINERS[@]}" >/dev/null 2>&1 || true
  else
    echo "No lab containers found."
  fi
}

require_command docker

echo "[1/5] Stopping current runtime..."
stop_lab_containers
docker compose down --remove-orphans

echo "[2/5] Building lab base image..."
docker compose --profile labs-build build "${pull_build_args[@]}" lab-base-novnc

echo "[3/5] Building SecLabs platform and lab images from local files..."
docker compose build "${pull_build_args[@]}"
docker compose --profile labs-build build "${local_build_args[@]}" lab1

echo "[4/5] Starting SecLabs platform services with fresh containers..."
docker compose up -d --force-recreate --remove-orphans

if [ "$PRUNE_IMAGES" = "1" ]; then
  echo "[5/5] Cleaning dangling Docker images..."
  docker image prune -f
else
  echo "[5/5] Skipping Docker image cleanup because PRUNE_IMAGES=0."
fi

echo
echo "SecLabs is running."
echo "Frontend: http://localhost:3000"
echo "Backend health: http://localhost:8000/health"
