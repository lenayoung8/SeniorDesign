import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const fakeUserInfo = [
  { username: 'deeradmin', password: 'deeradmin', role: 1, is_owner: 1, name: 'Deer Admin' },
  { username: 'anaumann', password: 'password123', role: 1, is_owner: 1, name: 'Adele Naumann' },
  { username: 'd3rlord3', password: 'password123', role: 1, is_owner: 1, name: 'Derek Hutchins' },
  { username: 'reimu', password: 'password123', role: 0, is_owner: 1, name: 'Reimu Hakurei' },
  { username: 'ibuki', password: 'password123', role: 0, is_owner: 1, name: 'Ibuki Mioda' },
  { username: 'lycaon', password: 'password123', role: 0, is_owner: 1, name: 'Von Lycaon' },
  { username: 'kuromi', password: 'password123', role: 0, is_owner: 0, name: 'Kuromi' },
  { username: 'brekker', password: 'password123', role: 0, is_owner: 0, name: 'Kaz Brekker' },
  { username: 'bbouanich', password: 'password123', role: 1, is_owner: 0, name: 'Beryl Bouanich' },
  { username: 'quixote', password: 'password123', role: 0, is_owner: 0, name: 'Don Quixote' },
  { username: 'adreemur', password: 'password123', role: 0, is_owner: 0, name: 'Asriel Dreemur' },
  { username: 'hmiku', password: 'password123', role: 0, is_owner: 0, name: 'Hatsune Miku' },
  { username: 'pinkpantheress', password: 'password123', role: 0, is_owner: 0, name: 'Victoria Walker' },
  { username: 'ChuuLoona', password: 'password123', role: 0, is_owner: 0, name: 'Kim Ji-woo' },
];

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
    CREATE TABLE IF NOT EXISTS user_info (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(255) UNIQUE,
      password VARCHAR(255),
      role TINYINT(1) DEFAULT 0,
      is_owner TINYINT(1) DEFAULT 0,
      name VARCHAR(255)
    )
  `);

  const sql = `
    INSERT INTO user_info (username, password, role, is_owner, name)
    VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      password = VALUES(password),
      role = VALUES(role),
      is_owner = VALUES(is_owner),
      name = VALUES(name)
  `;

  for (const u of fakeUserInfo) {
    await conn.execute(sql, [u.username, u.password, u.role, u.is_owner, u.name]);
  }

  await conn.commit();
  console.log('Database seeded with users in MySQL.');
} catch (err) {
  await conn.rollback();
  console.error('Failed to seed users:', err.message);
  process.exitCode = 1;
} finally {
  conn.release();
  await pool.end();
}
