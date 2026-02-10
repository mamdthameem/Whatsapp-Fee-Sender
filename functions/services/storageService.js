/**
 * Storage service for Cloud Functions - Firebase Storage only, default credentials
 */
const admin = require('firebase-admin');
const config = require('../config');
const logger = require('../utils/logger');

if (!admin.apps.length) {
  admin.initializeApp(); // Uses project default credentials in Cloud Functions
}

const bucket = () => admin.storage().bucket(config.STORAGE.FIREBASE_STORAGE_BUCKET);

exports.savePdf = async (file, fileName) => {
  if (config.STORAGE.TYPE !== 'firebase') {
    throw new Error('Cloud Functions only support Firebase storage');
  }
  try {
    const fileRef = bucket().file(`fee-receipts/${fileName}`);
    await fileRef.save(file.buffer, {
      metadata: { contentType: 'application/pdf' }
    });
    await fileRef.makePublic();
    const publicUrl = `https://storage.googleapis.com/${config.STORAGE.FIREBASE_STORAGE_BUCKET}/fee-receipts/${fileName}`;
    logger.info(`File uploaded to Firebase Storage: ${publicUrl}`);
    return publicUrl;
  } catch (error) {
    logger.error(`Failed to upload to Firebase: ${error.message}`);
    throw error;
  }
};

exports.deleteOrArchiveFile = async (fileName, uniqueId) => {
  try {
    const fileRef = bucket().file(`fee-receipts/${fileName}`);
    await fileRef.delete();
    logger.info(`File deleted from Firebase Storage: ${fileName}`);
  } catch (error) {
    logger.error(`Failed to delete from Firebase: ${error.message}`);
  }
};
