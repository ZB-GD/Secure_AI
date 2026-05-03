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
    requests \
    flask

RUN mkdir -p \
    /home/lab/scripts \
    /home/lab/output \
    /home/lab/Desktop \
    /home/lab/Desktop/Lab1

COPY lab_files/README-LAB1.txt       /home/lab/README-LAB1.txt
COPY lab_files/poison_data.py        /home/lab/Desktop/Lab1/poison_data.py
COPY lab_files/validate_defense.py   /home/lab/Desktop/Lab1/validate_defense.py
COPY lab_files/vulnerable_app.py     /home/lab/Desktop/Lab1/vulnerable_app.py

RUN cp /home/lab/README-LAB1.txt /home/lab/Desktop/Lab1/README-LAB1.txt && \
    ln -sf /home/lab/Desktop/Lab1/poison_data.py /home/lab/scripts/poison_data.py && \
    ln -sf /home/lab/Desktop/Lab1/validate_defense.py /home/lab/scripts/validate_defense.py && \
    ln -sf /home/lab/Desktop/Lab1/vulnerable_app.py /home/lab/scripts/vulnerable_app.py && \
    chmod +x /home/lab/Desktop/Lab1/*.py

RUN printf '%s\n' \
    '' \
    '[program:lab1-vulnerable-app]' \
    'command=python3 /home/lab/Desktop/Lab1/vulnerable_app.py' \
    'directory=/home/lab/Desktop/Lab1' \
    'autorestart=true' \
    'priority=5' \
    'stdout_logfile=/home/lab/output/vulnerable_app.stdout.log' \
    'stderr_logfile=/home/lab/output/vulnerable_app.stderr.log' \
    >> /etc/supervisor/conf.d/supervisord.conf

WORKDIR /home/lab
