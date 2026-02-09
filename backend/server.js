/**
 * Main Express server for College WhatsApp System
 * Handles PDF uploads, WhatsApp sending via Exotel, and file management
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const config = require('./config');
const logger = require('./utils/logger');
const uploadRoutes = require('./routes/upload');
const urlGenerator = require('./utils/urlGenerator');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));

// Create necessary directories
const dirs = [
  config.STORAGE.LOCAL_PATH, 
  config.CLEANUP.ARCHIVE_PATH, 
  './logs'
];

dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    logger.info(`Created directory: ${dir}`);
  }
});

// API Routes
app.use('/api/upload', uploadRoutes);

// Download endpoint for temporary URLs (local storage only)
app.get('/download/:uniqueId', (req, res) => {
  try {
    const { uniqueId } = req.params;
    const fileUrl = urlGenerator.getUrlIfValid(uniqueId);

    if (!fileUrl) {
      logger.warn(`Invalid or expired download request: ${uniqueId}`);
      return res.status(404).json({
        success: false,
        message: 'File not found or link has expired'
      });
    }

    // Check if file exists
    const filePath = path.resolve(fileUrl);
    if (!fs.existsSync(filePath)) {
      logger.error(`File not found on disk: ${filePath}`);
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Send file with appropriate headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${path.basename(filePath)}"`);
    res.sendFile(filePath);
    logger.info(`File served: ${filePath}`);

  } catch (error) {
    logger.error(`Error serving file: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error serving file'
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    storage: config.STORAGE.TYPE,
    environment: config.NODE_ENV
  });
});

// Root endpoint serves frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
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

// Start server
const PORT = config.PORT;
app.listen(PORT, () => {
  logger.info(`========================================`);
  logger.info(`College WhatsApp System Started`);
  logger.info(`========================================`);
  logger.info(`Server started on port ${PORT}`);
  logger.info(`Environment: ${config.NODE_ENV}`);
  logger.info(`Storage Type: ${config.STORAGE.TYPE}`);
  logger.info(`Frontend: http://localhost:${PORT}`);
  logger.info(`Health Check: http://localhost:${PORT}/api/health`);
  logger.info(`========================================`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

module.exports = app;
