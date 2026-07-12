# Portable image: works on Render, Railway, Fly.io, or any Docker host.
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Install deps first so this layer caches across code changes.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Train the model at build time if the artifact was not committed. Keeps the image
# self-contained and guarantees the served model matches this code.
RUN test -f model/neuroriskx_model.joblib || python train_model.py

EXPOSE 8000

# Hosts inject $PORT. Fall back to 8000 locally.
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
