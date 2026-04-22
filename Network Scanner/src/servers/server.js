import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') }); //Same fix

import usersRoute from './routes/users.js'; 
import devicesRoute from './routes/devices.js';
import authRoute from './routes/auth.js';
import julesRoute from './routes/jules.js';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/users', usersRoute);
app.use('/api/devices', devicesRoute);
app.use('/api/auth', authRoute);
app.use('/api/jules', julesRoute);

app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend is connected!' });
});

app.listen(5000, () => {
  console.log('Server running on port 5000');
});
