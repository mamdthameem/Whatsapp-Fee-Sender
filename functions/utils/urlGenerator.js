/**
 * Utility to generate temporary URLs with expiry for PDF documents (Cloud Functions)
 */
const config = require('../config');
const logger = require('./logger');

const tempUrls = new Map();

exports.generateSecureUrl = (fileUrl, uniqueId) => {
  try {
    const expiryTime = Date.now() + config.URL.EXPIRY_TIME;
    tempUrls.set(uniqueId, { url: fileUrl, expiresAt: expiryTime, createdAt: Date.now() });
    const tempUrl = config.STORAGE.TYPE === 'local'
      ? `${config.URL.BASE_URL}/download/${uniqueId}`
      : fileUrl;
    logger.info(`Temporary URL generated: ${tempUrl} (expires: ${new Date(expiryTime).toISOString()})`);
    return tempUrl;
  } catch (error) {
    logger.error(`Error generating temporary URL: ${error.message}`);
    throw error;
  }
};

exports.getUrlIfValid = (uniqueId) => {
  const entry = tempUrls.get(uniqueId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    tempUrls.delete(uniqueId);
    logger.warn(`Temporary URL expired: ${uniqueId}`);
    return null;
  }
  return entry.url;
};

setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  for (const [key, entry] of tempUrls.entries()) {
    if (now > entry.expiresAt) {
      tempUrls.delete(key);
      cleaned++;
    }
  }
  if (cleaned > 0) logger.info(`Cleaned up ${cleaned} expired temporary URLs`);
}, 5 * 60 * 1000);
