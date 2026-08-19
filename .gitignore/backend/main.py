import asyncio
import logging
from pathlib import Path
from typing import Any, Dict, List

import numpy as np
import pandas as pd
from fastapi import (
    FastAPI,
    File,
    HTTPException,
    UploadFile,
    WebSocket,
    WebSocketDisconnect,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from backend.network_engine import (
    LiveTrafficMonitor,
    get_available_interfaces,
)
from backend.safeml_engine import SafeMLEngine


# =====================================================================
# LOGGING
# =====================================================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)

logger = logging.getLogger("SafeMLAPI")


# =====================================================================
# PROJECT PATHS
# =====================================================================

BASE_DIR = Path(__file__).resolve().parent.parent

UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(
    parents=True,
    exist_ok=True,
)


# =====================================================================
# FASTAPI APPLICATION
# =====================================================================

app = FastAPI(
    title="SafeML Security & Safety AI Engine API",
    description=(
        "Backend API for SafeML ML detection, "
        "data drift analysis and real-time network monitoring."
    ),
    version="3.0.0",
)


# =====================================================================
# CORS
# =====================================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =====================================================================
# REQUEST SCHEMAS
# =====================================================================


class DatasetPreviewRequest(BaseModel):
    file_name: str


class AnalyzeRequest(BaseModel):
    file_name: str
    model_name: str = Field(
        default="mlp",
        description="mlp, rf, knn, or lr",
    )
    n_pca_components: int = Field(
        default=7,
        ge=1,
        le=20,
    )
    max_samples: int = Field(
        default=20000,
        ge=500,
        le=100000,
    )
    test_size: float = Field(
        default=0.33,
        ge=0.1,
        le=0.5,
    )
    drift_intensity: float = Field(
        default=0.0,
        ge=0.0,
        le=2.0,
    )


class DriftSimulationRequest(BaseModel):
    file_name: str
    model_name: str = "mlp"
    n_pca_components: int = 7
    max_samples: int = 10000
    steps: int = Field(
        default=6,
        ge=3,
        le=10,
    )


# =====================================================================
# DATASET HELPERS
# =====================================================================


def find_dataset_path(file_name: str) -> Path:
    """
    Find a dataset inside uploads or the project workspace.
    """

    uploaded_path = UPLOAD_DIR / file_name

    if uploaded_path.exists():
        return uploaded_path

    matches = list(
        BASE_DIR.glob(
            f"**/{file_name}"
        )
    )

    if matches:
        return matches[0]

    raise HTTPException(
        status_code=404,
        detail=(
            f"Dataset file '{file_name}' "
            "not found."
        ),
    )


# =====================================================================
# HEALTH
# =====================================================================


@app.get("/api/health")
def health_check() -> Dict[str, Any]:
    """
    Backend health endpoint.
    """

    return {
        "status": "HEALTHY",
        "engine": "SafeML Real-Time Security Engine",
        "version": "3.0.0",
        "active": True,
        "pipeline_loaded": (
            SafeMLEngine.active_pipeline is not None
        ),
    }


# =====================================================================
# DATASETS
# =====================================================================


@app.get("/api/datasets")
def list_available_datasets() -> Dict[str, List[Dict[str, Any]]]:
    """
    Scan the project for available CSV datasets.
    """

    datasets = []
    seen_names = set()

    search_locations = [
        BASE_DIR,
        BASE_DIR / "SafeML",
        UPLOAD_DIR,
    ]

    csv_files = []

    for location in search_locations:

        if not location.exists():
            continue

        if location == BASE_DIR:
            csv_files.extend(
                location.glob("*.csv")
            )

        else:
            csv_files.extend(
                location.glob("**/*.csv")
            )

    for path in csv_files:

        if not path.exists():
            continue

        if path.name in seen_names:
            continue

        if path.stat().st_size == 0:
            continue

        seen_names.add(path.name)

        size_mb = round(
            path.stat().st_size /
            (1024 * 1024),
            2,
        )

        name_upper = path.name.upper()

        if "ISCX" in name_upper:
            category = "CICIDS2017"

        elif "UNSW" in name_upper:
            category = "UNSW-NB15"

        else:
            category = "Custom Upload"

        datasets.append(
            {
                "name": path.name,
                "path": str(path),
                "size_mb": size_mb,
                "category": category,
            }
        )

    datasets.sort(
        key=lambda item: item["size_mb"]
    )

    return {
        "datasets": datasets
    }


# =====================================================================
# DATASET PREVIEW
# =====================================================================


@app.post("/api/dataset/preview")
def preview_dataset(
    req: DatasetPreviewRequest,
) -> Dict[str, Any]:

    file_path = find_dataset_path(
        req.file_name
    )

    try:

        return SafeMLEngine.inspect_dataset(
            file_path
        )

    except Exception as exc:

        logger.exception(
            "Dataset preview failed"
        )

        raise HTTPException(
            status_code=500,
            detail=str(exc),
        )


# =====================================================================
# DATASET ANALYSIS
# =====================================================================


@app.post("/api/analyze")
def run_analysis(
    req: AnalyzeRequest,
) -> Dict[str, Any]:

    file_path = find_dataset_path(
        req.file_name
    )

    try:

        result = SafeMLEngine.run_pipeline(
            file_path=file_path,
            model_name=req.model_name,
            n_pca_components=req.n_pca_components,
            max_samples=req.max_samples,
            test_size=req.test_size,
            drift_intensity=req.drift_intensity,
        )

        return result

    except Exception as exc:

        logger.exception(
            "SafeML pipeline execution failed"
        )

        raise HTTPException(
            status_code=500,
            detail=str(exc),
        )


# =====================================================================
# DRIFT SIMULATION
# =====================================================================


@app.post("/api/simulate-drift")
def simulate_drift(
    req: DriftSimulationRequest,
) -> Dict[str, Any]:

    file_path = find_dataset_path(
        req.file_name
    )

    drift_levels = np.linspace(
        0.0,
        0.8,
        req.steps,
    )

    results = []

    try:

        for level in drift_levels:

            level = round(
                float(level),
                2,
            )

            result = SafeMLEngine.run_pipeline(
                file_path=file_path,
                model_name=req.model_name,
                n_pca_components=req.n_pca_components,
                max_samples=req.max_samples,
                drift_intensity=level,
            )

            distances = result.get(
                "overall_distances",
                {},
            )

            results.append(
                {
                    "drift_intensity": level,
                    "accuracy": result.get(
                        "accuracy",
                        0,
                    ),
                    "safety_score": result.get(
                        "safety_score",
                        0,
                    ),
                    "overall_safety": result.get(
                        "overall_safety",
                        "UNKNOWN",
                    ),
                    "dts_dist": round(
                        float(
                            distances.get(
                                "DTS_dist",
                                0,
                            )
                        ),
                        4,
                    ),
                    "ks_dist": round(
                        float(
                            distances.get(
                                "Kolmogorov_Smirnov_dist",
                                0,
                            )
                        ),
                        4,
                    ),
                    "cvm_dist": round(
                        float(
                            distances.get(
                                "CVM_dist",
                                0,
                            )
                        ),
                        4,
                    ),
                    "ad_dist": round(
                        float(
                            distances.get(
                                "Anderson_Darling_dist",
                                0,
                            )
                        ),
                        4,
                    ),
                    "wasserstein_dist": round(
                        float(
                            distances.get(
                                "Wasserstein_dist",
                                0,
                            )
                        ),
                        4,
                    ),
                }
            )

        return {
            "file_name": req.file_name,
            "simulation_curve": results,
        }

    except Exception as exc:

        logger.exception(
            "Drift simulation failed"
        )

        raise HTTPException(
            status_code=500,
            detail=str(exc),
        )


# =====================================================================
# UPLOAD DATASET
# =====================================================================


@app.post("/api/upload")
async def upload_dataset(
    file: UploadFile = File(...),
) -> Dict[str, Any]:

    filename = file.filename or ""

    if not filename.lower().endswith(
        ".csv"
    ):
        raise HTTPException(
            status_code=400,
            detail="Only CSV files are supported.",
        )

    safe_filename = Path(
        filename
    ).name

    file_path = (
        UPLOAD_DIR /
        safe_filename
    )

    try:

        contents = await file.read()

        with open(
            file_path,
            "wb",
        ) as output_file:

            output_file.write(
                contents
            )

        return {
            "message": "Upload successful",
            "file_name": safe_filename,
            "size_mb": round(
                len(contents) /
                (1024 * 1024),
                2,
            ),
        }

    except Exception as exc:

        logger.exception(
            "Dataset upload failed"
        )

        raise HTTPException(
            status_code=500,
            detail=(
                f"Failed to save upload: {exc}"
            ),
        )


# =====================================================================
# EXPORT RESULTS
# =====================================================================


@app.post("/api/export")
def export_results(
    data: Dict[str, Any],
) -> FileResponse:

    try:

        report_path = (
            BASE_DIR /
            "safeml_report_download.xlsx"
        )

        with pd.ExcelWriter(
            report_path,
            engine="openpyxl",
        ) as writer:

            summary_data = [
                {
                    "Metric": "Dataset",
                    "Value": data.get(
                        "dataset_name",
                        "N/A",
                    ),
                },
                {
                    "Metric": "Classifier Model",
                    "Value": data.get(
                        "model_used",
                        "N/A",
                    ),
                },
                {
                    "Metric": "Accuracy (%)",
                    "Value": data.get(
                        "accuracy",
                        0,
                    ),
                },
                {
                    "Metric": "Overall Safety",
                    "Value": data.get(
                        "overall_safety",
                        "UNKNOWN",
                    ),
                },
                {
                    "Metric": "Safety Score",
                    "Value": data.get(
                        "safety_score",
                        0,
                    ),
                },
                {
                    "Metric": "Drift Intensity",
                    "Value": data.get(
                        "drift_intensity",
                        0,
                    ),
                },
            ]

            pd.DataFrame(
                summary_data
            ).to_excel(
                writer,
                sheet_name="Summary",
                index=False,
            )

            if "overall_distances" in data:

                pd.DataFrame(
                    [
                        data[
                            "overall_distances"
                        ]
                    ]
                ).to_excel(
                    writer,
                    sheet_name="Overall Distances",
                    index=False,
                )

            if (
                "class_level_results" in data
                and data["class_level_results"]
            ):

                pd.DataFrame(
                    data[
                        "class_level_results"
                    ]
                ).to_excel(
                    writer,
                    sheet_name="Class Level Results",
                    index=False,
                )

            if (
                "feature_distances" in data
                and data["feature_distances"]
            ):

                pd.DataFrame(
                    data[
                        "feature_distances"
                    ]
                ).to_excel(
                    writer,
                    sheet_name="Feature Distances",
                    index=False,
                )

        dataset_name = (
            data.get(
                "dataset_name",
                "export",
            )
        )

        return FileResponse(
            path=report_path,
            filename=(
                f"SafeML_Report_"
                f"{dataset_name}.xlsx"
            ),
            media_type=(
                "application/vnd.openxmlformats-"
                "officedocument.spreadsheetml.sheet"
            ),
        )

    except Exception as exc:

        logger.exception(
            "Export failed"
        )

        raise HTTPException(
            status_code=500,
            detail=f"Export failed: {exc}",
        )


# =====================================================================
# NETWORK INTERFACES
# =====================================================================


@app.get("/api/network/interfaces")
def list_network_interfaces() -> Dict[str, Any]:
    """
    Return real network interfaces available
    for packet capture.
    """

    try:

        interfaces = (
            get_available_interfaces()
        )

        if not isinstance(
            interfaces,
            list,
        ):
            interfaces = []

        return {
            "interfaces": interfaces
        }

    except Exception as exc:

        logger.exception(
            "Failed to retrieve network interfaces"
        )

        return {
            "interfaces": [
                {
                    "id": "auto",
                    "name": (
                        "Auto-Detect Default Interface"
                    ),
                    "ip": "127.0.0.1",
                }
            ],
            "error": str(exc),
        }


# =====================================================================
# REAL-TIME WEBSOCKET
# =====================================================================


@app.websocket("/ws/stream")
async def websocket_stream_endpoint(
    websocket: WebSocket,
    interface: str = "auto",
    mode: str = "live",
):
    """
    Real-time SafeML network monitoring stream.

    The backend performs:

    Packet capture
        ↓
    Flow generation
        ↓
    ML prediction
        ↓
    Threat classification
        ↓
    Threat scoring
        ↓
    PCA drift analysis
        ↓
    WebSocket dashboard update
    """

    await websocket.accept()

    logger.info(
        "WebSocket client connected | "
        f"interface={interface} | "
        f"mode={mode}"
    )

    # ================================================================
    # SIMULATION MODE
    # ================================================================

    if mode != "live":

        await run_simulation_stream(
            websocket
        )

        return

    # ================================================================
    # LIVE MODE
    # ================================================================

    monitor = None

    live_pca_history = []

    recent_events = []

    benign_count = 0
    suspicious_count = 0
    attack_count = 0

    step = 0

    try:

        # ------------------------------------------------------------
        # CREATE MONITOR
        # ------------------------------------------------------------

        monitor = LiveTrafficMonitor(
            interface=interface
        )

        monitor.start()

        logger.info(
            "LiveTrafficMonitor started | "
            f"interface={interface}"
        )

        # ------------------------------------------------------------
        # STREAM LOOP
        # ------------------------------------------------------------

        while True:

            step += 1

            await asyncio.sleep(
                1.0
            )

            # --------------------------------------------------------
            # GET NETWORK STATISTICS
            # --------------------------------------------------------

            try:

                stats = monitor.get_stats()

            except Exception as exc:

                logger.error(
                    f"Unable to get monitor stats: {exc}"
                )

                stats = {
                    "packets_captured": 0,
                    "bytes_captured": 0,
                    "flows_analyzed": 0,
                    "packets_per_sec": 0,
                    "bytes_per_sec": 0,
                    "active_flows_count": 0,
                    "using_fallback": True,
                }

            # --------------------------------------------------------
            # GET COMPLETED FLOWS
            # --------------------------------------------------------

            try:

                flows = (
                    monitor
                    .get_pending_completed_flows()
                )

            except Exception as exc:

                logger.error(
                    f"Unable to get completed flows: {exc}"
                )

                flows = []

            # --------------------------------------------------------
            # ML PROCESSING
            # --------------------------------------------------------

            processed_flows = []

            if flows:

                try:

                    processed_flows = (
                        SafeMLEngine.predict_flow_batch(
                            flows,
                            BASE_DIR,
                        )
                    )

                except Exception as exc:

                    logger.exception(
                        "Live ML prediction failed"
                    )

                    processed_flows = []

            # --------------------------------------------------------
            # PROCESS EVERY ML FLOW
            # --------------------------------------------------------

            for item in processed_flows:

                status = str(
                    item.get(
                        "threat_status",
                        "BENIGN",
                    )
                ).upper()

                # ----------------------------------------------------
                # CORRECT THREAT COUNTS
                # ----------------------------------------------------

                if status == "ATTACK":

                    attack_count += 1

                elif status == "SUSPICIOUS":

                    suspicious_count += 1

                else:

                    benign_count += 1

                # ----------------------------------------------------
                # PCA HISTORY
                # ----------------------------------------------------

                pca_vector = item.get(
                    "pca_vector"
                )

                if (
                    isinstance(
                        pca_vector,
                        list,
                    )
                    and len(pca_vector) > 0
                ):

                    live_pca_history.append(
                        pca_vector
                    )

                # ----------------------------------------------------
                # STORE COMPLETE EVENT
                # ----------------------------------------------------

                event = {
                    "timestamp": item.get(
                        "timestamp",
                        item.get(
                            "time",
                            "--",
                        ),
                    ),
                    "time": item.get(
                        "time",
                        item.get(
                            "timestamp",
                            "--",
                        ),
                    ),
                    "src_ip": item.get(
                        "src_ip",
                        "--",
                    ),
                    "src_port": item.get(
                        "src_port",
                        0,
                    ),
                    "dst_ip": item.get(
                        "dst_ip",
                        "--",
                    ),
                    "dst_port": item.get(
                        "dst_port",
                        0,
                    ),
                    "protocol": item.get(
                        "protocol",
                        "--",
                    ),
                    "prediction": item.get(
                        "prediction",
                        "UNKNOWN",
                    ),
                    "confidence": float(
                        item.get(
                            "confidence",
                            0,
                        )
                        or 0
                    ),
                    "is_threat": bool(
                        item.get(
                            "is_threat",
                            False,
                        )
                    ),
                    "threat_status": status,
                    "threat_score": float(
                        item.get(
                            "threat_score",
                            0,
                        )
                        or 0
                    ),
                    "severity": str(
                        item.get(
                            "severity",
                            "LOW",
                        )
                    ).upper(),
                    "threat_reasons": (
                        item.get(
                            "threat_reasons",
                            [],
                        )
                        if isinstance(
                            item.get(
                                "threat_reasons",
                                [],
                            ),
                            list,
                        )
                        else []
                    ),
                }

                recent_events.insert(
                    0,
                    event,
                )

            # --------------------------------------------------------
            # LIMIT PCA HISTORY
            # --------------------------------------------------------

            if len(
                live_pca_history
            ) > 300:

                live_pca_history = (
                    live_pca_history[-200:]
                )

            # --------------------------------------------------------
            # LIMIT EVENTS
            # --------------------------------------------------------

            if len(
                recent_events
            ) > 100:

                recent_events = (
                    recent_events[:100]
                )

            # --------------------------------------------------------
            # LIVE DRIFT EVALUATION
            # --------------------------------------------------------

            if len(
                live_pca_history
            ) >= 5:

                try:

                    pca_matrix = np.asarray(
                        live_pca_history,
                        dtype=float,
                    )

                    safety_eval = (
                        SafeMLEngine
                        .evaluate_live_drift(
                            pca_matrix
                        )
                    )

                except Exception as exc:

                    logger.error(
                        f"Live drift evaluation failed: {exc}"
                    )

                    safety_eval = (
                        default_safety()
                    )

            else:

                safety_eval = (
                    default_safety()
                )

            # --------------------------------------------------------
            # NORMALIZE SAFETY DATA
            # --------------------------------------------------------

            safety_distances = (
                safety_eval.get(
                    "distances",
                    {},
                )
            )

            safety_status = str(
                safety_eval.get(
                    "safety_status",
                    "SAFE",
                )
            ).upper()

            safety_score = int(
                max(
                    0,
                    min(
                        100,
                        float(
                            safety_eval.get(
                                "safety_score",
                                98,
                            )
                        ),
                    ),
                )
            )

            # --------------------------------------------------------
            # LATEST FLOW
            # --------------------------------------------------------

            latest_flow = (
                recent_events[0]
                if recent_events
                else None
            )

            # --------------------------------------------------------
            # ACTIVE FLOWS
            # --------------------------------------------------------

            active_flows = int(
                stats.get(
                    "active_flows_count",
                    stats.get(
                        "active_flows",
                        0,
                    ),
                )
                or 0
            )

            # --------------------------------------------------------
            # SAFE STAT VALUES
            # --------------------------------------------------------

            packets_captured = int(
                stats.get(
                    "packets_captured",
                    0,
                )
                or 0
            )

            bytes_captured = int(
                stats.get(
                    "bytes_captured",
                    0,
                )
                or 0
            )

            flows_analyzed = int(
                stats.get(
                    "flows_analyzed",
                    0,
                )
                or 0
            )

            packets_per_sec = float(
                stats.get(
                    "packets_per_sec",
                    0,
                )
                or 0
            )

            bytes_per_sec = float(
                stats.get(
                    "bytes_per_sec",
                    0,
                )
                or 0
            )

            using_fallback = bool(
                stats.get(
                    "using_fallback",
                    False,
                )
            )

            # --------------------------------------------------------
            # ACCURACY INDICATOR
            # --------------------------------------------------------

            accuracy = calculate_live_accuracy(
                safety_distances
            )

            # --------------------------------------------------------
            # WEBSOCKET PAYLOAD
            # --------------------------------------------------------

            payload = {
                "step": step,
                "mode": "live",
                "timestamp": pd.Timestamp.now().strftime(
                    "%H:%M:%S"
                ),

                "interface": interface,

                "using_fallback": (
                    using_fallback
                ),

                "stats": {
                    "packets_captured": (
                        packets_captured
                    ),
                    "bytes_captured": (
                        bytes_captured
                    ),
                    "flows_analyzed": (
                        flows_analyzed
                    ),
                    "packets_per_sec": (
                        packets_per_sec
                    ),
                    "bytes_per_sec": (
                        bytes_per_sec
                    ),
                    "benign_count": (
                        benign_count
                    ),
                    "suspicious_count": (
                        suspicious_count
                    ),
                    "attack_count": (
                        attack_count
                    ),
                    "active_flows_count": (
                        active_flows
                    ),
                },

                "latest_flow": (
                    latest_flow
                ),

                "recent_events": (
                    recent_events[:10]
                ),

                "safety": {
                    "distances": (
                        safety_distances
                    ),
                    "safety_status": (
                        safety_status
                    ),
                    "safety_score": (
                        safety_score
                    ),
                    "drift_alert": bool(
                        safety_eval.get(
                            "drift_alert",
                            False,
                        )
                    ),
                    "unknown_behavior": bool(
                        safety_eval.get(
                            "unknown_behavior",
                            False,
                        )
                    ),
                    "overall_safety": (
                        safety_eval.get(
                            "overall_safety",
                            safety_status,
                        )
                    ),
                },

                "accuracy": accuracy,
            }

            await websocket.send_json(
                payload
            )

    except WebSocketDisconnect:

        logger.info(
            "SafeML WebSocket client disconnected."
        )

    except Exception as exc:

        logger.exception(
            f"Live WebSocket error: {exc}"
        )

    finally:

        if monitor is not None:

            try:

                monitor.stop()

                logger.info(
                    "LiveTrafficMonitor stopped."
                )

            except Exception as exc:

                logger.error(
                    f"Error stopping monitor: {exc}"
                )


# =====================================================================
# DEFAULT SAFETY
# =====================================================================


def default_safety() -> Dict[str, Any]:
    """
    Default safety state before enough PCA
    samples are available for drift analysis.
    """

    return {
        "distances": {
            "DTS_dist": 0.02,
            "Kolmogorov_Smirnov_dist": 0.01,
            "CVM_dist": 0.05,
            "Anderson_Darling_dist": 0.02,
            "Kuiper_dist": 0.02,
            "Wasserstein_dist": 0.02,
        },
        "safety_status": "SAFE",
        "safety_score": 98,
        "drift_alert": False,
        "unknown_behavior": False,
        "overall_safety": "SAFE",
    }


# =====================================================================
# LIVE ACCURACY
# =====================================================================


def calculate_live_accuracy(
    distances: Dict[str, Any],
) -> float:
    """
    Generates a dashboard confidence indicator
    from the current drift measurements.

    This is NOT ground-truth classification accuracy
    because live traffic has no labels.
    """

    dts = float(
        distances.get(
            "DTS_dist",
            0,
        )
        or 0
    )

    ks = float(
        distances.get(
            "Kolmogorov_Smirnov_dist",
            0,
        )
        or 0
    )

    value = (
        99.5
        - dts * 15.0
        - ks * 20.0
    )

    return round(
        max(
            50.0,
            min(
                99.9,
                value,
            ),
        ),
        1,
    )


# =====================================================================
# SIMULATION STREAM
# =====================================================================


async def run_simulation_stream(
    websocket: WebSocket,
):
    """
    Optional simulation mode for testing
    the frontend without live packet capture.
    """

    baseline = np.random.normal(
        loc=0.0,
        scale=1.0,
        size=(1000, 7),
    )

    step = 0

    try:

        while True:

            step += 1

            await asyncio.sleep(
                1.2
            )

            drift = (
                0.0
                if step <= 4
                else min(
                    0.8,
                    (step - 4) * 0.12,
                )
            )

            noise = np.random.normal(
                loc=drift * 0.6,
                scale=1.0 + drift,
                size=(200, 7),
            )

            live_matrix = (
                baseline[:200] +
                noise
            )

            distances = (
                SafeMLEngine.compute_all_distances
                if hasattr(
                    SafeMLEngine,
                    "compute_all_distances",
                )
                else None
            )

            dts_dist = round(
                float(
                    drift * 0.18 +
                    np.random.uniform(
                        0.01,
                        0.04,
                    )
                ),
                4,
            )

            ks_dist = round(
                float(
                    drift * 0.45 +
                    np.random.uniform(
                        0.02,
                        0.05,
                    )
                ),
                4,
            )

            safety_status = (
                "SAFE"
                if drift < 0.2
                else (
                    "WARNING"
                    if drift < 0.45
                    else "HIGH RISK"
                )
            )

            safety_score = max(
                20,
                int(
                    100 -
                    (
                        dts_dist * 25 +
                        ks_dist * 40
                    )
                ),
            )

            is_attack = (
                drift > 0.3
                and step % 3 == 0
            )

            prediction = (
                "PortScan"
                if is_attack
                else "BENIGN"
            )

            threat_status = (
                "ATTACK"
                if is_attack
                else "BENIGN"
            )

            threat_score = (
                85.0
                if is_attack
                else 0.0
            )

            latest_flow = {
                "timestamp": pd.Timestamp.now().strftime(
                    "%H:%M:%S"
                ),
                "time": pd.Timestamp.now().strftime(
                    "%H:%M:%S"
                ),
                "src_ip": (
                    f"192.168.1."
                    f"{10 + (step % 20)}"
                ),
                "src_port": 5000 + step,
                "dst_ip": "192.168.1.1",
                "dst_port": 80,
                "protocol": "TCP",
                "prediction": prediction,
                "confidence": round(
                    99.0 -
                    drift * 20.0,
                    1,
                ),
                "is_threat": is_attack,
                "threat_status": threat_status,
                "threat_score": threat_score,
                "severity": (
                    "HIGH"
                    if is_attack
                    else "LOW"
                ),
                "threat_reasons": (
                    [
                        "Simulation detected anomalous network behavior"
                    ]
                    if is_attack
                    else []
                ),
            }

            payload = {
                "step": step,
                "mode": "simulation",
                "timestamp": pd.Timestamp.now().strftime(
                    "%H:%M:%S"
                ),
                "using_fallback": True,

                "stats": {
                    "packets_captured": step * 180,
                    "bytes_captured": step * 142000,
                    "flows_analyzed": step * 12,
                    "packets_per_sec": 180.0,
                    "bytes_per_sec": 142000.0,
                    "benign_count": (
                        step * 11
                    ),
                    "suspicious_count": 0,
                    "attack_count": (
                        int(drift * 3)
                    ),
                    "active_flows_count": 0,
                },

                "latest_flow": (
                    latest_flow
                ),

                "recent_events": [
                    latest_flow
                ],

                "safety": {
                    "distances": {
                        "DTS_dist": dts_dist,
                        "Kolmogorov_Smirnov_dist": ks_dist,
                    },
                    "safety_status": safety_status,
                    "safety_score": safety_score,
                    "drift_alert": (
                        drift > 0.35
                    ),
                    "unknown_behavior": (
                        drift > 0.5
                    ),
                    "overall_safety": safety_status,
                },

                "accuracy": max(
                    65.0,
                    round(
                        99.2 -
                        drift * 28.0,
                        1,
                    ),
                ),
            }

            await websocket.send_json(
                payload
            )

    except WebSocketDisconnect:

        logger.info(
            "Simulation WebSocket disconnected."
        )

    except Exception as exc:

        logger.exception(
            f"Simulation WebSocket error: {exc}"
        )


# =====================================================================
# FRONTEND STATIC FILES
# =====================================================================

FRONTEND_DIR = (
    BASE_DIR /
    "frontend"
)

FRONTEND_DIST = (
    FRONTEND_DIR /
    "dist"
)


if FRONTEND_DIST.exists():

    app.mount(
        "/",
        StaticFiles(
            directory=str(
                FRONTEND_DIST
            ),
            html=True,
        ),
        name="frontend",
    )

else:

    logger.info(
        "React frontend build not found. "
        "Run: cd frontend && npm install && npm run build"
    )