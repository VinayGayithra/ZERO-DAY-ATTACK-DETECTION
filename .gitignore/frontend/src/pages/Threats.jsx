import {
  ShieldAlert,
  ShieldCheck,
  Network,
  Target,
  Activity,
  Clock
} from "lucide-react";

function getSeverityClass(severity) {
  const value = String(
    severity || "LOW"
  ).toUpperCase();

  if (
    value === "HIGH" ||
    value === "CRITICAL"
  ) {
    return "high";
  }

  if (
    value === "MEDIUM" ||
    value === "WARNING"
  ) {
    return "medium";
  }

  return "low";
}

function getThreatClass(status) {
  const value = String(
    status || "BENIGN"
  ).toUpperCase();

  if (value === "ATTACK") {
    return "high";
  }

  if (value === "SUSPICIOUS") {
    return "medium";
  }

  return "low";
}

function formatPort(port) {
  if (
    port === undefined ||
    port === null ||
    port === "" ||
    Number(port) === 0
  ) {
    return "Unknown";
  }

  return port;
}

function formatConfidence(confidence) {
  const value = Number(
    confidence ?? 0
  );

  if (!Number.isFinite(value)) {
    return "0.0%";
  }

  return `${value.toFixed(1)}%`;
}

function formatScore(score) {
  const value = Number(
    score ?? 0
  );

  if (!Number.isFinite(value)) {
    return "0";
  }

  return Math.round(value);
}

export default function Threats({
  flows = []
}) {
  const threats = flows.filter(
    (flow) => {
      const status = String(
        flow.threat_status || ""
      ).toUpperCase();

      return (
        status === "ATTACK" ||
        status === "SUSPICIOUS" ||
        flow.is_threat === true
      );
    }
  );

  return (
    <div className="page">

      {/* =========================================================
          PAGE HEADER
      ========================================================= */}

      <div className="page-title">

        <div>

          <div className="eyebrow">
            INCIDENT RESPONSE
          </div>

          <h1>
            Threat Center
          </h1>

          <p>
            Review suspicious flows detected by the live ML sensor.
          </p>

        </div>

        <div className="capture-badge">
          <i></i>
          {threats.length} ACTIVE
        </div>

      </div>


      {/* =========================================================
          NO THREATS
      ========================================================= */}

      {threats.length === 0 ? (

        <div className="empty-state">

          <ShieldCheck size={44} />

          <h2>
            No active threats
          </h2>

          <p>
            SafeML has not reported a suspicious or attack flow
            in the current feed.
          </p>

        </div>

      ) : (

        <div className="threat-grid">

          {threats.map(
            (flow, index) => {

              const threatStatus =
                String(
                  flow.threat_status ||
                  "SUSPICIOUS"
                ).toUpperCase();

              const severity =
                String(
                  flow.severity ||
                  "MEDIUM"
                ).toUpperCase();

              const prediction =
                flow.prediction ||
                "Unknown Activity";

              const srcIp =
                flow.src_ip ||
                "Unknown";

              const dstIp =
                flow.dst_ip ||
                "Unknown";

              const srcPort =
                formatPort(
                  flow.src_port
                );

              const dstPort =
                formatPort(
                  flow.dst_port
                );

              const protocol =
                flow.protocol ||
                "Unknown";

              const timestamp =
                flow.timestamp ||
                flow.time ||
                "--";

              const reasons =
                Array.isArray(
                  flow.threat_reasons
                ) &&
                  flow.threat_reasons.length
                  ? flow.threat_reasons
                  : [
                    "Live ML detector reported suspicious activity"
                  ];

              return (

                <div
                  className="threat-card"
                  key={[
                    flow.timestamp,
                    srcIp,
                    srcPort,
                    dstIp,
                    dstPort,
                    prediction,
                    index
                  ].join("-")}
                >

                  {/* =================================================
                      CARD HEADER
                  ================================================= */}

                  <div className="threat-card-top">

                    <div className="danger-icon">
                      <ShieldAlert size={20} />
                    </div>

                    <span
                      className={`severity-badge ${getSeverityClass(
                        severity
                      )}`}
                    >
                      {severity}
                    </span>

                  </div>


                  {/* =================================================
                      THREAT TITLE
                  ================================================= */}

                  <h3>
                    {prediction}
                  </h3>

                  <p className="flow-route">
                    {srcIp}:{srcPort}
                    {" → "}
                    {dstIp}:{dstPort}
                  </p>


                  {/* =================================================
                      THREAT METRICS
                  ================================================= */}

                  <div className="threat-metrics">

                    <div>

                      <span>
                        Threat score
                      </span>

                      <strong>
                        {formatScore(
                          flow.threat_score
                        )}
                      </strong>

                    </div>


                    <div>

                      <span>
                        Confidence
                      </span>

                      <strong>
                        {formatConfidence(
                          flow.confidence
                        )}
                      </strong>

                    </div>

                  </div>


                  {/* =================================================
                      DETAILS
                  ================================================= */}

                  <div className="threat-details">

                    <div className="detail-item">

                      <Network size={16} />

                      <div>

                        <span>
                          Protocol
                        </span>

                        <strong>
                          {protocol}
                        </strong>

                      </div>

                    </div>


                    <div className="detail-item">

                      <Target size={16} />

                      <div>

                        <span>
                          Source
                        </span>

                        <strong>
                          {srcIp}:{srcPort}
                        </strong>

                      </div>

                    </div>


                    <div className="detail-item">

                      <Target size={16} />

                      <div>

                        <span>
                          Destination
                        </span>

                        <strong>
                          {dstIp}:{dstPort}
                        </strong>

                      </div>

                    </div>


                    <div className="detail-item">

                      <Activity size={16} />

                      <div>

                        <span>
                          ML Prediction
                        </span>

                        <strong>
                          {prediction}
                        </strong>

                      </div>

                    </div>


                    <div className="detail-item">

                      <Clock size={16} />

                      <div>

                        <span>
                          Detected
                        </span>

                        <strong>
                          {timestamp}
                        </strong>

                      </div>

                    </div>


                    <div className="detail-item">

                      <ShieldAlert size={16} />

                      <div>

                        <span>
                          Threat Status
                        </span>

                        <strong
                          className={
                            getThreatClass(
                              threatStatus
                            )
                          }
                        >
                          {threatStatus}
                        </strong>

                      </div>

                    </div>

                  </div>


                  {/* =================================================
                      REASONS
                  ================================================= */}

                  <div className="reason-section">

                    <span className="reason-title">
                      Threat Reasons
                    </span>

                    <div className="reason-list">

                      {reasons.map(
                        (reason, reasonIndex) => (

                          <span
                            key={reasonIndex}
                          >
                            {reason}
                          </span>

                        )
                      )}

                    </div>

                  </div>

                </div>
              );
            }
          )}

        </div>
      )}

    </div>
  );
}