/**
 * API route for PDF upload and WhatsApp send (Cloud Functions)
 * Uses parseMultipart middleware (in index.js) instead of multer for GCF compatibility.
 */
const express = require('express');
const router = express.Router();
const fileValidation = require('../middleware/fileValidation');
const pdfController = require('../controllers/pdfController');

router.post('/send-pdf', fileValidation, pdfController.sendPdfViaWhatsApp);

module.exports = router;
