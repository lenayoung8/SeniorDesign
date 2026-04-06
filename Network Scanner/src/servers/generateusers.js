import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database(path.resolve(__dirname, '../../database.db'));

// Clear existing data first
db.exec(`
  DROP TABLE IF EXISTS users;
  CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    password TEXT NOT NULL
  );
`);

// Insert fake users
const insert = db.prepare(`
  INSERT INTO users (name, email, password) VALUES (?, ?, ?)
`);

const fakeUsers = [
  { name: 'Adele Naumann', email: 'anaumann@example.com', password: 'admin' },
  { name: 'Derek Hutchins', email: 'd3rlord3@example.com', password: 'admin'  },
  { name: 'Reimu Hakurei', email: 'reimu@example.com', password: 'admin'  },
  { name: 'Ibuki Mioda', email: 'ibuki@example.com', password: 'admin'  },
  { name: 'Von Lycaon', email: 'lycaon@example.com', password: 'admin'  },
  { name: 'Marisa Kirisame', email: 'mkirisame@example.com', password: 'admin'  },
  { name: 'Anthony Simon', email: 'simon@example.com', password: 'admin'  },
  { name: 'Kaz Brekker', email: 'brekker@example.com', password: 'admin'  },
  { name: 'Beryl Bouanich', email: 'bbouanich@example.com', password: 'admin'  },
  { name: 'Don Quixote', email: 'quixote@example.com', password: 'admin'  },
  { name: 'Hatsune Miku', email: 'hmiku@example.com', password: 'admin'  },
  { name: 'Victoria Walker', email: 'pinkpantheress@example.com', password: 'admin'  },
  { name: 'Kim Ji-woo', email: 'ChuuLoona@heartattack.com', password: 'admin'  }
];

for (const user of fakeUsers) {
  insert.run(user.name, user.email, user.password);
}

console.log('★ Database seeded with fake users!');
db.close();