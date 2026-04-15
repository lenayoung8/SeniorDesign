import express from 'express';
import db from '../db.js';

const router = express.Router();

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

export default router;