/**
 * Configuration file for College WhatsApp System (Cloud Functions)
 * Reads from Firebase Functions config or environment variables
 */
const functions = require('firebase-functions');

// Helper to get config value (from Firebase Functions config or env)
function getConfig(key, defaultValue) {
  // Try Firebase Functions config first
  try {
    const functionsConfig = functions.config();
    const keys = key.split('.');
    let value = functionsConfig;
    for (const k of keys) {
      value = value?.[k];
    }
    if (value !== undefined) return value;
  } catch (e) {
    // Firebase config not available (local dev)
  }
  
  // Fallback to environment variable
  const envKey = key.toUpperCase().replace(/\./g, '_');
  return process.env[envKey] || defaultValue;
}

module.exports = {
  // Server settings
  PORT: getConfig('port', 3000),
  NODE_ENV: getConfig('node_env', 'production'),

  // Exotel API credentials
  EXOTEL: {
    API_KEY: getConfig('exotel.api_key', process.env.EXOTEL_API_KEY),
    API_TOKEN: getConfig('exotel.api_token', process.env.EXOTEL_API_TOKEN),
    SID: getConfig('exotel.sid', process.env.EXOTEL_SID),
    TEMPLATE_NAME: getConfig('exotel.template_name', process.env.EXOTEL_TEMPLATE_NAME || 'college_fee_receipt'),
    FROM_NUMBER: getConfig('exotel.from_number', process.env.EXOTEL_FROM_NUMBER || '919442027368'),
    WABA_ID: getConfig('exotel.waba_id', process.env.EXOTEL_WABA_ID),
    STATUS_CALLBACK: getConfig('exotel.status_callback', process.env.EXOTEL_STATUS_CALLBACK) // Optional webhook URL
  },

  // Storage settings (always Firebase in Cloud Functions)
  STORAGE: {
    TYPE: 'firebase', // Always Firebase in Cloud Functions
    LOCAL_PATH: '/tmp/uploads', // Use /tmp in Cloud Functions
    FIREBASE_STORAGE_BUCKET: getConfig('storage.bucket', process.env.STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET || 'ssec-outing.firebasestorage.app'),
    FIREBASE_SERVICE_ACCOUNT_PATH: getConfig('storage.service_account_path', process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json')
  },

  // File settings
  FILE: {
    MAX_SIZE: 5 * 1024 * 1024, // 5MB limit
    ALLOWED_MIME: ['application/pdf'],
    ALLOWED_EXT: ['.pdf']
  },

  // URL settings
  URL: {
    EXPIRY_TIME: 10 * 60 * 1000, // 10 minutes
    BASE_URL: getConfig('url.base_url', process.env.BASE_URL || 'https://wa-pdf.web.app')
  },

  // Cleanup settings
  CLEANUP: {
    ENABLED: getConfig('cleanup.enabled', 'true') === 'true',
    DELETE_AFTER_SEND: true,
    ARCHIVE_PATH: '/tmp/archives' // Use /tmp in Cloud Functions
  },

  // Logging (use console in Cloud Functions)
  LOG_PATH: null // Cloud Functions logs to console automatically
};
