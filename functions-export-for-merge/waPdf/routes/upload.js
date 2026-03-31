/**
 * API route for PDF upload and WhatsApp send (waPdf)
 */
const express = require('express');
const router = express.Router();
const fileValidation = require('../middleware/fileValidation');
const pdfController = require('../controllers/pdfController');

router.post('/send-pdf', fileValidation, pdfController.sendPdfViaWhatsApp);

module.exports = router;
