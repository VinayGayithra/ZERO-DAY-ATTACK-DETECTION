import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export default function TrafficChart({
  data = [],
}) {
  const safeData = Array.isArray(data)
    ? data
      .map((item) => ({
        time: item?.time || "--",
        value: Number(item?.value) || 0,
      }))
      .filter((item) =>
        Number.isFinite(item.value)
      )
    : [];

  return (
    <div className="chart-wrap">

      {safeData.length === 0 ? (

        <div className="chart-empty">
          Waiting for network traffic...
        </div>

      ) : (

        <ResponsiveContainer
          width="100%"
          height="100%"
        >
          <AreaChart
            data={safeData}
            margin={{
              top: 10,
              right: 10,
              left: 0,
              bottom: 0,
            }}
          >

            <defs>
              <linearGradient
                id="trafficFill"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor="#38bdf8"
                  stopOpacity={0.30}
                />

                <stop
                  offset="100%"
                  stopColor="#38bdf8"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>

            <XAxis
              dataKey="time"
              hide
            />

            <YAxis
              hide
              domain={[
                0,
                "auto",
              ]}
            />

            <Tooltip
              cursor={{
                stroke: "#38bdf8",
                strokeOpacity: 0.25,
              }}
              formatter={(value) => [
                `${Number(value).toFixed(1)} packets/sec`,
                "Traffic",
              ]}
              labelFormatter={(label) =>
                `Time: ${label}`
              }
              contentStyle={{
                background: "#0b1728",
                border:
                  "1px solid #1c3552",
                borderRadius: 10,
                color: "#e8f0fa",
              }}
              labelStyle={{
                color: "#94a3b8",
                marginBottom: 4,
              }}
            />

            <Area
              type="monotone"
              dataKey="value"
              stroke="#38bdf8"
              strokeWidth={2}
              fill="url(#trafficFill)"
              dot={false}
              activeDot={{
                r: 4,
              }}
              isAnimationActive={false}
            />

          </AreaChart>
        </ResponsiveContainer>

      )}

    </div>
  );
}