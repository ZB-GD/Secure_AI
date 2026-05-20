FROM python:3.11-slim

WORKDIR /node

COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir --timeout 120 --retries 10 -r requirements.txt

COPY pipeline_nodes/actuator/app.py    ./app.py

# Models come from shared volume mounted at /models
# app.py already points to BASE_DIR/models — override via env var
ENV MODELS_DIR=/models

EXPOSE 8003

COPY pipeline_nodes/paths.py ./paths.py

CMD ["uvicorn", "app:server", "--host", "0.0.0.0", "--port", "8003"]
