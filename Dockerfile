# ─────────────────────────────────────────────────────────────
# Stage 1 — builder
# Full Alpine + build tools. Compiles wheels, downloads model.
# Nothing from this stage leaks into the final image.
# ─────────────────────────────────────────────────────────────
FROM python:3.11-slim AS builder
# Build deps for opencv-headless and scipy native extensions
RUN apk add --no-cache \
    gcc g++ musl-dev \
    libffi-dev \
    openblas-dev \
    libstdc++ \
    linux-headers

WORKDIR /app

# Install all Python deps into an isolated prefix so we can
# copy just that folder into the final stage
COPY backend/requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# Pre-download ISNet model weights so first request is instant
COPY backend/main.py       .
COPY backend/processing.py .
ENV U2NET_HOME=/app/.u2net
RUN PYTHONPATH=/install/lib/python3.11/site-packages \
    python -c "\
from rembg import new_session; \
new_session('isnet-general-use'); \
print('ISNet model cached.')"


# ─────────────────────────────────────────────────────────────
# Stage 2 — final (coreless Alpine)
# Only: Alpine base, runtime .so libs, Python, our code.
# No gcc, no apk cache, no pip, no build headers.
# ─────────────────────────────────────────────────────────────
FROM python:3.11-slim

# Only the shared libraries that opencv / rembg / scipy need at runtime
RUN apk add --no-cache \
    libstdc++ \
    openblas \
    libgomp

WORKDIR /app

# Bring over installed packages from builder (no pip needed in final image)
COPY --from=builder /install /usr/local

# Bring over cached ISNet model weights
COPY --from=builder /app/.u2net /app/.u2net

# App code
COPY backend/main.py       .
COPY backend/processing.py .

# Frontend static files
COPY index.html  static/index.html
COPY style.css   static/style.css
COPY script.js   static/script.js

ENV U2NET_HOME=/app/.u2net \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

EXPOSE 7860

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860", "--workers", "4"]
