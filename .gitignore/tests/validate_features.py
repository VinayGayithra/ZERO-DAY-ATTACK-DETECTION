import sys
import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

sys.path.insert(0, str(BASE_DIR))

from backend.network_engine import FlowTracker

MODEL_DIR = BASE_DIR / "models"