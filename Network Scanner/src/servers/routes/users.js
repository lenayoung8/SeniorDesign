import express from 'express';
import db from '../db.js';

const router = express.Router();

// GET all users - works with BOTH SQLite and MySQL
router.get('/', async (req, res) => {
  try {
    const users = await db.query('SELECT * FROM users');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST a new user - works with BOTH SQLite and MySQL
router.post('/', async (req, res) => {
  const { name, email } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO users (name, email) VALUES (?, ?)',
      [name, email]
    );
    res.json({ id: result.lastInsertRowid, name, email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;