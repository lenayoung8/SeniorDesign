import express from 'express';
import db from '../db.js';

const router = express.Router();

function normalizeMac(mac) {
  if (!mac) return null;
  return String(mac).replace(/[:\-.]/g, '').toUpperCase();
}

function parseRole(roleValue) {
  const n = Number(roleValue);
  if (Number.isFinite(n)) return n;
  if (String(roleValue).toLowerCase() === 'admin') return 1;
  return 0;
}

function intToPortBuffer(portValue) {
  if (portValue === null || portValue === undefined || portValue === '') {
    return null;
  }
  const port = Number(portValue);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    return null;
  }
  const b = Buffer.alloc(4);
  b.writeUInt32BE(port, 0);
  return b;
}

// GET all devices
router.get('/', async (req, res) => {
  try {
    const devices = await db.query('SELECT * FROM known_devices');
    res.json(devices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET only trusted devices
router.get('/trusted', async (req, res) => {
  try {
    const devices = await db.query(
      'SELECT * FROM known_devices WHERE is_trusted = 1'
    );
    res.json(devices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET only untrusted devices
router.get('/untrusted', async (req, res) => {
  try {
    const devices = await db.query(
      'SELECT * FROM known_devices WHERE is_trusted = 0'
    );
    res.json(devices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Register a new known device (role=1 only)
router.post('/register', async (req, res) => {
  const {
    requester_username,
    ip_address,
    mac_address,
    mac,
    type,
    connection_type,
    network,
    port,
    info,
    trusted,
    is_trusted,
  } = req.body || {};

  if (!requester_username) {
    return res.status(400).json({ success: false, message: 'requester_username is required' });
  }

  const normalizedMac = normalizeMac(mac_address || mac);
  if (!ip_address && !normalizedMac) {
    return res.status(400).json({ success: false, message: 'ip_address or mac_address is required' });
  }

  try {
    const userRows = await db.query(
      'SELECT role FROM user_info WHERE username = ? LIMIT 1',
      [requester_username]
    );
    const user = Array.isArray(userRows) ? userRows[0] : userRows;

    if (!user) {
      return res.status(401).json({ success: false, message: 'Unknown user' });
    }

    if (parseRole(user.role) !== 1) {
      return res.status(403).json({ success: false, message: 'Permission denied: only role=1 can register devices' });
    }

    const trustFlag = (String(is_trusted ?? trusted).toLowerCase() === 'true' || Number(is_trusted ?? trusted) === 1) ? 1 : 0;
    const portBuffer = intToPortBuffer(port);

    const result = await db.query(
      `INSERT INTO known_devices
        (ip_address, mac_address, type, connection_type, network, port, info, is_trusted)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ip_address || null,
        normalizedMac,
        type || null,
        connection_type || null,
        network || null,
        portBuffer,
        info || null,
        trustFlag,
      ]
    );

    const insertedId = result?.insertId ?? result?.lastInsertRowid ?? null;
    return res.status(201).json({ success: true, id: insertedId });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
