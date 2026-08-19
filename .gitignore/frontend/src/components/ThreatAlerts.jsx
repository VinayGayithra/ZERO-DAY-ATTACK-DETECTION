import {
  AlertTriangle,
  Clock3,
  ShieldAlert,
  ShieldCheck,
  Target,
} from "lucide-react";

export default function ThreatAlerts({ flows = [] }) {
  const safeFlows = Array.isArray(flows)
    ? flows
    : [];

  const alerts = safeFlows
    .filter((flow) => {
      const status = String(
        flow?.threat_status || ""
      ).toUpperCase();

      return (
        status === "ATTACK" ||
        status === "SUSPICIOUS" ||
        flow?.is_threat === true ||
        Number(flow?.threat_score || 0) > 0
      );
    })
    .slice(0, 8);

  const getSeverity = (flow) => {
    const score = Number(
      flow?.threat_score || 0
    );

    const severity = String(
      flow?.severity || ""
    ).toUpperCase();

    if (
      severity === "HIGH" ||
      score >= 70
    ) {
      return "HIGH";
    }

    if (
      severity === "MEDIUM" ||
      score >= 40
    ) {
      return "MEDIUM";
    }

    return "LOW";
  };

  const getStatus = (flow) => {
    const status = String(
      flow?.threat_status ||
      ""
    ).toUpperCase();

    if (status === "ATTACK") {
      return "ATTACK";
    }

    if (status === "SUSPICIOUS") {
      return "SUSPICIOUS";
    }

    if (flow?.is_threat) {
      return "ATTACK";
    }

    return "SUSPICIOUS";
  };

  return (
    <section className="panel threat-alerts-panel">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="panel-head">

        <div>

          <div className="threat-title-row">

            <div className="threat-title-icon">
              <ShieldAlert size={17} />
            </div>

            <div>
              <h2>
                Threat Center
              </h2>

              <span>
                Real-time suspicious activity
                detected by SafeML
              </span>
            </div>

          </div>

        </div>

        <div className="alert-count-badge">

          <span />

          {alerts.length} active

        </div>

      </div>


      {/* ======================================================
          NO ALERTS
      ====================================================== */}

      {alerts.length === 0 ? (

        <div className="threat-empty">

          <div className="threat-empty-icon">
            <ShieldCheck size={23} />
          </div>

          <div>

            <strong>
              No active threats
            </strong>

            <span>
              SafeML has not detected any
              suspicious network activity.
            </span>

          </div>

          <div className="threat-clear-badge">
            SYSTEM CLEAR
          </div>

        </div>

      ) : (

        /* ====================================================
           ALERT LIST
        ==================================================== */

        <div className="threat-alert-list">

          {alerts.map(
            (flow, index) => {

              const status =
                getStatus(flow);

              const severity =
                getSeverity(flow);

              const score =
                Number(
                  flow?.threat_score || 0
                );

              const confidence =
                Number(
                  flow?.confidence || 0
                );

              const isAttack =
                status === "ATTACK";

              return (
                <div
                  className={
                    `threat-alert-row ${isAttack
                      ? "attack"
                      : "suspicious"
                    }`
                  }
                  key={
                    flow?.id ||
                    `${flow?.timestamp}-${flow?.src_ip}-${flow?.dst_ip}-${index}`
                  }
                >

                  {/* STATUS ICON */}

                  <div
                    className={
                      `threat-alert-icon ${severity.toLowerCase()
                      }`
                    }
                  >

                    {isAttack ? (
                      <ShieldAlert
                        size={18}
                      />
                    ) : (
                      <AlertTriangle
                        size={18}
                      />
                    )}

                  </div>


                  {/* MAIN CONTENT */}

                  <div className="threat-alert-main">

                    <div className="threat-alert-heading">

                      <strong>
                        {flow?.prediction ||
                          "Suspicious Activity"}
                      </strong>

                      <span
                        className={
                          `severity-badge ${severity.toLowerCase()
                          }`
                        }
                      >
                        {severity}
                      </span>

                    </div>


                    <div className="threat-alert-route">

                      <span>
                        {flow?.src_ip ||
                          "Unknown source"}
                      </span>

                      <b>
                        →
                      </b>

                      <span>
                        {flow?.dst_ip ||
                          "Unknown destination"}
                      </span>

                    </div>


                    <div className="threat-alert-meta">

                      <span>
                        Protocol:{" "}
                        <strong>
                          {flow?.protocol ||
                            "--"}
                        </strong>
                      </span>

                      <span>
                        Status:{" "}
                        <strong>
                          {status}
                        </strong>
                      </span>

                      <span>
                        Confidence:{" "}
                        <strong>
                          {confidence.toFixed(1)}%
                        </strong>
                      </span>

                    </div>


                    {/* REASON */}

                    {Array.isArray(
                      flow?.threat_reasons
                    ) &&
                      flow.threat_reasons
                        .length > 0 && (

                        <div className="threat-reason">

                          <Target size={13} />

                          <span>
                            {
                              flow
                                .threat_reasons[0]
                            }
                          </span>

                        </div>
                      )}

                  </div>


                  {/* SCORE */}

                  <div className="threat-alert-score">

                    <span>
                      THREAT SCORE
                    </span>

                    <strong>
                      {score.toFixed(0)}
                    </strong>

                    <div className="score-bar">

                      <div
                        style={{
                          width:
                            `${Math.min(
                              100,
                              Math.max(
                                0,
                                score
                              )
                            )}%`,
                        }}
                      />

                    </div>

                  </div>


                  {/* TIME */}

                  <div className="threat-alert-time">

                    <Clock3 size={13} />

                    <span>
                      {flow?.timestamp ||
                        flow?.time ||
                        "--:--:--"}
                    </span>

                  </div>

                </div>
              );
            }
          )}

        </div>
      )}


      {/* ======================================================
          FOOTER
      ====================================================== */}

      <div className="threat-alert-footer">

        <div>

          <span>
            Detection engine
          </span>

          <strong>
            SafeML ML Pipeline
          </strong>

        </div>

        <div>

          <span>
            Alerts shown
          </span>

          <strong>
            {alerts.length}
          </strong>

        </div>

        <div>

          <span>
            Monitoring
          </span>

          <strong className="monitoring-active">
            ● ACTIVE
          </strong>

        </div>

      </div>

    </section>
  );
}