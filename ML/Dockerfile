FROM python:3.11-slim

WORKDIR /code

RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy and install dependencies first (better layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all app files including schema.prisma
COPY . .

# Generate Prisma Python client AFTER schema.prisma is copied
RUN prisma generate

# ML model pre-download commented out — causes OOMKilled on free tier
# RUN python -c "from transformers import pipeline; ..."

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]