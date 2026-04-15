import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database(path.resolve(__dirname, '../../database.db'));

// Clear existing data first
db.exec(`
    DROP TABLE IF EXISTS devices;
    DROP TABLE IF EXISTS user_info;
    DROP TABLE IF EXISTS users;

    CREATE TABLE user_info (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      is_owner TEXT DEFAULT 'no',
      name TEXT NOT NULL
    );
`);

// Seed user_info
const insertUserInfo = db.prepare(`
  INSERT INTO user_info (username, password, role, is_owner, name)
  VALUES (?, ?, ?, ?, ?)
`);

/*
const fakeUsers = [
  { name: 'Adele Naumann',   email: 'anaumann@example.com',       password: 'password123' },
  { name: 'Derek Hutchins',  email: 'd3rlord3@example.com',       password: 'password123' },
  { name: 'Reimu Hakurei',   email: 'reimu@example.com',          password: 'password123' },
  { name: 'Ibuki Mioda',     email: 'ibuki@example.com',          password: 'password123' },
  { name: 'Von Lycaon',      email: 'lycaon@example.com',         password: 'password123' },
  { name: 'Kuromi',          email: 'kuromi@example.com',         password: 'password123' },
  { name: 'Kaz Brekker',     email: 'brekker@example.com',        password: 'password123' },
  { name: 'Beryl Bouanich',  email: 'bbouanich@example.com',      password: 'password123' },
  { name: 'Don Quixote',     email: 'quixote@example.com',        password: 'password123' },
  { name: 'Asriel Dreemur',  email: 'adreemur@example.com',       password: 'password123' },
  { name: 'Hatsune Miku',    email: 'hmiku@example.com',          password: 'password123' },
  { name: 'Victoria Walker', email: 'pinkpantheress@example.com', password: 'password123' },
  { name: 'Kim Ji-woo',      email: 'ChuuLoona@heartattack.com',  password: 'password123' },
];
*/

const fakeUserInfo = [
  { username: 'deeradmin',     password: 'deeradmin', role: 'admin',    is_owner: 'yes', name: "Deer Admin"},
  { username: 'anaumann',      password: 'password123', role: 'admin',  is_owner: 'yes', name: 'Adele Naumann'},
  { username: 'd3rlord3',      password: 'password123', role: 'admin',  is_owner: 'yes', name: 'Derek Hutchins'},
  { username: 'reimu',         password: 'password123', role: 'user',   is_owner: 'yes', name: 'Reimu Hakurei'},
  { username: 'ibuki',         password: 'password123', role: 'user',   is_owner: 'yes', name: 'Ibuki Mioda' },
  { username: 'lycaon',        password: 'password123', role: 'user',   is_owner: 'yes', name: 'Von Lycaon' },
  { username: 'kuromi',        password: 'password123', role: 'user',   is_owner: 'no',  name: 'Kuromi' },
  { username: 'brekker',       password: 'password123', role: 'user',   is_owner: 'no',  name: 'Kaz Brekker' },
  { username: 'bbouanich',     password: 'password123', role: 'admin',  is_owner: 'no',  name: 'Beryl Bouanich' },
  { username: 'quixote',       password: 'password123', role: 'user',   is_owner: 'no',  name: 'Don Quixote' },
  { username: 'adreemur',      password: 'password123', role: 'user',   is_owner: 'no',  name: 'Asriel Dreemur' },
  { username: 'hmiku',         password: 'password123', role: 'user',   is_owner: 'no',  name: 'Hatsune Miku' },
  { username: 'pinkpantheress',password: 'password123', role: 'user',   is_owner: 'no',  name: 'Victoria Walker' },
  { username: 'ChuuLoona',     password: 'password123', role: 'user',   is_owner: 'no',  name: 'Kim Ji-woo' }
];

for (const info of fakeUserInfo) {
  insertUserInfo.run(info.username, info.password, info.role, info.is_owner, info.name);
}

console.log('★ Database seeded with fake users!');
db.close();