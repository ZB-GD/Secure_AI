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
#   TARGET=all           What to rebuild: all, frontend, backend, lab, pipeline, rag.
#   NO_CACHE=0           Reuse Docker build cache. Default is 1.
#   PULL_BASE=1          Pull public Docker base images before building.
#   PRUNE_IMAGES=0       Skip dangling Docker image cleanup. Default is 1.
#   PRUNE_BUILD_CACHE=0  Skip Docker build-cache cleanup. Default is 1.
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

require_command docker

echo "[1/5] Stopping current runtime..."
if [ "$TARGET" = "all" ] || [ "$TARGET" = "lab" ] || [ "$TARGET" = "lab-base" ]; then
  stop_lab_containers
fi
compose_down

echo "[2/5] Building target: $TARGET"
build_target

echo "[3/5] Starting SecLabs platform services with fresh containers..."
docker compose up -d --force-recreate --remove-orphans

if [ "$PRUNE_IMAGES" = "1" ]; then
  echo "[4/5] Cleaning dangling Docker images..."
  docker image prune -f
else
  echo "[4/5] Skipping Docker image cleanup because PRUNE_IMAGES=0."
fi

if [ "$PRUNE_BUILD_CACHE" = "1" ]; then
  echo "[5/5] Cleaning dangling Docker build cache..."
  docker builder prune -f --filter "type=exec.cachemount" >/dev/null 2>&1 || true
  docker builder prune -f >/dev/null 2>&1 || true
else
  echo "[5/5] Skipping Docker build-cache cleanup because PRUNE_BUILD_CACHE=0."
fi

echo
echo "SecLabs is running."
echo "Frontend: http://localhost:3000"
echo "Backend health: http://localhost:8000/health"
