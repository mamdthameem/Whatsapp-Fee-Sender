/**
 * Middleware to validate uploaded files (Cloud Functions)
 */
const config = require('../config');
const logger = require('../utils/logger');

const fileValidation = (req, res, next) => {
  const file = req.file;
  if (!file) {
    logger.warn('No file provided in request');
    return res.status(400).json({ success: false, message: 'No PDF file provided' });
  }
  if (!config.FILE.ALLOWED_MIME.includes(file.mimetype)) {
    logger.warn(`Invalid MIME type: ${file.mimetype}`);
    return res.status(400).json({ success: false, message: 'Only PDF files are allowed' });
  }
  if (file.size > config.FILE.MAX_SIZE) {
    logger.warn(`File too large: ${file.size} bytes`);
    return res.status(400).json({
      success: false,
      message: `File size exceeds maximum limit of ${config.FILE.MAX_SIZE / (1024 * 1024)}MB`
    });
  }
  if (file.size === 0) {
    logger.warn('Empty file provided');
    return res.status(400).json({ success: false, message: 'File is empty' });
  }
  logger.debug(`File validation passed: ${file.originalname} (${file.size} bytes)`);
  next();
};

module.exports = fileValidation;
