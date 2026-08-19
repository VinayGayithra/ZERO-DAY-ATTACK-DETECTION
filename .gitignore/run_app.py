import threading
import time
import webbrowser
import urllib.request

import uvicorn


HOST = "127.0.0.1"
PORT = 8001
URL = f"http://{HOST}:{PORT}"
HEALTH_URL = f"{URL}/api/health"


def wait_for_server():
    print("Waiting for SafeML backend to start...")

    while True:
        try:
            with urllib.request.urlopen(
                HEALTH_URL,
                timeout=2
            ) as response:

                if response.status == 200:
                    print("SafeML backend is ready.")
                    print(f"Opening dashboard: {URL}")

                    webbrowser.open(URL)
                    return

        except Exception:
            time.sleep(1)


def launch_server():
    print("=" * 65)
    print("        SafeML Security & Safety AI Dashboard")
    print("=" * 65)
    print(f"Dashboard: {URL}")
    print(f"API:       {HEALTH_URL}")
    print("=" * 65)

    browser_thread = threading.Thread(
        target=wait_for_server,
        daemon=True
    )

    browser_thread.start()

    uvicorn.run(
        "backend.main:app",
        host=HOST,
        port=PORT,
        reload=False,
        log_level="info"
    )


if __name__ == "__main__":
    launch_server()