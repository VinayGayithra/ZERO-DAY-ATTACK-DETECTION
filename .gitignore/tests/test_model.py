import json
import joblib
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_DIR = BASE_DIR / "models"

model = joblib.load(MODEL_DIR / "mlp_model.joblib")
scaler = joblib.load(MODEL_DIR / "scaler.joblib")
pca = joblib.load(MODEL_DIR / "pca.joblib")
label_encoder = joblib.load(MODEL_DIR / "label_encoder.joblib")

with open(MODEL_DIR / "feature_schema.json", "r") as f:
    schema = json.load(f)

print("MODEL LOADED SUCCESSFULLY")
print()
print("Model:", type(model).__name__)
print("Scaler:", type(scaler).__name__)
print("PCA:", type(pca).__name__)
print("Label Encoder:", type(label_encoder).__name__)
print()
print("Number of features:", schema["number_of_features"])
print("PCA components:", schema["pca_components"])
print("Classes:", schema["classes"])