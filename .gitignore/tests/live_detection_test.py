import sys
import time
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from backend.network_engine import LiveTrafficMonitor


monitor = LiveTrafficMonitor(interface="auto")

print("=" * 60)
print("SAFE ML - LIVE NETWORK DETECTION")
print("=" * 60)

print("\nStarting packet capture...")
monitor.start()

print("Capture is running.")
print("Browse the internet for 20-30 seconds.")
print("Press Ctrl+C to stop.\n")

try:
    while True:
        time.sleep(2)

        flows = monitor.get_pending_completed_flows()

        for flow in flows:
            print("-" * 60)
            print(
                f"Source      : "
                f"{flow['src_ip']}:{flow['src_port']}"
            )
            print(
                f"Destination : "
                f"{flow['dst_ip']}:{flow['dst_port']}"
            )
            print(f"Protocol    : {flow['protocol']}")
            print(f"Prediction  : {flow['prediction']}")
            print(f"Confidence  : {flow['confidence']}%")

except KeyboardInterrupt:
    print("\nStopping capture...")

finally:
    monitor.stop()

    print("\nFinal statistics:")
    print(monitor.get_stats())