#!/usr/bin/env bash
set -euo pipefail

# SecLabs deployment script
#
# Use this on the university server after cloning/updating the project.
# It does two things:
#   1. Builds the main platform images and the lab images.
#   2. Starts only the long-running platform services.
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

echo "[1/3] Building lab base image..."
docker compose --profile labs-build build lab-base-novnc

echo "[2/3] Building SecLabs platform and lab images..."
docker compose --profile labs-build build

echo "[3/3] Starting SecLabs platform services..."
docker compose up -d --remove-orphans

echo
echo "SecLabs is running."
echo "Frontend: http://localhost:3000"
echo "Backend health: http://localhost:8000/health"
