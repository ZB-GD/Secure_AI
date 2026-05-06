#!/usr/bin/env bash
set -euo pipefail

# SecLabs deployment script
#
# Use this on the university server after cloning/updating the project.
# It does three things:
#   1. Stops stale disposable lab containers from previous runs.
#   2. Builds the main platform images and the lab images.
#   3. Starts only the long-running platform services.
#
# The lab images are built through the `labs-build` Compose profile, but the
# lab containers themselves are not kept running. The backend starts disposable
# lab containers dynamically when a student opens a lab from the web UI.
#
# Usage:
#   chmod +x deploy.sh
#   ./deploy.sh
#
# After it finishes:
#   Frontend: http://<server-ip>:3000
#   Backend health check: http://<server-ip>:8000/health

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

echo "[1/4] Stopping stale lab containers..."
mapfile -t RUNNING_LABS < <(docker ps -q --filter "name=^/lab-phase-")
if [ "${#RUNNING_LABS[@]}" -gt 0 ]; then
  echo "Stopping stale lab containers: ${RUNNING_LABS[*]}"
  docker stop "${RUNNING_LABS[@]}"
else
  echo "No stale lab containers found."
fi

echo "[2/4] Building lab base image..."
docker compose --profile labs-build build lab-base-novnc

echo "[3/4] Building SecLabs platform and lab images..."
docker compose --profile labs-build build

echo "[4/4] Starting SecLabs platform services..."
docker compose up -d --remove-orphans

echo
echo "SecLabs is running."
echo "Frontend: http://localhost:3000"
echo "Backend health: http://localhost:8000/health"
