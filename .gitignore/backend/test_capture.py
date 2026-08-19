from scapy.all import sniff

print("Starting REAL network packet capture...")
print("Press Ctrl+C to stop.\n")

def packet_callback(packet):
    print(packet.summary())

sniff(prn=packet_callback, store=False)
