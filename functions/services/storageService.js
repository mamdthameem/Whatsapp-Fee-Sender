/**
 * Storage service for Cloud Functions - Firebase Storage only, default credentials
 * Builds download URL with token so the link works (getDownloadURL often fails when
 * metadata is set via GCS API from Cloud Functions).
 */
const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');
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
    const downloadToken = uuidv4();
    await fileRef.save(file.buffer, {
      metadata: { contentType: 'application/pdf' }
    });
    await fileRef.setMetadata({
      metadata: { firebaseStorageDownloadTokens: downloadToken }
    });
    await fileRef.makePublic();
    // Build URL with the token we set. getDownloadURL() often fails in CF because
    // Firebase REST API may not see GCS-set metadata; using our token guarantees a working link.
    const objectPath = fileRef.name; // e.g. "fee-receipts/uuid_filename.pdf"
    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${config.STORAGE.FIREBASE_STORAGE_BUCKET}/o/${encodeURIComponent(objectPath)}?alt=media&token=${downloadToken}`;
    logger.info('[storageService] PDF URL (with token) length=' + publicUrl.length + ': ' + publicUrl);
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
