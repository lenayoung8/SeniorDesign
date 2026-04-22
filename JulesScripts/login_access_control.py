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

def get_db():
    return pymysql.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASS,
        database=DB_NAME,
        cursorclass=pymysql.cursors.DictCursor,
    )

def verify_password(input_password, stored_password):
    if stored_password is None:
        return False
    if stored_password == input_password:
        return True
    try:
        import bcrypt  # optional
        if stored_password.startswith('$2'):
            return bcrypt.checkpw(
                input_password.encode('utf-8'),
                stored_password.encode('utf-8')
            )
    except Exception:
        return False
    return False

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

def authenticate_user(cursor, username, password):
    cursor.execute(
        "SELECT username, password, role, is_owner FROM user_info WHERE username = %s LIMIT 1",
        (username,),
    )
    row = cursor.fetchone()
    if not row:
        return None
    if not verify_password(password, row.get('password')):
        return None
    return row

def parse_role(role_value):
    try:
        return int(str(role_value).strip())
    except (TypeError, ValueError):
        return 0

@app.post('/login')
def login():
    payload = request.get_json(silent=True) or request.form

    username = (payload.get('username') or payload.get('user_name') or '').strip()
    password = payload.get('password') or ''

    if not username or not password:
        return jsonify({'success': False, 'message': 'Username and password are required'}), 400

    conn = None
    try:
        conn = get_db()
        with conn.cursor() as cursor:
            row = authenticate_user(cursor, username, password)

        if row:
            return jsonify({'success': True, 'redirect': '/home', 'role': parse_role(row.get('role'))}), 200

        return jsonify({'success': False, 'message': 'Invalid username or password'}), 401
    except pymysql.MySQLError:
        return jsonify({'success': False, 'message': 'Database error'}), 500
    finally:
        if conn:
            conn.close()

@app.post('/edit_known_device')
def edit_known_device():
    payload = request.get_json(silent=True) or request.form

    username = (payload.get('username') or payload.get('user_name') or '').strip()
    password = payload.get('password') or ''
    device_id = payload.get('device_id')

    if not username or not password or device_id in (None, ''):
        return jsonify({'success': False, 'message': 'username, password, and device_id are required'}), 400

    try:
        device_id = int(device_id)
    except (TypeError, ValueError):
        return jsonify({'success': False, 'message': 'device_id must be an integer'}), 400

    updates = {}
    if isinstance(payload.get('updates'), dict):
        updates.update(payload.get('updates'))
    for key in ('ip_address', 'mac_address', 'type', 'connection_type', 'network', 'port', 'info', 'is_trusted'):
        if key in payload:
            updates[key] = payload.get(key)

    if not updates:
        return jsonify({'success': False, 'message': 'No update fields were provided'}), 400

    conn = None
    try:
        conn = get_db()
        with conn.cursor() as cursor:
            user_row = authenticate_user(cursor, username, password)
            if not user_row:
                return jsonify({'success': False, 'message': 'Invalid username or password'}), 401

            # role = 0 => normal user; block all known_devices edits.
            if parse_role(user_row.get('role')) == 0:
                return jsonify({'success': False, 'message': 'Permission denied: user role cannot edit devices'}), 403

            allowed_fields = {'ip_address', 'mac_address', 'type', 'connection_type', 'network', 'port', 'info', 'is_trusted'}
            set_parts = []
            values = []

            for key, value in updates.items():
                if key not in allowed_fields:
                    continue
                if key == 'mac_address':
                    value = normalize_mac(value)
                elif key == 'port':
                    value = parse_port(value)
                elif key == 'is_trusted':
                    value = 1 if str(value).lower() in ('1', 'true', 'yes', 'on') else 0
                set_parts.append(f"{key} = %s")
                values.append(value)

            if not set_parts:
                return jsonify({'success': False, 'message': 'No valid fields to update'}), 400

            values.append(device_id)
            cursor.execute(
                f"UPDATE known_devices SET {', '.join(set_parts)} WHERE id = %s",
                tuple(values),
            )
            if cursor.rowcount == 0:
                return jsonify({'success': False, 'message': 'Device not found'}), 404

        conn.commit()
        return jsonify({'success': True}), 200
    except pymysql.MySQLError:
        if conn:
            conn.rollback()
        return jsonify({'success': False, 'message': 'Database error'}), 500
    finally:
        if conn:
            conn.close()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=False)
