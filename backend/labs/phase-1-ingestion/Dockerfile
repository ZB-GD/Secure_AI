FROM lab-base-novnc

# Aquí instalas lo que necesita el lab de data ingestion
# Ejemplo: pandas, jupyter, etc.
RUN apt-get update && apt-get install -y python3 python3-pip \
    && pip3 install pandas jupyter \
    && rm -rf /var/lib/apt/lists/*

# Copia los scripts/datos del lab
COPY lab_files/ /home/lab/