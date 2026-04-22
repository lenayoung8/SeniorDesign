import ipaddress
import os
import re
from flask import Flask, jsonify
import pymysql

app = Flask(__name__)

DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = int(os.getenv('DB_PORT', '3306'))
DB_USER = os.getenv('DB_USER', 'root')
DB_PASS = os.getenv('DB_PASS', 'K3viesh4rk!!')
DB_NAME = os.getenv('DB_NAME', 'data')

WINDOW_MINUTES = int(os.getenv('ANOMALY_WINDOW_MINUTES', '10'))
TRAFFIC_SPIKE_THRESHOLD = int(os.getenv('TRAFFIC_SPIKE_THRESHOLD', '200'))
ALLOWED_NETWORKS_RAW = os.getenv(
    'ALLOWED_NETWORKS',
    '127.0.0.0/8,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16'
)


def get_db():
    return pymysql.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASS,
        database=DB_NAME,
        cursorclass=pymysql.cursors.DictCursor,
    )


def normalize_mac(mac):
    if not mac:
        return None
    return mac.replace(':', '').replace('-', '').replace('.', '').upper()


def parse_ip(value):
    if not value:
        return None
    raw = str(value).strip()
    if not raw:
        return None

    # Direct IP match (IPv4/IPv6)
    try:
        ipaddress.ip_address(raw)
        return raw
    except ValueError:
        pass

    # Handle common "ip:port" format
    if ':' in raw and raw.count(':') == 1:
        candidate = raw.rsplit(':', 1)[0]
        try:
            ipaddress.ip_address(candidate)
            return candidate
        except ValueError:
            pass

    # Last fallback: search for an IPv4 literal in string blobs.
    match = re.search(r'(\d{1,3}(?:\.\d{1,3}){3})', raw)
    if match:
        candidate = match.group(1)
        try:
            ipaddress.ip_address(candidate)
            return candidate
        except ValueError:
            return None
    return None


def parse_allowed_networks():
    networks = []
    for chunk in ALLOWED_NETWORKS_RAW.split(','):
        cidr = chunk.strip()
        if not cidr:
            continue
        try:
            networks.append(ipaddress.ip_network(cidr, strict=False))
        except ValueError:
            continue
    return networks


def get_time_column(cursor, table_name):
    cursor.execute(
        """
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = %s
          AND TABLE_NAME = %s
        """,
        (DB_NAME, table_name),
    )
    cols = {row['COLUMN_NAME'] for row in cursor.fetchall()}
    if 'scan_time' in cols:
        return 'scan_time'
    if 'time' in cols:
        return 'time'
    return None


def fetch_recent_scan_rows(cursor, table_name, time_col):
    query = f"""
        SELECT source, destination, protocol, mac_addr, info, {time_col} AS event_time
        FROM {table_name}
        WHERE {time_col} >= DATE_SUB(NOW(), INTERVAL %s MINUTE)
    """
    cursor.execute(query, (WINDOW_MINUTES,))
    return cursor.fetchall()


def load_known_devices(cursor):
    cursor.execute("SELECT ip_address, mac_address FROM known_devices")
    rows = cursor.fetchall()
    known_ips = set()
    known_macs = set()
    for row in rows:
        ip_value = parse_ip(row.get('ip_address'))
        mac_value = normalize_mac(row.get('mac_address'))
        if ip_value:
            known_ips.add(ip_value)
        if mac_value:
            known_macs.add(mac_value)
    return known_ips, known_macs


def detect_anomalies():
    conn = None
    try:
        conn = get_db()
        with conn.cursor() as cursor:
            known_ips, known_macs = load_known_devices(cursor)
            allowed_networks = parse_allowed_networks()

            wireshark_time = get_time_column(cursor, 'wireshark_scans')
            nmap_time = get_time_column(cursor, 'nmap_scans')

            events = []
            if wireshark_time:
                events.extend(fetch_recent_scan_rows(cursor, 'wireshark_scans', wireshark_time))
            if nmap_time:
                events.extend(fetch_recent_scan_rows(cursor, 'nmap_scans', nmap_time))

            anomalies = []
            seen_unknown_devices = set()
            seen_unknown_destinations = set()

            for event in events:
                src_ip = parse_ip(event.get('source'))
                dst_ip = parse_ip(event.get('destination'))
                mac = normalize_mac(event.get('mac_addr'))

                # 1) Unknown device attempted to connect
                is_known_ip = src_ip in known_ips if src_ip else False
                is_known_mac = mac in known_macs if mac else False
                if not is_known_ip and not is_known_mac:
                    key = (src_ip or '', mac or '')
                    if key not in seen_unknown_devices:
                        seen_unknown_devices.add(key)
                        anomalies.append({
                            'kind': 'unknown_device',
                            'severity': 'high',
                            'source_ip': src_ip,
                            'mac_addr': mac,
                            'message': 'Unknown device connection attempt detected.',
                        })

                # 2) Device contacting unknown external IP
                if dst_ip:
                    in_known_ips = dst_ip in known_ips
                    in_allowed_network = False
                    try:
                        dst_obj = ipaddress.ip_address(dst_ip)
                        in_allowed_network = any(dst_obj in net for net in allowed_networks)
                    except ValueError:
                        pass
                    same_as_source = src_ip == dst_ip if src_ip and dst_ip else False

                    if not in_known_ips and not in_allowed_network and not same_as_source:
                        key = (src_ip or '', dst_ip)
                        if key not in seen_unknown_destinations:
                            seen_unknown_destinations.add(key)
                            anomalies.append({
                                'kind': 'unknown_destination_ip',
                                'severity': 'medium',
                                'source_ip': src_ip,
                                'destination_ip': dst_ip,
                                'message': 'Device attempted to contact an unknown IP outside known devices/network.',
                            })

            # 3) High traffic spike check
            packet_count = len(events)
            if packet_count > TRAFFIC_SPIKE_THRESHOLD:
                anomalies.append({
                    'kind': 'traffic_spike',
                    'severity': 'high',
                    'packet_count': packet_count,
                    'threshold': TRAFFIC_SPIKE_THRESHOLD,
                    'window_minutes': WINDOW_MINUTES,
                    'message': 'Traffic spike detected.',
                })

            return {
                'success': True,
                'window_minutes': WINDOW_MINUTES,
                'packet_count': packet_count,
                'anomaly_count': len(anomalies),
                'anomalies': anomalies,
            }, 200
    except pymysql.MySQLError:
        return {
            'success': False,
            'message': 'Database error while running anomaly checks.',
            'anomalies': [],
        }, 500
    finally:
        if conn:
            conn.close()


@app.get('/anomalies')
def anomalies_endpoint():
    payload, status = detect_anomalies()
    return jsonify(payload), status


if __name__ == '__main__':
    result, status_code = detect_anomalies()
    print(result)
    app.run(host='0.0.0.0', port=5002, debug=False)
