FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
	bash \
	ca-certificates \
	coreutils \
	curl \
	less \
	nano \
	python3 \
	python3-pip \
	ttyd \
	&& rm -rf /var/lib/apt/lists/*

WORKDIR /lab

# Small dataset and prompt files for phase 2 (input handling) exercises.
RUN mkdir -p /lab/input /lab/output /lab/prompts /lab/scripts \
	&& printf "id,text\n1,example input\n" > /lab/input/samples.csv \
	&& printf "Summarize the following input safely:\n" > /lab/prompts/base_prompt.txt

EXPOSE 7681

CMD ["ttyd", "-W", "-p", "7681", "bash"]
