import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '../../.env');
console.log('Looking for .env at:', envPath);

dotenv.config({ path: envPath });
console.log('> DB_TYPE is:', process.env.DB_TYPE);

let db;

if (process.env.DB_TYPE === 'mysql') {
  // MySQL mode, for backend devs
  console.log('🗄️ Using MySQL database...');
  const mysql = await import('mysql2/promise');
  
  const pool = mysql.default.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
  });

  // Wrap MySQL to match SQLite-style usage in routes
  db = {
    query: async (sql, params = []) => {
      const [rows] = await pool.execute(sql, params);
      return rows;
    },
    run: async (sql, params = []) => {
      const [result] = await pool.execute(sql, params);
      return { lastInsertRowid: result.insertId };
    }
  };

} else {
  // SQLite mode (default), for frontend
  console.log('🗄️ Using SQLite database...');
  const Database = (await import('better-sqlite3')).default;
  const sqlite = new Database('database.db');

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL
    );
  `);

  // Wrap SQLite to match MySQL-style usage in routes
  db = {
    query: (sql, params = []) => {
      if (sql.trim().toUpperCase().startsWith('SELECT')) {
        return sqlite.prepare(sql).all(params);
      } else {
        const result = sqlite.prepare(sql).run(params);
        return { lastInsertRowid: result.lastInsertRowid };
      }
    }
  };
}

export default db;