/**
 * Express app for WhatsApp Fee Receipt (waPdf).
 * Mount at /api/upload in your main app, or use as standalone for waPdfApi.
 */
const express = require('express');
const cors = require('cors');
const config = require('./config');
const logger = require('./utils/logger');
const uploadRoutes = require('./routes/upload');
const parseMultipart = require('./middleware/parseMultipart');

const app = express();

app.use(cors({ origin: true }));
app.use(parseMultipart);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/upload', uploadRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    storage: config.STORAGE.TYPE,
    service: 'waPdf',
    platform: 'firebase-cloud-functions'
  });
});

app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`);
  if (err.stack) logger.error(`Stack: ${err.stack}`);
  const msg = err.message || 'Internal Server Error';
  const friendly = msg.includes('Unexpected end of form')
    ? 'Upload failed: request body was incomplete or invalid. Try again or use a smaller file.'
    : msg;
  res.status(500).json({ success: false, message: friendly });
});

module.exports = app;
