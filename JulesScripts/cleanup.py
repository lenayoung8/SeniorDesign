import pymysql
from datetime import datetime
import os

DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': int(os.getenv('DB_PORT', '3306')),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASS', 'K3viesh4rk!!'),
    'database': os.getenv('DB_NAME', 'data')
}

MONTHS_TO_KEEP = 3

TABLES_TO_CLEAN = {
    'wireshark_scans': 'time',
    'nmap_scans': 'scan_time' 
}

def delete_old_records():
    print(f"--- Starting Cleanup: {datetime.now()} ---")
    
    conn = None
    try:
        conn = pymysql.connect(**DB_CONFIG)
        cursor = conn.cursor()

        for table, time_col in TABLES_TO_CLEAN.items():
            print(f"Checking table '{table}'...")
            query = f"DELETE FROM {table} WHERE {time_col} < NOW() - INTERVAL %s MONTH"
            
            cursor.execute(query, (MONTHS_TO_KEEP,))
            deleted_count = cursor.rowcount
            
            print(f"  - Deleted {deleted_count} rows from '{table}' older than {MONTHS_TO_KEEP} months.")

        conn.commit()
        print("Cleanup completed successfully.")

    except pymysql.MySQLError as e:
        print(f"Error during database operation: {e}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    delete_old_records()
