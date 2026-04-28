FROM python:3.11-slim

WORKDIR /node

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY nodes/edge_preprocessing/app.py    ./app.py

EXPOSE 8002

CMD ["uvicorn", "app:server", "--host", "0.0.0.0", "--port", "8002"]