FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# Base tools for an interactive ingestion lab.
RUN apt-get update && apt-get install -y --no-install-recommends \
	bash \
	ca-certificates \
	curl \
	less \
	nano \
	python3 \
	python3-pip \
	ttyd \
	&& rm -rf /var/lib/apt/lists/*

WORKDIR /lab

# Minimal playground structure for phase 1 experiments.
RUN mkdir -p /lab/input /lab/output /lab/scripts

EXPOSE 7681

# -W keeps websocket-only mode, matching the ws:// URL returned by backend.
CMD ["ttyd", "-W", "-p", "7681", "bash"]
