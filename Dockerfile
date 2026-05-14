FROM python:3.11-slim AS builder
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y \
    build-essential \
    gcc \
    g++ \
    libglib2.0-0 \
    libgomp1 \
    libstdc++6 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN pip install --upgrade pip setuptools wheel

COPY backend/requirements.txt .

RUN pip install \
    --no-cache-dir \
    --prefix=/install \
    -r requirements.txt

COPY backend/main.py .
COPY backend/processing.py .

ENV U2NET_HOME=/app/.u2net

RUN PYTHONPATH=/install/lib/python3.11/site-packages \
    python -c "\
from rembg import new_session; \
new_session('isnet-general-use'); \
print('ISNet model cached successfully.')"

# ─────────────────────────────────────────────────────────────
# Stage 2 — Runtime
# Small clean production image
# ─────────────────────────────────────────────────────────────
FROM python:3.11-slim

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    libgomp1 \
    libstdc++6 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /install /usr/local

COPY --from=builder /app/.u2net /app/.u2net

COPY backend/main.py .
COPY backend/processing.py .

COPY index.html ./static/index.html
COPY style.css ./static/style.css
COPY script.js ./static/script.js

ENV U2NET_HOME=/app/.u2net \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    OMP_NUM_THREADS=1 \
    OPENBLAS_NUM_THREADS=1

EXPOSE 7860

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860", "--workers", "4"]
