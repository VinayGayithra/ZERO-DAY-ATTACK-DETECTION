import json
import joblib
import numpy as np
import pandas as pd
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_DIR = BASE_DIR / "models"


class MLDetector:
    def __init__(self):
        self.model = joblib.load(
            MODEL_DIR / "mlp_model.joblib"
        )

        self.scaler = joblib.load(
            MODEL_DIR / "scaler.joblib"
        )

        self.pca = joblib.load(
            MODEL_DIR / "pca.joblib"
        )

        self.label_encoder = joblib.load(
            MODEL_DIR / "label_encoder.joblib"
        )

        with open(
            MODEL_DIR / "feature_schema.json",
            "r",
            encoding="utf-8"
        ) as f:
            self.schema = json.load(f)

        self.features = self.schema["features"]

    def _get_feature_value(self, feature_dict, feature):
        if feature in feature_dict:
            return feature_dict[feature]

        key = feature.lower()
        key = key.replace(" ", "_")
        key = key.replace("/", "s")

        if key in feature_dict:
            return feature_dict[key]

        return 0.0

    def predict(self, feature_dict):
        values = []

        for feature in self.features:
            value = self._get_feature_value(
                feature_dict,
                feature
            )

            try:
                value = float(value)
            except (ValueError, TypeError):
                value = 0.0

            if not np.isfinite(value):
                value = 0.0

            values.append(value)

        X = pd.DataFrame(
            [values],
            columns=self.features
        )

        X_scaled = self.scaler.transform(X)

        X_pca = self.pca.transform(X_scaled)

        prediction = self.model.predict(X_pca)[0]

        probabilities = self.model.predict_proba(X_pca)[0]

        label = self.label_encoder.inverse_transform(
            [prediction]
        )[0]

        confidence = float(
            np.max(probabilities)
        )

        return {
            "prediction": str(label),
            "confidence": round(
                confidence * 100,
                2
            )
        }