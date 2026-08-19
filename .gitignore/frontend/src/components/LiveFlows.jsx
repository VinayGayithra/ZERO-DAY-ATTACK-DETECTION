import {
  Activity,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Globe,
  Radio,
  ArrowRight,
  Zap,
} from "lucide-react";

export default function LiveFlows({ flows = [] }) {
  const safeFlows = Array.isArray(flows)
    ? flows
    : [];

  const visibleFlows =
    safeFlows.slice(0, 20);

  const threatCount =
    safeFlows.filter((flow) => {
      const status =
        String(
          flow?.threat_status || ""
        ).toUpperCase();

      return (
        status === "ATTACK" ||
        status === "SUSPICIOUS" ||
        flow?.is_threat === true
      );
    }).length;

  const averageScore =
    safeFlows.length > 0
      ? safeFlows.reduce(
        (total, flow) =>
          total +
          Number(
            flow?.threat_score ?? 0
          ),
        0
      ) / safeFlows.length
      : 0;

  return (
    <section className="panel live-flows-panel">

      {/* ========================================================
          HEADER
      ======================================================== */}

      <div className="panel-head">

        <div>

          <div className="live-flow-title">

            <div className="live-flow-icon">
              <Activity size={17} />
            </div>

            <div>

              <h2>
                Live Network Flows
              </h2>

              <span>
                Real-time connections analyzed by
                the SafeML detection engine
              </span>

            </div>

          </div>

        </div>


        <div className="live-flow-status">

          <i />

          LIVE

        </div>

      </div>


      {/* ========================================================
          LIVE SUMMARY BAR
      ======================================================== */}

      <div className="flow-live-summary">

        <div>

          <Zap size={14} />

          <span>
            STREAMING
          </span>

        </div>

        <div>

          <span>
            FLOWS
          </span>

          <strong>
            {safeFlows.length}
          </strong>

        </div>

        <div>

          <span>
            THREATS
          </span>

          <strong
            className={
              threatCount > 0
                ? "danger-text"
                : "safe-text"
            }
          >
            {threatCount}
          </strong>

        </div>

        <div>

          <span>
            AVG SCORE
          </span>

          <strong>
            {averageScore.toFixed(1)}
          </strong>

        </div>

      </div>


      {/* ========================================================
          EMPTY STATE
      ======================================================== */}

      {safeFlows.length === 0 ? (

        <div className="live-flows-empty">

          <div className="empty-icon">

            <Radio size={22} />

          </div>

          <strong>
            Waiting for network traffic
          </strong>

          <span>
            Start the live sensor to begin
            analyzing network flows.
          </span>

        </div>

      ) : (

        /* ======================================================
           TABLE
        ====================================================== */

        <div className="flows-table-wrapper">

          <table className="flows-table">

            <thead>

              <tr>

                <th>
                  TIME
                </th>

                <th>
                  SOURCE
                </th>

                <th>
                  FLOW
                </th>

                <th>
                  DESTINATION
                </th>

                <th>
                  PROTOCOL
                </th>

                <th>
                  ML PREDICTION
                </th>

                <th>
                  CONFIDENCE
                </th>

                <th>
                  THREAT SCORE
                </th>

                <th>
                  STATUS
                </th>

              </tr>

            </thead>


            <tbody>

              {visibleFlows.map(
                (flow, index) => {

                  const prediction =
                    String(
                      flow?.prediction ||
                      "BENIGN"
                    );

                  const status =
                    String(
                      flow?.threat_status ||
                      "BENIGN"
                    ).toUpperCase();

                  const isAttack =
                    status === "ATTACK" ||
                    flow?.is_threat === true;

                  const isSuspicious =
                    !isAttack &&
                    status ===
                    "SUSPICIOUS";

                  const confidence =
                    clamp(
                      Number(
                        flow?.confidence ??
                        0
                      )
                    );

                  const threatScore =
                    clamp(
                      Number(
                        flow?.threat_score ??
                        0
                      )
                    );

                  const severity =
                    String(
                      flow?.severity ||
                      getSeverity(
                        threatScore
                      )
                    ).toUpperCase();


                  return (

                    <tr
                      key={
                        flow?.id ||
                        `${flow?.timestamp}-${flow?.src_ip}-${flow?.src_port}-${flow?.dst_ip}-${flow?.dst_port}-${index}`
                      }
                      className={
                        isAttack
                          ? "flow-threat"
                          : isSuspicious
                            ? "flow-warning"
                            : ""
                      }
                    >


                      {/* TIME */}

                      <td>

                        <div className="flow-time">

                          <Activity
                            size={12}
                          />

                          <span>
                            {flow?.time ||
                              flow?.timestamp ||
                              "--:--:--"}
                          </span>

                        </div>

                      </td>


                      {/* SOURCE */}

                      <td>

                        <div className="flow-endpoint">

                          <div className="endpoint-icon">
                            <Globe size={12} />
                          </div>

                          <div>

                            <strong>
                              {flow?.src_ip ||
                                "Unknown"}
                            </strong>

                            {flow?.src_port ? (
                              <small>
                                :{flow.src_port}
                              </small>
                            ) : null}

                          </div>

                        </div>

                      </td>


                      {/* FLOW DIRECTION */}

                      <td>

                        <div className="flow-direction">

                          <ArrowRight
                            size={14}
                          />

                        </div>

                      </td>


                      {/* DESTINATION */}

                      <td>

                        <div className="flow-endpoint">

                          <div className="endpoint-icon">
                            <Globe size={12} />
                          </div>

                          <div>

                            <strong>
                              {flow?.dst_ip ||
                                "Unknown"}
                            </strong>

                            {flow?.dst_port ? (
                              <small>
                                :{flow.dst_port}
                              </small>
                            ) : null}

                          </div>

                        </div>

                      </td>


                      {/* PROTOCOL */}

                      <td>

                        <span className="protocol-badge">

                          {String(
                            flow?.protocol ||
                            "UNKNOWN"
                          ).toUpperCase()}

                        </span>

                      </td>


                      {/* PREDICTION */}

                      <td>

                        <div
                          className={
                            `prediction-cell ${isAttack
                              ? "threat"
                              : isSuspicious
                                ? "warning"
                                : "safe"
                            }`
                          }
                        >

                          {isAttack ? (
                            <ShieldAlert
                              size={13}
                            />
                          ) : isSuspicious ? (
                            <AlertTriangle
                              size={13}
                            />
                          ) : (
                            <ShieldCheck
                              size={13}
                            />
                          )}

                          <strong>
                            {prediction}
                          </strong>

                        </div>

                      </td>


                      {/* CONFIDENCE */}

                      <td>

                        <div className="confidence-cell">

                          <div className="confidence-bar">

                            <div
                              style={{
                                width:
                                  `${confidence}%`,
                              }}
                            />

                          </div>

                          <span>
                            {confidence.toFixed(
                              1
                            )}
                            %
                          </span>

                        </div>

                      </td>


                      {/* THREAT SCORE */}

                      <td>

                        <div className="threat-score-cell">

                          <strong>
                            {threatScore.toFixed(
                              1
                            )}
                          </strong>

                          <div className="threat-score-bar">

                            <div
                              className={
                                getScoreClass(
                                  threatScore
                                )
                              }
                              style={{
                                width:
                                  `${threatScore}%`,
                              }}
                            />

                          </div>

                        </div>

                      </td>


                      {/* STATUS */}

                      <td>

                        <div
                          className={
                            `flow-status ${isAttack
                              ? "danger"
                              : isSuspicious
                                ? "warning"
                                : "safe"
                            }`
                          }
                        >

                          {isAttack ? (
                            <ShieldAlert
                              size={13}
                            />
                          ) : isSuspicious ? (
                            <AlertTriangle
                              size={13}
                            />
                          ) : (
                            <ShieldCheck
                              size={13}
                            />
                          )}

                          <span>
                            {isAttack
                              ? "ATTACK"
                              : isSuspicious
                                ? "SUSPICIOUS"
                                : "BENIGN"}
                          </span>

                        </div>

                      </td>

                    </tr>

                  );
                }
              )}

            </tbody>

          </table>

        </div>

      )}


      {/* ========================================================
          FOOTER
      ======================================================== */}

      <div className="live-flows-footer">

        <div>

          <span>
            Showing
          </span>

          <strong>
            {Math.min(
              safeFlows.length,
              20
            )}
          </strong>

          <span>
            of {safeFlows.length} recent flows
          </span>

        </div>


        <div className="flow-footer-right">

          <span>
            Threats:
          </span>

          <strong
            className={
              threatCount > 0
                ? "danger-text"
                : "safe-text"
            }
          >
            {threatCount}
          </strong>

          <span>
            •
          </span>

          <span>
            Avg score:
          </span>

          <strong>
            {averageScore.toFixed(1)}
          </strong>

        </div>

      </div>

    </section>
  );
}


/* ================================================================
   HELPERS
================================================================ */

function clamp(value) {

  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      100,
      value
    )
  );
}


function getSeverity(score) {

  if (score >= 70) {
    return "HIGH";
  }

  if (score >= 40) {
    return "MEDIUM";
  }

  return "LOW";
}


function getScoreClass(score) {

  if (score >= 70) {
    return "score-high";
  }

  if (score >= 40) {
    return "score-medium";
  }

  return "score-low";
}