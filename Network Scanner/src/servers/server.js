const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const usersRoute = require('./routes/users');
app.use('/api/users', usersRoute);

app.listen(5000, () => {
  console.log('Server running on port 5000');
});