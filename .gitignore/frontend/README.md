# SafeML SOC Frontend

This frontend is integrated into the existing SafeML project.

## Development

From the project root:

```powershell
cd frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal, normally:

```text
http://127.0.0.1:5173
```

The frontend connects to the existing FastAPI WebSocket:

```text
/ws/stream?interface=auto&mode=live
```

## Production-style local run

Build the React frontend:

```powershell
cd frontend
npm install
npm run build
```

Then start the Python backend from the project root:

```powershell
python run_app.py
```

FastAPI serves `frontend/dist/` when the build exists.

## Live data used

The existing backend sends:

- `stats`
- `latest_flow`
- `recent_events`
- `safety`
- `timestamp`

The frontend converts these messages into the dashboard's live traffic and threat views.

## Important

The frontend does not create fake network traffic. Live mode uses the project's existing:

Npcap -> Scapy -> FlowTracker -> MLDetector -> ThreatEngine -> FastAPI -> WebSocket -> React
