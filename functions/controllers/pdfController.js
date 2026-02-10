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
  const cleanupTime = config.URL.EXPIRY_TIME + 5 * 60 * 1000;
  setTimeout(() => {
    storageService.deleteOrArchiveFile(storedFileName, uniqueId).catch(() => {});
    logger.info(`File cleanup scheduled for: ${storedFileName}`);
  }, 1000);
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

    let fileUrl;
    try {
      fileUrl = await storageService.savePdf(file, storedFileName);
      logger.info(`PDF stored successfully: ${storedFileName}`);
    } catch (error) {
      logger.error(`Failed to store PDF: ${error.message}`);
      return res.status(500).json({ success: false, message: 'Failed to store PDF file' });
    }

    const tempUrl = config.STORAGE.TYPE === 'local'
      ? urlGenerator.generateSecureUrl(fileUrl, uniqueId)
      : fileUrl;
    logger.info(`Public URL from Firebase Storage: ${tempUrl}`);

    let exotelResponse;
    try {
      exotelResponse = await exotelService.sendDocumentMessage(phoneNumber, tempUrl, originalFileName);
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
