FROM python:3.11-slim

WORKDIR /node

COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir --timeout 120 --retries 10 -r requirements.txt

COPY pipeline_nodes/edge_preprocessing/app.py    ./app.py

EXPOSE 8002

CMD ["uvicorn", "app:server", "--host", "0.0.0.0", "--port", "8002"]
