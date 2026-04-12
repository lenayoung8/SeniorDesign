import express from 'express';
import db from '../db.js';

const router = express.Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    // Query user_info table just like the PHP file does
    const result = await db.query(
      `SELECT * FROM user_info 
       WHERE username = ? 
       LIMIT 1`,
      [username]
    );

    // Handle both SQLite and MySQL response formats
    const user = Array.isArray(result) ? result[0] : result;

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid username or password' 
      });
    }

    // Simple password check for now (backend teammate should add bcrypt later)
    if (password !== user.password) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid username or password' 
      });
    }

    // Success — send back user info
    res.status(200).json({ 
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        is_owner: user.is_owner
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;