FROM python:3.11-slim

WORKDIR /node

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY nodes/model_trainer/app.py    ./app.py
COPY nodes/model_trainer/main.py   ./main.py

# Models and SQLite DB go into shared/mounted volumes
ENV MODELS_DIR=/models
ENV DB_PATH=/data/trainer_store.db

EXPOSE 8004

COPY nodes/paths.py ./paths.py

CMD ["uvicorn", "main:server", "--host", "0.0.0.0", "--port", "8004"]