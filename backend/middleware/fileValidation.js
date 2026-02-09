/**
 * Middleware to validate uploaded files
 * Checks file type, size, and format before processing
 */
const config = require('../config');
const logger = require('../utils/logger');

/**
 * File validation middleware
 * Validates MIME type, file size, and file existence
 */
const fileValidation = (req, res, next) => {
  const file = req.file;

  // Check if file exists
  if (!file) {
    logger.warn('No file provided in request');
    return res.status(400).json({ 
      success: false, 
      message: 'No PDF file provided' 
    });
  }

  // Validate MIME type
  if (!config.FILE.ALLOWED_MIME.includes(file.mimetype)) {
    logger.warn(`Invalid MIME type: ${file.mimetype}`);
    return res.status(400).json({ 
      success: false, 
      message: 'Only PDF files are allowed' 
    });
  }

  // Validate file size
  if (file.size > config.FILE.MAX_SIZE) {
    logger.warn(`File too large: ${file.size} bytes`);
    return res.status(400).json({ 
      success: false, 
      message: `File size exceeds maximum limit of ${config.FILE.MAX_SIZE / (1024 * 1024)}MB` 
    });
  }

  // Validate file has content
  if (file.size === 0) {
    logger.warn('Empty file provided');
    return res.status(400).json({ 
      success: false, 
      message: 'File is empty' 
    });
  }

  // All validations passed
  logger.debug(`File validation passed: ${file.originalname} (${file.size} bytes)`);
  next();
};

module.exports = fileValidation;
