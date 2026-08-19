# 🚀 SAFEML Deployment Guide

This guide covers all methods for deploying **SAFEML (Security & Safety AI SOC Platform)** in production.

---

## 📁 Project Architecture Overview
SAFEML uses a unified architecture where **FastAPI (Python)** runs the ML/Safety Engine, captures real-time network traffic, and directly serves the compiled **React SOC Dashboard (`frontend/dist`)** over HTTP and WebSockets (`/ws/stream`) on port **8001**.

---

## 🐳 Option 1: Docker Deployment (Recommended)

Docker packages both the Node.js frontend and Python backend into a single container.

### Step 1: Build the Docker Image
```bash
docker build -t safeml-soc:latest .
```

### Step 2: Run with Docker Compose
```bash
docker compose up -d
```

- Access Dashboard: `http://localhost:8001`
- Check Logs: `docker compose logs -f`

---

## ☁️ Option 2: Free Cloud Deployment (Render.com)

You can host SAFEML on Render.com for free:

1. Push your repository to **GitHub**.
2. Sign in to [Render.com](https://render.com) and click **New + > Web Service**.
3. Connect your GitHub repository.
4. Set the following settings:
   - **Environment**: `Python 3`
   - **Build Command**: 
     ```bash
     cd frontend && npm install && npm run build && cd .. && pip install -r requirements.txt
     ```
   - **Start Command**: 
     ```bash
     python run_app.py
     ```
5. Click **Create Web Service**. Render will build and deploy your SAFEML app!

---

## 💻 Option 3: Local Network (LAN) Deployment

To allow other computers on your home or company network to access the SAFEML dashboard:

1. Open `run_app.py` and set `HOST = "0.0.0.0"`.
2. Find your IP address in PowerShell:
   ```powershell
   ipconfig
   ```
3. Run the application:
   ```powershell
   python run_app.py
   ```
4. Access the dashboard from any PC or phone on your network at:
   `http://<YOUR-LOCAL-IP>:8001`

---

## 🛡️ Production Security Checklist
- Ensure Npcap / WinPcap is installed for raw packet capture on Windows hosts.
- For public cloud servers, use an SSL/TLS reverse proxy like Nginx or Caddy (`https://` and `wss://`).
