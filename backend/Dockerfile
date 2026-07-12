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

# The trained artifact is committed, so the image needs no training deps (no pandas,
# no shap). Fail loudly at build time rather than at runtime if it is ever missing.
RUN test -f model/neuroriskx_model.joblib || (echo "Missing model artifact. Run train_model.py and commit it." && exit 1)

EXPOSE 8000

# Hosts inject $PORT. Fall back to 8000 locally.
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
