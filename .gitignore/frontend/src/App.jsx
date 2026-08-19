import { useEffect, useMemo, useRef, useState } from "react";

import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";

import Dashboard from "./pages/Dashboard";
import LiveTraffic from "./pages/LiveTraffic";
import Threats from "./pages/Threats";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";

import { connectLiveTraffic } from "./services/api";


const initialStats = {
  packets_captured: 0,
  bytes_captured: 0,

  flows_analyzed: 0,

  packets_per_sec: 0,
  bytes_per_sec: 0,

  benign_count: 0,
  suspicious_count: 0,
  attack_count: 0,

  active_flows_count: 0,

  using_fallback: false,

  safety_score: 98,
  safety_status: "SAFE",
  overall_safety: "SAFE",

  drift_alert: false,
  unknown_behavior: false,
};


export default function App() {

  const [page, setPage] =
    useState("dashboard");

  const [monitoring, setMonitoring] =
    useState(false);

  const [connected, setConnected] =
    useState(false);

  const [stats, setStats] =
    useState(initialStats);

  const [flows, setFlows] =
    useState([]);

  const [chartData, setChartData] =
    useState([]);

  const [safety, setSafety] =
    useState(null);

  const [interfaceName, setInterfaceName] =
    useState("auto");

  const socketRef =
    useRef(null);


  /* ============================================================
     MONITORING LIFECYCLE
  ============================================================ */

  const startSocketConnection = () => {
    if (socketRef.current) {
      try {
        socketRef.current.close();
      } catch (error) {
        // ignore
      }
    }

    try {
      const socket = connectLiveTraffic(
        handleBackendMessage,
        (status) => {
          setConnected(status);
        },
        interfaceName
      );
      socketRef.current = socket;
    } catch (error) {
      console.error(
        "SafeML WebSocket connection failed:",
        error
      );
      setConnected(false);
    }
  };

  const stopSocketConnection = () => {
    if (socketRef.current) {
      try {
        socketRef.current.close();
      } catch (error) {
        // ignore
      }
      socketRef.current = null;
    }
    setConnected(false);
  };

  const handleStartMonitoring = () => {
    setMonitoring(true);
    startSocketConnection();
  };

  const handleStopMonitoring = () => {
    setMonitoring(false);
    stopSocketConnection();
  };

  useEffect(() => {
    if (monitoring) {
      startSocketConnection();
    } else {
      stopSocketConnection();
    }

    return () => {
      stopSocketConnection();
    };
  }, [interfaceName, monitoring]);


  /* ============================================================
     BACKEND MESSAGE
  ============================================================ */

  function handleBackendMessage(message) {

    if (!message) {
      return;
    }


    /* ==========================================================
       STATISTICS
    ========================================================== */

    if (message.stats) {

      const normalized =
        normalizeStats(
          message.stats
        );

      setStats((current) => ({
        ...current,
        ...normalized,
      }));
    }


    /* ==========================================================
       SAFETY / DRIFT
    ========================================================== */

    if (message.safety) {

      const normalizedSafety =
        normalizeSafety(
          message.safety
        );

      setSafety(
        normalizedSafety
      );

      setStats((current) => ({
        ...current,

        safety_score:
          normalizedSafety.safety_score,

        safety_status:
          normalizedSafety.safety_status,

        overall_safety:
          normalizedSafety.overall_safety,

        drift_alert:
          normalizedSafety.drift_alert,

        unknown_behavior:
          normalizedSafety.unknown_behavior,
      }));
    }


    /* ==========================================================
       FALLBACK SAFETY FORMAT
    ========================================================== */

    else if (
      message.safety_score !==
      undefined ||
      message.overall_safety
    ) {

      const normalizedSafety =
        normalizeSafety({

          safety_score:
            message.safety_score,

          safety_status:
            message.safety_status ||
            message.overall_safety,

          overall_safety:
            message.overall_safety,

          drift_alert:
            message.drift_alert,

          unknown_behavior:
            message.unknown_behavior,
        });


      setSafety(
        normalizedSafety
      );

      setStats((current) => ({
        ...current,

        safety_score:
          normalizedSafety.safety_score,

        safety_status:
          normalizedSafety.safety_status,

        overall_safety:
          normalizedSafety.overall_safety,

        drift_alert:
          normalizedSafety.drift_alert,

        unknown_behavior:
          normalizedSafety.unknown_behavior,
      }));
    }


    /* ==========================================================
       LIVE FLOW EVENTS
    ========================================================== */

    const incomingFlows = [];


    /* ----------------------------------------------------------
       RECENT EVENTS
    ---------------------------------------------------------- */

    if (
      Array.isArray(
        message.recent_events
      )
    ) {

      message.recent_events.forEach(
        (flow) => {

          incomingFlows.push(
            normalizeFlow(flow)
          );

        }
      );
    }


    /* ----------------------------------------------------------
       LATEST FLOW
    ---------------------------------------------------------- */

    if (
      message.latest_flow
    ) {

      incomingFlows.push(
        normalizeFlow(
          message.latest_flow
        )
      );
    }


    /* ----------------------------------------------------------
       MERGE FLOWS
    ---------------------------------------------------------- */

    if (
      incomingFlows.length > 0
    ) {

      setFlows((current) => {

        const merged = [
          ...incomingFlows,
          ...current,
        ];


        const seen =
          new Set();


        const unique =
          merged.filter(
            (flow) => {

              const key =
                createFlowKey(
                  flow
                );


              if (
                seen.has(key)
              ) {
                return false;
              }


              seen.add(key);

              return true;
            }
          );


        return unique.slice(
          0,
          200
        );
      });
    }


    /* ==========================================================
       LIVE TRAFFIC CHART
    ========================================================== */

    if (message.stats) {

      const packetsPerSecond =
        Number(
          message.stats
            .packets_per_sec
        ) || 0;


      const point = {

        time:
          message.timestamp ||
          new Date()
            .toLocaleTimeString(),

        value:
          packetsPerSecond,
      };


      setChartData(
        (current) => [
          ...current,
          point,
        ].slice(-30)
      );
    }
  }


  /* ============================================================
     CHART DATA
  ============================================================ */

  const chart =
    useMemo(() => {

      if (
        chartData.length > 0
      ) {

        return chartData;
      }


      return Array.from(
        {
          length: 24,
        },
        (_, index) => ({

          time:
            index,

          value:
            Number(
              stats.packets_per_sec
            ) || 0,

        })
      );

    }, [
      chartData,
      stats.packets_per_sec,
    ]);


  /* ============================================================
     ENRICHED STATS
  ============================================================ */

  const enrichedStats =
    useMemo(
      () => ({

        ...stats,


        packets_captured:
          Number(
            stats.packets_captured
          ) || 0,


        bytes_captured:
          Number(
            stats.bytes_captured
          ) || 0,


        flows_analyzed:
          Number(
            stats.flows_analyzed
          ) || 0,


        packets_per_sec:
          Number(
            stats.packets_per_sec
          ) || 0,


        bytes_per_sec:
          Number(
            stats.bytes_per_sec
          ) || 0,


        benign_count:
          Number(
            stats.benign_count
          ) || 0,


        suspicious_count:
          Number(
            stats.suspicious_count
          ) || 0,


        attack_count:
          Number(
            stats.attack_count
          ) || 0,


        active_flows_count:
          Number(
            stats.active_flows_count
          ) || 0,


        using_fallback:
          Boolean(
            stats.using_fallback
          ),


        ml_available:
          true,


        safety_score:
          Number(
            safety?.safety_score ??
            stats.safety_score ??
            98
          ),


        safety_status:
          String(
            safety?.safety_status ||
            stats.safety_status ||
            "SAFE"
          ).toUpperCase(),


        overall_safety:
          String(
            safety?.overall_safety ||
            stats.overall_safety ||
            safety?.safety_status ||
            "SAFE"
          ).toUpperCase(),


        drift_alert:
          Boolean(
            safety?.drift_alert ??
            stats.drift_alert
          ),


        unknown_behavior:
          Boolean(
            safety?.unknown_behavior ??
            stats.unknown_behavior
          ),

      }),
      [
        stats,
        safety,
      ]
    );


  /* ============================================================
     APPLICATION
  ============================================================ */

  return (

    <div className="app-shell">


      {/* ========================================================
          SIDEBAR
      ======================================================== */}

      <Sidebar
        page={page}
        setPage={setPage}
      />


      <div className="main-shell">


        {/* ======================================================
            TOPBAR
        ====================================================== */}

        <Topbar
          connected={connected}
          monitoring={monitoring}
          onStartMonitoring={handleStartMonitoring}
          onStopMonitoring={handleStopMonitoring}
        />


        {/* ======================================================
            DASHBOARD
        ====================================================== */}

        {page === "dashboard" && (

          <Dashboard
            stats={enrichedStats}
            chartData={chart}
            flows={flows}
          />

        )}


        {/* ======================================================
            LIVE TRAFFIC
        ====================================================== */}

        {page === "traffic" && (

          <LiveTraffic
            stats={enrichedStats}
            flows={flows}
          />

        )}


        {/* ======================================================
            THREATS
        ====================================================== */}

        {page === "threats" && (

          <Threats
            flows={flows}
          />

        )}


        {/* ======================================================
            ANALYTICS
        ====================================================== */}

        {page === "analytics" && (

          <Analytics
            flows={flows}
          />

        )}


        {/* ======================================================
            SETTINGS
        ====================================================== */}

        {page === "settings" && (

          <Settings
            connected={connected}
            interfaceName={
              interfaceName
            }
            setInterfaceName={
              setInterfaceName
            }
          />

        )}

      </div>

    </div>
  );
}


/* =================================================================
   NORMALIZE STATISTICS
================================================================= */

function normalizeStats(stats) {

  return {

    packets_captured:
      Number(
        stats?.packets_captured
      ) || 0,


    bytes_captured:
      Number(
        stats?.bytes_captured
      ) || 0,


    flows_analyzed:
      Number(
        stats?.flows_analyzed
      ) || 0,


    packets_per_sec:
      Number(
        stats?.packets_per_sec
      ) || 0,


    bytes_per_sec:
      Number(
        stats?.bytes_per_sec
      ) || 0,


    benign_count:
      Number(
        stats?.benign_count
      ) || 0,


    suspicious_count:
      Number(
        stats?.suspicious_count
      ) || 0,


    attack_count:
      Number(
        stats?.attack_count
      ) || 0,


    active_flows_count:
      Number(
        stats?.active_flows_count
      ) || 0,


    using_fallback:
      Boolean(
        stats?.using_fallback
      ),

  };
}


/* =================================================================
   NORMALIZE SAFETY
================================================================= */

function normalizeSafety(
  safety
) {

  if (!safety) {

    return {

      safety_score: 98,

      safety_status:
        "SAFE",

      overall_safety:
        "SAFE",

      drift_alert:
        false,

      unknown_behavior:
        false,

      distances: {},

    };
  }


  let score =
    Number(
      safety.safety_score
    );


  if (
    !Number.isFinite(score)
  ) {

    score = 98;
  }


  score =
    Math.max(
      0,
      Math.min(
        100,
        score
      )
    );


  const status =
    String(
      safety.safety_status ||
      safety.overall_safety ||
      "SAFE"
    ).toUpperCase();


  return {

    ...safety,


    safety_score:
      Number(
        score.toFixed(2)
      ),


    safety_status:
      status,


    overall_safety:
      String(
        safety.overall_safety ||
        safety.safety_status ||
        "SAFE"
      ).toUpperCase(),


    drift_alert:
      Boolean(
        safety.drift_alert
      ),


    unknown_behavior:
      Boolean(
        safety.unknown_behavior
      ),


    distances:
      safety.distances ||
      {},

  };
}


/* =================================================================
   NORMALIZE LIVE FLOW
================================================================= */

function normalizeFlow(
  flow
) {

  const prediction =
    String(
      flow?.prediction ||
      "BENIGN"
    );


  const predictionUpper =
    prediction.toUpperCase();


  const backendThreat =
    Boolean(
      flow?.is_threat
    );


  /* ==============================================================
     THREAT STATUS
  ============================================================== */

  let threatStatus =
    flow?.threat_status;


  if (threatStatus) {

    threatStatus =
      String(
        threatStatus
      ).toUpperCase();

  }

  else if (
    backendThreat
  ) {

    threatStatus =
      "ATTACK";

  }

  else {

    const suspiciousPredictions = [

      "PORTSCAN",
      "PORT SCAN",

      "DDOS",
      "DOS",

      "BOT",
      "BOTNET",

      "BRUTEFORCE",
      "BRUTE FORCE",

      "INFILTRATION",

      "WEBATTACK",
      "WEB ATTACK",

    ];


    threatStatus =
      suspiciousPredictions
        .includes(
          predictionUpper
        )
        ? "SUSPICIOUS"
        : "BENIGN";
  }


  /* ==============================================================
     THREAT SCORE
  ============================================================== */

  let threatScore =
    Number(
      flow?.threat_score
    );


  if (
    !Number.isFinite(
      threatScore
    )
  ) {

    threatScore = 0;
  }


  if (
    threatScore <= 0 &&
    threatStatus ===
    "ATTACK"
  ) {

    threatScore = 80;
  }


  else if (
    threatScore <= 0 &&
    threatStatus ===
    "SUSPICIOUS"
  ) {

    threatScore = 50;
  }


  threatScore =
    Math.max(
      0,
      Math.min(
        100,
        threatScore
      )
    );


  /* ==============================================================
     SEVERITY
  ============================================================== */

  let severity =
    flow?.severity;


  if (severity) {

    severity =
      String(
        severity
      ).toUpperCase();

  }

  else if (
    threatScore >= 70
  ) {

    severity =
      "HIGH";

  }

  else if (
    threatScore >= 40
  ) {

    severity =
      "MEDIUM";

  }

  else {

    severity =
      "LOW";
  }


  /* ==============================================================
     CONFIDENCE
  ============================================================== */

  let confidence =
    Number(
      flow?.confidence
    );


  if (
    !Number.isFinite(
      confidence
    )
  ) {

    confidence = 0;
  }


  confidence =
    Math.max(
      0,
      Math.min(
        100,
        confidence
      )
    );


  /* ==============================================================
     THREAT REASONS
  ============================================================== */

  let reasons =
    Array.isArray(
      flow?.threat_reasons
    )
      ? flow.threat_reasons
      : [];


  if (
    (
      threatStatus ===
      "ATTACK" ||
      threatStatus ===
      "SUSPICIOUS"
    ) &&
    reasons.length === 0
  ) {

    reasons = [
      "SafeML ML detector reported suspicious activity"
    ];
  }


  /* ==============================================================
     TIMESTAMP
  ============================================================== */

  const timestamp =
    flow?.timestamp ||
    flow?.time ||
    "--";


  /* ==============================================================
     FINAL FLOW
  ============================================================== */

  return {

    ...flow,


    id:
      flow?.id ||
      createFlowKey(flow),


    time:
      flow?.time ||
      timestamp,


    timestamp,


    src_ip:
      flow?.src_ip ||
      "--",


    src_port:
      Number(
        flow?.src_port
      ) || 0,


    dst_ip:
      flow?.dst_ip ||
      "--",


    dst_port:
      Number(
        flow?.dst_port
      ) || 0,


    protocol:
      flow?.protocol ||
      "--",


    prediction,


    confidence:
      Number(
        confidence.toFixed(1)
      ),


    is_threat:
      backendThreat ||
      threatStatus ===
      "ATTACK",


    threat_status:
      threatStatus,


    severity,


    threat_score:
      Number(
        threatScore.toFixed(1)
      ),


    threat_reasons:
      reasons,

  };
}


/* =================================================================
   FLOW KEY
================================================================= */

function createFlowKey(
  flow
) {

  return [

    flow?.timestamp ||
    flow?.time ||
    "",

    flow?.src_ip ||
    "",

    flow?.src_port ||
    "",

    flow?.dst_ip ||
    "",

    flow?.dst_port ||
    "",

    flow?.protocol ||
    "",

    flow?.prediction ||
    "",

  ].join("|");
}