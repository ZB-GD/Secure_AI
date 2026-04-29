FROM lab-base-novnc

ENV DEBIAN_FRONTEND=noninteractive

# ── Sistema y Python ────────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y \
    python3 python3-pip python3-venv \
    firefox \
    gedit \
    curl \
    && rm -rf /var/lib/apt/lists/*

# ── Dependencias Python del lab ─────────────────────────────────────────────
RUN pip3 install --no-cache-dir \
    jupyter \
    notebook \
    pandas \
    numpy \
    scikit-learn \
    matplotlib \
    requests

# ── Estructura del laboratorio ──────────────────────────────────────────────
RUN mkdir -p /home/lab/data /home/lab/scripts /home/lab/output

# Archivos del lab
COPY lab_files/notebook.ipynb        /home/lab/notebook.ipynb
COPY lab_files/poison_data.py        /home/lab/scripts/poison_data.py
COPY lab_files/validate_defense.py   /home/lab/scripts/validate_defense.py
COPY lab_files/README-LAB1.txt       /home/lab/README-LAB1.txt

# ── Script de arranque de Jupyter (el alumno lo ejecuta desde el terminal) ──
RUN echo '#!/bin/bash\n\
cd /home/lab\n\
echo ""\n\
echo "  ╔══════════════════════════════════════════════╗"\n\
echo "  ║  CityFlow AI — Lab 1: Data Poisoning         ║"\n\
echo "  ║  Iniciando Jupyter Notebook...                ║"\n\
echo "  ╚══════════════════════════════════════════════╝"\n\
echo ""\n\
echo "  Abre Firefox y ve a:  http://localhost:8888"\n\
echo "  Abre el archivo:      notebook.ipynb"\n\
echo ""\n\
jupyter notebook \\\n\
    --ip=0.0.0.0 \\\n\
    --port=8888 \\\n\
    --no-browser \\\n\
    --allow-root \\\n\
    --NotebookApp.token="" \\\n\
    --NotebookApp.password="" \\\n\
    --NotebookApp.allow_origin="*" \\\n\
    --NotebookApp.disable_check_xsrf=True\n\
' > /usr/local/bin/start-lab.sh && chmod +x /usr/local/bin/start-lab.sh

# ── Acceso directo en el escritorio XFCE ───────────────────────────────────
RUN mkdir -p /root/Desktop && \
    echo '[Desktop Entry]\n\
Version=1.0\n\
Type=Application\n\
Name=LAB 1 — Iniciar Jupyter\n\
Comment=Arranca el notebook del laboratorio\n\
Exec=xfce4-terminal -e "bash /usr/local/bin/start-lab.sh"\n\
Icon=jupyter\n\
Terminal=false\n\
Categories=Education;\n\
' > /root/Desktop/start-lab.desktop && \
    chmod +x /root/Desktop/start-lab.desktop

WORKDIR /home/lab
