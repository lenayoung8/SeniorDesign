import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';

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
          reject({
            message: error.message,
            stdout: stdout || '',
            stderr: stderr || '',
          });
          return;
        }
        resolve({ stdout: stdout || '', stderr: stderr || '' });
      }
    );
  });
}

router.get('/status', (req, res) => {
  res.json({
    success: true,
    scriptsDir,
    endpoints: [
      'GET /api/jules/status',
      'GET /api/jules/anomalies',
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
    return res.status(500).json({
      success: false,
      message: 'Failed to run anomaly detection',
      detail: err.message,
      stderr: err.stderr || '',
    });
  }
});

router.post('/cleanup', async (req, res) => {
  try {
    const { stdout, stderr } = await runPython(['cleanup.py'], {}, 2 * 60 * 1000);
    return res.json({ success: true, stdout, stderr });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to run cleanup',
      detail: err.message,
      stderr: err.stderr || '',
    });
  }
});

router.post('/run/nmap', async (req, res) => {
  const target = req.body?.target || req.body?.target_ip || process.env.NMAP_TARGET || '127.0.0.1';
  try {
    const { stdout, stderr } = await runPython(
      ['pcap_to_xml_nmap.py'],
      { NMAP_TARGET: String(target) },
      10 * 60 * 1000
    );
    return res.json({ success: true, target, stdout, stderr });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to run Nmap ingestion script',
      detail: err.message,
      stderr: err.stderr || '',
    });
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
    return res.status(500).json({
      success: false,
      message: 'Failed to run Wireshark ingestion script',
      detail: err.message,
      stderr: err.stderr || '',
    });
  }
});

export default router;
