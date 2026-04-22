import subprocess
import xml.etree.ElementTree as ET
import pymysql
import os
import shutil
import sys
import getpass
import json
import re

# File config
PCAP_FILE = 'test.pcap'
XML_FILE = 'output_capture.xml'
DEVICE_TYPE_MAP_FILE = os.getenv('DEVICE_TYPE_MAP_FILE', 'device_type_map.json')
AUTO_CAPTURE = os.getenv('AUTO_CAPTURE', '1') == '1'
CAPTURE_INTERFACE = os.getenv('CAPTURE_INTERFACE', '')
CAPTURE_SECONDS = int(os.getenv('CAPTURE_SECONDS', '15'))
CAPTURE_PACKET_COUNT = int(os.getenv('CAPTURE_PACKET_COUNT', '0'))
MQTT_PORTS = {1883, 8883}
AMQP_PORTS = {5672, 5671}

# Database config
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = int(os.getenv('DB_PORT', '3306'))
DB_USER = os.getenv('DB_USER', 'root')
DB_PASS = os.getenv('DB_PASS', 'K3viesh4rk!!')
DB_NAME = os.getenv('DB_NAME', 'data')

def find_tshark():
    env_path = os.getenv('TSHARK_PATH')
    if env_path and os.path.exists(env_path):
        return env_path

    in_path = shutil.which('tshark')
    if in_path:
        return in_path

    common_paths = [
        r'C:\Program Files\Wireshark\tshark.exe',
        r'C:\Program Files (x86)\Wireshark\tshark.exe',
    ]
    for path in common_paths:
        if os.path.exists(path):
            return path

    return None

def normalize_mac(mac):
    if not mac:
        return None
    return mac.replace(':', '').replace('-', '').replace('.', '').upper()

def lookup_mac_via_arp(host_ip):
    try:
        result = subprocess.run(
            ['arp', '-a', host_ip],
            check=True,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
    except subprocess.CalledProcessError:
        return None

    match = re.search(r'([0-9A-Fa-f]{2}[-:]){5}[0-9A-Fa-f]{2}', result.stdout)
    if match:
        return match.group(0)
    return None

def ensure_arp_entry(host_ip):
    try:
        subprocess.run(
            ['ping', '-n', '1', '-w', '1000', host_ip],
            check=False,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
    except Exception:
        return

def get_default_interface(tshark_exe):
    try:
        result = subprocess.run([tshark_exe, '-D'], check=True, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        for line in result.stdout.splitlines():
            line = line.strip()
            if not line:
                continue
            if "Loopback" in line:
                continue
            if '.' in line:
                return line.split('.', 1)[0].strip()
    except subprocess.CalledProcessError:
        return None
    return None

def capture_pcap(tshark_exe, pcap_file):
    iface = CAPTURE_INTERFACE or get_default_interface(tshark_exe)
    if not iface:
        print("Error: no capture interface found. Set CAPTURE_INTERFACE to a valid tshark interface.")
        return False

    cmd = [tshark_exe, '-i', iface, '-w', pcap_file]
    if CAPTURE_PACKET_COUNT > 0:
        cmd.extend(['-c', str(CAPTURE_PACKET_COUNT)])
    else:
        cmd.extend(['-a', f'duration:{CAPTURE_SECONDS}'])

    try:
        print(f"Capturing packets on interface {iface}...")
        subprocess.run(cmd, check=True, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        print(f"Capture complete. Saved to {pcap_file}.")
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error capturing packets: {e}")
        if e.stderr:
            print(f"tshark stderr: {e.stderr.strip()}")
        return False

def load_device_type_map():
    if not os.path.exists(DEVICE_TYPE_MAP_FILE):
        return {'ip': {}, 'mac': {}, 'vendor': {}}

    try:
        with open(DEVICE_TYPE_MAP_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except (OSError, json.JSONDecodeError):
        return {'ip': {}, 'mac': {}, 'vendor': {}}

    mac_map = {}
    for k, v in data.get('mac', {}).items():
        mac_norm = normalize_mac(k)
        if mac_norm:
            mac_map[mac_norm] = v

    vendor_map = data.get('vendor', {})
    vendor_lower = {k.lower(): v for k, v in vendor_map.items()}

    return {
        'ip': data.get('ip', {}),
        'mac': mac_map,
        'vendor': vendor_map,
        'vendor_lower': vendor_lower,
    }

def resolve_vendor_type(vendor, type_map):
    if not vendor:
        return None
    vendor_key = vendor.split('_', 1)[0]
    vendor_lower = vendor.lower()
    vendor_key_lower = vendor_key.lower()
    if vendor in type_map['vendor']:
        return type_map['vendor'][vendor]
    if vendor_key in type_map['vendor']:
        return type_map['vendor'][vendor_key]
    if vendor_lower in type_map['vendor_lower']:
        return type_map['vendor_lower'][vendor_lower]
    if vendor_key_lower in type_map['vendor_lower']:
        return type_map['vendor_lower'][vendor_key_lower]
    return vendor_key

def get_device_type_for_packet(packet, type_map, src_ip, dst_ip, mac_raw):
    if src_ip and src_ip in type_map['ip']:
        return type_map['ip'][src_ip]
    if dst_ip and dst_ip in type_map['ip']:
        return type_map['ip'][dst_ip]

    mac_norm = normalize_mac(mac_raw)
    if mac_norm and mac_norm in type_map['mac']:
        return type_map['mac'][mac_norm]

    eth_proto = packet.find(".//proto[@name='eth']")
    if eth_proto is not None:
        mac_elem = eth_proto.find("field[@name='eth.src']")
        mac = mac_elem.get('show') if mac_elem is not None else None
        mac_norm = normalize_mac(mac)
        if mac_norm and mac_norm in type_map['mac']:
            return type_map['mac'][mac_norm]

        for field_name in (
            "field[@name='eth.src.oui_resolved']",
            "field[@name='eth.dst.oui_resolved']",
            "field[@name='eth.addr.oui_resolved']",
            "field[@name='eth.src_resolved']",
            "field[@name='eth.dst_resolved']",
            "field[@name='eth.addr_resolved']",
        ):
            vendor_elem = eth_proto.find(field_name)
            vendor = vendor_elem.get('show') if vendor_elem is not None else None
            vendor_type = resolve_vendor_type(vendor, type_map)
            if vendor_type:
                return vendor_type

    wlan_proto = packet.find(".//proto[@name='wlan']")
    if wlan_proto is not None:
        mac_elem = wlan_proto.find("field[@name='wlan.ta']")
        mac = mac_elem.get('show') if mac_elem is not None else None
        mac_norm = normalize_mac(mac)
        if mac_norm and mac_norm in type_map['mac']:
            return type_map['mac'][mac_norm]

        for field_name in (
            "field[@name='wlan.ta.oui_resolved']",
            "field[@name='wlan.ra.oui_resolved']",
            "field[@name='wlan.sa.oui_resolved']",
            "field[@name='wlan.da.oui_resolved']",
            "field[@name='wlan.bssid.oui_resolved']",
            "field[@name='wlan.ta_resolved']",
            "field[@name='wlan.ra_resolved']",
            "field[@name='wlan.sa_resolved']",
            "field[@name='wlan.da_resolved']",
            "field[@name='wlan.bssid_resolved']",
        ):
            vendor_elem = wlan_proto.find(field_name)
            vendor = vendor_elem.get('show') if vendor_elem is not None else None
            vendor_type = resolve_vendor_type(vendor, type_map)
            if vendor_type:
                return vendor_type

    return None

def detect_app_protocol(packet):
    tcp_proto = packet.find(".//proto[@name='tcp']")
    if tcp_proto is None:
        return None
    src_port_elem = tcp_proto.find("field[@name='tcp.srcport']")
    dst_port_elem = tcp_proto.find("field[@name='tcp.dstport']")
    try:
        src_port = int(src_port_elem.get('show')) if src_port_elem is not None else None
        dst_port = int(dst_port_elem.get('show')) if dst_port_elem is not None else None
    except (TypeError, ValueError):
        return None

    ports = {p for p in (src_port, dst_port) if p is not None}
    if ports & MQTT_PORTS:
        return 'mqtt'
    if ports & AMQP_PORTS:
        return 'amqp'
    return None

def convert_pcap_to_xml(pcap_file, xml_file):
    print(f"Converting {pcap_file} to XML...")
    tshark_exe = find_tshark()
    if not tshark_exe:
        print("Error: tshark was not found.")
        print("Install Wireshark/tshark or set TSHARK_PATH to tshark.exe.")
        return False

    # Use tshark to convert to PDML
    cmd = [tshark_exe, '-r', pcap_file, '-T', 'pdml']

    try:
        with open(xml_file, 'w', encoding='utf-8') as f:
            result = subprocess.run(cmd, stdout=f, stderr=subprocess.PIPE, check=True, text=True)
        if result.stderr:
            print(f"tshark warnings: {result.stderr.strip()}")
        print("XML conversion successful.")
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error running tshark: {e}")
        if e.stderr:
            print(f"tshark stderr: {e.stderr.strip()}")
        return False
    except FileNotFoundError as e:
        print(f"Error opening files: {e}")
        return False

def upload_xml_to_sql(xml_file):
    print("Uploading to MySQL...")
    if not os.path.exists(xml_file):
        print(f"Error: XML file not found: {xml_file}")
        return False

    conn = None
    try:
        password = DB_PASS if DB_PASS else getpass.getpass(f"MySQL password for '{DB_USER}' (leave blank if none): ")
        conn = pymysql.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=password,
            database=DB_NAME,
        )
        cursor = conn.cursor()
        
        tree = ET.parse(xml_file)
        root = tree.getroot()
        type_map = load_device_type_map()
        arp_cache = {}

        count = 0
        for packet in root.findall('packet'):
            try:
                ip_proto = packet.find(".//proto[@name='ip']")
                
                if ip_proto is not None:
                    # Extract attributes 
                    src_elem = ip_proto.find("field[@name='ip.src']")
                    dst_elem = ip_proto.find("field[@name='ip.dst']")
                    proto_elem = ip_proto.find("field[@name='ip.proto']")
                    
                    src_ip = src_elem.get('show') if src_elem is not None else None
                    dst_ip = dst_elem.get('show') if dst_elem is not None else None

                    ip_protocol = proto_elem.get('show') if proto_elem is not None else None
                    mac_raw = None
                    eth_proto = packet.find(".//proto[@name='eth']")
                    if eth_proto is not None:
                        mac_elem = eth_proto.find("field[@name='eth.src']")
                        mac_raw = mac_elem.get('show') if mac_elem is not None else None
                    if not mac_raw:
                        wlan_proto = packet.find(".//proto[@name='wlan']")
                        if wlan_proto is not None:
                            mac_elem = wlan_proto.find("field[@name='wlan.ta']")
                            mac_raw = mac_elem.get('show') if mac_elem is not None else None
                    if not mac_raw:
                        for ip in (src_ip, dst_ip):
                            if not ip:
                                continue
                            if ip not in arp_cache:
                                ensure_arp_entry(ip)
                                arp_cache[ip] = lookup_mac_via_arp(ip)
                            if arp_cache[ip]:
                                mac_raw = arp_cache[ip]
                                break
                    mac_addr = normalize_mac(mac_raw)

                    device_type = get_device_type_for_packet(packet, type_map, src_ip, dst_ip, mac_raw)
                    app_protocol = detect_app_protocol(packet)
                    protocol = app_protocol if app_protocol else ip_protocol

                    if src_ip and dst_ip:
                        query = "INSERT INTO wireshark_scans (source, destination, protocol, type, mac_addr) VALUES (%s, %s, %s, %s, %s)"
                        cursor.execute(query, (src_ip, dst_ip, protocol, device_type, mac_addr))
                        count += 1
                        
            except Exception as e:
                print(f"Skipping malformed packet: {e}")
                continue

        conn.commit()
        print(f"Success! {count} packets uploaded.")
        return True

    except pymysql.MySQLError as e:
        print(f"Database error: {e}")
        return False
    except ET.ParseError:
        print("Error parsing the generated XML file.")
        return False
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    tshark_exe = find_tshark()
    if not tshark_exe:
        print("Error: tshark was not found.")
        print("Install Wireshark/tshark or set TSHARK_PATH to tshark.exe.")
        sys.exit(1)

    if AUTO_CAPTURE:
        captured = capture_pcap(tshark_exe, PCAP_FILE)
        if not captured:
            sys.exit(1)
        converted = convert_pcap_to_xml(PCAP_FILE, XML_FILE)
    elif os.path.exists(PCAP_FILE):
        converted = convert_pcap_to_xml(PCAP_FILE, XML_FILE)
    else:
        print(f"CRITICAL ERROR: Python cannot find the file named '{PCAP_FILE}' in this folder.")
        print("Check your spelling and file extensions!")
        sys.exit(1)

    if converted:
        uploaded = upload_xml_to_sql(XML_FILE)
        if uploaded:
            print(f"Done. XML saved at: {XML_FILE}")
        else:
            sys.exit(1)
    else:
        sys.exit(1)
