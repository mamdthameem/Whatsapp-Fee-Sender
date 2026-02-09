/**
 * Logging utility for College WhatsApp System
 * Provides timestamped logging to both console and file
 */
const fs = require('fs');
const path = require('path');
const config = require('../config');

// Ensure log directory exists
const logDir = path.dirname(config.LOG_PATH);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Log levels
const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

/**
 * Format log message with timestamp and level
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @returns {string} Formatted log message
 */
function formatLog(level, message) {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level}] ${message}`;
}

/**
 * Write log message to both console and file
 * @param {string} level - Log level
 * @param {string} message - Log message
 */
function writeLog(level, message) {
  const logMessage = formatLog(level, message);

  // Write to console
  console.log(logMessage);

  // Write to file (async, non-blocking)
  fs.appendFile(config.LOG_PATH, logMessage + '\n', (err) => {
    if (err) {
      console.error('Failed to write to log file:', err);
    }
  });
}

// Export logger functions
module.exports = {
  error: (message) => writeLog(LOG_LEVELS.ERROR, message),
  warn: (message) => writeLog(LOG_LEVELS.WARN, message),
  info: (message) => writeLog(LOG_LEVELS.INFO, message),
  debug: (message) => {
    if (config.NODE_ENV === 'development') {
      writeLog(LOG_LEVELS.DEBUG, message);
    }
  }
};
