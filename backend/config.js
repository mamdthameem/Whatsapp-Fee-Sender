/**
 * Configuration file for College WhatsApp System
 * Loads environment variables and provides centralized configuration
 */
require('dotenv').config();

module.exports = {
  // Server settings
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Exotel API credentials (provided via environment variables)
  EXOTEL: {
    API_KEY: process.env.EXOTEL_API_KEY,
    API_TOKEN: process.env.EXOTEL_API_TOKEN,
    SID: process.env.EXOTEL_SID,
    TEMPLATE_NAME: process.env.EXOTEL_TEMPLATE_NAME || 'college_fee_receipt',
    FROM_NUMBER: process.env.EXOTEL_FROM_NUMBER || '919442027368', // Default sender number
    WABA_ID: process.env.EXOTEL_WABA_ID
  },

  // Storage settings
  STORAGE: {
    TYPE: process.env.STORAGE_TYPE || 'local', // 'local' or 'firebase'
    LOCAL_PATH: process.env.LOCAL_STORAGE_PATH || './uploads',
    FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET,
    FIREBASE_SERVICE_ACCOUNT_PATH: process.env.FIREBASE_SERVICE_ACCOUNT_PATH
  },

  // File settings
  FILE: {
    MAX_SIZE: 5 * 1024 * 1024, // 5MB limit (WhatsApp limit)
    ALLOWED_MIME: ['application/pdf'],
    ALLOWED_EXT: ['.pdf']
  },

  // URL settings
  URL: {
    EXPIRY_TIME: 10 * 60 * 1000, // 10 minutes in milliseconds
    BASE_URL: process.env.BASE_URL || 'http://localhost:3000'
  },

  // Cleanup settings
  CLEANUP: {
    ENABLED: process.env.CLEANUP_ENABLED === 'true' || true,
    DELETE_AFTER_SEND: true, // Delete or archive after sending
    ARCHIVE_PATH: process.env.ARCHIVE_PATH || './archives'
  },

  // Logging
  LOG_PATH: './logs/activity.log'
};
