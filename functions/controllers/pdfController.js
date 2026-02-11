/**
 * PDF upload and WhatsApp send controller (Cloud Functions)
 */
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const exotelService = require('../services/exotelService');
const storageService = require('../services/storageService');
const urlGenerator = require('../utils/urlGenerator');
const logger = require('../utils/logger');

function logTransaction(phoneNumber, fileName, storedFileName, status, messageId) {
  logger.info(`Transaction: ${JSON.stringify({
    timestamp: new Date().toISOString(),
    phoneNumber,
    originalFileName: fileName,
    storedFileName,
    status,
    messageId
  })}`);
}

function scheduleFileCleanup(storedFileName, uniqueId) {
  const delayMs = config.CLEANUP.DELAY_MS || 2 * 60 * 60 * 1000;
  const delayMin = Math.round(delayMs / 60000);
  logger.info(`File cleanup scheduled for ${storedFileName} in ${delayMin} minutes`);
  setTimeout(() => {
    storageService.deleteOrArchiveFile(storedFileName, uniqueId).catch(() => {});
    logger.info(`File cleanup ran for: ${storedFileName}`);
  }, delayMs);
}

exports.sendPdfViaWhatsApp = async (req, res) => {
  let storedFileName = null;
  let uniqueId = null;

  try {
    const { phoneNumber } = req.body;
    const file = req.file;

    if (!phoneNumber || !/^\d{10,15}$/.test(phoneNumber.replace(/\D/g, ''))) {
      logger.warn(`Invalid phone number attempted: ${phoneNumber}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid WhatsApp number format. Please enter 10-15 digits.'
      });
    }
    if (!file) {
      return res.status(400).json({ success: false, message: 'No PDF file provided' });
    }

    logger.info(`Processing PDF upload for phone: ${phoneNumber}, file: ${file.originalname}`);
    uniqueId = uuidv4();
    const originalFileName = file.originalname;
    storedFileName = `${uniqueId}_${originalFileName}`;

    try {
      await storageService.savePdf(file, storedFileName);
      const fileIdForLog = `fee-receipts/${storedFileName}`;
      logger.info(`PDF stored successfully. path=${fileIdForLog} bucket=${config.STORAGE.FIREBASE_STORAGE_BUCKET}`);
    } catch (error) {
      logger.error(`Failed to store PDF: ${error.message}`);
      return res.status(500).json({ success: false, message: 'Failed to store PDF file' });
    }

    // Use proxy URL for WhatsApp (GET → PDF stream, no redirect/token). Exotel fetches this URL.
    const fileId = `fee-receipts/${storedFileName}`;
    const documentUrl = `${config.URL.DOWNLOAD_PROXY_BASE_URL}?fileId=${encodeURIComponent(fileId)}`;
    logger.info(`Document URL (proxy): ${documentUrl}`);

    let exotelResponse;
    try {
      exotelResponse = await exotelService.sendDocumentMessage(phoneNumber, documentUrl, originalFileName);
      logger.info(`WhatsApp message sent successfully. Message ID: ${exotelResponse.messageId}`);
    } catch (error) {
      logger.error(`Failed to send WhatsApp message: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Failed to send WhatsApp message',
        error: error.message
      });
    }

    logTransaction(phoneNumber, originalFileName, storedFileName, 'sent', exotelResponse.messageId);

    if (config.CLEANUP.ENABLED && config.CLEANUP.DELETE_AFTER_SEND) {
      scheduleFileCleanup(storedFileName, uniqueId);
    }

    res.json({
      success: true,
      message: 'PDF sent successfully via WhatsApp',
      messageId: exotelResponse.messageId,
      phoneNumber,
      fileName: originalFileName,
      documentUrl,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Unexpected error in sendPdfViaWhatsApp: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred',
      error: error.message
    });
  }
};
