import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from backend.ml_detector import MLDetector


detector = MLDetector()

print("ML MODEL LOADED")
print("Classes:", detector.schema["classes"])
print("Features:", len(detector.features))