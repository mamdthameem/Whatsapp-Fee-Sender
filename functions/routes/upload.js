/**
 * API route for PDF upload and WhatsApp send (Cloud Functions)
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const config = require('../config');
const fileValidation = require('../middleware/fileValidation');
const pdfController = require('../controllers/pdfController');
const logger = require('../utils/logger');

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (config.FILE.ALLOWED_EXT.includes(ext)) cb(null, true);
    else cb(new Error('Only PDF files are allowed'));
  },
  limits: { fileSize: config.FILE.MAX_SIZE }
});

router.post('/send-pdf', upload.single('pdf'), fileValidation, pdfController.sendPdfViaWhatsApp);

module.exports = router;
