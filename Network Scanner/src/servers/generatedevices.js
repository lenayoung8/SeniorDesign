import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database(path.resolve(__dirname, '../../database.db'));

// Helper to generate random MAC address
function randomMAC() {
  return 'XX:XX:XX:XX:XX:XX'.replace(/X/g, () =>
    '0123456789ABCDEF'[Math.floor(Math.random() * 16)]
  );
}

// Helper to generate random IP address
function randomIP() {
  return `192.168.1.${Math.floor(Math.random() * 254) + 1}`;
}

// Helper to pick a random item from an array
function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Clear and recreate known_devices table
db.exec(`
  DROP TABLE IF EXISTS known_devices;
  CREATE TABLE known_devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip_address TEXT,
    mac_address TEXT,
    type TEXT,
    connection_type TEXT,
    network TEXT,
    port INTEGER,
    info TEXT,
    is_trusted INTEGER
  );
`);

const deviceTypes    = ['Laptop', 'Phone', 'Tablet', 'Smart TV', 'Desktop', 'Printer', 'Security Camera', 'Router'];
const connectionTypes = ['WiFi', 'Ethernet', 'Bluetooth'];
const networks       = ['Home Network', 'Guest Network', 'Office Network'];
const ports          = [80, 443, 22, 8080, 3000, 5000, 8443, 3306];
const infoOptions    = ['Active', 'Idle', 'Scanning', 'Connected', 'Unknown'];

const insertDevice = db.prepare(`
  INSERT INTO known_devices 
    (ip_address, mac_address, type, connection_type, network, port, info, is_trusted)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

// Generate 3 trusted devices
for (let i = 0; i < 5; i++) {
  insertDevice.run(
    randomIP(),
    randomMAC(),
    randomFrom(deviceTypes),
    randomFrom(connectionTypes),
    randomFrom(networks),
    randomFrom(ports),
    randomFrom(infoOptions),
    1  // is_trusted = true
  );
}

// Generate 3 untrusted devices
for (let i = 0; i < 3; i++) {
  insertDevice.run(
    randomIP(),
    randomMAC(),
    randomFrom(deviceTypes),
    randomFrom(connectionTypes),
    randomFrom(networks),
    randomFrom(ports),
    randomFrom(infoOptions),
    0  // is_trusted = false
  );
}

console.log('✅ Seeded 6 random devices (3 trusted, 3 untrusted)!');
db.close();