#!/usr/bin/env bash
set -euo pipefail

# Stop the full SecLabs runtime.
#
# docker compose down only stops the long-running platform containers. The
# backend starts lab sandboxes directly through the Docker API, so stop those
# lab-phase-* containers explicitly before bringing Compose down.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

mapfile -t RUNNING_LABS < <(docker ps -q --filter "name=^/lab-phase-")
if [ "${#RUNNING_LABS[@]}" -gt 0 ]; then
  echo "Stopping lab containers: ${RUNNING_LABS[*]}"
  docker stop "${RUNNING_LABS[@]}"
else
  echo "No running lab containers found."
fi

echo "Stopping SecLabs platform services..."
docker compose down --remove-orphans

echo "SecLabs stopped."
