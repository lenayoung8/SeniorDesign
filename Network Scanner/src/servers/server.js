import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import usersRoute from './routes/users.js'; 

dotenv.config({ path: '../../.env' }); 

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/users', usersRoute);

app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend is connected!' });
});

app.listen(5000, () => {
  console.log('Server running on port 5000');
});