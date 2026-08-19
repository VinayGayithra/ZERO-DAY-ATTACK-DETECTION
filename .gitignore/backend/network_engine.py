import logging
import random
import socket
import threading
import time
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

from backend.ml_detector import MLDetector
from backend.threat_engine import ThreatEngine


logger = logging.getLogger("NetworkEngine")


HAS_SCAPY = False

try:
    import scapy.all as scapy
    from scapy.layers.inet import IP, TCP, UDP
    from scapy.layers.inet6 import IPv6

    HAS_SCAPY = True

    logger.info("Scapy loaded successfully. Live packet capture enabled.")

except Exception as e:
    logger.warning(f"Scapy or Npcap unavailable: {e}")


def get_available_interfaces() -> List[Dict[str, str]]:
    interfaces = [
        {
            "id": "auto",
            "name": "Auto-Detect Default Interface",
            "ip": "127.0.0.1"
        }
    ]

    if HAS_SCAPY:
        try:
            ifaces = getattr(
                scapy,
                "get_working_ifaces",
                lambda: getattr(
                    scapy.conf,
                    "ifaces",
                    {}
                ).values()
            )()

            for iface in ifaces:
                name = getattr(
                    iface,
                    "name",
                    str(iface)
                )

                ip = getattr(
                    iface,
                    "ip",
                    "0.0.0.0"
                )

                description = getattr(
                    iface,
                    "description",
                    name
                )

                if ip and ip != "0.0.0.0":
                    interfaces.append({
                        "id": name,
                        "name": (
                            f"{description} ({ip})"
                            if description != name
                            else f"{name} ({ip})"
                        ),
                        "ip": ip
                    })

        except Exception as err:
            logger.warning(
                f"Interface enumeration failed: {err}"
            )

    if len(interfaces) == 1:
        try:
            hostname = socket.gethostname()
            local_ip = socket.gethostbyname(hostname)

            interfaces.append({
                "id": "default",
                "name": f"Local Network Adapter ({local_ip})",
                "ip": local_ip
            })

        except Exception:
            pass

    return interfaces


@dataclass
class PacketInfo:
    timestamp: float
    src_ip: str
    dst_ip: str
    src_port: int
    dst_port: int
    protocol: str
    length: int
    is_fwd: bool
    tcp_flags: int = 0
    tcp_window: int = 0
    header_length: int = 0
    payload_length: int = 0


class FlowTracker:

    def __init__(
        self,
        key: Tuple[str, str, int, int, str],
        start_time: float
    ):
        self.src_ip = key[0]
        self.dst_ip = key[1]
        self.src_port = int(key[2])
        self.dst_port = int(key[3])
        self.protocol = key[4]

        self.start_time = start_time
        self.last_seen = start_time

        self.fwd_packets: List[PacketInfo] = []
        self.bwd_packets: List[PacketInfo] = []
        self.all_packets: List[PacketInfo] = []

    def add_packet(self, pkt: PacketInfo):

        self.last_seen = pkt.timestamp
        self.all_packets.append(pkt)

        if pkt.is_fwd:
            self.fwd_packets.append(pkt)
        else:
            self.bwd_packets.append(pkt)

    def is_finished(
        self,
        current_time: float,
        timeout: float = 3.0
    ) -> bool:

        if current_time - self.last_seen > timeout:
            return True

        if self.all_packets:
            flags = self.all_packets[-1].tcp_flags

            if flags & 0x01:
                return True

            if flags & 0x04:
                return True

        return False

    @staticmethod
    def _stats(values):

        if not values:
            return {
                "max": 0.0,
                "min": 0.0,
                "mean": 0.0,
                "std": 0.0
            }

        arr = np.asarray(
            values,
            dtype=np.float64
        )

        return {
            "max": float(np.max(arr)),
            "min": float(np.min(arr)),
            "mean": float(np.mean(arr)),
            "std": float(np.std(arr))
        }

    @staticmethod
    def _iat_stats(packets):

        if len(packets) < 2:
            return {
                "total": 0.0,
                "mean": 0.0,
                "std": 0.0,
                "max": 0.0,
                "min": 0.0
            }

        times = np.asarray(
            [
                packet.timestamp
                for packet in packets
            ],
            dtype=np.float64
        )

        iats = np.diff(times)

        return {
            "total": float(np.sum(iats) * 1e6),
            "mean": float(np.mean(iats) * 1e6),
            "std": float(np.std(iats) * 1e6),
            "max": float(np.max(iats) * 1e6),
            "min": float(np.min(iats) * 1e6)
        }

    @staticmethod
    def _active_idle_stats(packets):

        if len(packets) < 2:
            return {
                "active_mean": 0.0,
                "active_std": 0.0,
                "active_max": 0.0,
                "active_min": 0.0,
                "idle_mean": 0.0,
                "idle_std": 0.0,
                "idle_max": 0.0,
                "idle_min": 0.0
            }

        timestamps = np.asarray(
            [
                packet.timestamp
                for packet in packets
            ],
            dtype=np.float64
        )

        gaps = np.diff(timestamps)

        active_periods = []
        idle_periods = []

        active_start = timestamps[0]

        for i, gap in enumerate(gaps):

            if gap > 1.0:

                active_periods.append(
                    timestamps[i] - active_start
                )

                idle_periods.append(gap)

                active_start = timestamps[i + 1]

        active_periods.append(
            timestamps[-1] - active_start
        )

        if not active_periods:
            active_periods = [0.0]

        if not idle_periods:
            idle_periods = [0.0]

        active = np.asarray(
            active_periods,
            dtype=np.float64
        ) * 1e6

        idle = np.asarray(
            idle_periods,
            dtype=np.float64
        ) * 1e6

        return {
            "active_mean": float(np.mean(active)),
            "active_std": float(np.std(active)),
            "active_max": float(np.max(active)),
            "active_min": float(np.min(active)),
            "idle_mean": float(np.mean(idle)),
            "idle_std": float(np.std(idle)),
            "idle_max": float(np.max(idle)),
            "idle_min": float(np.min(idle))
        }

    def extract_features(self) -> Dict[str, Any]:

        n_all = len(self.all_packets)
        n_fwd = len(self.fwd_packets)
        n_bwd = len(self.bwd_packets)

        duration_sec = max(
            1e-6,
            self.last_seen - self.start_time
        )

        duration_us = duration_sec * 1e6

        fwd_lens = [
            p.length
            for p in self.fwd_packets
        ]

        bwd_lens = [
            p.length
            for p in self.bwd_packets
        ]

        all_lens = [
            p.length
            for p in self.all_packets
        ]

        if not fwd_lens:
            fwd_lens = [0]

        if not bwd_lens:
            bwd_lens = [0]

        if not all_lens:
            all_lens = [0]

        total_fwd_bytes = sum(fwd_lens)
        total_bwd_bytes = sum(bwd_lens)

        fwd_stats = self._stats(fwd_lens)
        bwd_stats = self._stats(bwd_lens)
        all_stats = self._stats(all_lens)

        flow_iat = self._iat_stats(
            self.all_packets
        )

        fwd_iat = self._iat_stats(
            self.fwd_packets
        )

        bwd_iat = self._iat_stats(
            self.bwd_packets
        )

        active_idle = self._active_idle_stats(
            self.all_packets
        )

        fin_count = sum(
            1
            for p in self.all_packets
            if p.tcp_flags & 0x01
        )

        syn_count = sum(
            1
            for p in self.all_packets
            if p.tcp_flags & 0x02
        )

        rst_count = sum(
            1
            for p in self.all_packets
            if p.tcp_flags & 0x04
        )

        psh_count = sum(
            1
            for p in self.all_packets
            if p.tcp_flags & 0x08
        )

        ack_count = sum(
            1
            for p in self.all_packets
            if p.tcp_flags & 0x10
        )

        urg_count = sum(
            1
            for p in self.all_packets
            if p.tcp_flags & 0x20
        )

        fwd_psh = sum(
            1
            for p in self.fwd_packets
            if p.tcp_flags & 0x08
        )

        bwd_psh = sum(
            1
            for p in self.bwd_packets
            if p.tcp_flags & 0x08
        )

        fwd_urg = sum(
            1
            for p in self.fwd_packets
            if p.tcp_flags & 0x20
        )

        bwd_urg = sum(
            1
            for p in self.bwd_packets
            if p.tcp_flags & 0x20
        )

        fwd_header_length = sum(
            p.header_length
            for p in self.fwd_packets
        )

        bwd_header_length = sum(
            p.header_length
            for p in self.bwd_packets
        )

        forward_windows = [
            p.tcp_window
            for p in self.fwd_packets
            if p.tcp_window > 0
        ]

        backward_windows = [
            p.tcp_window
            for p in self.bwd_packets
            if p.tcp_window > 0
        ]

        init_win_forward = (
            forward_windows[0]
            if forward_windows
            else 0
        )

        init_win_backward = (
            backward_windows[0]
            if backward_windows
            else 0
        )

        forward_payloads = [
            p.payload_length
            for p in self.fwd_packets
            if p.payload_length > 0
        ]

        active_data_packets = len(
            forward_payloads
        )

        min_segment_size = min(
            forward_payloads
            if forward_payloads
            else [0]
        )

        return {

            "destination_port":
                float(self.dst_port),

            "flow_duration":
                float(duration_us),

            "total_fwd_packets":
                float(n_fwd),

            "total_backward_packets":
                float(n_bwd),

            "total_length_of_fwd_packets":
                float(total_fwd_bytes),

            "total_length_of_bwd_packets":
                float(total_bwd_bytes),

            "fwd_packet_length_max":
                fwd_stats["max"],

            "fwd_packet_length_min":
                fwd_stats["min"],

            "fwd_packet_length_mean":
                fwd_stats["mean"],

            "fwd_packet_length_std":
                fwd_stats["std"],

            "bwd_packet_length_max":
                bwd_stats["max"],

            "bwd_packet_length_min":
                bwd_stats["min"],

            "bwd_packet_length_mean":
                bwd_stats["mean"],

            "bwd_packet_length_std":
                bwd_stats["std"],

            "flow_bytess":
                float(
                    (
                        total_fwd_bytes
                        + total_bwd_bytes
                    ) / duration_sec
                ),

            "flow_packetss":
                float(
                    n_all / duration_sec
                ),

            "flow_iat_mean":
                flow_iat["mean"],

            "flow_iat_std":
                flow_iat["std"],

            "flow_iat_max":
                flow_iat["max"],

            "flow_iat_min":
                flow_iat["min"],

            "fwd_iat_total":
                fwd_iat["total"],

            "fwd_iat_mean":
                fwd_iat["mean"],

            "fwd_iat_std":
                fwd_iat["std"],

            "fwd_iat_max":
                fwd_iat["max"],

            "fwd_iat_min":
                fwd_iat["min"],

            "bwd_iat_total":
                bwd_iat["total"],

            "bwd_iat_mean":
                bwd_iat["mean"],

            "bwd_iat_std":
                bwd_iat["std"],

            "bwd_iat_max":
                bwd_iat["max"],

            "bwd_iat_min":
                bwd_iat["min"],

            "fwd_psh_flags":
                float(fwd_psh),

            "bwd_psh_flags":
                float(bwd_psh),

            "fwd_urg_flags":
                float(fwd_urg),

            "bwd_urg_flags":
                float(bwd_urg),

            "fwd_header_length":
                float(fwd_header_length),

            "bwd_header_length":
                float(bwd_header_length),

            "fwd_packetss":
                float(
                    n_fwd / duration_sec
                ),

            "bwd_packetss":
                float(
                    n_bwd / duration_sec
                ),

            "min_packet_length":
                float(np.min(all_lens)),

            "max_packet_length":
                float(np.max(all_lens)),

            "packet_length_mean":
                all_stats["mean"],

            "packet_length_std":
                all_stats["std"],

            "packet_length_variance":
                float(np.var(all_lens)),

            "fin_flag_count":
                float(fin_count),

            "syn_flag_count":
                float(syn_count),

            "rst_flag_count":
                float(rst_count),

            "psh_flag_count":
                float(psh_count),

            "ack_flag_count":
                float(ack_count),

            "urg_flag_count":
                float(urg_count),

            "cwe_flag_count":
                0.0,

            "ece_flag_count":
                0.0,

            "downup_ratio":
                float(
                    n_bwd / n_fwd
                    if n_fwd > 0
                    else 0.0
                ),

            "average_packet_size":
                float(np.mean(all_lens)),

            "avg_fwd_segment_size":
                float(np.mean(fwd_lens)),

            "avg_bwd_segment_size":
                float(np.mean(bwd_lens)),

            "fwd_header_length.1":
                float(fwd_header_length),

            "fwd_avg_bytes_bulk":
                0.0,

            "fwd_avg_packets_bulk":
                0.0,

            "fwd_avg_bulk_rate":
                0.0,

            "bwd_avg_bytes_bulk":
                0.0,

            "bwd_avg_packets_bulk":
                0.0,

            "bwd_avg_bulk_rate":
                0.0,

            "subflow_fwd_packets":
                float(n_fwd),

            "subflow_fwd_bytes":
                float(total_fwd_bytes),

            "subflow_bwd_packets":
                float(n_bwd),

            "subflow_bwd_bytes":
                float(total_bwd_bytes),

            "init_win_bytes_forward":
                float(init_win_forward),

            "init_win_bytes_backward":
                float(init_win_backward),

            "act_data_pkt_fwd":
                float(active_data_packets),

            "min_seg_size_forward":
                float(min_segment_size),

            "active_mean":
                active_idle["active_mean"],

            "active_std":
                active_idle["active_std"],

            "active_max":
                active_idle["active_max"],

            "active_min":
                active_idle["active_min"],

            "idle_mean":
                active_idle["idle_mean"],

            "idle_std":
                active_idle["idle_std"],

            "idle_max":
                active_idle["idle_max"],

            "idle_min":
                active_idle["idle_min"]
        }


class LiveTrafficMonitor:

    def __init__(
        self,
        interface: str = "auto"
    ):

        self.interface = interface

        self.is_running = False

        self.thread: Optional[
            threading.Thread
        ] = None

        self.active_flows: Dict[
            Tuple[str, str, int, int, str],
            FlowTracker
        ] = {}

        self.completed_flows: List[
            Dict[str, Any]
        ] = []

        self.lock = threading.Lock()

        self.packets_captured = 0
        self.bytes_captured = 0
        self.flows_analyzed = 0

        self.start_time = time.time()

        self.using_fallback = not HAS_SCAPY

        try:
            self.detector = MLDetector()
            self.threat_engine = ThreatEngine()

            self.ml_available = True

            logger.info(
                "ML detector and Threat Engine loaded successfully."
            )

        except Exception as e:

            self.detector = None
            self.threat_engine = None
            self.ml_available = False

            logger.error(
                f"Could not load ML detector or Threat Engine: {e}"
            )

    def start(self):

        if self.is_running:
            return

        self.is_running = True
        self.start_time = time.time()

        self.thread = threading.Thread(
            target=self._run_loop,
            daemon=True
        )

        self.thread.start()

        logger.info(
            f"LiveTrafficMonitor started on interface: {self.interface}"
        )

    def stop(self):

        self.is_running = False

        if (
            self.thread
            and self.thread.is_alive()
        ):
            self.thread.join(timeout=1.0)

        logger.info(
            "LiveTrafficMonitor stopped."
        )

    def _run_loop(self):

        if not HAS_SCAPY:

            self._run_fallback_loop()

            return

        try:

            kwargs = {
                "prn": self._packet_callback,
                "store": False
            }

            if (
                self.interface != "auto"
                and self.interface != "default"
            ):
                kwargs["iface"] = self.interface

            while self.is_running:

                scapy.sniff(
                    timeout=0.5,
                    **kwargs
                )

                self._check_timeouts()

        except Exception as err:

            logger.error(
                f"Live packet capture failed: {err}"
            )

            self.using_fallback = True

            self._run_fallback_loop()

    def _run_fallback_loop(self):

        local_ips = [
            "192.168.1.10",
            "192.168.1.15",
            "10.0.0.5"
        ]

        remote_ips = [
            "8.8.8.8",
            "1.1.1.1",
            "142.250.190.46"
        ]

        while self.is_running:

            time.sleep(
                random.uniform(0.1, 0.4)
            )

            now = time.time()

            src_ip = random.choice(local_ips)
            dst_ip = random.choice(remote_ips)

            src_port = random.randint(
                1024,
                65535
            )

            dst_port = random.choice([
                53,
                80,
                443
            ])

            proto = random.choice([
                "TCP",
                "UDP"
            ])

            key = (
                src_ip,
                dst_ip,
                src_port,
                dst_port,
                proto
            )

            pkt_len = random.randint(
                40,
                1500
            )

            with self.lock:

                self.packets_captured += 1
                self.bytes_captured += pkt_len

                if key not in self.active_flows:

                    self.active_flows[key] = FlowTracker(
                        key,
                        now
                    )

                header_len = (
                    40
                    if proto == "TCP"
                    else 28
                )

                packet = PacketInfo(
                    timestamp=now,
                    src_ip=src_ip,
                    dst_ip=dst_ip,
                    src_port=src_port,
                    dst_port=dst_port,
                    protocol=proto,
                    length=pkt_len,
                    is_fwd=True,
                    tcp_flags=(
                        0x02
                        if proto == "TCP"
                        else 0
                    ),
                    tcp_window=(
                        65535
                        if proto == "TCP"
                        else 0
                    ),
                    header_length=header_len,
                    payload_length=max(
                        0,
                        pkt_len - header_len
                    )
                )

                self.active_flows[key].add_packet(
                    packet
                )

            self._check_timeouts()

    def _packet_callback(self, pkt):

        if not self.is_running:
            return

        if not HAS_SCAPY:
            return

        now = time.time()

        src_ip = None
        dst_ip = None

        src_port = 0
        dst_port = 0

        proto = None

        tcp_flags = 0
        tcp_window = 0

        header_length = 0
        payload_length = 0

        # -------------------------------------------------------------
        # IP ADDRESS EXTRACTION
        # -------------------------------------------------------------

        if pkt.haslayer(IP):

            src_ip = str(pkt[IP].src)
            dst_ip = str(pkt[IP].dst)

            ip_header_length = (
                int(pkt[IP].ihl) * 4
                if pkt[IP].ihl
                else 20
            )

        elif pkt.haslayer(IPv6):

            src_ip = str(pkt[IPv6].src)
            dst_ip = str(pkt[IPv6].dst)

            ip_header_length = 40

        else:
            return

        # -------------------------------------------------------------
        # TCP
        # -------------------------------------------------------------

        if pkt.haslayer(TCP):

            proto = "TCP"

            tcp_layer = pkt[TCP]

            try:
                src_port = int(tcp_layer.sport)
            except Exception:
                src_port = 0

            try:
                dst_port = int(tcp_layer.dport)
            except Exception:
                dst_port = 0

            try:
                tcp_flags = int(tcp_layer.flags)
            except Exception:
                tcp_flags = 0

            try:
                tcp_window = int(tcp_layer.window)
            except Exception:
                tcp_window = 0

            try:
                tcp_header_length = (
                    int(tcp_layer.dataofs) * 4
                    if tcp_layer.dataofs
                    else 20
                )
            except Exception:
                tcp_header_length = 20

            header_length = (
                ip_header_length
                + tcp_header_length
            )

            try:
                payload_length = len(
                    tcp_layer.payload
                )
            except Exception:
                payload_length = 0

        # -------------------------------------------------------------
        # UDP
        # -------------------------------------------------------------

        elif pkt.haslayer(UDP):

            proto = "UDP"

            udp_layer = pkt[UDP]

            try:
                src_port = int(udp_layer.sport)
            except Exception:
                src_port = 0

            try:
                dst_port = int(udp_layer.dport)
            except Exception:
                dst_port = 0

            header_length = (
                ip_header_length + 8
            )

            try:
                payload_length = len(
                    udp_layer.payload
                )
            except Exception:
                payload_length = 0

        else:
            return

        # -------------------------------------------------------------
        # VALIDATION
        # -------------------------------------------------------------

        if not src_ip or not dst_ip:
            return

        if not proto:
            return

        if src_port < 0 or src_port > 65535:
            src_port = 0

        if dst_port < 0 or dst_port > 65535:
            dst_port = 0

        pkt_len = len(pkt)

        # -------------------------------------------------------------
        # FLOW KEY
        # -------------------------------------------------------------

        key = (
            src_ip,
            dst_ip,
            src_port,
            dst_port,
            proto
        )

        reverse_key = (
            dst_ip,
            src_ip,
            dst_port,
            src_port,
            proto
        )

        with self.lock:

            self.packets_captured += 1
            self.bytes_captured += pkt_len

            if key in self.active_flows:

                flow = self.active_flows[key]
                is_fwd = True

            elif reverse_key in self.active_flows:

                flow = self.active_flows[reverse_key]
                is_fwd = False

            else:

                flow = FlowTracker(
                    key,
                    now
                )

                self.active_flows[key] = flow

                is_fwd = True

            packet = PacketInfo(
                timestamp=now,
                src_ip=src_ip,
                dst_ip=dst_ip,
                src_port=src_port,
                dst_port=dst_port,
                protocol=proto,
                length=pkt_len,
                is_fwd=is_fwd,
                tcp_flags=tcp_flags,
                tcp_window=tcp_window,
                header_length=header_length,
                payload_length=payload_length
            )

            flow.add_packet(packet)

            # Debug logging for port verification
            if src_port > 0 or dst_port > 0:

                logger.debug(
                    f"{proto} flow: "
                    f"{src_ip}:{src_port} -> "
                    f"{dst_ip}:{dst_port}"
                )

    def _check_timeouts(self):

        now = time.time()

        finished_keys = []

        with self.lock:

            for key, flow in list(
                self.active_flows.items()
            ):

                if flow.is_finished(
                    now,
                    timeout=2.5
                ):
                    finished_keys.append(key)

            for key in finished_keys:

                flow = self.active_flows.pop(key)

                features = flow.extract_features()

                prediction = "UNKNOWN"
                confidence = 0.0

                if self.ml_available:

                    try:

                        result = self.detector.predict(
                            features
                        )

                        prediction = result["prediction"]
                        confidence = result["confidence"]

                    except Exception as e:

                        logger.error(
                            f"ML prediction failed: {e}"
                        )

                threat_result = {
                    "status": "UNKNOWN",
                    "severity": "LOW",
                    "threat_score": 0,
                    "reasons": []
                }

                if self.threat_engine is not None:

                    try:

                        threat_result = (
                            self.threat_engine.analyze({
                                "src_ip": flow.src_ip,
                                "dst_ip": flow.dst_ip,
                                "src_port": flow.src_port,
                                "dst_port": flow.dst_port,
                                "protocol": flow.protocol,
                                "prediction": prediction,
                                "confidence": confidence,
                                "features": features
                            })
                        )

                    except Exception as e:

                        logger.error(
                            f"Threat analysis failed: {e}"
                        )

                self.flows_analyzed += 1

                # -----------------------------------------------------
                # COMPLETE FLOW RESULT
                # -----------------------------------------------------

                self.completed_flows.append({

                    "key": key,

                    "src_ip": flow.src_ip,
                    "dst_ip": flow.dst_ip,

                    "src_port": int(flow.src_port),
                    "dst_port": int(flow.dst_port),

                    "source": (
                        f"{flow.src_ip}:{flow.src_port}"
                    ),

                    "destination": (
                        f"{flow.dst_ip}:{flow.dst_port}"
                    ),

                    "source_ip": flow.src_ip,
                    "destination_ip": flow.dst_ip,

                    "source_port": int(flow.src_port),
                    "destination_port": int(flow.dst_port),

                    "srcPort": int(flow.src_port),
                    "dstPort": int(flow.dst_port),

                    "protocol": flow.protocol,

                    "timestamp": (
                        pd.Timestamp.fromtimestamp(
                            flow.last_seen
                        ).strftime("%H:%M:%S")
                    ),

                    "features": features,

                    "prediction": prediction,

                    "confidence": confidence,

                    "is_threat": (
                        prediction.upper() != "BENIGN"
                        and prediction.upper() != "NORMAL"
                    ),

                    "threat_status": (
                        threat_result["status"]
                    ),

                    "severity": (
                        threat_result["severity"]
                    ),

                    "threat_score": (
                        threat_result["threat_score"]
                    ),

                    "threat_reasons": (
                        threat_result["reasons"]
                    )
                })

            if len(self.completed_flows) > 500:

                self.completed_flows = (
                    self.completed_flows[-300:]
                )

    def get_pending_completed_flows(self):

        with self.lock:

            result = list(
                self.completed_flows
            )

            self.completed_flows.clear()

            return result

    def get_stats(self):

        with self.lock:

            elapsed = max(
                1.0,
                time.time() - self.start_time
            )

            return {

                "packets_captured":
                    self.packets_captured,

                "bytes_captured":
                    self.bytes_captured,

                "flows_analyzed":
                    self.flows_analyzed,

                "active_flows_count":
                    len(self.active_flows),

                "packets_per_sec":
                    round(
                        self.packets_captured
                        / elapsed,
                        1
                    ),

                "bytes_per_sec":
                    round(
                        self.bytes_captured
                        / elapsed,
                        1
                    ),

                "using_fallback":
                    self.using_fallback,

                "ml_available":
                    self.ml_available
            }