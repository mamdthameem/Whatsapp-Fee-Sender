/**
 * Logging utility for Cloud Functions - console only (no file in serverless)
 */
const config = require('../config');

const LOG_LEVELS = { ERROR: 'ERROR', WARN: 'WARN', INFO: 'INFO', DEBUG: 'DEBUG' };

function formatLog(level, message) {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level}] ${message}`;
}

function writeLog(level, message) {
  const logMessage = formatLog(level, message);
  console.log(logMessage);
  // Cloud Functions: no file logging (config.LOG_PATH is null)
  if (config.LOG_PATH) {
    const fs = require('fs');
    const path = require('path');
    const logDir = path.dirname(config.LOG_PATH);
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    fs.appendFile(config.LOG_PATH, logMessage + '\n', () => {});
  }
}

module.exports = {
  error: (message) => writeLog(LOG_LEVELS.ERROR, message),
  warn: (message) => writeLog(LOG_LEVELS.WARN, message),
  info: (message) => writeLog(LOG_LEVELS.INFO, message),
  debug: (message) => {
    if (config.NODE_ENV === 'development') writeLog(LOG_LEVELS.DEBUG, message);
  }
};
