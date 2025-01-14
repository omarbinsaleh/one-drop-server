require('dotenv').config();
const express = require('express');
const cors = require('cors');
const port = process.env.SERVER_PORT || 5000;

// CREATE EXPRESS APPLICATION INSTANCE
const app = express();

// MIDDLEWARES
app.use(cors());
app.use(express.json());

// API END POINTS
app.get('/', (req, res) => {
   res.send('Server is running..')
})

// LISTEN
app.listen(port, () => {
   console.log(`Server is running on: http://localhost:${port}`);
})