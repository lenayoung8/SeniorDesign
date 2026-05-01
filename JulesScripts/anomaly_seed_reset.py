import os
import pymysql

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "3306"))
DB_USER = os.getenv("DB_USER", "root")
DB_PASS = os.getenv("DB_PASS", "K3viesh4rk!!")
DB_NAME = os.getenv("DB_NAME", "data")

SIM_PREFIX = "SIMULATED_ANOMALY_TRAFFIC_%"


def get_db():
    return pymysql.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASS,
        database=DB_NAME,
        cursorclass=pymysql.cursors.DictCursor,
    )


def reset_simulated_anomalies():
    conn = None
    try:
        conn = get_db()
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM wireshark_scans WHERE info LIKE %s", (SIM_PREFIX,))
            ws_deleted = cursor.rowcount

            cursor.execute("DELETE FROM nmap_scans WHERE info LIKE %s", (SIM_PREFIX,))
            nm_deleted = cursor.rowcount

        conn.commit()
        return {
            "success": True,
            "deleted_wireshark": ws_deleted,
            "deleted_nmap": nm_deleted,
            "message": "Simulated anomaly rows removed.",
        }
    except pymysql.MySQLError as exc:
        if conn:
            conn.rollback()
        return {"success": False, "message": f"Database error: {exc}"}
    finally:
        if conn:
            conn.close()


if __name__ == "__main__":
    print(reset_simulated_anomalies())
