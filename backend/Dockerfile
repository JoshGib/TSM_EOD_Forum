FROM python:3.11-slim

# Set working directory
WORKDIR /code

# 1. Install system requirements (Single layer for efficiency)
# We need g++ and build-essential for sentencepiece and prisma
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# 2. Securely handle the HF_TOKEN for the build phase
ARG HF_TOKEN
ENV HF_TOKEN=${HF_TOKEN}

# 2. Install Python dependencies
# We install these first so they are cached
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir torch transformers[sentencepiece] protobuf

# 3. Copy application files
COPY . .

# 4. Generate the Prisma Client
# This must happen before you try to run the app
RUN prisma generate

# 5. Pre-download models to the image
# This prevents downloading ~3GB every time the container restarts.
# CRITICAL: Use 'text-classification' for FinBERT to match the library registry.
RUN python -c "from transformers import pipeline; \
    pipeline('text2text-generation', model='google/pegasus-xsum'); \
    pipeline('text-classification', model='ProsusAI/finbert')"

# Hugging Face Spaces specific port
# 'app:app' is correct since your file is app.py
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]