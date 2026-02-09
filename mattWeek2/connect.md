# Connect?

## Nmap (Active)

- Run scans on request  
- Sends packets → probes network  
- Returns:
  - IPs
  - MACs
  - Open ports
  - Device discovery  

**Question answered:**  
> "What devices exist?"

---

## Wireshark / Tshark (Passive)

- Listens to traffic  
- No probing  
- Captures packets in flow  
- Returns:
  - Traffic patterns
  - Protocols
  - Anomalies  

**Question answered:**  
> "What are devices doing?"

# How run? 

## Monitor Mode? (i think NO)

- cant stay connected while capturing
- Most laptops dont support it
- OS/Driver dependent
- Messy development
- Hard to parse traffic

## Capture on router (yes!?)

- Rapsberry Pi 4 (matt's choice)
- OpenWRT

# How ???

## setup in a room (build mini network)

- Raz pi 4
- network devices (laptop, printer, whatev for demo)
- router NAT / pi gateway + capture
- dashboard
