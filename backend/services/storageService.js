/**
 * Storage service for handling PDF file storage
 * Supports local filesystem and Firebase Storage
 */
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const config = require('../config');
const logger = require('../utils/logger');

// Initialize Firebase Admin if configured
if (config.STORAGE.TYPE === 'firebase') {
  try {
    let serviceAccountPath = config.STORAGE.FIREBASE_SERVICE_ACCOUNT_PATH;
    
    // Resolve path relative to backend folder (not current module folder)
    if (serviceAccountPath.startsWith('./') || !path.isAbsolute(serviceAccountPath)) {
      // Resolve relative to backend folder (__dirname is backend/services, so go up one level)
      serviceAccountPath = path.resolve(__dirname, '..', serviceAccountPath);
    }
    
    if (!fs.existsSync(serviceAccountPath)) {
      throw new Error(`Firebase service account file not found at: ${serviceAccountPath}. Set FIREBASE_SERVICE_ACCOUNT_PATH in .env`);
    }
    
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: config.STORAGE.FIREBASE_STORAGE_BUCKET
    });
    logger.info('Firebase Admin initialized');
  } catch (error) {
    logger.error(`Failed to initialize Firebase: ${error.message}`);
    throw error;
  }
}

/**
 * Save PDF to storage (local or Firebase)
 * @param {Object} file - Multer file object with buffer
 * @param {string} fileName - Unique filename to store
 * @returns {Promise<string>} Public URL to access the file
 */
exports.savePdf = async (file, fileName) => {
  if (config.STORAGE.TYPE === 'local') {
    return saveToLocalStorage(file, fileName);
  } else if (config.STORAGE.TYPE === 'firebase') {
    return saveToFirebase(file, fileName);
  } else {
    throw new Error(`Unknown storage type: ${config.STORAGE.TYPE}. Use 'local' or 'firebase'`);
  }
};

/**
 * Save PDF to local filesystem
 * @param {Object} file - Multer file object
 * @param {string} fileName - Filename to save
 * @returns {Promise<string>} Relative path for Express serving
 */
function saveToLocalStorage(file, fileName) {
  return new Promise((resolve, reject) => {
    try {
      // Ensure upload directory exists
      if (!fs.existsSync(config.STORAGE.LOCAL_PATH)) {
        fs.mkdirSync(config.STORAGE.LOCAL_PATH, { recursive: true });
      }

      const filePath = path.join(config.STORAGE.LOCAL_PATH, fileName);

      // Write file to disk
      fs.writeFile(filePath, file.buffer, (err) => {
        if (err) {
          logger.error(`Failed to save file locally: ${err.message}`);
          reject(err);
        } else {
          // Return accessible URL (relative path for local server)
          const fileUrl = path.join(config.STORAGE.LOCAL_PATH, fileName);
          logger.info(`File saved locally: ${filePath}`);
          resolve(fileUrl);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Delete or archive file after sending
 * @param {string} fileName - Filename to delete/archive
 * @param {string} uniqueId - Unique identifier for cleanup tracking
 */
exports.deleteOrArchiveFile = async (fileName, uniqueId) => {
  if (config.STORAGE.TYPE === 'local') {
    deleteFromLocalStorage(fileName, uniqueId);
  } else if (config.STORAGE.TYPE === 'firebase') {
    deleteFromFirebase(fileName);
  }
};

/**
 * Delete or archive file from local storage
 * @param {string} fileName - Filename to process
 * @param {string} uniqueId - Unique identifier
 */
function deleteFromLocalStorage(fileName, uniqueId) {
  try {
    const filePath = path.join(config.STORAGE.LOCAL_PATH, fileName);
    
    if (!fs.existsSync(filePath)) {
      logger.warn(`File not found for cleanup: ${fileName}`);
      return;
    }

    if (config.CLEANUP.DELETE_AFTER_SEND) {
      // Archive file first, then schedule deletion after expiry
      const archiveDir = config.CLEANUP.ARCHIVE_PATH;
      if (!fs.existsSync(archiveDir)) {
        fs.mkdirSync(archiveDir, { recursive: true });
      }
      
      const archivePath = path.join(archiveDir, fileName);
      fs.renameSync(filePath, archivePath);
      logger.info(`File archived: ${fileName}`);
      
      // Schedule deletion after URL expiry + buffer
      const cleanupTime = config.URL.EXPIRY_TIME + 5 * 60 * 1000; // 5 min buffer
      setTimeout(() => {
        try {
          if (fs.existsSync(archivePath)) {
            fs.unlinkSync(archivePath);
            logger.info(`Archived file deleted: ${fileName}`);
          }
        } catch (error) {
          logger.error(`Error deleting archived file: ${error.message}`);
        }
      }, cleanupTime);
    } else {
      // Just archive, don't delete
      const archiveDir = config.CLEANUP.ARCHIVE_PATH;
      if (!fs.existsSync(archiveDir)) {
        fs.mkdirSync(archiveDir, { recursive: true });
      }
      
      const archivePath = path.join(archiveDir, fileName);
      fs.renameSync(filePath, archivePath);
      logger.info(`File archived: ${fileName}`);
    }
  } catch (error) {
    logger.error(`Error during file cleanup: ${error.message}`);
  }
}

/**
 * Save PDF to Firebase Storage and return public URL
 * @param {Object} file - Multer file object
 * @param {string} fileName - Filename to save
 * @returns {Promise<string>} Public download URL
 */
async function saveToFirebase(file, fileName) {
  try {
    const bucket = admin.storage().bucket();
    const fileRef = bucket.file(`fee-receipts/${fileName}`);
    
    // Upload file buffer
    await fileRef.save(file.buffer, {
      metadata: {
        contentType: 'application/pdf'
      }
    });
    
    // Make file publicly accessible
    await fileRef.makePublic();
    
    // Get public URL
    const publicUrl = `https://storage.googleapis.com/${config.STORAGE.FIREBASE_STORAGE_BUCKET}/fee-receipts/${fileName}`;
    
    logger.info(`File uploaded to Firebase Storage: ${publicUrl}`);
    return publicUrl;
  } catch (error) {
    logger.error(`Failed to upload to Firebase: ${error.message}`);
    throw error;
  }
}

/**
 * Delete file from Firebase Storage
 * @param {string} fileName - Filename to delete
 */
async function deleteFromFirebase(fileName) {
  try {
    const bucket = admin.storage().bucket();
    const fileRef = bucket.file(`fee-receipts/${fileName}`);
    
    await fileRef.delete();
    logger.info(`File deleted from Firebase Storage: ${fileName}`);
  } catch (error) {
    logger.error(`Failed to delete from Firebase: ${error.message}`);
  }
}
