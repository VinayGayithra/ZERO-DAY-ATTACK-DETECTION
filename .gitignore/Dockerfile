# ==========================================
# STAGE 1: Build React Frontend
# ==========================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ==========================================
# STAGE 2: Python Backend & Production App
# ==========================================
FROM python:3.12-slim

WORKDIR /app

# Install system dependencies (libpcap for network sniffing)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpcap-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code, models, and training datasets
COPY backend/ ./backend/
COPY models/ ./models/
COPY SafeML/ ./SafeML/
COPY run_app.py ./

# Copy built frontend assets into frontend/dist
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

EXPOSE 8001

ENV HOST=0.0.0.0
ENV PORT=8001

CMD ["python", "run_app.py"]
