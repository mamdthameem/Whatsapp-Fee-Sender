/**
 * Firebase Cloud Functions (2nd gen) - WhatsApp Fee Receipt System
 * Express app wrapped as Cloud Function
 */
const { onRequest } = require('firebase-functions/v2/https');
const express = require('express');
const cors = require('cors');

// Import backend modules (copy from backend folder)
const config = require('./config');
const logger = require('./utils/logger');
const uploadRoutes = require('./routes/upload');
const urlGenerator = require('./utils/urlGenerator');

const app = express();

// Multipart parser must run first (before body parsers) so raw body is available.
// Cloud Functions buffer the request; multer fails with "Unexpected end of form".
const parseMultipart = require('./middleware/parseMultipart');

app.use(cors({ origin: true }));
app.use(parseMultipart);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/upload', uploadRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    storage: config.STORAGE.TYPE,
    environment: 'production',
    platform: 'firebase-cloud-functions'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`);
  if (err.stack) logger.error(`Stack: ${err.stack}`);
  const msg = err.message || 'Internal Server Error';
  const friendly = msg.includes('Unexpected end of form')
    ? 'Upload failed: request body was incomplete or invalid. Try again or use a smaller file.'
    : msg;
  res.status(500).json({ success: false, message: friendly });
});

// Export as 2nd gen Cloud Function (avoids "Cannot set CPU" on Gen 1)
// Updated: Fixed multipart parsing and Exotel payload to match working Postman request
exports.api = onRequest(app);

// Proxy for WhatsApp document delivery: GET ?fileId=fee-receipts/xxx.pdf → stream PDF (no redirect/token)
exports.downloadFee = require('./downloadFee').downloadFee;
