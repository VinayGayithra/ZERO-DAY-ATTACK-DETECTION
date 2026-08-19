import {
  Activity,
  ArrowDownUp,
  Boxes,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";

import StatCard from "../components/StatCard";
import TrafficChart from "../components/TrafficChart";
import ThreatGauge from "../components/ThreatGauge";
import LiveFlows from "../components/LiveFlows";
import ThreatAlerts from "../components/ThreatAlerts";

export default function Dashboard({
  stats = {},
  chartData = [],
  flows = [],
}) {
  const safeFlows = Array.isArray(flows)
    ? flows
    : [];

  const safeStats =
    stats && typeof stats === "object"
      ? stats
      : {};

  /* ============================================================
     LIVE SENSOR STATISTICS
  ============================================================ */

  const packetsCaptured = Number(
    safeStats.packets_captured ?? 0
  );

  const packetsPerSecond = Number(
    safeStats.packets_per_sec ?? 0
  );

  const bytesPerSecond = Number(
    safeStats.bytes_per_sec ?? 0
  );

  const flowsAnalyzed = Number(
    safeStats.flows_analyzed ?? 0
  );

  const activeFlows = Number(
    safeStats.active_flows_count ?? 0
  );

  /* ============================================================
     BACKEND THREAT COUNTERS
  ============================================================ */

  const benignCount = Number(
    safeStats.benign_count ?? 0
  );

  const suspiciousCount = Number(
    safeStats.suspicious_count ?? 0
  );

  const attackCount = Number(
    safeStats.attack_count ?? 0
  );

  /* ============================================================
     FIND REAL THREAT FLOWS
  ============================================================ */

  const threats = safeFlows.filter((flow) => {
    const status = String(
      flow?.threat_status ?? "BENIGN"
    ).toUpperCase();

    const isThreat =
      flow?.is_threat === true;

    const score =
      Number(flow?.threat_score ?? 0);

    return (
      status === "ATTACK" ||
      status === "SUSPICIOUS" ||
      isThreat ||
      score > 0
    );
  });

  /* ============================================================
     HIGHEST REAL THREAT SCORE
  ============================================================ */

  const highestThreatScore =
    threats.length > 0
      ? Math.max(
        ...threats.map(
          (flow) =>
            Number(
              flow?.threat_score ?? 0
            ) || 0
        )
      )
      : 0;

  /* ============================================================
     SAFETY SCORE
     
     Used only when there are no recent threat flows.
  ============================================================ */

  const backendSafetyScore = Number(
    safeStats.safety_score ?? 98
  );

  const safeBackendScore =
    Number.isFinite(
      backendSafetyScore
    )
      ? Math.max(
        0,
        Math.min(
          100,
          backendSafetyScore
        )
      )
      : 98;

  /*
   * Show the actual recent threat score when
   * threats exist. Otherwise show the backend
   * safety-derived risk value.
   */

  const riskScore =
    threats.length > 0
      ? Math.round(
        highestThreatScore
      )
      : Math.max(
        0,
        Math.min(
          100,
          100 - safeBackendScore
        )
      );

  /* ============================================================
     THREAT LEVEL
  ============================================================ */

  const threatLevel =
    riskScore >= 70
      ? "HIGH"
      : riskScore >= 40
        ? "MEDIUM"
        : "LOW";

  /* ============================================================
     THREAT EVENT COUNT
     
     Prefer actual flow records because the backend
     currently increments suspicious + attack for
     the same threat event.
  ============================================================ */

  const threatEventCount =
    threats.length > 0
      ? threats.length
      : attackCount;

  /* ============================================================
     SENSOR STATUS
  ============================================================ */

  const usingFallback =
    safeStats.using_fallback === true;

  const captureActive =
    !usingFallback;

  /* ============================================================
     CHART DATA
  ============================================================ */

  const safeChartData =
    Array.isArray(chartData)
      ? chartData
      : [];

  /* ============================================================
     THREAT MESSAGE
  ============================================================ */

  const threatMessage =
    threatEventCount > 0
      ? "Review required"
      : "No active alerts";

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <div className="page">

      {/* ========================================================
          PAGE HEADER
      ======================================================== */}

      <div className="page-title">

        <div>

          <div className="eyebrow">
            REAL-TIME SECURITY
          </div>

          <h1>
            Network Security Overview
          </h1>

          <p>
            Monitor traffic, flows and ML-based
            threat detections from your local sensor.
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
            ? "Packet capture active"
            : "Sensor fallback mode"}

        </div>

      </div>


      {/* ========================================================
          STAT CARDS
      ======================================================== */}

      <div className="stats-grid">

        {/* ------------------------------------------------------
            PACKETS
        ------------------------------------------------------ */}

        <StatCard
          icon={<Activity />}
          label="Packets Captured"
          value={packetsCaptured}
          unit=""
          change={
            `${packetsPerSecond.toFixed(1)}/sec`
          }
          tone="cyan"
        />


        {/* ------------------------------------------------------
            TRAFFIC
        ------------------------------------------------------ */}

        <StatCard
          icon={<ArrowDownUp />}
          label="Traffic Rate"
          value={
            formatBytes(
              bytesPerSecond
            )
          }
          unit="/s"
          change="Live sensor"
          tone="cyan"
        />


        {/* ------------------------------------------------------
            FLOWS
        ------------------------------------------------------ */}

        <StatCard
          icon={<Boxes />}
          label="Flows Analyzed"
          value={flowsAnalyzed}
          unit=""
          change={
            `${activeFlows} active`
          }
          tone="violet"
        />


        {/* ------------------------------------------------------
            THREATS
        ------------------------------------------------------ */}

        <StatCard
          icon={
            threatEventCount > 0
              ? <ShieldAlert />
              : <ShieldCheck />
          }
          label="Threat Events"
          value={threatEventCount}
          unit=""
          change={threatMessage}
          tone={
            threatEventCount > 0
              ? "red"
              : "green"
          }
        />

      </div>


      {/* ========================================================
          MAIN DASHBOARD
      ======================================================== */}

      <div className="dashboard-grid">

        {/* ======================================================
            LIVE TRAFFIC
        ====================================================== */}

        <section className="panel chart-panel">

          <div className="panel-head">

            <div>

              <h2>
                Live Traffic
              </h2>

              <span>
                Packets captured per second
              </span>

            </div>

            <div className="legend">

              <i />

              Network traffic

            </div>

          </div>

          <TrafficChart
            data={safeChartData}
          />

        </section>


        {/* ======================================================
            THREAT MONITOR
        ====================================================== */}

        <section className="panel threat-monitor-panel">

          <div className="panel-head">

            <div>

              <h2>
                Threat Monitor
              </h2>

              <span>
                Highest recent threat score
              </span>

            </div>

          </div>

          <ThreatGauge
            score={riskScore}
            status={threatLevel}
          />

          {/* Small live information */}

          <div className="threat-monitor-info">

            <div>

              <span>
                Recent threats
              </span>

              <strong>
                {threatEventCount}
              </strong>

            </div>

            <div>

              <span>
                Attacks
              </span>

              <strong>
                {attackCount}
              </strong>

            </div>

            <div>

              <span>
                Suspicious
              </span>

              <strong>
                {Math.max(
                  0,
                  suspiciousCount -
                  attackCount
                )}
              </strong>

            </div>

          </div>

        </section>

      </div>


      {/* ========================================================
          THREAT CENTER
      ======================================================== */}

      <ThreatAlerts
        flows={safeFlows}
      />


      {/* ========================================================
          LIVE NETWORK FLOWS
      ======================================================== */}

      <LiveFlows
        flows={
          safeFlows.slice(
            0,
            20
          )
        }
      />

    </div>
  );
}


/* ================================================================
   FORMAT BYTES
================================================================ */

function formatBytes(value) {
  const n =
    Number(value) || 0;

  if (n < 1024) {
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
    1024 * 1024 * 1024
  ) {
    return `${(
      n /
      (1024 * 1024)
    ).toFixed(2)} MB`;
  }

  return `${(
    n /
    (1024 * 1024 * 1024)
  ).toFixed(2)} GB`;
}