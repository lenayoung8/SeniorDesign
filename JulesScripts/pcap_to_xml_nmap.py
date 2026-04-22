import subprocess
import xml.etree.ElementTree as ET
import pymysql
import os
import shutil
import sys
import getpass
import json
import re

TARGET_IP = os.getenv('NMAP_TARGET', '192.168.1.1')
NMAP_XML_FILE = os.getenv('NMAP_XML_FILE', 'nmap_output.xml')
NMAP_OS_DETECT = os.getenv('NMAP_OS_DETECT', '1') == '1'
DEVICE_TYPE_MAP_FILE = os.getenv('DEVICE_TYPE_MAP_FILE', 'device_type_map.json')
NMAP_PORTS = os.getenv('NMAP_PORTS', '1-1024,1883,8883,5672,5671')
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = int(os.getenv('DB_PORT', '3306'))
DB_USER = os.getenv('DB_USER', 'root')
DB_PASS = os.getenv('DB_PASS', 'K3viesh4rk!!')
DB_NAME = os.getenv('DB_NAME', 'data')


def find_nmap():
    env_path = os.getenv('NMAP_PATH')
    if env_path and os.path.exists(env_path):
        return env_path

    in_path = shutil.which('nmap')
    if in_path:
        return in_path

    common_paths = [
        r'C:\Program Files (x86)\Nmap\nmap.exe',
        r'C:\Program Files\Nmap\nmap.exe',
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

def load_device_type_map():
    if not os.path.exists(DEVICE_TYPE_MAP_FILE):
        return {'ip': {}, 'mac': {}, 'os': {}, 'vendor': {}}

    try:
        with open(DEVICE_TYPE_MAP_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except (OSError, json.JSONDecodeError):
        return {'ip': {}, 'mac': {}, 'os': {}, 'vendor': {}}

    mac_map = {}
    for k, v in data.get('mac', {}).items():
        mac_norm = normalize_mac(k)
        if mac_norm:
            mac_map[mac_norm] = v

    return {
        'ip': data.get('ip', {}),
        'mac': mac_map,
        'os': data.get('os', {}),
        'vendor': data.get('vendor', {}),
    }

def get_device_type_for_host(host_ip, os_name, mac_raw, vendor, type_map):
    if host_ip and host_ip in type_map['ip']:
        return type_map['ip'][host_ip]
    mac_norm = normalize_mac(mac_raw)
    if mac_norm and mac_norm in type_map['mac']:
        return type_map['mac'][mac_norm]
    if vendor and vendor in type_map['vendor']:
        return type_map['vendor'][vendor]
    if os_name and os_name in type_map['os']:
        return type_map['os'][os_name]
    return os_name

def run_nmap_scan(target, xml_file):
    print(f"Starting Nmap scan on {target}...")
    nmap_exe = find_nmap()
    if not nmap_exe:
        print("Error: nmap was not found.")
        print("Install Nmap or set NMAP_PATH to nmap.exe.")
        return False

    # -oX for XML output, -sV for service detection
    # Include MQTT and AMQP ports alongside common ports
    cmd = [nmap_exe, '-oX', xml_file, '-sV', '-p', NMAP_PORTS]
    if NMAP_OS_DETECT:
        cmd.extend(['-O', '--osscan-guess'])
    cmd.append(target)
    
    try:
        result = subprocess.run(cmd, check=True, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if result.stdout.strip():
            print(result.stdout.strip())
        if result.stderr.strip():
            print(f"Nmap warnings: {result.stderr.strip()}")
        print("Scan complete.")
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error running Nmap: {e}")
        if e.stdout:
            print(e.stdout.strip())
        if e.stderr:
            print(e.stderr.strip())
        return False
    except FileNotFoundError as e:
        print(f"Error opening files: {e}")
        return False

def upload_nmap_to_sql(xml_file):
    print("Uploading results to DB...")
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
        
        count = 0
        for host in root.findall('host'):
            # ip logic
            host_ip = None
            mac_raw = None
            vendor = None
            for addr in host.findall('address'):
                if addr.get('addrtype') == 'ipv4':
                    host_ip = addr.get('addr')
                if addr.get('addrtype') == 'mac':
                    mac_raw = addr.get('addr')
                    vendor = addr.get('vendor')
            if not host_ip:
                continue

            if not mac_raw:
                ensure_arp_entry(host_ip)
                mac_raw = lookup_mac_via_arp(host_ip)
            
            os_name = None
            os_elem = host.find('os')
            if os_elem is not None:
                os_match = os_elem.find('osmatch')
                if os_match is not None:
                    os_name = os_match.get('name')

            device_type = get_device_type_for_host(host_ip, os_name, mac_raw, vendor, type_map)
            mac_addr = normalize_mac(mac_raw)

            # port logic
            ports = host.find('ports')
            if ports is None: continue

            for port in ports.findall('port'):
                port_id = port.get('portid')
                protocol = port.get('protocol') # make sure iot protocols are included!
                
                state_elem = port.find('state')
                state = state_elem.get('state') if state_elem is not None else 'unknown'
                
                service_elem = port.find('service')
                service = service_elem.get('name') if service_elem is not None else 'unknown'

                source = TARGET_IP
                destination = f"{host_ip}:{port_id}"
                info = f"state={state}; service={service}"

                query = """
                    INSERT INTO nmap_scans (source, destination, protocol, info, type, mac_addr)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """
                cursor.execute(query, (source, destination, protocol, info, device_type, mac_addr))
                count += 1

        conn.commit()
        print(f"Success! {count} entries added to nmap_scans.")
        return True

    except pymysql.MySQLError as e:
        print(f"Database error: {e}")
        return False
    except ET.ParseError as e:
        print(f"Error parsing Nmap XML: {e}")
        return False
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    scanned = run_nmap_scan(TARGET_IP, NMAP_XML_FILE)
    if not scanned:
        sys.exit(1)

    uploaded = upload_nmap_to_sql(NMAP_XML_FILE)
    if not uploaded:
        sys.exit(1)
