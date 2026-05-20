FROM python:3.11-slim

WORKDIR /app

COPY services/tutor_rag/requirements.txt .
RUN pip install --no-cache-dir --timeout 120 --retries 10 -r requirements.txt

COPY services/tutor_rag .

EXPOSE 8010

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8010"]
