const API_BASE = "";

/* ============================================================
   LIVE WEBSOCKET
   ============================================================ */

export function connectLiveTraffic(
  onMessage,
  onStatus,
  interfaceName = "auto"
) {
  /*
    If React is running through Vite on port 5173,
    connect directly to FastAPI on port 8000.

    If the React build is being served by FastAPI,
    use the same host automatically.
  */

  const port = window.location.port;
  const isDevMode =
    port === "5173" ||
    port === "3000" ||
    port === "5174";

  const protocol =
    window.location.protocol === "https:"
      ? "wss:"
      : "ws:";

  const host = isDevMode
    ? `${window.location.hostname}:8001`
    : window.location.host;

  const params = new URLSearchParams({
    interface: interfaceName || "auto",
    mode: "live",
  });

  const wsUrl =
    `${protocol}//${host}/ws/stream?${params.toString()}`;

  console.log(
    "Connecting SafeML WebSocket:",
    wsUrl
  );

  const socket = new WebSocket(wsUrl);

  /* ==========================================================
     CONNECTED
  ========================================================== */

  socket.onopen = () => {
    console.log(
      "SafeML WebSocket connected"
    );

    onStatus?.(true);
  };

  /* ==========================================================
     MESSAGE
  ========================================================== */

  socket.onmessage = (event) => {
    try {
      const message =
        JSON.parse(event.data);

      console.log(
        "SafeML data received:",
        message
      );

      onMessage?.(message);
    } catch (error) {
      console.error(
        "Invalid WebSocket payload:",
        error
      );
    }
  };

  /* ==========================================================
     ERROR
  ========================================================== */

  socket.onerror = (error) => {
    console.error(
      "SafeML WebSocket error:",
      error
    );

    onStatus?.(false);
  };

  /* ==========================================================
     CLOSED
  ========================================================== */

  socket.onclose = (event) => {
    console.log(
      "SafeML WebSocket disconnected:",
      event.code,
      event.reason
    );

    onStatus?.(false);
  };

  return socket;
}


/* ============================================================
   API REQUEST HELPER
   ============================================================ */

async function apiRequest(
  endpoint,
  options = {}
) {
  const response = await fetch(
    `${API_BASE}${endpoint}`,
    {
      headers: {
        "Content-Type":
          "application/json",

        ...(options.headers || {}),
      },

      ...options,
    }
  );

  if (!response.ok) {
    let message =
      `Request failed: ${response.status}`;

    try {
      const errorData =
        await response.json();

      if (errorData?.detail) {
        message =
          errorData.detail;
      }
    } catch {
      // Ignore JSON parsing errors.
    }

    throw new Error(message);
  }

  return response.json();
}


/* ============================================================
   HEALTH
   ============================================================ */

export function getHealth() {
  return apiRequest(
    "/api/health"
  );
}


/* ============================================================
   DATASETS
   ============================================================ */

export function getDatasets() {
  return apiRequest(
    "/api/datasets"
  );
}


/* ============================================================
   DATASET PREVIEW
   ============================================================ */

export function previewDataset(
  fileName
) {
  return apiRequest(
    "/api/dataset/preview",
    {
      method: "POST",

      body: JSON.stringify({
        file_name: fileName,
      }),
    }
  );
}


/* ============================================================
   ANALYZE DATASET
   ============================================================ */

export function analyzeDataset(
  data
) {
  return apiRequest(
    "/api/analyze",
    {
      method: "POST",

      body: JSON.stringify(data),
    }
  );
}


/* ============================================================
   DRIFT SIMULATION
   ============================================================ */

export function simulateDrift(
  data
) {
  return apiRequest(
    "/api/simulate-drift",
    {
      method: "POST",

      body: JSON.stringify(data),
    }
  );
}


/* ============================================================
   NETWORK INTERFACES
   ============================================================ */

export function getNetworkInterfaces() {
  return apiRequest(
    "/api/network/interfaces"
  );
}


/* ============================================================
   UPLOAD DATASET
   ============================================================ */

export async function uploadDataset(
  file
) {
  const formData =
    new FormData();

  formData.append(
    "file",
    file
  );

  const response =
    await fetch(
      `${API_BASE}/api/upload`,
      {
        method: "POST",

        body: formData,
      }
    );

  if (!response.ok) {
    let message =
      `Upload failed: ${response.status}`;

    try {
      const errorData =
        await response.json();

      if (errorData?.detail) {
        message =
          errorData.detail;
      }
    } catch {
      // Ignore JSON parsing errors.
    }

    throw new Error(message);
  }

  return response.json();
}


/* ============================================================
   EXPORT RESULTS
   ============================================================ */

export async function exportResults(
  data
) {
  const response =
    await fetch(
      `${API_BASE}/api/export`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify(data),
      }
    );

  if (!response.ok) {
    let message =
      `Export failed: ${response.status}`;

    try {
      const errorData =
        await response.json();

      if (errorData?.detail) {
        message =
          errorData.detail;
      }
    } catch {
      // Ignore JSON parsing errors.
    }

    throw new Error(message);
  }

  const blob =
    await response.blob();

  const url =
    window.URL.createObjectURL(
      blob
    );

  const link =
    document.createElement(
      "a"
    );

  link.href = url;

  link.download =
    "SafeML_Report.xlsx";

  document.body.appendChild(
    link
  );

  link.click();

  link.remove();

  window.URL.revokeObjectURL(
    url
  );
}