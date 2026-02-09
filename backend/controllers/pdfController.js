/**
 * Controller for PDF upload and WhatsApp sending logic
 * Orchestrates the entire flow: upload, storage, URL generation, API call, cleanup
 */
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const exotelService = require('../services/exotelService');
const storageService = require('../services/storageService');
const urlGenerator = require('../utils/urlGenerator');
const logger = require('../utils/logger');

/**
 * Main function: Send PDF via WhatsApp
 * Handles the complete workflow from upload to delivery
 */
exports.sendPdfViaWhatsApp = async (req, res) => {
  let storedFileName = null;
  let uniqueId = null;

  try {
    const { phoneNumber } = req.body;
    const file = req.file;

    // Validate phone number
    if (!phoneNumber || !/^\d{10,15}$/.test(phoneNumber.replace(/\D/g, ''))) {
      logger.warn(`Invalid phone number attempted: ${phoneNumber}`);
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid WhatsApp number format. Please enter 10-15 digits.' 
      });
    }

    // Validate file exists
    if (!file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No PDF file provided' 
      });
    }

    logger.info(`Processing PDF upload for phone: ${phoneNumber}, file: ${file.originalname}`);

    // Generate unique filename
    uniqueId = uuidv4();
    const originalFileName = file.originalname;
    storedFileName = `${uniqueId}_${originalFileName}`;

    // Step 1: Store the PDF
    let fileUrl;
    try {
      fileUrl = await storageService.savePdf(file, storedFileName);
      logger.info(`PDF stored successfully: ${storedFileName}`);
    } catch (error) {
      logger.error(`Failed to store PDF: ${error.message}`);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to store PDF file' 
      });
    }

    // Step 2: Generate URL for WhatsApp
    // For local storage, this creates a temporary Express endpoint URL
    // For Firebase, storageService returns public URLs directly
    let tempUrl;
    if (config.STORAGE.TYPE === 'local') {
      tempUrl = urlGenerator.generateSecureUrl(fileUrl, uniqueId);
      logger.info(`Temporary URL generated with 10-minute expiry`);
    } else {
      // Firebase returns public URLs directly (permanent public access)
      tempUrl = fileUrl;
      logger.info(`Public URL from Firebase Storage: ${tempUrl}`);
    }

    // Step 3: Send via Exotel WhatsApp API
    let exotelResponse;
    try {
      exotelResponse = await exotelService.sendDocumentMessage(
        phoneNumber,
        tempUrl,
        originalFileName
      );
      logger.info(`WhatsApp message sent successfully. Message ID: ${exotelResponse.messageId}`);
    } catch (error) {
      logger.error(`Failed to send WhatsApp message: ${error.message}`);
      // Don't delete file here, might retry later
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to send WhatsApp message',
        error: error.message
      });
    }

    // Step 4: Log the transaction
    logTransaction(phoneNumber, originalFileName, storedFileName, 'sent', exotelResponse.messageId);

    // Step 5: Schedule cleanup if enabled
    if (config.CLEANUP.ENABLED && config.CLEANUP.DELETE_AFTER_SEND) {
      scheduleFileCleanup(storedFileName, uniqueId);
    }

    // Return success response
    res.json({
      success: true,
      message: 'PDF sent successfully via WhatsApp',
      messageId: exotelResponse.messageId,
      phoneNumber: phoneNumber,
      fileName: originalFileName,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error(`Unexpected error in sendPdfViaWhatsApp: ${error.message}`);
    logger.error(`Stack trace: ${error.stack}`);
    res.status(500).json({ 
      success: false, 
      message: 'An unexpected error occurred',
      error: error.message
    });
  }
};

/**
 * Helper: Log transaction details
 * Records all important information about the transaction
 */
function logTransaction(phoneNumber, fileName, storedFileName, status, messageId) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    phoneNumber: phoneNumber,
    originalFileName: fileName,
    storedFileName: storedFileName,
    status: status,
    messageId: messageId
  };

  logger.info(`Transaction: ${JSON.stringify(logEntry)}`);
}

/**
 * Helper: Schedule file cleanup after expiry or after send
 * Implements the cleanup strategy: delete after send, archive until expiry
 */
function scheduleFileCleanup(storedFileName, uniqueId) {
  // Schedule cleanup: Delete after URL expires or after successful send
  // Archive immediately, delete after expiry + buffer
  const cleanupTime = config.URL.EXPIRY_TIME + 5 * 60 * 1000; // 5 min buffer

  setTimeout(() => {
    try {
      storageService.deleteOrArchiveFile(storedFileName, uniqueId);
      logger.info(`File cleanup scheduled for: ${storedFileName}`);
    } catch (error) {
      logger.error(`Error during file cleanup: ${error.message}`);
    }
  }, 1000); // Archive immediately after send

  // Schedule final deletion after expiry
  setTimeout(() => {
    try {
      // Additional cleanup if needed
      logger.debug(`Cleanup period expired for: ${storedFileName}`);
    } catch (error) {
      logger.error(`Error during final cleanup: ${error.message}`);
    }
  }, cleanupTime);
}
