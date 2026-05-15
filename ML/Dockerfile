FROM python:3.11-slim

WORKDIR /code

# System deps (libpq-dev only needed if you reintroduce psycopg2; safe to keep)
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8080"]
