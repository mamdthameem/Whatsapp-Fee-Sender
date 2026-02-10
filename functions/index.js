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

// Middleware
app.use(cors({ origin: true }));
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
  if (err.stack) {
    logger.error(`Stack: ${err.stack}`);
  }
  res.status(500).json({ 
    success: false, 
    message: err.message || 'Internal Server Error' 
  });
});

// Export as 2nd gen Cloud Function (avoids "Cannot set CPU" on Gen 1)
exports.api = onRequest(app);
