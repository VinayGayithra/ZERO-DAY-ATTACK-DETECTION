from scapy.all import sniff

print("Starting live packet capture...")
print("Browse the internet now...")
print("Press Ctrl+C to stop.\n")

def packet_callback(packet):
    print(packet.summary())

sniff(iface="Realtek RTL8852BE WiFi 6 802.11ax PCIe Adapter",
      prn=packet_callback,
      store=False)