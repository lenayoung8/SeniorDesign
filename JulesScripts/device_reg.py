import os
import struct
from flask import Flask, request, jsonify
import pymysql

app = Flask(__name__)

DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = int(os.getenv('DB_PORT', '3306'))
DB_USER = os.getenv('DB_USER', 'root')
DB_PASS = os.getenv('DB_PASS', 'K3viesh4rk!!')
DB_NAME = os.getenv('DB_NAME', 'data')

def normalize_mac(mac):
    if not mac:
        return None
    return mac.replace(':', '').replace('-', '').replace('.', '').upper()

def parse_port(port_value):
    if port_value in (None, ''):
        return None
    try:
        port_int = int(port_value)
    except (TypeError, ValueError):
        return None
    if port_int < 0 or port_int > 65535:
        return None
    return struct.pack('!I', port_int)

def get_db():
    return pymysql.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASS,
        database=DB_NAME,
        cursorclass=pymysql.cursors.DictCursor,
    )

@app.post('/register_device')
def register_device():
    payload = request.get_json(silent=True) or request.form

    ip_address = (payload.get('ip_address') or '').strip()
    mac_address = normalize_mac(payload.get('mac_address') or payload.get('mac') or '')
    device_type = (payload.get('type') or '').strip()
    connection_type = (payload.get('connection_type') or '').strip()
    network = (payload.get('network') or '').strip()
    port = parse_port(payload.get('port'))
    info = (payload.get('info') or payload.get('notes') or '').strip()

    if not ip_address and not mac_address:
        return jsonify({'success': False, 'message': 'ip_address or mac_address is required'}), 400

    conn = None
    try:
        conn = get_db()
        with conn.cursor() as cursor:
            # Uniqueness check on all provided fields (ignoring id, is_trusted)
            cursor.execute(
                """
                SELECT id FROM known_devices
                WHERE ip_address = %s
                  AND mac_address = %s
                  AND type = %s
                  AND connection_type = %s
                  AND network = %s
                  AND (port <=> %s)
                  AND info = %s
                LIMIT 1
                """,
                (ip_address, mac_address, device_type, connection_type, network, port, info),
            )
            if cursor.fetchone():
                return jsonify({'success': False, 'message': 'Device already registered'}), 409

            cursor.execute(
                """
                INSERT INTO known_devices
                    (ip_address, mac_address, type, connection_type, network, port, info, is_trusted)
                VALUES
                    (%s, %s, %s, %s, %s, %s, %s, 1)
                """,
                (ip_address, mac_address, device_type, connection_type, network, port, info),
            )
        conn.commit()
        return jsonify({'success': True}), 201
    except pymysql.MySQLError:
        if conn:
            conn.rollback()
        return jsonify({'success': False, 'message': 'Database error'}), 500
    finally:
        if conn:
            conn.close()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
