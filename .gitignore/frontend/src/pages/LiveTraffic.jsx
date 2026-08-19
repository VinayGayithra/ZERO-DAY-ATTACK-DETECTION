import {
  Activity,
  ArrowDownUp,
  Boxes,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Radio,
  Wifi,
} from "lucide-react";

import LiveFlows from "../components/LiveFlows";

export default function LiveTraffic({
  flows = [],
  stats = {},
}) {
  const safeFlows = Array.isArray(flows)
    ? flows
    : [];

  /* ============================================================
     LIVE STATISTICS
  ============================================================ */

  const packets =
    Number(
      stats.packets_captured ?? 0
    );

  const bytes =
    Number(
      stats.bytes_captured ?? 0
    );

  const packetsPerSec =
    Number(
      stats.packets_per_sec ?? 0
    );

  const bytesPerSec =
    Number(
      stats.bytes_per_sec ?? 0
    );

  const activeFlows =
    Number(
      stats.active_flows_count ?? 0
    );

  const analyzed =
    Number(
      stats.flows_analyzed ?? 0
    );

  const benign =
    Number(
      stats.benign_count ?? 0
    );

  const suspicious =
    Number(
      stats.suspicious_count ?? 0
    );

  const attacks =
    Number(
      stats.attack_count ?? 0
    );

  const safetyScore =
    Number(
      stats.safety_score ?? 98
    );

  const safetyStatus =
    String(
      stats.safety_status ||
      stats.overall_safety ||
      "SAFE"
    ).toUpperCase();


  /* ============================================================
     THREAT FLOWS
  ============================================================ */

  const threatFlows =
    safeFlows.filter(
      (flow) => {

        const status =
          String(
            flow?.threat_status ||
            ""
          ).toUpperCase();

        return (
          status === "ATTACK" ||
          status === "SUSPICIOUS" ||
          flow?.is_threat === true
        );
      }
    );


  const visibleThreats =
    threatFlows.length;


  /* ============================================================
     CAPTURE STATUS
  ============================================================ */

  const fallback =
    Boolean(
      stats.using_fallback
    );

  const captureActive =
    !fallback;


  /* ============================================================
     SAFETY STATE
  ============================================================ */

  const isDanger =
    safetyStatus ===
    "HIGH RISK" ||
    safetyStatus ===
    "UNSAFE" ||
    safetyScore < 40;

  const isWarning =
    !isDanger &&
    (
      safetyStatus ===
      "WARNING" ||
      safetyScore < 70
    );


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
            NETWORK SENSOR
          </div>

          <h1>
            Live Traffic
          </h1>

          <p>
            Real-time packet capture, flow
            analysis and ML threat detection.
          </p>

        </div>


        <div
          className={
            `capture-badge ${captureActive
              ? "active"
              : "fallback"
            }`
          }
        >

          <i />

          {captureActive
            ? "LIVE PACKET CAPTURE"
            : "SENSOR FALLBACK"}

        </div>

      </div>


      {/* ========================================================
          CONNECTION STATUS
      ======================================================== */}

      <section
        className={
          `live-sensor-banner ${captureActive
            ? "online"
            : "offline"
          }`
        }
      >

        <div className="live-sensor-left">

          <div className="live-sensor-icon">

            {captureActive ? (
              <Wifi size={18} />
            ) : (
              <Radio size={18} />
            )}

          </div>

          <div>

            <span>
              Packet Capture Engine
            </span>

            <strong>
              {captureActive
                ? "CAPTURE ACTIVE"
                : "FALLBACK MODE"}
            </strong>

          </div>

        </div>


        <div className="live-sensor-meta">

          <span>
            Npcap / Scapy
          </span>

          <span>
            Real-Time ML
          </span>

          <span>
            WebSocket Stream
          </span>

        </div>

      </section>


      {/* ========================================================
          PRIMARY LIVE STATISTICS
      ======================================================== */}

      <div className="stats-grid">


        {/* PACKETS */}

        <LiveStatCard
          icon={<Activity />}
          label="Packets Captured"
          value={packets.toLocaleString()}
          sub={`${packetsPerSec.toFixed(1)} packets/sec`}
          tone="cyan"
        />


        {/* TRAFFIC */}

        <LiveStatCard
          icon={<ArrowDownUp />}
          label="Traffic Rate"
          value={formatBytes(bytesPerSec)}
          sub={`${formatBytes(bytes)} total`}
          tone="cyan"
        />


        {/* FLOWS */}

        <LiveStatCard
          icon={<Boxes />}
          label="Flows Analyzed"
          value={analyzed.toLocaleString()}
          sub={`${activeFlows} active flows`}
          tone="violet"
        />


        {/* THREATS */}

        <LiveStatCard
          icon={
            attacks > 0
              ? <ShieldAlert />
              : suspicious > 0
                ? <AlertTriangle />
                : <ShieldCheck />
          }
          label="Threat Events"
          value={(
            attacks +
            suspicious
          ).toLocaleString()}
          sub={`${attacks} attacks • ${suspicious} suspicious`}
          tone={
            attacks > 0
              ? "red"
              : suspicious > 0
                ? "orange"
                : "green"
          }
        />

      </div>


      {/* ========================================================
          FLOW ANALYSIS SUMMARY
      ======================================================== */}

      <section className="panel live-summary-panel">

        <div className="panel-head">

          <div>

            <h2>
              Live Flow Analysis
            </h2>

            <span>
              Current ML classification of
              captured network flows.
            </span>

          </div>

          <div className="live-analysis-status">

            <i />

            STREAMING

          </div>

        </div>


        <div className="flow-summary-grid">


          {/* BENIGN */}

          <div className="flow-summary-card">

            <div className="flow-summary-icon green">
              <ShieldCheck size={17} />
            </div>

            <div>

              <span>
                Benign
              </span>

              <strong>
                {benign.toLocaleString()}
              </strong>

            </div>

          </div>


          {/* SUSPICIOUS */}

          <div className="flow-summary-card">

            <div className="flow-summary-icon orange">
              <AlertTriangle size={17} />
            </div>

            <div>

              <span>
                Suspicious
              </span>

              <strong>
                {suspicious.toLocaleString()}
              </strong>

            </div>

          </div>


          {/* ATTACKS */}

          <div className="flow-summary-card">

            <div className="flow-summary-icon red">
              <ShieldAlert size={17} />
            </div>

            <div>

              <span>
                Attacks
              </span>

              <strong>
                {attacks.toLocaleString()}
              </strong>

            </div>

          </div>


          {/* VISIBLE */}

          <div className="flow-summary-card">

            <div className="flow-summary-icon cyan">
              <Activity size={17} />
            </div>

            <div>

              <span>
                Visible Flows
              </span>

              <strong>
                {safeFlows.length}
              </strong>

            </div>

          </div>

        </div>

      </section>


      {/* ========================================================
          SAFETY STATUS
      ======================================================== */}

      <section
        className={
          `panel live-safety-panel ${isDanger
            ? "danger"
            : isWarning
              ? "warning"
              : "safe"
          }`
        }
      >

        <div className="live-safety-left">

          <div className="live-safety-icon">

            {isDanger ? (
              <ShieldAlert />
            ) : isWarning ? (
              <AlertTriangle />
            ) : (
              <ShieldCheck />
            )}

          </div>

          <div>

            <span>
              SafeML Runtime Assessment
            </span>

            <strong>
              {safetyStatus}
            </strong>

          </div>

        </div>


        <div className="live-safety-score">

          <span>
            Safety Score
          </span>

          <strong>
            {Math.max(
              0,
              Math.min(
                100,
                safetyScore
              )
            ).toFixed(0)}
          </strong>

          <small>
            / 100
          </small>

        </div>

      </section>


      {/* ========================================================
          LIVE FLOWS
      ======================================================== */}

      <section className="panel live-flows-panel">

        <div className="panel-head">

          <div>

            <h2>
              Live Network Flows
            </h2>

            <span>
              Latest completed flows received
              from the local sensor.
            </span>

          </div>


          <div className="flow-counter">

            <Activity size={14} />

            {safeFlows.length} events

          </div>

        </div>


        <LiveFlows
          flows={safeFlows}
        />

      </section>


      {/* ========================================================
          THREAT SUMMARY FOOTER
      ======================================================== */}

      <div className="live-footer-stats">

        <div>

          <span>
            Threat Events
          </span>

          <strong
            className={
              attacks > 0
                ? "danger-text"
                : ""
            }
          >
            {(
              attacks +
              suspicious
            ).toLocaleString()}
          </strong>

        </div>


        <div>

          <span>
            Attack Events
          </span>

          <strong
            className={
              attacks > 0
                ? "danger-text"
                : ""
            }
          >
            {attacks.toLocaleString()}
          </strong>

        </div>


        <div>

          <span>
            Suspicious Events
          </span>

          <strong
            className={
              suspicious > 0
                ? "warning-text"
                : ""
            }
          >
            {suspicious.toLocaleString()}
          </strong>

        </div>


        <div>

          <span>
            Capture Status
          </span>

          <strong
            className={
              captureActive
                ? "safe-text"
                : "warning-text"
            }
          >
            {captureActive
              ? "ACTIVE"
              : "FALLBACK"}
          </strong>

        </div>

      </div>

    </div>
  );
}


/* ================================================================
   LIVE STAT CARD
================================================================ */

function LiveStatCard({
  icon,
  label,
  value,
  sub,
  tone = "cyan",
}) {

  return (

    <div className="stat-card">

      <div
        className={
          `stat-card-icon ${tone}`
        }
      >
        {icon}
      </div>

      <div className="stat-card-content">

        <span>
          {label}
        </span>

        <strong>
          {value}
        </strong>

        <small>
          {sub}
        </small>

      </div>

    </div>
  );
}


/* ================================================================
   FORMAT BYTES
================================================================ */

function formatBytes(
  value
) {

  const n =
    Number(value) || 0;


  if (
    n < 1024
  ) {

    return `${n.toFixed(0)} B`;
  }


  if (
    n <
    1024 * 1024
  ) {

    return `${(
      n / 1024
    ).toFixed(1)} KB`;
  }


  if (
    n <
    1024 *
    1024 *
    1024
  ) {

    return `${(
      n /
      (1024 * 1024)
    ).toFixed(2)} MB`;
  }


  return `${(
    n /
    (1024 *
      1024 *
      1024)
  ).toFixed(2)} GB`;
}