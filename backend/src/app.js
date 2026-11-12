require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map((s) => s.trim()) }));
app.use(express.json({ limit: '100kb' }));
app.use((req, res, next) => { req.body = req.body || {}; next(); });

const limiter = (limit, message) => rateLimit({ windowMs: 15 * 60 * 1000, limit, standardHeaders: true, legacyHeaders: false, message: { message } });
app.use('/api', limiter(500, 'Too many requests, please slow down'));
app.use('/api/auth', limiter(40, 'Too many attempts, try again in a few minutes'));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/listings', require('./routes/listings'));
app.use('/api/requests', require('./routes/requests'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api', (req, res) => res.status(404).json({ message: 'Endpoint not found' }));

app.use((err, req, res, next) => {
  if (err.code === 11000) return res.status(409).json({ message: 'That already exists' });
  if (['CastError', 'ValidationError', 'MulterError'].includes(err.name)) return res.status(400).json({ message: err.message });
  if (err.status && err.status < 500) return res.status(err.status).json({ message: err.message });
  console.error(err);
  res.status(500).json({ message: 'Something went wrong on the server' });
});

module.exports = app;
