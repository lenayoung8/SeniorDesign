import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function randomMac() {
  return 'XXXXXXXXXXXX'.replace(/X/g, () => '0123456789ABCDEF'[Math.floor(Math.random() * 16)]);
}

function randomIp() {
  return `192.168.1.${Math.floor(Math.random() * 254) + 1}`;
}

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function intToPortBuffer(port) {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(port, 0);
  return b;
}

const deviceTypes = ['Laptop', 'Phone', 'Tablet', 'Smart TV', 'Desktop', 'Printer', 'Security Camera', 'Router'];
const connectionTypes = ['WiFi', 'Ethernet', 'Bluetooth'];
const networks = ['Home Network', 'Guest Network', 'Office Network'];
const ports = [80, 443, 22, 8080, 3000, 5000, 8443, 3306];
const infoOptions = ['Active', 'Idle', 'Scanning', 'Connected', 'Unknown'];

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

const conn = await pool.getConnection();
try {
  await conn.beginTransaction();

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS known_devices (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      ip_address VARCHAR(45),
      mac_address VARCHAR(45),
      type VARCHAR(20),
      connection_type TEXT,
      network TEXT,
      port VARBINARY(4),
      info TEXT,
      is_trusted TINYINT(1) DEFAULT 0
    )
  `);

  // Do not drop the shared table; only append sample rows.
  const sql = `
    INSERT INTO known_devices
      (ip_address, mac_address, type, connection_type, network, port, info, is_trusted)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  for (let i = 0; i < 5; i++) {
    const port = randomFrom(ports);
    await conn.execute(sql, [
      randomIp(),
      randomMac(),
      randomFrom(deviceTypes),
      randomFrom(connectionTypes),
      randomFrom(networks),
      intToPortBuffer(port),
      randomFrom(infoOptions),
      1,
    ]);
  }

  for (let i = 0; i < 3; i++) {
    const port = randomFrom(ports);
    await conn.execute(sql, [
      randomIp(),
      randomMac(),
      randomFrom(deviceTypes),
      randomFrom(connectionTypes),
      randomFrom(networks),
      intToPortBuffer(port),
      randomFrom(infoOptions),
      0,
    ]);
  }

  await conn.commit();
  console.log('Seeded 8 random devices into MySQL known_devices.');
} catch (err) {
  await conn.rollback();
  console.error('Failed to seed devices:', err.message);
  process.exitCode = 1;
} finally {
  conn.release();
  await pool.end();
}
