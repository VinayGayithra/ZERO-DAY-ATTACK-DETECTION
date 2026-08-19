import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from backend.threat_engine import ThreatEngine


engine = ThreatEngine()

flow = {
    "src_ip": "192.168.1.41",
    "dst_ip": "8.8.8.8",
    "dst_port": 53,
    "prediction": "BENIGN",
    "confidence": 100.0
}

result = engine.analyze(flow)

print("=" * 60)
print("THREAT ENGINE TEST")
print("=" * 60)

print("Status:", result["status"])
print("Severity:", result["severity"])
print("Threat Score:", result["threat_score"])
print("Prediction:", result["prediction"])
print("Confidence:", result["confidence"])
print("Reasons:", result["reasons"])