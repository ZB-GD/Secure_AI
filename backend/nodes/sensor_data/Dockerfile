FROM python:3.11-slim

WORKDIR /node

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy only this node's files
COPY nodes/sensor_data/app.py    ./app.py
COPY nodes/sensor_data/main.py   ./main.py

EXPOSE 8001

CMD ["uvicorn", "main:server", "--host", "0.0.0.0", "--port", "8001"]