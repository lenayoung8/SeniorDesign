import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import db from '../db.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const scriptsDir = path.resolve(__dirname, '../../../../JulesScripts');

function runPython(args, extraEnv = {}, timeoutMs = 10 * 60 * 1000) {
  return new Promise((resolve, reject) => {
    execFile(
      'python',
      args,
      {
        cwd: scriptsDir,
        env: { ...process.env, ...extraEnv },
        timeout: timeoutMs,
      },
      (error, stdout, stderr) => {
        if (error) {
          reject({ message: error.message, stdout: stdout || '', stderr: stderr || '' });
          return;
        }
        resolve({ stdout: stdout || '', stderr: stderr || '' });
      }
    );
  });
}

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

function ipToCidr24(ip) {
  if (!ip || !String(ip).includes('.')) return null;
  const parts = String(ip).split('.');
  if (parts.length !== 4) return null;
  if (parts.some((p) => Number.isNaN(Number(p)))) return null;
  return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
}

async function ensureAccessTables() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS known_networks (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      network_cidr VARCHAR(64) NOT NULL UNIQUE,
      can_connect TINYINT(1) DEFAULT 1,
      info TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  try {
    await db.query('ALTER TABLE known_devices ADD COLUMN can_connect TINYINT(1) DEFAULT 1');
  } catch {
    // Ignore if column already exists.
  }
}

async function upsertKnownDevice({ sourceIp, macAddr, canConnect, infoText }) {
  if (!sourceIp && !macAddr) return null;

  const rows = await db.query(
    `SELECT id FROM known_devices
     WHERE (ip_address = ? AND ? IS NOT NULL)
        OR (mac_address = ? AND ? IS NOT NULL)
     LIMIT 1`,
    [sourceIp, sourceIp, macAddr, macAddr]
  );
  const existing = Array.isArray(rows) ? rows[0] : rows;

  if (existing?.id) {
    await db.query(
      `UPDATE known_devices
       SET ip_address = COALESCE(?, ip_address),
           mac_address = COALESCE(?, mac_address),
           can_connect = ?,
           info = COALESCE(?, info)
       WHERE id = ?`,
      [sourceIp, macAddr, canConnect, infoText, existing.id]
    );
    return existing.id;
  }

  const result = await db.query(
    `INSERT INTO known_devices
      (ip_address, mac_address, type, connection_type, network, port, info, is_trusted, can_connect)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      sourceIp || null,
      macAddr || null,
      'Unknown',
      'Unknown',
      sourceIp ? ipToCidr24(sourceIp) : null,
      null,
      infoText || null,
      0,
      canConnect,
    ]
  );
  return result?.insertId ?? result?.lastInsertRowid ?? null;
}

async function upsertKnownNetwork({ networkCidr, canConnect, infoText }) {
  if (!networkCidr) return null;
  const rows = await db.query('SELECT id FROM known_networks WHERE network_cidr = ? LIMIT 1', [networkCidr]);
  const existing = Array.isArray(rows) ? rows[0] : rows;
  if (existing?.id) {
    await db.query('UPDATE known_networks SET can_connect = ?, info = COALESCE(?, info) WHERE id = ?', [canConnect, infoText, existing.id]);
    return existing.id;
  }
  const result = await db.query(
    'INSERT INTO known_networks (network_cidr, can_connect, info) VALUES (?, ?, ?)',
    [networkCidr, canConnect, infoText || null]
  );
  return result?.insertId ?? result?.lastInsertRowid ?? null;
}

async function findTopTalker() {
  const rows = await db.query(`
    SELECT source, destination, COUNT(*) AS packet_count
    FROM wireshark_scans
    WHERE time >= DATE_SUB(NOW(), INTERVAL 10 MINUTE)
    GROUP BY source, destination
    ORDER BY packet_count DESC
    LIMIT 1
  `);
  const top = Array.isArray(rows) ? rows[0] : rows;
  return top || null;
}

async function requireAdmin(username) {
  const rows = await db.query('SELECT role FROM user_info WHERE username = ? LIMIT 1', [username]);
  const user = Array.isArray(rows) ? rows[0] : rows;
  if (!user) return { ok: false, status: 401, message: 'Unknown user' };
  if (parseRole(user.role) !== 1) return { ok: false, status: 403, message: 'Only role=1 admins can take anomaly actions' };
  return { ok: true };
}

router.get('/status', (req, res) => {
  res.json({
    success: true,
    scriptsDir,
    endpoints: [
      'GET /api/jules/status',
      'GET /api/jules/anomalies',
      'POST /api/jules/anomalies/action',
      'POST /api/jules/simulate/anomalies',
      'POST /api/jules/cleanup',
      'POST /api/jules/run/nmap',
      'POST /api/jules/run/wireshark',
    ],
  });
});

router.get('/anomalies', async (req, res) => {
  try {
    const py = `
import json
import anomaly_detection as a
payload, status = a.detect_anomalies()
print(json.dumps({"status": status, "payload": payload}))
`;
    const { stdout } = await runPython(['-c', py], {}, 60 * 1000);
    const lines = stdout.trim().split(/\r?\n/).filter(Boolean);
    const last = lines[lines.length - 1] || '{}';
    const parsed = JSON.parse(last);
    return res.status(parsed.status || 200).json(parsed.payload || {});
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to run anomaly detection', detail: err.message, stderr: err.stderr || '' });
  }
});

router.post('/anomalies/action', async (req, res) => {
  const { requester_username, anomaly, decision } = req.body || {};
  if (!requester_username || !anomaly?.kind || !decision) {
    return res.status(400).json({ success: false, message: 'requester_username, anomaly.kind, and decision are required' });
  }

  const canConnect = String(decision).toLowerCase() === 'allow' ? 1 : 0;

  try {
    const auth = await requireAdmin(requester_username);
    if (!auth.ok) return res.status(auth.status).json({ success: false, message: auth.message });

    await ensureAccessTables();

    const sourceIp = anomaly.source_ip || null;
    const destinationIp = anomaly.destination_ip || null;
    const macAddr = normalizeMac(anomaly.mac_addr || null);

    let message = 'Action applied.';
    const updated = { known_device_id: null, known_network_id: null };

    if (anomaly.kind === 'unknown_device') {
      updated.known_device_id = await upsertKnownDevice({
        sourceIp,
        macAddr,
        canConnect,
        infoText: `unknown_device action=${decision}`,
      });
      message = canConnect ? 'Unknown device allowed and logged.' : 'Unknown device denied and logged.';
    } else if (anomaly.kind === 'unknown_destination_ip') {
      updated.known_device_id = await upsertKnownDevice({
        sourceIp,
        macAddr,
        canConnect,
        infoText: `unknown_destination_ip action=${decision} destination=${destinationIp || 'n/a'}`,
      });
      message = canConnect
        ? 'Device allowed after unknown destination activity and logged.'
        : 'Device denied after unknown destination activity and logged.';
    } else if (anomaly.kind === 'traffic_spike') {
      const top = await findTopTalker();
      const spikeSource = sourceIp || top?.source || null;
      const spikeDestination = destinationIp || top?.destination || null;

      updated.known_device_id = await upsertKnownDevice({
        sourceIp: spikeSource,
        macAddr,
        canConnect,
        infoText: `traffic_spike action=${decision} packets=${anomaly.packet_count || top?.packet_count || 'n/a'}`,
      });

      const srcNet = ipToCidr24(spikeSource);
      const dstNet = ipToCidr24(spikeDestination);

      if (srcNet) {
        updated.known_network_id = await upsertKnownNetwork({
          networkCidr: srcNet,
          canConnect,
          infoText: `traffic_spike source network action=${decision}`,
        });
      }
      if (dstNet && dstNet !== srcNet) {
        await upsertKnownNetwork({
          networkCidr: dstNet,
          canConnect,
          infoText: `traffic_spike destination network action=${decision}`,
        });
      }

      message = canConnect
        ? 'Traffic spike acknowledged; source/network logged and allowed.'
        : 'Traffic spike actor/network blocked and logged.';
    }

    return res.json({ success: true, message, can_connect: canConnect, ...updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to apply anomaly action', detail: err.message });
  }
});

router.post('/simulate/anomalies', async (req, res) => {
  try {
    const { stdout, stderr } = await runPython(['anomaly_seed_data.py'], {}, 2 * 60 * 1000);
    return res.json({ success: true, stdout, stderr });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to simulate anomaly data', detail: err.message, stderr: err.stderr || '' });
  }
});

router.post('/cleanup', async (req, res) => {
  try {
    const { stdout, stderr } = await runPython(['cleanup.py'], {}, 2 * 60 * 1000);
    return res.json({ success: true, stdout, stderr });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to run cleanup', detail: err.message, stderr: err.stderr || '' });
  }
});

router.post('/run/nmap', async (req, res) => {
  const target = req.body?.target || req.body?.target_ip || process.env.NMAP_TARGET || '127.0.0.1';
  try {
    const { stdout, stderr } = await runPython(['pcap_to_xml_nmap.py'], { NMAP_TARGET: String(target) }, 10 * 60 * 1000);
    return res.json({ success: true, target, stdout, stderr });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to run Nmap ingestion script', detail: err.message, stderr: err.stderr || '' });
  }
});

router.post('/run/wireshark', async (req, res) => {
  const iface = req.body?.capture_interface || process.env.CAPTURE_INTERFACE || '';
  const seconds = req.body?.capture_seconds || process.env.CAPTURE_SECONDS || '15';
  try {
    const { stdout, stderr } = await runPython(
      ['pcap_to_xml_wireshark.py'],
      { CAPTURE_INTERFACE: String(iface), CAPTURE_SECONDS: String(seconds) },
      10 * 60 * 1000
    );
    return res.json({ success: true, capture_interface: iface, capture_seconds: seconds, stdout, stderr });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to run Wireshark ingestion script', detail: err.message, stderr: err.stderr || '' });
  }
});

export default router;
