/**
 * Config for WhatsApp Fee Receipt (namespaced for merge with main project config).
 * In the other project you can merge these keys into your main config.js or keep this file
 * and ensure only waPdf code requires it.
 */
const functions = require('firebase-functions');

function getConfig(key, defaultValue) {
  try {
    const functionsConfig = functions.config();
    const keys = key.split('.');
    let value = functionsConfig;
    for (const k of keys) {
      value = value?.[k];
    }
    if (value !== undefined) return value;
  } catch (e) {}
  const envKey = key.toUpperCase().replace(/\./g, '_');
  return process.env[envKey] || defaultValue;
}

module.exports = {
  PORT: getConfig('port', 3000),
  NODE_ENV: getConfig('node_env', 'production'),
  EXOTEL: {
    API_KEY: getConfig('exotel.api_key', process.env.EXOTEL_API_KEY),
    API_TOKEN: getConfig('exotel.api_token', process.env.EXOTEL_API_TOKEN),
    SID: getConfig('exotel.sid', process.env.EXOTEL_SID),
    TEMPLATE_NAME: getConfig('exotel.template_name', process.env.EXOTEL_TEMPLATE_NAME || 'college_fee_receipt'),
    FROM_NUMBER: getConfig('exotel.from_number', process.env.EXOTEL_FROM_NUMBER || '919442027368'),
    WABA_ID: getConfig('exotel.waba_id', process.env.EXOTEL_WABA_ID),
    STATUS_CALLBACK: getConfig('exotel.status_callback', process.env.EXOTEL_STATUS_CALLBACK)
  },
  STORAGE: {
    TYPE: 'firebase',
    LOCAL_PATH: '/tmp/uploads',
    FIREBASE_STORAGE_BUCKET: getConfig('storage.bucket', process.env.STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET || 'ssec-outing.firebasestorage.app'),
    FIREBASE_SERVICE_ACCOUNT_PATH: getConfig('storage.service_account_path', process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json')
  },
  FILE: {
    MAX_SIZE: 5 * 1024 * 1024,
    ALLOWED_MIME: ['application/pdf'],
    ALLOWED_EXT: ['.pdf']
  },
  URL: {
    EXPIRY_TIME: 10 * 60 * 1000,
    BASE_URL: getConfig('url.base_url', process.env.BASE_URL || 'https://wa-pdf.web.app'),
    DOWNLOAD_PROXY_BASE_URL: getConfig('url.download_proxy_base_url', process.env.DOWNLOAD_PROXY_BASE_URL || `https://${process.env.FUNCTION_REGION || 'us-central1'}-${process.env.GCLOUD_PROJECT || 'ssec-outing'}.cloudfunctions.net/downloadFee`)
  },
  CLEANUP: {
    ENABLED: getConfig('cleanup.enabled', 'true') === 'true',
    DELETE_AFTER_SEND: true,
    DELAY_MS: parseInt(getConfig('cleanup.delay_ms', process.env.CLEANUP_DELAY_MS || (2 * 60 * 60 * 1000)), 10) || (2 * 60 * 60 * 1000),
    ARCHIVE_PATH: '/tmp/archives'
  },
  LOG_PATH: null
};
