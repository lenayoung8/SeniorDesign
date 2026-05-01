import os
import random
import string
import pymysql

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "3306"))
DB_USER = os.getenv("DB_USER", "root")
DB_PASS = os.getenv("DB_PASS", "K3viesh4rk!!")
DB_NAME = os.getenv("DB_NAME", "data")

SPIKE_COUNT = int(os.getenv("ANOMALY_SEED_SPIKE_COUNT", "220"))


def get_db():
    return pymysql.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASS,
        database=DB_NAME,
        cursorclass=pymysql.cursors.DictCursor,
    )


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
    cols = {row["COLUMN_NAME"] for row in cursor.fetchall()}
    if "scan_time" in cols:
        return "scan_time"
    if "time" in cols:
        return "time"
    return None


def random_mac():
    chars = string.hexdigits.upper()
    return "".join(random.choice(chars[:16]) for _ in range(12))


def insert_seed_rows(cursor, table_name, time_col):
    sql = f"""
        INSERT INTO {table_name}
        (source, destination, protocol, info, mac_addr, {time_col})
        VALUES (%s, %s, %s, %s, %s, NOW())
    """

    inserted = 0
    for i in range(SPIKE_COUNT):
        src = f"10.255.255.{(i % 200) + 1}"  # not usually in known_devices
        dst = f"203.0.113.{(i % 200) + 1}"   # external test net IP (unknown)
        proto = "MQTT" if i % 2 == 0 else "AMQP"
        info = f"SIMULATED_ANOMALY_TRAFFIC_{i + 1}"
        mac = random_mac()
        cursor.execute(sql, (src, dst, proto, info, mac))
        inserted += 1
    return inserted


def seed_anomaly_data():
    conn = None
    try:
        conn = get_db()
        with conn.cursor() as cursor:
            w_time = get_time_column(cursor, "wireshark_scans")
            n_time = get_time_column(cursor, "nmap_scans")

            inserted_w = 0
            inserted_n = 0

            if w_time:
                inserted_w = insert_seed_rows(cursor, "wireshark_scans", w_time)
            if n_time:
                # Add a smaller count to nmap_scans too for realism.
                global SPIKE_COUNT
                original = SPIKE_COUNT
                SPIKE_COUNT = max(20, original // 4)
                inserted_n = insert_seed_rows(cursor, "nmap_scans", n_time)
                SPIKE_COUNT = original

        conn.commit()
        return {
            "success": True,
            "inserted_wireshark": inserted_w,
            "inserted_nmap": inserted_n,
            "message": "Anomaly simulation data inserted successfully.",
        }
    except pymysql.MySQLError as exc:
        if conn:
            conn.rollback()
        return {"success": False, "message": f"Database error: {exc}"}
    finally:
        if conn:
            conn.close()


if __name__ == "__main__":
    print(seed_anomaly_data())
