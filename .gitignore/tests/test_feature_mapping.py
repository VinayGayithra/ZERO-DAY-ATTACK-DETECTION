import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from backend.network_engine import FlowTracker
from backend.ml_detector import MLDetector


detector = MLDetector()

flow = FlowTracker(
    (
        "192.168.1.41",
        "8.8.8.8",
        50000,
        443,
        "TCP"
    ),
    1000.0
)

features = flow.extract_features()

print("=" * 60)
print("FEATURE MAPPING TEST")
print("=" * 60)

print("\nLive extractor features:", len(features))
print("Model features:", len(detector.features))

print("\nSample live features:")

for key, value in list(features.items())[:10]:
    print(f"{key}: {value}")

print("\nTesting ML prediction...")

result = detector.predict(features)

print("\nPrediction:", result["prediction"])
print("Confidence:", result["confidence"])

print("\nFEATURE MAPPING TEST COMPLETE")