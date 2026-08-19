import {
  Activity,
  BarChart3,
  BellRing,
  LayoutDashboard,
  Network,
  Settings,
  ShieldCheck,
  ShieldAlert
} from "lucide-react";

const items = [
  ["dashboard", "Dashboard", LayoutDashboard],
  ["traffic", "Live Traffic", Network],
  ["threats", "Threat Center", ShieldAlert],
  ["analytics", "Analytics", BarChart3],
  ["settings", "Settings", Settings]
];

export default function Sidebar({ page, setPage }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark"><ShieldCheck size={21} /></div>
        <div>
          <strong>SAFEML</strong>
          <span>SOC PLATFORM</span>
        </div>
      </div>

      <div className="side-label">MONITORING</div>

      <nav>
        {items.map(([id, label, Icon]) => (
          <button
            key={id}
            className={`nav-item ${page === id ? "active" : ""}`}
            onClick={() => setPage(id)}
          >
            <Icon size={18} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="sensor-card">
          <div className="sensor-icon"><Activity size={17} /></div>
          <div>
            <strong>Sensor Online</strong>
            <span>Npcap / Scapy</span>
          </div>
          <i />
        </div>
        <div className="version">SafeML v1.0 · Local Sensor</div>
      </div>
    </aside>
  );
}
