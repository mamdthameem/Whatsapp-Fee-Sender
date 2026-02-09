/**
 * Utility to generate temporary URLs with expiry for PDF documents
 * Manages URL lifecycle and provides secure access to files
 */
const config = require('../config');
const logger = require('./logger');

// Map to store active temporary URLs with expiry information
const tempUrls = new Map();

/**
 * Generate secure temporary URL for PDF file
 * @param {string} fileUrl - Original file URL (local path or S3 URL)
 * @param {string} uniqueId - Unique identifier for the file
 * @returns {string} Temporary URL with expiry token
 */
exports.generateSecureUrl = (fileUrl, uniqueId) => {
  try {
    const expiryTime = Date.now() + config.URL.EXPIRY_TIME;
    
    // Store URL expiry information
    tempUrls.set(uniqueId, {
      url: fileUrl,
      expiresAt: expiryTime,
      createdAt: Date.now()
    });

    // Generate temporary URL with expiry token
    // For local storage, this will be served by Express
    // For S3, this should be the presigned URL from storageService
    const tempUrl = config.STORAGE.TYPE === 'local' 
      ? `${config.URL.BASE_URL}/download/${uniqueId}`
      : fileUrl; // S3 presigned URL is already time-limited
    
    logger.info(`Temporary URL generated: ${tempUrl} (expires: ${new Date(expiryTime).toISOString()})`);
    
    return tempUrl;
  } catch (error) {
    logger.error(`Error generating temporary URL: ${error.message}`);
    throw error;
  }
};

/**
 * Verify and get URL if still valid
 * Used by Express download endpoint for local storage
 * @param {string} uniqueId - Unique identifier
 * @returns {string|null} Valid file URL or null if expired/invalid
 */
exports.getUrlIfValid = (uniqueId) => {
  const entry = tempUrls.get(uniqueId);

  if (!entry) {
    return null;
  }

  // Check if URL has expired
  if (Date.now() > entry.expiresAt) {
    tempUrls.delete(uniqueId);
    logger.warn(`Temporary URL expired: ${uniqueId}`);
    return null;
  }

  return entry.url;
};

/**
 * Clean up expired URLs periodically
 * Runs every 5 minutes to remove expired entries from memory
 */
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;

  for (const [key, entry] of tempUrls.entries()) {
    if (now > entry.expiresAt) {
      tempUrls.delete(key);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    logger.info(`Cleaned up ${cleaned} expired temporary URLs`);
  }
}, 5 * 60 * 1000); // Every 5 minutes
