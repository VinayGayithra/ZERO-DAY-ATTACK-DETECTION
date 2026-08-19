export default function StatCard({ icon, label, value, unit, change, tone = "blue" }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${tone}`}>{icon}</div>
      <div className="stat-copy">
        <span>{label}</span>
        <strong>{value}<small>{unit}</small></strong>
        {change && <em>{change}</em>}
      </div>
    </div>
  );
}
