import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd

from sklearn.decomposition import PCA
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.neighbors import KNeighborsClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.preprocessing import LabelEncoder, StandardScaler


logger = logging.getLogger("SafeMLEngine")


# =====================================================================
# DISTANCE FUNCTIONS
# =====================================================================

def cvm_dist(
    XX: np.ndarray,
    YY: np.ndarray
) -> float:

    XX = np.asarray(XX, dtype=float)
    YY = np.asarray(YY, dtype=float)

    nx, ny = len(XX), len(YY)

    if nx == 0 or ny == 0:
        return 0.0

    n = nx + ny

    if n <= 2:
        return 0.0

    XY = np.concatenate([
        XX,
        YY
    ])

    X2 = np.concatenate([
        np.full(nx, 1.0 / nx),
        np.zeros(ny)
    ])

    Y2 = np.concatenate([
        np.zeros(nx),
        np.full(ny, 1.0 / ny)
    ])

    S_Ind = np.argsort(XY)

    XY_Sorted = XY[S_Ind]
    X2_Sorted = X2[S_Ind]
    Y2_Sorted = Y2[S_Ind]

    E_CDF = np.cumsum(
        X2_Sorted[:n - 2]
    )

    F_CDF = np.cumsum(
        Y2_Sorted[:n - 2]
    )

    height = np.abs(
        F_CDF - E_CDF
    )

    diff_mask = (
        XY_Sorted[1:n - 1] !=
        XY_Sorted[:n - 2]
    )

    return float(
        np.sum(
            height[diff_mask]
        )
    )


def ad_dist(
    XX: np.ndarray,
    YY: np.ndarray
) -> float:

    XX = np.asarray(XX, dtype=float)
    YY = np.asarray(YY, dtype=float)

    nx, ny = len(XX), len(YY)

    if nx == 0 or ny == 0:
        return 0.0

    n = nx + ny

    if n <= 2:
        return 0.0

    XY = np.concatenate([
        XX,
        YY
    ])

    X2 = np.concatenate([
        np.full(nx, 1.0 / nx),
        np.zeros(ny)
    ])

    Y2 = np.concatenate([
        np.zeros(nx),
        np.full(ny, 1.0 / ny)
    ])

    S_Ind = np.argsort(XY)

    XY_Sorted = XY[S_Ind]
    X2_Sorted = X2[S_Ind]
    Y2_Sorted = Y2[S_Ind]

    E_CDF = np.cumsum(
        X2_Sorted[:n - 2]
    )

    F_CDF = np.cumsum(
        Y2_Sorted[:n - 2]
    )

    G_CDF = (
        np.arange(
            1,
            n - 1,
            dtype=float
        ) / n
    )

    SD = np.sqrt(
        n *
        G_CDF *
        (1.0 - G_CDF)
    )

    height = np.abs(
        F_CDF - E_CDF
    )

    diff_mask = (
        XY_Sorted[1:n - 1] !=
        XY_Sorted[:n - 2]
    ) & (
        SD > 1e-12
    )

    return float(
        np.sum(
            height[diff_mask] /
            SD[diff_mask]
        )
    )


def ks_dist(
    XX: np.ndarray,
    YY: np.ndarray
) -> float:

    XX = np.asarray(XX, dtype=float)
    YY = np.asarray(YY, dtype=float)

    nx, ny = len(XX), len(YY)

    if nx == 0 or ny == 0:
        return 0.0

    n = nx + ny

    if n <= 2:
        return 0.0

    XY = np.concatenate([
        XX,
        YY
    ])

    X2 = np.concatenate([
        np.full(nx, 1.0 / nx),
        np.zeros(ny)
    ])

    Y2 = np.concatenate([
        np.zeros(nx),
        np.full(ny, 1.0 / ny)
    ])

    S_Ind = np.argsort(XY)

    XY_Sorted = XY[S_Ind]
    X2_Sorted = X2[S_Ind]
    Y2_Sorted = Y2[S_Ind]

    E_CDF = np.cumsum(
        X2_Sorted[:n - 2]
    )

    F_CDF = np.cumsum(
        Y2_Sorted[:n - 2]
    )

    height = np.abs(
        F_CDF - E_CDF
    )

    diff_mask = (
        XY_Sorted[1:n - 1] !=
        XY_Sorted[:n - 2]
    )

    filtered_heights = (
        height[diff_mask]
    )

    if len(filtered_heights) == 0:
        return 0.0

    return float(
        np.max(
            filtered_heights
        )
    )


def kuiper_dist(
    XX: np.ndarray,
    YY: np.ndarray
) -> float:

    XX = np.asarray(XX, dtype=float)
    YY = np.asarray(YY, dtype=float)

    nx, ny = len(XX), len(YY)

    if nx == 0 or ny == 0:
        return 0.0

    n = nx + ny

    if n <= 2:
        return 0.0

    XY = np.concatenate([
        XX,
        YY
    ])

    X2 = np.concatenate([
        np.full(nx, 1.0 / nx),
        np.zeros(ny)
    ])

    Y2 = np.concatenate([
        np.zeros(nx),
        np.full(ny, 1.0 / ny)
    ])

    S_Ind = np.argsort(XY)

    XY_Sorted = XY[S_Ind]
    X2_Sorted = X2[S_Ind]
    Y2_Sorted = Y2[S_Ind]

    E_CDF = np.cumsum(
        X2_Sorted[:n - 2]
    )

    F_CDF = np.cumsum(
        Y2_Sorted[:n - 2]
    )

    height = (
        F_CDF - E_CDF
    )

    diff_mask = (
        XY_Sorted[1:n - 1] !=
        XY_Sorted[:n - 2]
    )

    filtered_heights = (
        height[diff_mask]
    )

    if len(filtered_heights) == 0:
        return 0.0

    up = max(
        0.0,
        float(
            np.max(
                filtered_heights
            )
        )
    )

    down = min(
        0.0,
        float(
            np.min(
                filtered_heights
            )
        )
    )

    return float(
        abs(down) + abs(up)
    )


def wasserstein_dist(
    XX: np.ndarray,
    YY: np.ndarray
) -> float:

    XX = np.asarray(XX, dtype=float)
    YY = np.asarray(YY, dtype=float)

    nx, ny = len(XX), len(YY)

    if nx == 0 or ny == 0:
        return 0.0

    n = nx + ny

    if n <= 2:
        return 0.0

    XY = np.concatenate([
        XX,
        YY
    ])

    X2 = np.concatenate([
        np.full(nx, 1.0 / nx),
        np.zeros(ny)
    ])

    Y2 = np.concatenate([
        np.zeros(nx),
        np.full(ny, 1.0 / ny)
    ])

    S_Ind = np.argsort(XY)

    XY_Sorted = XY[S_Ind]
    X2_Sorted = X2[S_Ind]
    Y2_Sorted = Y2[S_Ind]

    E_CDF = np.cumsum(
        X2_Sorted[:n - 2]
    )

    F_CDF = np.cumsum(
        Y2_Sorted[:n - 2]
    )

    height = np.abs(
        F_CDF - E_CDF
    )

    width = (
        XY_Sorted[1:n - 1] -
        XY_Sorted[:n - 2]
    )

    return float(
        np.sum(
            height * width
        )
    )


def dts_dist(
    XX: np.ndarray,
    YY: np.ndarray
) -> float:

    XX = np.asarray(XX, dtype=float)
    YY = np.asarray(YY, dtype=float)

    nx, ny = len(XX), len(YY)

    if nx == 0 or ny == 0:
        return 0.0

    n = nx + ny

    if n <= 2:
        return 0.0

    XY = np.concatenate([
        XX,
        YY
    ])

    X2 = np.concatenate([
        np.full(nx, 1.0 / nx),
        np.zeros(ny)
    ])

    Y2 = np.concatenate([
        np.zeros(nx),
        np.full(ny, 1.0 / ny)
    ])

    S_Ind = np.argsort(XY)

    XY_Sorted = XY[S_Ind]
    X2_Sorted = X2[S_Ind]
    Y2_Sorted = Y2[S_Ind]

    E_CDF = np.cumsum(
        X2_Sorted[:n - 2]
    )

    F_CDF = np.cumsum(
        Y2_Sorted[:n - 2]
    )

    G_CDF = (
        np.arange(
            1,
            n - 1,
            dtype=float
        ) / n
    )

    SD = np.sqrt(
        n *
        G_CDF *
        (1.0 - G_CDF)
    )

    height = np.abs(
        F_CDF - E_CDF
    )

    width = (
        XY_Sorted[1:n - 1] -
        XY_Sorted[:n - 2]
    )

    valid_mask = (
        SD > 1e-12
    )

    return float(
        np.sum(
            (
                height[valid_mask] /
                SD[valid_mask]
            ) *
            width[valid_mask]
        )
    )


# =====================================================================
# DISTANCE HELPERS
# =====================================================================

def compute_all_distances(
    x_train: np.ndarray,
    x_test: np.ndarray,
    max_samples: int = 1500
) -> Dict[str, float]:

    if (
        x_train.size == 0
        or x_test.size == 0
    ):

        return {
            "CVM_dist": 0.0,
            "Anderson_Darling_dist": 0.0,
            "Kolmogorov_Smirnov_dist": 0.0,
            "Kuiper_dist": 0.0,
            "Wasserstein_dist": 0.0,
            "DTS_dist": 0.0
        }

    if len(x_train) > max_samples:

        indices = np.random.choice(
            len(x_train),
            size=max_samples,
            replace=False
        )

        x_train = x_train[
            indices
        ]

    if len(x_test) > max_samples:

        indices = np.random.choice(
            len(x_test),
            size=max_samples,
            replace=False
        )

        x_test = x_test[
            indices
        ]

    n_features = x_train.shape[1]

    cvm_list = []
    ad_list = []
    ks_list = []
    kuiper_list = []
    ws_list = []
    dts_list = []

    for f_idx in range(
        n_features
    ):

        tr_f = x_train[
            :,
            f_idx
        ]

        te_f = x_test[
            :,
            f_idx
        ]

        cvm_list.append(
            cvm_dist(
                tr_f,
                te_f
            )
        )

        ad_list.append(
            ad_dist(
                tr_f,
                te_f
            )
        )

        ks_list.append(
            ks_dist(
                tr_f,
                te_f
            )
        )

        kuiper_list.append(
            kuiper_dist(
                tr_f,
                te_f
            )
        )

        ws_list.append(
            wasserstein_dist(
                tr_f,
                te_f
            )
        )

        dts_list.append(
            dts_dist(
                tr_f,
                te_f
            )
        )

    return {
        "CVM_dist": float(
            np.nanmean(
                cvm_list
            )
        ),
        "Anderson_Darling_dist": float(
            np.nanmean(
                ad_list
            )
        ),
        "Kolmogorov_Smirnov_dist": float(
            np.nanmean(
                ks_list
            )
        ),
        "Kuiper_dist": float(
            np.nanmean(
                kuiper_list
            )
        ),
        "Wasserstein_dist": float(
            np.nanmean(
                ws_list
            )
        ),
        "DTS_dist": float(
            np.nanmean(
                dts_list
            )
        )
    }


def compute_feature_level_distances(
    x_train: np.ndarray,
    x_test: np.ndarray,
    feature_names: List[str],
    max_samples: int = 1500
) -> List[Dict[str, Any]]:

    if len(x_train) > max_samples:

        indices = np.random.choice(
            len(x_train),
            size=max_samples,
            replace=False
        )

        x_train = x_train[
            indices
        ]

    if len(x_test) > max_samples:

        indices = np.random.choice(
            len(x_test),
            size=max_samples,
            replace=False
        )

        x_test = x_test[
            indices
        ]

    result = []

    for f_idx, name in enumerate(
        feature_names
    ):

        tr_f = x_train[
            :,
            f_idx
        ]

        te_f = x_test[
            :,
            f_idx
        ]

        result.append({

            "feature":
                name,

            "CVM_dist":
                cvm_dist(
                    tr_f,
                    te_f
                ),

            "Anderson_Darling_dist":
                ad_dist(
                    tr_f,
                    te_f
                ),

            "Kolmogorov_Smirnov_dist":
                ks_dist(
                    tr_f,
                    te_f
                ),

            "Kuiper_dist":
                kuiper_dist(
                    tr_f,
                    te_f
                ),

            "Wasserstein_dist":
                wasserstein_dist(
                    tr_f,
                    te_f
                ),

            "DTS_dist":
                dts_dist(
                    tr_f,
                    te_f
                )
        })

    return result


# =====================================================================
# DATAFRAME HELPERS
# =====================================================================

def clean_dataframe(
    df: pd.DataFrame
) -> pd.DataFrame:

    df = df.copy()

    df.replace(
        [
            np.inf,
            -np.inf
        ],
        np.nan,
        inplace=True
    )

    df.dropna(
        axis=0,
        how="any",
        inplace=True
    )

    return df.reset_index(
        drop=True
    )


def normalize_column_names(
    df: pd.DataFrame
) -> pd.DataFrame:

    df = df.copy()

    df.columns = (
        df.columns
        .str.strip()
        .str.lower()
        .str.replace(
            " ",
            "_"
        )
        .str.replace(
            "(",
            "",
            regex=False
        )
        .str.replace(
            ")",
            "",
            regex=False
        )
    )

    return df


# =====================================================================
# SAFE ML ENGINE
# =====================================================================

class SafeMLEngine:

    active_pipeline: Optional[
        Dict[str, Any]
    ] = None

    # =================================================================
    # DATASET INSPECTION
    # =================================================================

    @staticmethod
    def inspect_dataset(
        file_path: Path
    ) -> Dict[str, Any]:

        if not file_path.exists():

            raise FileNotFoundError(
                f"File not found: {file_path}"
            )

        df = pd.read_csv(
            file_path,
            nrows=5000
        )

        df = normalize_column_names(
            df
        )

        df_clean = clean_dataframe(
            df
        )

        label_col = next(
            (
                c
                for c in df_clean.columns
                if (
                    "label" in c
                    or
                    "target" in c
                    or
                    "class" in c
                )
            ),
            None
        )

        class_distribution = {}

        if label_col:

            class_distribution = (
                df_clean[
                    label_col
                ]
                .value_counts()
                .to_dict()
            )

        return {

            "file_name":
                file_path.name,

            "total_sample_rows_previewed":
                len(df_clean),

            "total_columns":
                len(
                    df_clean.columns
                ),

            "label_column":
                label_col,

            "columns":
                list(
                    df_clean.columns
                ),

            "class_distribution": {
                str(k): int(v)
                for k, v
                in class_distribution.items()
            },

            "preview_rows":
                (
                    df_clean
                    .head(5)
                    .to_dict(
                        orient="records"
                    )
                )
        }

    # =================================================================
    # MAIN PIPELINE
    # =================================================================

    @staticmethod
    def run_pipeline(
        file_path: Path,
        model_name: str = "mlp",
        n_pca_components: int = 7,
        max_samples: int = 30000,
        test_size: float = 0.33,
        random_state: int = 42,
        drift_intensity: float = 0.0
    ) -> Dict[str, Any]:

        if not file_path.exists():

            raise FileNotFoundError(
                f"Dataset missing: {file_path}"
            )

        logger.info(
            f"Loading dataset from "
            f"{file_path.name}..."
        )

        file_size_mb = (
            file_path.stat().st_size
            /
            (1024 * 1024)
        )

        if file_size_mb > 20:

            df = pd.read_csv(
                file_path,
                nrows=max_samples * 2
            )

        else:

            df = pd.read_csv(
                file_path
            )

        df = normalize_column_names(
            df
        )

        df = clean_dataframe(
            df
        )

        label_col = next(
            (
                c
                for c in df.columns
                if (
                    "label" in c
                    or
                    "target" in c
                    or
                    "class" in c
                )
            ),
            None
        )

        if not label_col:

            raise KeyError(
                "No target column "
                "('label' or 'class') found "
                "in dataset."
            )

        if len(df) > max_samples:

            df = (
                df.sample(
                    n=max_samples,
                    random_state=random_state
                )
                .reset_index(
                    drop=True
                )
            )

        y = df[
            label_col
        ].copy()

        X = df.drop(
            columns=[
                label_col
            ]
        )

        X = X.select_dtypes(
            include=[
                np.number
            ]
        )

        if X.empty:

            raise ValueError(
                "No numeric features found "
                "for model training."
            )

        feature_cols = list(
            X.columns
        )

        label_encoder = LabelEncoder()

        y_encoded = (
            label_encoder
            .fit_transform(y)
        )

        class_labels = list(
            label_encoder.classes_
        )

        scaler = StandardScaler()

        X_scaled = scaler.fit_transform(
            X
        )

        n_comp = min(
            n_pca_components,
            X_scaled.shape[1]
        )

        pca = PCA(
            n_components=n_comp,
            random_state=random_state
        )

        X_pca = pca.fit_transform(
            X_scaled
        )

        feature_names = [
            f"PC_{i + 1}"
            for i in range(
                n_comp
            )
        ]

        X_train, X_test, y_train, y_test = (
            train_test_split(
                X_pca,
                y_encoded,
                test_size=test_size,
                random_state=random_state,
                stratify=y_encoded
            )
        )

        if drift_intensity > 0:

            noise = np.random.normal(
                loc=drift_intensity * 0.5,
                scale=drift_intensity,
                size=X_test.shape
            )

            X_test_drifted = (
                X_test + noise
            )

        else:

            X_test_drifted = X_test

        model_key = (
            model_name.lower()
        )

        if (
            "mlp" in model_key
            or
            "neural" in model_key
        ):

            clf = MLPClassifier(
                hidden_layer_sizes=(
                    16,
                    8
                ),
                max_iter=100,
                alpha=0.01,
                random_state=random_state,
                early_stopping=True
            )

        elif (
            "rf" in model_key
            or
            "forest" in model_key
        ):

            clf = RandomForestClassifier(
                n_estimators=50,
                max_depth=10,
                random_state=random_state
            )

        elif (
            "knn" in model_key
            or
            "neighbor" in model_key
        ):

            clf = KNeighborsClassifier(
                n_neighbors=5
            )

        else:

            clf = LogisticRegression(
                max_iter=200,
                random_state=random_state
            )

        clf.fit(
            X_train,
            y_train
        )

        pred_y = clf.predict(
            X_test_drifted
        )

        accuracy = float(
            accuracy_score(
                y_test,
                pred_y
            )
        )

        conf_mat = confusion_matrix(
            y_test,
            pred_y
        ).tolist()

        overall_distances = (
            compute_all_distances(
                X_train,
                X_test_drifted
            )
        )

        feature_distances = (
            compute_feature_level_distances(
                X_train,
                X_test_drifted,
                feature_names
            )
        )

        class_level_results = []

        for idx, cls_name in enumerate(
            class_labels
        ):

            tr_mask = (
                y_train == idx
            )

            te_mask = (
                pred_y == idx
            )

            if (
                tr_mask.sum() >= 2
                and
                te_mask.sum() >= 2
            ):

                cls_dists = (
                    compute_all_distances(
                        X_train[
                            tr_mask
                        ],
                        X_test_drifted[
                            te_mask
                        ]
                    )
                )

                cls_dists[
                    "class_label"
                ] = str(
                    cls_name
                )

                cls_dists[
                    "train_count"
                ] = int(
                    tr_mask.sum()
                )

                cls_dists[
                    "predicted_count"
                ] = int(
                    te_mask.sum()
                )

                dts_val = cls_dists[
                    "DTS_dist"
                ]

                if (
                    dts_val > 1.5
                    or
                    drift_intensity > 0.5
                ):

                    cls_dists[
                        "status"
                    ] = "UNSAFE"

                elif (
                    dts_val > 0.5
                    or
                    drift_intensity > 0.2
                ):

                    cls_dists[
                        "status"
                    ] = "WARNING"

                else:

                    cls_dists[
                        "status"
                    ] = "SAFE"

                class_level_results.append(
                    cls_dists
                )

        # =============================================================
        # SAFETY SCORE
        # =============================================================

        dts_mean = float(
            overall_distances[
                "DTS_dist"
            ]
        )

        ks_mean = float(
            overall_distances[
                "Kolmogorov_Smirnov_dist"
            ]
        )

        ad_mean = float(
            overall_distances[
                "Anderson_Darling_dist"
            ]
        )

        penalty = (
            dts_mean * 25.0
            +
            ks_mean * 40.0
            +
            ad_mean * 5.0
        )

        safety_score = int(
            max(
                0,
                min(
                    100,
                    round(
                        100.0 -
                        penalty
                    )
                )
            )
        )

        if (
            dts_mean > 1.5
            or
            ks_mean > 0.30
            or
            drift_intensity > 0.60
            or
            safety_score < 40
        ):

            overall_safety = "UNSAFE"

        elif (
            dts_mean > 0.50
            or
            ks_mean > 0.15
            or
            drift_intensity > 0.20
            or
            safety_score < 70
        ):

            overall_safety = "WARNING"

        else:

            overall_safety = "SAFE"

        # =============================================================
        # STORE ACTIVE PIPELINE
        # =============================================================

        SafeMLEngine.active_pipeline = {

            "scaler":
                scaler,

            "pca":
                pca,

            "label_encoder":
                label_encoder,

            "clf":
                clf,

            "feature_cols":
                feature_cols,

            "reference_train_pca":
                X_train,

            "class_names":
                [
                    str(c)
                    for c in class_labels
                ],

            "dataset_name":
                file_path.name
        }

        logger.info(
            f"Pipeline ready: "
            f"{clf.__class__.__name__} | "
            f"Accuracy="
            f"{accuracy * 100:.2f}% | "
            f"Safety="
            f"{overall_safety} | "
            f"Score="
            f"{safety_score}"
        )

        return {

            "dataset_name":
                file_path.name,

            "model_used":
                clf.__class__.__name__,

            "total_samples":
                len(df),

            "train_samples":
                len(X_train),

            "test_samples":
                len(X_test),

            "accuracy":
                round(
                    accuracy * 100,
                    2
                ),

            "accuracy_raw":
                accuracy,

            "overall_safety":
                overall_safety,

            "safety_score":
                safety_score,

            "drift_intensity":
                drift_intensity,

            "overall_distances":
                overall_distances,

            "feature_distances":
                feature_distances,

            "class_level_results":
                class_level_results,

            "confusion_matrix":
                conf_mat,

            "class_names":
                [
                    str(c)
                    for c in class_labels
                ],

            "pca_explained_variance":
                list(
                    map(
                        float,
                        pca.explained_variance_ratio_
                    )
                )
        }

    # =================================================================
    # ACTIVE PIPELINE
    # =================================================================

    @staticmethod
    def ensure_active_pipeline(
        base_dir: Path
    ):

        if (
            SafeMLEngine.active_pipeline
            is not None
        ):

            return (
                SafeMLEngine.active_pipeline
            )

        csv_candidates = [

            base_dir
            / "SafeML"
            / "Friday-WorkingHours-Afternoon-PortScan.pcap_ISCX.csv",

            base_dir
            / "Friday-WorkingHours-Afternoon-PortScan.pcap_ISCX.csv",

            base_dir
            / "UNSW_NB15_training-set.csv"
        ]

        csv_candidates += list(
            base_dir.glob(
                "*.csv"
            )
        )

        dataset_path = next(
            (
                p
                for p in csv_candidates
                if p.exists()
            ),
            None
        )

        if not dataset_path:

            raise FileNotFoundError(
                "No training dataset found "
                "to initialize SafeML pipeline."
            )

        logger.info(
            "Initializing baseline pipeline "
            f"using {dataset_path.name}..."
        )

        SafeMLEngine.run_pipeline(
            file_path=dataset_path,
            model_name="mlp",
            n_pca_components=7,
            max_samples=10000
        )

        return (
            SafeMLEngine.active_pipeline
        )

    # =================================================================
    # LIVE FLOW PREDICTION
    # =================================================================

    @staticmethod
    def predict_flow_batch(
        completed_flows: List[
            Dict[str, Any]
        ],
        base_dir: Path
    ) -> List[Dict[str, Any]]:

        pipeline = (
            SafeMLEngine.ensure_active_pipeline(
                base_dir
            )
        )

        scaler: StandardScaler = (
            pipeline["scaler"]
        )

        pca: PCA = (
            pipeline["pca"]
        )

        le: LabelEncoder = (
            pipeline["label_encoder"]
        )

        clf = pipeline["clf"]

        feature_cols: List[str] = (
            pipeline["feature_cols"]
        )

        if not completed_flows:
            return []

        # =============================================================
        # BUILD LIVE DATAFRAME
        # =============================================================

        flow_dicts = [
            f.get(
                "features",
                {}
            )
            for f in completed_flows
        ]

        df_live = pd.DataFrame(
            flow_dicts
        )

        for col in feature_cols:

            if col not in df_live.columns:

                df_live[col] = 0.0

        df_live = (
            df_live[
                feature_cols
            ]
            .apply(
                pd.to_numeric,
                errors="coerce"
            )
            .fillna(0.0)
        )

        X_live = df_live[
            feature_cols
        ]

        # =============================================================
        # SCALE
        # =============================================================

        X_scaled = scaler.transform(
            X_live
        )

        # =============================================================
        # PCA
        # =============================================================

        X_pca = pca.transform(
            X_scaled
        )

        # =============================================================
        # ML PREDICTION
        # =============================================================

        preds = clf.predict(
            X_pca
        )

        # =============================================================
        # PROBABILITY
        # =============================================================

        if hasattr(
            clf,
            "predict_proba"
        ):

            probas = (
                clf.predict_proba(
                    X_pca
                )
            )

        else:

            probas = None

        results = []

        # =============================================================
        # PROCESS EACH FLOW
        # =============================================================

        for i, flow_info in enumerate(
            completed_flows
        ):

            # =========================================================
            # PREDICTION LABEL
            # =========================================================

            pred_class = str(
                le.inverse_transform(
                    [preds[i]]
                )[0]
            )

            prediction_upper = (
                pred_class
                .strip()
                .upper()
            )

            # =========================================================
            # CONFIDENCE
            # =========================================================

            if probas is not None:

                confidence = float(
                    np.max(
                        probas[i]
                    ) * 100.0
                )

            else:

                confidence = 95.0

            confidence = round(
                max(
                    0.0,
                    min(
                        100.0,
                        confidence
                    )
                ),
                1
            )

            # =========================================================
            # DETERMINE BENIGN / THREAT
            # =========================================================

            is_benign = (
                "BENIGN"
                in prediction_upper
                or
                "NORMAL"
                in prediction_upper
            )

            ml_is_threat = (
                not is_benign
            )

            # =========================================================
            # COPY ORIGINAL FLOW DATA
            # =========================================================

            result = dict(
                flow_info
            )

            # =========================================================
            # ALWAYS USE ML PREDICTION
            # =========================================================

            result[
                "prediction"
            ] = pred_class

            result[
                "confidence"
            ] = confidence

            # =========================================================
            # BENIGN RESULT
            # =========================================================

            if is_benign:

                result[
                    "is_threat"
                ] = False

                result[
                    "threat_status"
                ] = "BENIGN"

                result[
                    "threat_score"
                ] = 0.0

                result[
                    "severity"
                ] = "LOW"

                result[
                    "threat_reasons"
                ] = []

            # =========================================================
            # ATTACK RESULT
            # =========================================================

            else:

                result[
                    "is_threat"
                ] = True

                result[
                    "threat_status"
                ] = "ATTACK"

                # -----------------------------------------------------
                # Threat score from ML confidence
                # -----------------------------------------------------

                if confidence >= 90:

                    threat_score = 90.0

                elif confidence >= 75:

                    threat_score = 80.0

                elif confidence >= 60:

                    threat_score = 65.0

                else:

                    threat_score = 50.0

                result[
                    "threat_score"
                ] = round(
                    threat_score,
                    1
                )

                # -----------------------------------------------------
                # Severity
                # -----------------------------------------------------

                if threat_score >= 70:

                    severity = "HIGH"

                elif threat_score >= 40:

                    severity = "MEDIUM"

                else:

                    severity = "LOW"

                result[
                    "severity"
                ] = severity

                # -----------------------------------------------------
                # Threat reason
                # -----------------------------------------------------

                result[
                    "threat_reasons"
                ] = [
                    (
                        "ML detector classified "
                        f"flow as {pred_class}"
                    )
                ]

            # =========================================================
            # PCA VECTOR
            # =========================================================

            result[
                "pca_vector"
            ] = (
                X_pca[i]
                .tolist()
            )

            results.append(
                result
            )

        return results

    # =================================================================
    # LIVE DRIFT
    # =================================================================

    @staticmethod
    def evaluate_live_drift(
        live_pca_matrix: np.ndarray
    ) -> Dict[str, Any]:

        if (
            SafeMLEngine.active_pipeline
            is None
            or
            live_pca_matrix.size == 0
        ):

            return {

                "distances": {

                    "DTS_dist":
                        0.0,

                    "Kolmogorov_Smirnov_dist":
                        0.0,

                    "CVM_dist":
                        0.0
                },

                "safety_status":
                    "SAFE",

                "safety_score":
                    98,

                "drift_alert":
                    False,

                "unknown_behavior":
                    False,

                "overall_safety":
                    "SAFE"
            }

        ref_pca = (
            SafeMLEngine
            .active_pipeline[
                "reference_train_pca"
            ]
        )

        live_pca_matrix = np.asarray(
            live_pca_matrix,
            dtype=float
        )

        distances = (
            compute_all_distances(
                ref_pca,
                live_pca_matrix
            )
        )

        dts_val = float(
            distances[
                "DTS_dist"
            ]
        )

        ks_val = float(
            distances[
                "Kolmogorov_Smirnov_dist"
            ]
        )

        penalty = (
            dts_val * 25.0
            +
            ks_val * 40.0
        )

        safety_score = int(
            max(
                15,
                min(
                    99,
                    round(
                        100.0 -
                        penalty
                    )
                )
            )
        )

        if (
            dts_val > 1.2
            or
            ks_val > 0.25
        ):

            status = "HIGH RISK"

        elif (
            dts_val > 0.4
            or
            ks_val > 0.12
        ):

            status = "WARNING"

        else:

            status = "SAFE"

        drift_alert = (
            dts_val > 0.4
            or
            ks_val > 0.12
        )

        unknown_behavior = (
            dts_val > 0.5
            or
            ks_val > 0.18
        )

        return {

            "distances":
                distances,

            "safety_status":
                status,

            "safety_score":
                safety_score,

            "drift_alert":
                drift_alert,

            "unknown_behavior":
                unknown_behavior,

            "overall_safety":
                status
        }


# =====================================================================
# REAL-TIME STREAM EVALUATOR
# =====================================================================

class RealTimeStreamEvaluator:

    def __init__(
        self,
        baseline_X: np.ndarray,
        model: Any,
        feature_names: List[str]
    ):

        self.baseline_X = baseline_X
        self.model = model
        self.feature_names = feature_names

    def process_window(
        self,
        window_X: np.ndarray,
        window_y_true: Optional[
            np.ndarray
        ] = None
    ) -> Dict[str, Any]:

        pred_y = self.model.predict(
            window_X
        )

        distances = (
            compute_all_distances(
                self.baseline_X,
                window_X
            )
        )

        feat_dists = (
            compute_feature_level_distances(
                self.baseline_X,
                window_X,
                self.feature_names
            )
        )

        accuracy = None

        if (
            window_y_true is not None
            and
            len(window_y_true) > 0
        ):

            accuracy = round(
                float(
                    accuracy_score(
                        window_y_true,
                        pred_y
                    )
                ) * 100,
                2
            )

        dts_val = float(
            distances[
                "DTS_dist"
            ]
        )

        ks_val = float(
            distances[
                "Kolmogorov_Smirnov_dist"
            ]
        )

        if (
            dts_val > 1.5
            or
            ks_val > 0.3
        ):

            safety = "UNSAFE"

        elif (
            dts_val > 0.5
            or
            ks_val > 0.15
        ):

            safety = "WARNING"

        else:

            safety = "SAFE"

        return {

            "window_size":
                len(window_X),

            "accuracy":
                accuracy,

            "safety_status":
                safety,

            "distances":
                distances,

            "feature_distances":
                feat_dists
        }