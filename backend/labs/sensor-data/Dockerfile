FROM lab-base-novnc

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    python3 python3-pip \
    gedit \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN pip3 install --no-cache-dir \
    pandas \
    numpy \
    scikit-learn \
    matplotlib \
    requests

RUN mkdir -p \
    /home/lab/scripts \
    /home/lab/output \
    /home/lab/Desktop \
    /home/lab/Desktop/Lab1

COPY lab_files/README-LAB1.txt       /home/lab/README-LAB1.txt
COPY lab_files/poison_data.py        /home/lab/scripts/poison_data.py
COPY lab_files/validate_defense.py   /home/lab/scripts/validate_defense.py

RUN cp /home/lab/README-LAB1.txt /home/lab/Desktop/Lab1/README-LAB1.txt && \
    cp /home/lab/scripts/poison_data.py /home/lab/Desktop/Lab1/poison_data.py && \
    cp /home/lab/scripts/validate_defense.py /home/lab/Desktop/Lab1/validate_defense.py && \
    chmod +x /home/lab/scripts/*.py && \
    chmod +x /home/lab/Desktop/Lab1/*.py && \
    chown -R lab:lab /home/lab

WORKDIR /home/lab