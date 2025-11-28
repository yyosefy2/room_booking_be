const express = require('express');
const api = require('./api');
const config = require('../config/config.json');

const port = process.env.PORT || config.server.port;


const router = express.Router();
const app = express();
app.use(express.json());

// Mount API under /api/v1
app.use('/', api);

// Health check endpoint remains at root
app.get('/alive', (req, res) => {
  res.status(200).send('{"status":"alive"}');
});

// Default no route matched
app.use((req, res) => {
  res.status(404).json({ error: `url ${req.originalUrl} not found` });
});

app.use((err, req, res, next) => {
  console.error(`Global error caught: ${JSON.stringify(err)}`);
  res.status(500).json({ error: err.message });
});

app.listen(port, () => {
  console.log(`app running on port ${port} `);
});