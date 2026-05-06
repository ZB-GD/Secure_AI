#!/usr/bin/env bash
set -euo pipefail

# SecLabs deployment script
#
# Use this on the university server after cloning the project.
# It does five things:
#   1. Updates the current branch from its Git upstream.
#   2. Stops disposable lab containers and long-running platform services.
#   3. Rebuilds the main platform images and the lab images.
#   4. Starts only the long-running platform services with fresh containers.
#   5. Removes dangling build layers/images left behind by rebuilds.
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
#   SKIP_GIT_PULL=1      Do not fetch/pull the repository.
#   ALLOW_DIRTY=1        Allow deploy even if the worktree has local changes.
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

build_args=(--pull)
if [ "$NO_CACHE" = "1" ]; then
  build_args+=(--no-cache)
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

update_repo() {
  if [ "${SKIP_GIT_PULL:-0}" = "1" ]; then
    echo "Skipping Git update because SKIP_GIT_PULL=1."
    return
  fi

  if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "Not a Git worktree. Skipping Git update."
    return
  fi

  if [ "${ALLOW_DIRTY:-0}" != "1" ] && [ -n "$(git status --porcelain)" ]; then
    echo "Worktree has local changes. Commit/stash them, or rerun with ALLOW_DIRTY=1." >&2
    git status --short
    exit 1
  fi

  local upstream
  upstream="$(git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null || true)"
  if [ -z "$upstream" ]; then
    echo "Current branch has no upstream. Skipping Git pull."
    return
  fi

  echo "Fetching latest repository state..."
  git fetch --prune

  echo "Updating current branch from $upstream..."
  git pull --ff-only
}

require_command git
require_command docker

echo "[1/6] Updating repository..."
update_repo

echo "[2/6] Stopping current runtime..."
stop_lab_containers
docker compose down --remove-orphans

echo "[3/6] Building lab base image..."
docker compose --profile labs-build build "${build_args[@]}" lab-base-novnc

echo "[4/6] Building SecLabs platform and lab images..."
docker compose --profile labs-build build "${build_args[@]}"

echo "[5/6] Starting SecLabs platform services with fresh containers..."
docker compose up -d --force-recreate --remove-orphans

if [ "$PRUNE_IMAGES" = "1" ]; then
  echo "[6/6] Cleaning dangling Docker images..."
  docker image prune -f
else
  echo "[6/6] Skipping Docker image cleanup because PRUNE_IMAGES=0."
fi

echo
echo "SecLabs is running."
echo "Frontend: http://localhost:3000"
echo "Backend health: http://localhost:8000/health"
