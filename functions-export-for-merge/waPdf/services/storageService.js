/**
 * Storage service - Firebase Storage only (waPdf)
 */
const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const logger = require('../utils/logger');

if (!admin.apps.length) {
  admin.initializeApp();
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
    const objectPath = fileRef.name;
    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${config.STORAGE.FIREBASE_STORAGE_BUCKET}/o/${encodeURIComponent(objectPath)}?alt=media&token=${downloadToken}`;
    logger.info('[storageService] PDF URL length=' + publicUrl.length);
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
