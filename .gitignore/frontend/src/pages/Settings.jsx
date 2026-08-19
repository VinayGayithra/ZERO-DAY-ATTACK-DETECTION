import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  Wifi,
  ShieldAlert,
  RotateCcw,
  CheckCircle2,
  Radio,
  RefreshCw,
} from "lucide-react";

import { getNetworkInterfaces } from "../services/api";

export default function Settings({
  connected,
  interfaceName,
  setInterfaceName,
}) {
  const [threshold, setThreshold] = useState(70);
  const [interfaces, setInterfaces] = useState([]);
  const [loadingInterfaces, setLoadingInterfaces] = useState(false);
  const [interfaceError, setInterfaceError] = useState("");

  const thresholdValue = Number(threshold);

  /* ============================================================
     THRESHOLD
  ============================================================ */

  const thresholdLabel =
    thresholdValue >= 80
      ? "Strict"
      : thresholdValue >= 60
        ? "Balanced"
        : "Sensitive";

  const thresholdClass =
    thresholdValue >= 80
      ? "high"
      : thresholdValue >= 60
        ? "medium"
        : "low";

  /* ============================================================
     LOAD NETWORK INTERFACES
  ============================================================ */

  const loadInterfaces = useCallback(async () => {
    try {
      setLoadingInterfaces(true);
      setInterfaceError("");

      const data = await getNetworkInterfaces();

      const available = Array.isArray(data?.interfaces)
        ? data.interfaces
        : [];

      setInterfaces(available);

      if (available.length === 0) {
        setInterfaceError(
          "No network interfaces were detected."
        );
      }
    } catch (error) {
      console.error(
        "Failed to load network interfaces:",
        error
      );

      setInterfaceError(
        error?.message ||
        "Unable to load network interfaces. Make sure the SafeML backend is running."
      );

      setInterfaces([]);
    } finally {
      setLoadingInterfaces(false);
    }
  }, []);

  /* ============================================================
     LOAD INTERFACES WHEN SETTINGS OPENS
  ============================================================ */

  useEffect(() => {
    loadInterfaces();
  }, [loadInterfaces]);

  /* ============================================================
     RESET SETTINGS
  ============================================================ */

  const resetSettings = () => {
    setThreshold(70);
    setInterfaceName("auto");
    setInterfaceError("");
  };

  /* ============================================================
     SELECTED INTERFACE
  ============================================================ */

  const selectedInterface = interfaces.find(
    (item) =>
      String(item.id) === String(interfaceName)
  );

  const currentInterfaceName =
    interfaceName === "auto"
      ? "Automatic interface detection"
      : selectedInterface?.name ||
      interfaceName ||
      "Unknown";

  const currentInterfaceIp =
    interfaceName === "auto"
      ? "Auto"
      : selectedInterface?.ip ||
      "Unknown";

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
            SYSTEM CONFIGURATION
          </div>

          <h1>Settings</h1>

          <p>
            Configure the SafeML local network
            sensor and detection preferences.
          </p>

        </div>

        <button
          className="settings-reset"
          onClick={resetSettings}
        >
          <RotateCcw size={13} />
          Reset
        </button>

      </div>

      {/* ========================================================
          STATUS OVERVIEW
      ======================================================== */}

      <div className="settings-status-grid">

        {/* SENSOR CONNECTION */}

        <div className="settings-status-card">

          <div className="settings-status-icon green">
            <Wifi size={17} />
          </div>

          <div>

            <span>
              Sensor Connection
            </span>

            <strong
              className={
                connected
                  ? "connected"
                  : "disconnected"
              }
            >
              {connected
                ? "CONNECTED"
                : "DISCONNECTED"}
            </strong>

          </div>

          <div
            className={`status-dot ${connected
                ? "online"
                : "offline"
              }`}
          />

        </div>

        {/* CAPTURE ENGINE */}

        <div className="settings-status-card">

          <div className="settings-status-icon cyan">
            <Radio size={17} />
          </div>

          <div>

            <span>
              Capture Engine
            </span>

            <strong className="connected">
              READY
            </strong>

          </div>

          <div className="status-dot online" />

        </div>

        {/* MONITORING MODE */}

        <div className="settings-status-card">

          <div className="settings-status-icon violet">
            <Activity size={17} />
          </div>

          <div>

            <span>
              Monitoring Mode
            </span>

            <strong>
              LIVE SENSOR
            </strong>

          </div>

          <div className="status-dot online" />

        </div>

        {/* ALERT THRESHOLD */}

        <div className="settings-status-card">

          <div className="settings-status-icon red">
            <ShieldAlert size={17} />
          </div>

          <div>

            <span>
              Alert Threshold
            </span>

            <strong>
              {thresholdValue}
            </strong>

          </div>

          <div
            className={`threshold-indicator ${thresholdClass}`}
          >
            {thresholdLabel}
          </div>

        </div>

      </div>

      {/* ========================================================
          SETTINGS GRID
      ======================================================== */}

      <div className="settings-grid">

        {/* ======================================================
            SENSOR SETTINGS
        ====================================================== */}

        <section className="panel settings-card">

          <div className="settings-card-title">

            <div>

              <h2>
                Sensor Connection
              </h2>

              <p>
                Configure the local packet
                capture engine.
              </p>

            </div>

          </div>

          {/* WEBSOCKET */}

          <div className="setting-row">

            <div>

              <strong>
                FastAPI WebSocket
              </strong>

              <span>
                /ws/stream
              </span>

            </div>

            <b
              className={
                connected
                  ? "connected"
                  : "disconnected"
              }
            >
              {connected
                ? "CONNECTED"
                : "DISCONNECTED"}
            </b>

          </div>

          {/* CAPTURE ENGINE */}

          <div className="setting-row">

            <div>

              <strong>
                Capture engine
              </strong>

              <span>
                Npcap + Scapy packet capture
              </span>

            </div>

            <b className="connected">
              READY
            </b>

          </div>

          {/* NETWORK INTERFACE */}

          <div className="setting-row">

            <div>

              <strong>
                Network interface
              </strong>

              <span>
                Select the interface used by
                the live sensor.
              </span>

            </div>

            <div
              style={{
                display: "flex",
                gap: "8px",
                alignItems: "center",
              }}
            >

              <select
                value={interfaceName || "auto"}
                onChange={(e) =>
                  setInterfaceName(
                    e.target.value
                  )
                }
                disabled={
                  loadingInterfaces
                }
              >

                <option value="auto">
                  Auto Detect
                </option>

                {interfaces.map(
                  (item, index) => {

                    const id =
                      item.id ??
                      item.name ??
                      `interface-${index}`;

                    return (
                      <option
                        key={id}
                        value={id}
                      >
                        {item.name ||
                          item.id ||
                          "Unknown Interface"}

                        {item.ip
                          ? ` (${item.ip})`
                          : ""}
                      </option>
                    );
                  }
                )}

              </select>

              {/* REFRESH */}

              <button
                type="button"
                onClick={loadInterfaces}
                disabled={
                  loadingInterfaces
                }
                title="Refresh network interfaces"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "34px",
                  height: "34px",
                  borderRadius: "8px",
                  border:
                    "1px solid #1c3552",
                  background:
                    "#0b1728",
                  color: "#38bdf8",
                  cursor:
                    loadingInterfaces
                      ? "not-allowed"
                      : "pointer",
                  opacity:
                    loadingInterfaces
                      ? 0.6
                      : 1,
                }}
              >

                <RefreshCw
                  size={15}
                  className={
                    loadingInterfaces
                      ? "spin"
                      : ""
                  }
                />

              </button>

            </div>

          </div>

          {/* LOADING */}

          {loadingInterfaces && (

            <div
              style={{
                marginTop: "10px",
                color: "#7dd3fc",
                fontSize: "12px",
              }}
            >
              Detecting network interfaces...
            </div>

          )}

          {/* ERROR */}

          {interfaceError && (

            <div
              style={{
                marginTop: "12px",
                padding: "10px 12px",
                borderRadius: "8px",
                border:
                  "1px solid rgba(248,113,113,0.25)",
                background:
                  "rgba(248,113,113,0.08)",
                color: "#fca5a5",
                fontSize: "13px",
              }}
            >
              {interfaceError}
            </div>

          )}

          {/* CURRENT INTERFACE */}

          <div className="interface-info">

            <div className="interface-info-icon">
              <CheckCircle2 size={14} />
            </div>

            <div>

              <strong>
                Current interface
              </strong>

              <span>
                {currentInterfaceName}
              </span>

              <small
                style={{
                  display: "block",
                  marginTop: "3px",
                  opacity: 0.65,
                }}
              >
                IP: {currentInterfaceIp}
              </small>

            </div>

          </div>

        </section>

        {/* ======================================================
            ALERT SETTINGS
        ====================================================== */}

        <section className="panel settings-card">

          <div className="settings-card-title">

            <div>

              <h2>
                Alert Threshold
              </h2>

              <p>
                Configure the visual severity
                threshold.
              </p>

            </div>

            <div
              className={`threshold-badge ${thresholdClass}`}
            >
              {thresholdLabel}
            </div>

          </div>

          <div className="range-row">

            <span>
              High severity threshold
            </span>

            <strong>
              {thresholdValue}
            </strong>

          </div>

          <input
            type="range"
            min="40"
            max="100"
            step="1"
            value={thresholdValue}
            onChange={(e) =>
              setThreshold(
                Number(e.target.value)
              )
            }
          />

          <div className="range-scale">

            <span>40</span>
            <span>60</span>
            <span>80</span>
            <span>100</span>

          </div>

          <div className="threshold-description">

            {thresholdValue >= 80 && (
              <>
                <strong>
                  Strict detection
                </strong>

                <span>
                  Only high-confidence threat
                  scores are highlighted as
                  high severity.
                </span>
              </>
            )}

            {thresholdValue >= 60 &&
              thresholdValue < 80 && (
                <>
                  <strong>
                    Balanced detection
                  </strong>

                  <span>
                    Recommended setting for
                    normal live monitoring.
                  </span>
                </>
              )}

            {thresholdValue < 60 && (
              <>
                <strong>
                  Sensitive detection
                </strong>

                <span>
                  Lower scores will be
                  highlighted for additional
                  investigation.
                </span>
              </>
            )}

          </div>

          <p className="hint">
            This value controls the visual
            dashboard threshold. The backend
            detector remains authoritative.
          </p>

        </section>

      </div>

      {/* ========================================================
          SYSTEM INFORMATION
      ======================================================== */}

      <section className="panel system-info-card">

        <div className="settings-card-title">

          <div>

            <h2>
              System Information
            </h2>

            <p>
              Current SafeML monitoring
              environment.
            </p>

          </div>

        </div>

        <div className="system-info-grid">

          <div>
            <span>Platform</span>
            <strong>
              SafeML SOC
            </strong>
          </div>

          <div>
            <span>Capture</span>
            <strong>
              Npcap / Scapy
            </strong>
          </div>

          <div>
            <span>Transport</span>
            <strong>
              WebSocket
            </strong>
          </div>

          <div>
            <span>Endpoint</span>
            <strong>
              /ws/stream
            </strong>
          </div>

          <div>
            <span>Detection</span>
            <strong>
              ML Pipeline
            </strong>
          </div>

          <div>
            <span>Mode</span>
            <strong>
              Real-Time
            </strong>
          </div>

        </div>

      </section>

    </div>
  );
}