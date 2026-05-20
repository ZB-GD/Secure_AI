FROM python:3.11-slim

WORKDIR /node

COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy only this node's files and local dataset
COPY pipeline_nodes/sensor_data/app.py    ./app.py
COPY data/datasets/metro_interstate_traffic_volume.csv ./data/datasets/metro_interstate_traffic_volume.csv

EXPOSE 8001

CMD ["uvicorn", "app:server", "--host", "0.0.0.0", "--port", "8001"]
