import express from 'express';
import db from '../db.js';

const router = express.Router();

// GET all users from user_info
router.get('/', async (req, res) => {
  try {
    const users = await db.query(
      'SELECT id, username, role, is_owner, name FROM user_info ORDER BY id'
    );
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST a new user to user_info
router.post('/', async (req, res) => {
  const { username, password, role = 0, is_owner = 0, name = null } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' });
  }
  try {
    const normalizedRole = String(role).toLowerCase() === 'admin' ? 1 : Number(role) ? 1 : 0;
    const normalizedOwner = String(is_owner).toLowerCase() === 'yes' ? 1 : Number(is_owner) ? 1 : 0;
    const result = await db.run(
      'INSERT INTO user_info (username, password, role, is_owner, name) VALUES (?, ?, ?, ?, ?)',
      [username, password, normalizedRole, normalizedOwner, name]
    );
    res.json({ id: result.lastInsertRowid, username, role: normalizedRole, is_owner: normalizedOwner, name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
