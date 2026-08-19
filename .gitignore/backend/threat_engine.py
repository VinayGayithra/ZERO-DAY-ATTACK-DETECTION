from collections import defaultdict, deque
import time


class ThreatEngine:
    def __init__(self):
        self.source_history = defaultdict(
            lambda: deque(maxlen=100)
        )

    def analyze(self, flow):
        now = time.time()

        src_ip = flow["src_ip"]
        dst_port = flow["dst_port"]
        prediction = flow["prediction"]
        confidence = float(flow["confidence"])

        history = self.source_history[src_ip]

        history.append({
            "time": now,
            "dst_ip": flow["dst_ip"],
            "dst_port": dst_port,
            "prediction": prediction
        })

        recent = [
            item for item in history
            if now - item["time"] <= 10
        ]

        unique_ports = len({
            item["dst_port"]
            for item in recent
        })

        unique_destinations = len({
            item["dst_ip"]
            for item in recent
        })

        threat_score = 0
        reasons = []

        if prediction == "DDoS" and confidence >= 80:
            threat_score += 60
            reasons.append("ML detected DDoS pattern")

        elif prediction == "Bot" and confidence >= 80:
            threat_score += 50
            reasons.append("ML detected Bot activity")

        elif prediction == "PortScan" and confidence >= 80:
            threat_score += 30
            reasons.append("ML detected PortScan pattern")

        if unique_ports >= 8:
            threat_score += 40
            reasons.append(
                f"Multiple destination ports detected ({unique_ports})"
            )

        if unique_destinations >= 10:
            threat_score += 20
            reasons.append(
                f"Multiple destinations detected ({unique_destinations})"
            )

        threat_score = min(
            threat_score,
            100
        )

        if threat_score >= 70:
            severity = "HIGH"

        elif threat_score >= 40:
            severity = "MEDIUM"

        else:
            severity = "LOW"

        if threat_score == 0:
            status = "BENIGN"

        elif threat_score >= 70:
            status = "ATTACK"

        else:
            status = "SUSPICIOUS"

        return {
            "status": status,
            "severity": severity,
            "threat_score": threat_score,
            "reasons": reasons,
            "prediction": prediction,
            "confidence": confidence,
            "source_ip": src_ip,
            "destination_ip": flow["dst_ip"],
            "destination_port": dst_port
        }
        