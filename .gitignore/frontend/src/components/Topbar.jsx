import {
  Bell,
  Play,
  Square,
} from "lucide-react";

export default function Topbar({
  connected = false,
  monitoring = false,
  onStartMonitoring,
  onStopMonitoring,
}) {

  const handleStart = () => {

    if (
      typeof onStartMonitoring ===
      "function"
    ) {
      onStartMonitoring();
    }
  };


  const handleStop = () => {

    if (
      typeof onStopMonitoring ===
      "function"
    ) {
      onStopMonitoring();
    }
  };


  return (

    <header className="topbar">

      {/* ======================================================
          LEFT
      ====================================================== */}

      <div className="crumb">

        <span>
          SAFEML
        </span>

        <span>
          /
        </span>

        <strong>
          Security Operations Center
        </strong>

      </div>


      {/* ======================================================
          RIGHT
      ====================================================== */}

      <div className="top-actions">

        {/* ====================================================
            MONITORING CONTROL
        ==================================================== */}

        {!monitoring ? (

          <button
            type="button"
            className="monitor-control start"
            onClick={
              handleStart
            }
          >

            <Play
              size={12}
              fill="currentColor"
            />

            START LIVE MONITORING

          </button>

        ) : (

          <button
            type="button"
            className="monitor-control stop"
            onClick={
              handleStop
            }
          >

            <Square
              size={11}
              fill="currentColor"
            />

            STOP MONITORING

          </button>

        )}


        {/* ==================================================
            CONNECTION STATUS
        ================================================== */}

        <div
          className={
            `live-pill ${connected
              ? ""
              : "offline"
            }`
          }
        >

          <i />

          {connected
            ? "LIVE"
            : "OFFLINE"}

        </div>


        {/* ==================================================
            NOTIFICATION
        ================================================== */}

        <button
          type="button"
          className="icon-btn notification"
          title="Notifications"
        >

          <Bell
            size={15}
          />

          <b />

        </button>


        {/* ==================================================
            AVATAR
        ================================================== */}

        <div className="avatar">
          SM
        </div>

      </div>

    </header>
  );
}