FROM lab-base-novnc

# Aquí instalas lo que necesita el lab de data ingestion
# Ejemplo: pandas, jupyter, etc.
RUN apt-get update && apt-get install -y python3 python3-pip \
    && pip3 install pandas jupyter \
    && rm -rf /var/lib/apt/lists/*

# Directorio y contenido específico del laboratorio.
RUN mkdir -p /home/lab/data /home/lab/scripts /home/lab/output
COPY lab_files/README-LAB1.txt /home/lab/README-LAB1.txt
COPY lab_files/data_train.csv /home/lab/data/train.csv
COPY lab_files/analyze_dataset.py /home/lab/scripts/analyze_dataset.py

WORKDIR /home/lab