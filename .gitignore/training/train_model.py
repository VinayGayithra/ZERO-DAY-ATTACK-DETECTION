import json
import joblib
import numpy as np
import pandas as pd
from pathlib import Path

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.decomposition import PCA
from sklearn.neural_network import MLPClassifier
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score


BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "SafeML"
MODEL_DIR = BASE_DIR / "models"

MODEL_DIR.mkdir(exist_ok=True)

files = [
    DATA_DIR / "Friday-WorkingHours-Afternoon-PortScan.pcap_ISCX.csv",
    DATA_DIR / "Friday-WorkingHours-Afternoon-DDos.pcap_ISCX.csv",
    DATA_DIR / "Friday-WorkingHours-Morning.pcap_ISCX.csv"
]

print("Loading datasets...")

frames = []

for file in files:
    print(f"Loading: {file.name}")
    df = pd.read_csv(file, low_memory=False)
    frames.append(df)

data = pd.concat(frames, ignore_index=True)

print("\nTotal samples:", len(data))
print("\nClass distribution:")
print(data[" Label"].value_counts())


label_col = " Label"

X = data.drop(columns=[label_col])
y = data[label_col].astype(str).str.strip()

X.columns = X.columns.str.strip()

X = X.select_dtypes(include=[np.number])

X = X.replace([np.inf, -np.inf], np.nan)

valid = X.notna().all(axis=1)

X = X.loc[valid].reset_index(drop=True)
y = y.loc[valid].reset_index(drop=True)

print("\nFeatures:", X.shape[1])
print("Samples after cleaning:", len(X))

print("\nFinal classes:")
print(y.value_counts())


label_encoder = LabelEncoder()
y_encoded = label_encoder.fit_transform(y)

print("\nEncoded classes:")
print(dict(enumerate(label_encoder.classes_)))


X_train, X_test, y_train, y_test = train_test_split(
    X,
    y_encoded,
    test_size=0.20,
    random_state=42,
    stratify=y_encoded
)

print("\nTraining samples:", len(X_train))
print("Testing samples:", len(X_test))


print("\nScaling features...")

scaler = StandardScaler()

X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)


print("\nApplying PCA...")

n_components = min(20, X_train_scaled.shape[1])

pca = PCA(
    n_components=n_components,
    random_state=42
)

X_train_pca = pca.fit_transform(X_train_scaled)
X_test_pca = pca.transform(X_test_scaled)

print("PCA components:", n_components)

print(
    "Explained variance:",
    round(pca.explained_variance_ratio_.sum(), 4)
)


print("\nTraining MLP...")

model = MLPClassifier(
    hidden_layer_sizes=(16, 8),
    activation="relu",
    solver="adam",
    alpha=0.01,
    max_iter=100,
    early_stopping=True,
    random_state=42,
    verbose=True
)

model.fit(X_train_pca, y_train)


print("\nEvaluating model...")

predictions = model.predict(X_test_pca)

accuracy = accuracy_score(y_test, predictions)

print("\nAccuracy:", round(accuracy * 100, 2), "%")

print("\nClassification Report:")
print(
    classification_report(
        y_test,
        predictions,
        target_names=label_encoder.classes_,
        zero_division=0
    )
)

print("\nConfusion Matrix:")
print(confusion_matrix(y_test, predictions))


print("\nSaving model files...")

joblib.dump(
    model,
    MODEL_DIR / "mlp_model.joblib"
)

joblib.dump(
    scaler,
    MODEL_DIR / "scaler.joblib"
)

joblib.dump(
    pca,
    MODEL_DIR / "pca.joblib"
)

joblib.dump(
    label_encoder,
    MODEL_DIR / "label_encoder.joblib"
)


feature_schema = {
    "features": list(X.columns),
    "number_of_features": len(X.columns),
    "pca_components": n_components,
    "classes": list(label_encoder.classes_),
    "model": "MLPClassifier",
    "hidden_layer_sizes": [16, 8],
    "random_state": 42
}

with open(
    MODEL_DIR / "feature_schema.json",
    "w",
    encoding="utf-8"
) as f:
    json.dump(
        feature_schema,
        f,
        indent=4
    )


print("\n===================================")
print("MODEL TRAINING COMPLETED")
print("===================================")

print("\nSaved files:")

print("models/mlp_model.joblib")
print("models/scaler.joblib")
print("models/pca.joblib")
print("models/label_encoder.joblib")
print("models/feature_schema.json")

print("\nClasses:")
print(list(label_encoder.classes_))

print("\nAccuracy:")
print(round(accuracy * 100, 2), "%")