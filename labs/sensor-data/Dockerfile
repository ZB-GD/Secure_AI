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
    /opt/lab-home/scripts \
    /opt/lab-home/output \
    /opt/lab-home/Desktop \
    /opt/lab-home/Desktop/Lab1

COPY lab_files/README-LAB1.txt       /opt/lab-home/README-LAB1.txt
COPY lab_files/poison_data.py        /opt/lab-home/Desktop/Lab1/poison_data.py
COPY lab_files/validate_defense.py   /opt/lab-home/Desktop/Lab1/validate_defense.py
COPY lab_files/vulnerable_app.py     /opt/lab-home/Desktop/Lab1/vulnerable_app.py
COPY lab_files/enable_defense.py     /opt/lab-home/Desktop/Lab1/enable_defense.py
COPY lab_files/reset_lab.py          /opt/lab-home/Desktop/Lab1/reset_lab.py

RUN cp /opt/lab-home/README-LAB1.txt /opt/lab-home/Desktop/Lab1/README-LAB1.txt && \
    ln -sf /home/lab/Desktop/Lab1/poison_data.py /opt/lab-home/scripts/poison_data.py && \
    ln -sf /home/lab/Desktop/Lab1/validate_defense.py /opt/lab-home/scripts/validate_defense.py && \
    ln -sf /home/lab/Desktop/Lab1/vulnerable_app.py /opt/lab-home/scripts/vulnerable_app.py && \
    ln -sf /home/lab/Desktop/Lab1/enable_defense.py /opt/lab-home/scripts/enable_defense.py && \
    ln -sf /home/lab/Desktop/Lab1/reset_lab.py /opt/lab-home/scripts/reset_lab.py && \
    chmod +x /opt/lab-home/Desktop/Lab1/*.py && \
    chown -R 1000:1000 /opt/lab-home

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

COPY start-lab.sh /usr/local/bin/start-lab.sh
RUN chmod +x /usr/local/bin/start-lab.sh

WORKDIR /home/lab
CMD ["/usr/local/bin/start-lab.sh"]
