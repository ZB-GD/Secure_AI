FROM python:3.11-slim

WORKDIR /node

COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY pipeline_nodes/model_trainer/app.py    ./app.py

# Models and SQLite DB go into shared/mounted volumes
ENV MODELS_DIR=/models
ENV DB_PATH=/data/trainer_store.db

EXPOSE 8004

COPY pipeline_nodes/paths.py ./paths.py

CMD ["uvicorn", "app:server", "--host", "0.0.0.0", "--port", "8004"]
