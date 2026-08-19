# SafeML Frontend Integration

The new React/Vite SOC frontend is integrated into this project under `frontend/`.

## Actual data path

Npcap
-> Scapy
-> `backend/network_engine.py`
-> ML model
-> `ThreatEngine`
-> `backend/main.py` `/ws/stream`
-> React dashboard

## Start

Terminal 1, project root:
```powershell
python run_app.py
```

For development UI in Terminal 2:
```powershell
cd frontend
npm install
npm run dev
```

For FastAPI-served UI:
```powershell
cd frontend
npm install
npm run build
cd ..
python run_app.py
```

The backend serves `frontend/dist/` after a successful Vite build.

No existing ML/model/training files were removed.
