import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database(path.resolve(__dirname, '../../database.db'));

// Clear existing data first
db.exec(`DELETE FROM users;`);

// Insert fake users
const insert = db.prepare(`
  INSERT INTO users (name, email) VALUES (?, ?)
`);

const fakeUsers = [
  { name: 'Adele Naumann', email: 'anaumann@example.com' },
  { name: 'Derek Hutchins', email: 'd3rlord3@example.com' },
  { name: 'Reimu Hakurei', email: 'reimu@example.com' },
  { name: 'Ibuki Mioda', email: 'ibuki@example.com' },
  { name: 'Von Lycaon', email: 'lycaon@example.com' },
  { name: 'Kuromi', email: 'kuromi@example.com' },
  { name: 'Kaz Brekker', email: 'brekker@example.com' },
  { name: 'Beryl Bouanich', email: 'bbouanich@example.com' },
  { name: 'Don Quixote', email: 'quixote@example.com' },
  { name: 'Asriel Dreemur', email: 'adreemur@example.com' },
  { name: 'Hatsune Miku', email: 'hmiku@example.com' },
  { name: 'Victoria Walker', email: 'pinkpantheress@example.com' },
  { name: 'Kim Ji-woo', email: 'ChuuLoona@heartattack.com' }
];

for (const user of fakeUsers) {
  insert.run(user.name, user.email);
}

console.log('✅ Database seeded with fake users!');
db.close();