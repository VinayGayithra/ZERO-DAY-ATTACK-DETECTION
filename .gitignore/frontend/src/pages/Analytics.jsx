import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Brain,
  Database,
  Download,
  Play,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Upload,
  Network,
  Target,
  BarChart3,
} from "lucide-react";

import {
  getDatasets,
  previewDataset,
  analyzeDataset,
  simulateDrift,
  uploadDataset,
  exportResults,
} from "../services/api";

import {
  BarChart,
  Bar,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export default function Analytics({
  flows = [],
}) {
  const safeFlows = Array.isArray(flows)
    ? flows
    : [];

  const [datasets, setDatasets] = useState([]);
  const [selectedFile, setSelectedFile] = useState("");

  const [preview, setPreview] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [simulation, setSimulation] = useState(null);

  const [model, setModel] = useState("mlp");
  const [pcaComponents, setPcaComponents] = useState(7);
  const [maxSamples, setMaxSamples] = useState(20000);
  const [drift, setDrift] = useState(0);

  const [loadingDatasets, setLoadingDatasets] =
    useState(false);

  const [loadingPreview, setLoadingPreview] =
    useState(false);

  const [loadingAnalysis, setLoadingAnalysis] =
    useState(false);

  const [loadingSimulation, setLoadingSimulation] =
    useState(false);

  const [uploading, setUploading] =
    useState(false);

  const [error, setError] = useState("");

  /* ============================================================
     LIVE FLOW ANALYTICS
  ============================================================ */

  const predictionCounts = useMemo(() => {
    return safeFlows.reduce(
      (acc, flow) => {
        const prediction =
          flow?.prediction ||
          "UNKNOWN";

        acc[prediction] =
          (acc[prediction] || 0) + 1;

        return acc;
      },
      {}
    );
  }, [safeFlows]);

  const predictionData = useMemo(() => {
    return Object.entries(
      predictionCounts
    ).map(
      ([name, value]) => ({
        name,
        value,
      })
    );
  }, [predictionCounts]);

  const threatCounts = useMemo(() => {
    return safeFlows.reduce(
      (acc, flow) => {
        const status =
          String(
            flow?.threat_status ||
            "BENIGN"
          ).toUpperCase();

        if (
          status === "ATTACK"
        ) {
          acc.attack += 1;
        } else if (
          status === "SUSPICIOUS"
        ) {
          acc.suspicious += 1;
        } else {
          acc.benign += 1;
        }

        return acc;
      },
      {
        benign: 0,
        suspicious: 0,
        attack: 0,
      }
    );
  }, [safeFlows]);

  const threatData = [
    {
      name: "Benign",
      value: threatCounts.benign,
    },
    {
      name: "Suspicious",
      value: threatCounts.suspicious,
    },
    {
      name: "Attack",
      value: threatCounts.attack,
    },
  ];

  const protocolCounts = useMemo(() => {
    return safeFlows.reduce(
      (acc, flow) => {
        const protocol =
          flow?.protocol ||
          "UNKNOWN";

        acc[protocol] =
          (acc[protocol] || 0) + 1;

        return acc;
      },
      {}
    );
  }, [safeFlows]);

  const protocolData = useMemo(() => {
    return Object.entries(
      protocolCounts
    ).map(
      ([name, value]) => ({
        name,
        value,
      })
    );
  }, [protocolCounts]);

  const averageConfidence =
    safeFlows.length
      ? safeFlows.reduce(
        (sum, flow) =>
          sum +
          Number(
            flow?.confidence || 0
          ),
        0
      ) / safeFlows.length
      : 0;

  const averageThreatScore =
    safeFlows.length
      ? safeFlows.reduce(
        (sum, flow) =>
          sum +
          Number(
            flow?.threat_score || 0
          ),
        0
      ) / safeFlows.length
      : 0;

  const attackRate =
    safeFlows.length
      ? (
        (threatCounts.attack /
          safeFlows.length) *
        100
      ).toFixed(1)
      : "0.0";

  const suspiciousRate =
    safeFlows.length
      ? (
        (threatCounts.suspicious /
          safeFlows.length) *
        100
      ).toFixed(1)
      : "0.0";

  const confidenceTrend = useMemo(() => {
    return safeFlows
      .slice()
      .reverse()
      .slice(-25)
      .map(
        (flow, index) => ({
          name: index + 1,
          confidence: Number(
            flow?.confidence || 0
          ),
          threat: Number(
            flow?.threat_score || 0
          ),
        })
      );
  }, [safeFlows]);

  /* ============================================================
     LOAD DATASETS
  ============================================================ */

  const loadDatasets = async () => {
    try {
      setLoadingDatasets(true);
      setError("");

      const result =
        await getDatasets();

      const available =
        Array.isArray(
          result?.datasets
        )
          ? result.datasets
          : [];

      setDatasets(available);

      if (
        !selectedFile &&
        available.length > 0
      ) {
        setSelectedFile(
          available[0].name
        );
      }
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
        "Unable to load datasets."
      );
    } finally {
      setLoadingDatasets(false);
    }
  };

  useEffect(() => {
    loadDatasets();
  }, []);

  /* ============================================================
     PREVIEW DATASET
  ============================================================ */

  const handlePreview = async () => {
    if (!selectedFile) {
      setError(
        "Please select a dataset first."
      );
      return;
    }

    try {
      setLoadingPreview(true);
      setError("");

      const result =
        await previewDataset(
          selectedFile
        );

      setPreview(result);
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
        "Dataset preview failed."
      );
    } finally {
      setLoadingPreview(false);
    }
  };

  /* ============================================================
     RUN ANALYSIS
  ============================================================ */

  const handleAnalyze = async () => {
    if (!selectedFile) {
      setError(
        "Please select a dataset first."
      );
      return;
    }

    try {
      setLoadingAnalysis(true);
      setError("");
      setAnalysis(null);

      const result =
        await analyzeDataset({
          file_name: selectedFile,
          model_name: model,
          n_pca_components:
            Number(
              pcaComponents
            ),
          max_samples:
            Number(maxSamples),
          test_size: 0.33,
          drift_intensity:
            Number(drift),
        });

      setAnalysis(result);
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
        "ML analysis failed."
      );
    } finally {
      setLoadingAnalysis(false);
    }
  };

  /* ============================================================
     DRIFT SIMULATION
  ============================================================ */

  const handleSimulation = async () => {
    if (!selectedFile) {
      setError(
        "Please select a dataset first."
      );
      return;
    }

    try {
      setLoadingSimulation(true);
      setError("");
      setSimulation(null);

      const result =
        await simulateDrift({
          file_name: selectedFile,
          model_name: model,
          n_pca_components:
            Number(
              pcaComponents
            ),
          max_samples:
            Number(maxSamples),
          steps: 6,
        });

      setSimulation(result);
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
        "Drift simulation failed."
      );
    } finally {
      setLoadingSimulation(false);
    }
  };

  /* ============================================================
     UPLOAD
  ============================================================ */

  const handleUpload = async (
    event
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) return;

    if (
      !file.name
        .toLowerCase()
        .endsWith(".csv")
    ) {
      setError(
        "Only CSV files are supported."
      );
      return;
    }

    try {
      setUploading(true);
      setError("");

      const result =
        await uploadDataset(
          file
        );

      await loadDatasets();

      if (
        result?.file_name
      ) {
        setSelectedFile(
          result.file_name
        );
      }
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
        "Dataset upload failed."
      );
    } finally {
      setUploading(false);
    }
  };

  /* ============================================================
     EXPORT
  ============================================================ */

  const handleExport = async () => {
    if (!analysis) {
      setError(
        "Run an analysis before exporting."
      );
      return;
    }

    try {
      setError("");

      await exportResults(
        analysis
      );
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
        "Export failed."
      );
    }
  };

  /* ============================================================
     ANALYSIS RESULT DATA
  ============================================================ */

  const safetyStatus =
    String(
      analysis?.overall_safety ||
      "UNKNOWN"
    ).toUpperCase();

  const safetyScore = Number(
    analysis?.safety_score ?? 0
  );

  const safetyClass =
    safetyStatus === "SAFE"
      ? "safe"
      : safetyStatus ===
        "WARNING"
        ? "warning"
        : "danger";

  const accuracy = Number(
    analysis?.accuracy ?? 0
  );

  const distanceData =
    analysis?.overall_distances
      ? [
        {
          name: "CVM",
          value: Number(
            analysis
              .overall_distances
              .CVM_dist || 0
          ),
        },
        {
          name: "AD",
          value: Number(
            analysis
              .overall_distances
              .Anderson_Darling_dist ||
            0
          ),
        },
        {
          name: "KS",
          value: Number(
            analysis
              .overall_distances
              .Kolmogorov_Smirnov_dist ||
            0
          ),
        },
        {
          name: "Kuiper",
          value: Number(
            analysis
              .overall_distances
              .Kuiper_dist || 0
          ),
        },
        {
          name: "Wasserstein",
          value: Number(
            analysis
              .overall_distances
              .Wasserstein_dist ||
            0
          ),
        },
        {
          name: "DTS",
          value: Number(
            analysis
              .overall_distances
              .DTS_dist || 0
          ),
        },
      ]
      : [];

  const pcaData = useMemo(() => {
    if (
      !Array.isArray(
        analysis?.pca_explained_variance
      )
    ) {
      return [];
    }

    return analysis.pca_explained_variance.map(
      (value, index) => ({
        name: `PC${index + 1}`,
        value:
          Number(value || 0) *
          100,
      })
    );
  }, [analysis]);

  const simulationData =
    Array.isArray(
      simulation?.simulation_curve
    )
      ? simulation.simulation_curve.map(
        (item) => ({
          drift: Number(
            item.drift_intensity ||
            0
          ),
          accuracy: Number(
            item.accuracy || 0
          ),
          safety: Number(
            item.safety_score || 0
          ),
          dts: Number(
            item.dts_dist || 0
          ),
          ks: Number(
            item.ks_dist || 0
          ),
        })
      )
      : [];

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <div className="page">

      {/* ========================================================
          HEADER
      ======================================================== */}

      <div className="page-title">

        <div>

          <div className="eyebrow">
            SECURITY ANALYTICS
          </div>

          <h1>
            Detection Analytics
          </h1>

          <p>
            Analyze live ML detections,
            threat activity and model
            safety performance.
          </p>

        </div>

        <div className="analytics-live-badge">
          <i />
          LIVE SENSOR
        </div>

      </div>

      {/* ========================================================
          LIVE SUMMARY
      ======================================================== */}

      <div className="stats-grid analytics-stats">

        <div className="stat-card">

          <div className="stat-icon cyan">
            <Activity />
          </div>

          <div className="stat-copy">

            <span>
              Total Flows
            </span>

            <strong>
              {safeFlows.length}
            </strong>

            <em>
              Analyzed connections
            </em>

          </div>

        </div>


        <div className="stat-card">

          <div className="stat-icon green">
            <ShieldCheck />
          </div>

          <div className="stat-copy">

            <span>
              Benign Flows
            </span>

            <strong>
              {threatCounts.benign}
            </strong>

            <em>
              {safeFlows.length
                ? (
                  (
                    threatCounts.benign /
                    safeFlows.length
                  ) *
                  100
                ).toFixed(1)
                : "0.0"}
              % of traffic
            </em>

          </div>

        </div>


        <div className="stat-card">

          <div className="stat-icon red">
            <ShieldAlert />
          </div>

          <div className="stat-copy">

            <span>
              Attack Rate
            </span>

            <strong>
              {attackRate}%
            </strong>

            <em>
              {threatCounts.attack}
              {" "}
              attack events
            </em>

          </div>

        </div>


        <div className="stat-card">

          <div className="stat-icon violet">
            <Brain />
          </div>

          <div className="stat-copy">

            <span>
              ML Confidence
            </span>

            <strong>
              {averageConfidence.toFixed(
                1
              )}
              %
            </strong>

            <em>
              Average detector confidence
            </em>

          </div>

        </div>

      </div>

      {/* ========================================================
          LIVE ANALYTICS
      ======================================================== */}

      <div className="analytics-grid">

        {/* PREDICTIONS */}

        <section className="panel large-chart">

          <div className="panel-head">

            <div>

              <h2>
                Prediction Distribution
              </h2>

              <span>
                ML classification across
                live analyzed flows
              </span>

            </div>

          </div>

          <div className="analytics-chart">

            {predictionData.length ===
              0 ? (
              <div className="analytics-empty">
                Waiting for live
                analyzed flows...
              </div>
            ) : (
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart
                  data={predictionData}
                >

                  <CartesianGrid
                    stroke="#1b2d44"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="name"
                    stroke="#71839a"
                    tick={{
                      fontSize: 10,
                    }}
                  />

                  <YAxis
                    stroke="#71839a"
                    allowDecimals={
                      false
                    }
                  />

                  <Tooltip
                    contentStyle={{
                      background:
                        "#0b1728",
                      border:
                        "1px solid #1c3552",
                      borderRadius: 10,
                      color:
                        "#e8f0fa",
                    }}
                  />

                  <Bar
                    dataKey="value"
                    fill="#38bdf8"
                    radius={[
                      6,
                      6,
                      0,
                      0,
                    ]}
                  />

                </BarChart>
              </ResponsiveContainer>
            )}

          </div>

        </section>


        {/* THREAT DISTRIBUTION */}

        <section className="panel analytics-pie-panel">

          <div className="panel-head">

            <div>

              <h2>
                Threat Distribution
              </h2>

              <span>
                Current live flow classification
              </span>

            </div>

          </div>

          <div className="pie-chart">

            <ResponsiveContainer
              width="100%"
              height="100%"
            >

              <PieChart>

                <Pie
                  data={threatData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={3}
                >

                  <Cell
                    fill="#4ade80"
                  />

                  <Cell
                    fill="#fbbf24"
                  />

                  <Cell
                    fill="#fb7185"
                  />

                </Pie>

                <Tooltip
                  contentStyle={{
                    background:
                      "#0b1728",
                    border:
                      "1px solid #1c3552",
                    borderRadius: 10,
                    color:
                      "#e8f0fa",
                  }}
                />

              </PieChart>

            </ResponsiveContainer>

          </div>

          <div className="analytics-legend">

            <div>
              <i className="legend-safe" />
              <span>Benign</span>
              <strong>
                {threatCounts.benign}
              </strong>
            </div>

            <div>
              <i className="legend-warning" />
              <span>Suspicious</span>
              <strong>
                {threatCounts.suspicious}
              </strong>
            </div>

            <div>
              <i className="legend-danger" />
              <span>Attack</span>
              <strong>
                {threatCounts.attack}
              </strong>
            </div>

          </div>

        </section>

      </div>

      {/* ========================================================
          CONFIDENCE TREND
      ======================================================== */}

      <section className="panel large-chart analytics-trend">

        <div className="panel-head">

          <div>

            <h2>
              Detection Confidence & Threat Score
            </h2>

            <span>
              Latest live analyzed flows
            </span>

          </div>

          <div className="analytics-metrics">

            <div>
              <span>
                Avg Confidence
              </span>

              <strong>
                {averageConfidence.toFixed(
                  1
                )}
                %
              </strong>
            </div>

            <div>
              <span>
                Avg Threat Score
              </span>

              <strong>
                {averageThreatScore.toFixed(
                  1
                )}
              </strong>
            </div>

            <div>
              <span>
                Suspicious Rate
              </span>

              <strong>
                {suspiciousRate}%
              </strong>
            </div>

          </div>

        </div>

        <div className="analytics-trend-chart">

          {confidenceTrend.length ===
            0 ? (
            <div className="analytics-empty">
              Waiting for live detection
              data...
            </div>
          ) : (
            <ResponsiveContainer
              width="100%"
              height="100%"
            >

              <LineChart
                data={confidenceTrend}
              >

                <CartesianGrid
                  stroke="#1b2d44"
                  vertical={false}
                />

                <XAxis
                  dataKey="name"
                  stroke="#71839a"
                />

                <YAxis
                  stroke="#71839a"
                />

                <Tooltip
                  contentStyle={{
                    background:
                      "#0b1728",
                    border:
                      "1px solid #1c3552",
                    borderRadius: 10,
                    color:
                      "#e8f0fa",
                  }}
                />

                <Line
                  type="monotone"
                  dataKey="confidence"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  dot={false}
                  name="Confidence"
                />

                <Line
                  type="monotone"
                  dataKey="threat"
                  stroke="#fb7185"
                  strokeWidth={2}
                  dot={false}
                  name="Threat Score"
                />

              </LineChart>

            </ResponsiveContainer>
          )}

        </div>

      </section>

      {/* ========================================================
          PROTOCOL ANALYSIS
      ======================================================== */}

      <section className="panel protocol-panel">

        <div className="panel-head">

          <div>

            <h2>
              Protocol Distribution
            </h2>

            <span>
              Network protocols detected in
              live analyzed flows
            </span>

          </div>

        </div>

        <div className="protocol-grid">

          {protocolData.length ===
            0 ? (
            <div className="analytics-empty">
              No protocol data available.
            </div>
          ) : (
            protocolData.map(
              (item) => {

                const percentage =
                  safeFlows.length
                    ? (
                      (
                        item.value /
                        safeFlows.length
                      ) *
                      100
                    ).toFixed(1)
                    : "0.0";

                return (
                  <div
                    className="protocol-item"
                    key={item.name}
                  >

                    <div className="protocol-top">

                      <strong>
                        {item.name}
                      </strong>

                      <span>
                        {item.value}
                        {" "}
                        flows
                      </span>

                    </div>

                    <div className="protocol-bar">

                      <div
                        style={{
                          width:
                            `${percentage}%`,
                        }}
                      />

                    </div>

                    <small>
                      {percentage}%
                      {" "}
                      of analyzed traffic
                    </small>

                  </div>
                );
              }
            )
          )}

        </div>

      </section>

      {/* ========================================================
          MODEL ANALYSIS
      ======================================================== */}

      <section className="panel model-analysis-panel">

        <div className="panel-head">

          <div>

            <h2>
              ML Model Analysis
            </h2>

            <span>
              Train and evaluate the SafeML
              detector using your datasets.
            </span>

          </div>

          <label className="upload-button">

            <Upload size={15} />

            {uploading
              ? "Uploading..."
              : "Upload CSV"}

            <input
              type="file"
              accept=".csv"
              onChange={
                handleUpload
              }
              hidden
            />

          </label>

        </div>

        {error && (
          <div className="analytics-error">

            <ShieldAlert
              size={17}
            />

            <span>
              {error}
            </span>

          </div>
        )}

        {/* CONFIGURATION */}

        <div className="analysis-form">

          <div className="form-group">

            <label>
              <Database
                size={14}
              />
              Dataset
            </label>

            <select
              value={
                selectedFile
              }
              onChange={(e) =>
                setSelectedFile(
                  e.target.value
                )
              }
            >

              <option value="">
                Select dataset
              </option>

              {datasets.map(
                (dataset) => (
                  <option
                    key={
                      dataset.name
                    }
                    value={
                      dataset.name
                    }
                  >
                    {dataset.name}
                  </option>
                )
              )}

            </select>

          </div>

          <div className="form-group">

            <label>
              <Brain
                size={14}
              />
              ML Model
            </label>

            <select
              value={model}
              onChange={(e) =>
                setModel(
                  e.target.value
                )
              }
            >

              <option value="mlp">
                MLP Neural Network
              </option>

              <option value="rf">
                Random Forest
              </option>

              <option value="knn">
                K-Nearest Neighbors
              </option>

              <option value="lr">
                Logistic Regression
              </option>

            </select>

          </div>

          <div className="form-group">

            <label>
              PCA Components
            </label>

            <input
              type="number"
              min="1"
              max="20"
              value={
                pcaComponents
              }
              onChange={(e) =>
                setPcaComponents(
                  Number(
                    e.target.value
                  )
                )
              }
            />

          </div>

          <div className="form-group">

            <label>
              Maximum Samples
            </label>

            <input
              type="number"
              min="500"
              max="100000"
              value={
                maxSamples
              }
              onChange={(e) =>
                setMaxSamples(
                  Number(
                    e.target.value
                  )
                )
              }
            />

          </div>

        </div>

        <div className="analysis-actions">

          <button
            className="secondary-button"
            onClick={
              handlePreview
            }
            disabled={
              loadingPreview ||
              !selectedFile
            }
          >

            <Database
              size={15}
            />

            {loadingPreview
              ? "Loading..."
              : "Preview Dataset"}

          </button>

          <button
            className="primary-button"
            onClick={
              handleAnalyze
            }
            disabled={
              loadingAnalysis ||
              !selectedFile
            }
          >

            <Play size={15} />

            {loadingAnalysis
              ? "Running Analysis..."
              : "Run ML Analysis"}

          </button>

        </div>

        {/* DATASET PREVIEW */}

        {preview && (
          <div className="dataset-preview">

            <div className="preview-stats">

              <div>
                <span>
                  Rows Previewed
                </span>

                <strong>
                  {preview
                    .total_sample_rows_previewed ??
                    0}
                </strong>
              </div>

              <div>
                <span>
                  Columns
                </span>

                <strong>
                  {preview
                    .total_columns ??
                    0}
                </strong>
              </div>

              <div>
                <span>
                  Label Column
                </span>

                <strong>
                  {preview
                    .label_column ||
                    "Not detected"}
                </strong>
              </div>

              <div>
                <span>
                  Classes
                </span>

                <strong>
                  {Object.keys(
                    preview
                      .class_distribution ||
                    {}
                  ).length}
                </strong>
              </div>

            </div>

          </div>
        )}

        {/* ANALYSIS RESULTS */}

        {analysis && (
          <div className="analytics-result-grid">

            <div className="result-card">

              <div className="result-icon cyan">
                <Activity />
              </div>

              <span>
                Model Accuracy
              </span>

              <strong>
                {accuracy.toFixed(
                  2
                )}
                %
              </strong>

              <small>
                Test-set performance
              </small>

            </div>

            <div className="result-card">

              <div
                className={`result-icon ${safetyClass}`}
              >
                {safetyStatus ===
                  "SAFE"
                  ? (
                    <ShieldCheck />
                  )
                  : (
                    <ShieldAlert />
                  )}
              </div>

              <span>
                Safety Score
              </span>

              <strong>
                {safetyScore}
                <small>
                  /100
                </small>
              </strong>

              <em
                className={`result-status ${safetyClass}`}
              >
                {safetyStatus}
              </em>

            </div>

            <div className="result-card">

              <div className="result-icon violet">
                <Database />
              </div>

              <span>
                Samples Used
              </span>

              <strong>
                {analysis
                  .total_samples ??
                  0}
              </strong>

              <small>
                {analysis
                  .model_used ||
                  "ML model"}
              </small>

            </div>

            <div className="result-card">

              <div className="result-icon orange">
                <AlertTriangle />
              </div>

              <span>
                Drift Intensity
              </span>

              <strong>
                {Number(
                  analysis
                    .drift_intensity ||
                  0
                ).toFixed(2)}
              </strong>

              <small>
                Evaluation input
              </small>

            </div>

          </div>
        )}

        {/* EXPORT */}

        {analysis && (
          <div className="analysis-export">

            <button
              className="secondary-button"
              onClick={
                handleExport
              }
            >

              <Download
                size={15}
              />

              Export Excel Report

            </button>

          </div>
        )}

      </section>

      {/* ========================================================
          DRIFT SIMULATION
      ======================================================== */}

      <section className="panel drift-panel">

        <div className="panel-head">

          <div>

            <h2>
              Drift Simulation
            </h2>

            <span>
              Observe how increasing
              distribution drift affects
              model safety.
            </span>

          </div>

          <button
            className="primary-button"
            onClick={
              handleSimulation
            }
            disabled={
              loadingSimulation ||
              !selectedFile
            }
          >

            <Play
              size={15}
            />

            {loadingSimulation
              ? "Simulating..."
              : "Run Simulation"}

          </button>

        </div>

        {simulationData.length >
          0 ? (
          <div className="analytics-chart-large">

            <ResponsiveContainer
              width="100%"
              height="100%"
            >

              <LineChart
                data={
                  simulationData
                }
              >

                <CartesianGrid
                  stroke="#1b2d44"
                  vertical={false}
                />

                <XAxis
                  dataKey="drift"
                  stroke="#71839a"
                />

                <YAxis
                  stroke="#71839a"
                />

                <Tooltip />

                <Line
                  type="monotone"
                  dataKey="accuracy"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  dot={false}
                  name="Accuracy"
                />

                <Line
                  type="monotone"
                  dataKey="safety"
                  stroke="#4ade80"
                  strokeWidth={2}
                  dot={false}
                  name="Safety Score"
                />

              </LineChart>

            </ResponsiveContainer>

          </div>
        ) : (
          <div className="analytics-empty">
            Run the simulation to generate
            the drift curve.
          </div>
        )}

      </section>

    </div>
  );
}