export default function ThreatGauge({
  score = 0,
  status = "",
}) {
  const safeScore = Math.max(
    0,
    Math.min(100, Number(score) || 0)
  );

  const backendStatus = String(
    status || ""
  ).toUpperCase();

  let label;

  if (backendStatus === "HIGH RISK") {
    label = "HIGH";
  } else if (backendStatus === "WARNING") {
    label = "MEDIUM";
  } else if (backendStatus === "SAFE") {
    label = "LOW";
  } else {
    label =
      safeScore >= 70
        ? "HIGH"
        : safeScore >= 40
          ? "MEDIUM"
          : "LOW";
  }

  const gaugeClass = label.toLowerCase();

  return (
    <div className="gauge-card">

      <div
        className="gauge-ring"
        style={{
          "--score": `${safeScore * 3.6}deg`,
        }}
      >
        <div>
          <strong>
            {safeScore.toFixed(0)}
          </strong>

          <span>
            RISK SCORE
          </span>
        </div>
      </div>

      <div className="gauge-status">

        <span>
          Current threat level
        </span>

        <strong className={gaugeClass}>
          {label}
        </strong>

      </div>

      <div className="gauge-backend-status">
        Backend status:{" "}
        <strong>
          {backendStatus || "UNKNOWN"}
        </strong>
      </div>

    </div>
  );
}