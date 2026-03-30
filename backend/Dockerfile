FROM python:3.10-slim

WORKDIR /app

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements e instalar dependencias Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código de la app
COPY . .

# Exponer puerto
EXPOSE 8000

# Comando para correr la app
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
