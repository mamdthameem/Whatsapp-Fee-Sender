/**
 * Firebase Cloud Function: downloadFee
 *
 * Proxy that streams PDFs from Firebase Storage for WhatsApp (Exotel) document delivery.
 * WhatsApp requires: HTTPS GET → PDF bytes → 200 OK with no redirects, tokens, or auth.
 *
 * Why streaming: We pipe the Storage file stream directly to the HTTP response so the
 * PDF is not loaded into memory. This keeps the function fast and within memory limits.
 *
 * Why headers matter for WhatsApp: Exotel/WhatsApp fetches the document URL and expects
 * a normal file download: Content-Type and Content-Disposition tell the client it's a
 * PDF with a suggested filename. Without these, some clients may not treat it as a document.
 */
const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const config = require('./config');
const logger = require('./utils/logger');

if (!admin.apps.length) {
  admin.initializeApp();
}

const PDF_CONTENT_TYPE = 'application/pdf';
const DISPOSITION_FILENAME = 'Fee_Receipt.pdf';

async function handleDownloadFee(req, res) {
  // Allow GET (WhatsApp fetches document) and HEAD (Exotel pre-check)
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.status(405).set('Content-Type', 'text/plain').send('Method Not Allowed');
    return;
  }

  // Parse fileId from query (v2 request may expose query differently; support both)
  let fileId = (req.query && typeof req.query.fileId === 'string') ? req.query.fileId : '';
  if (!fileId && typeof req.url === 'string') {
    const q = req.url.split('?')[1];
    if (q) {
      const params = new URLSearchParams(q);
      fileId = params.get('fileId') || '';
    }
  }
  fileId = fileId.trim();
  if (fileId && fileId.includes('%')) {
    try { fileId = decodeURIComponent(fileId); } catch (e) { /* keep as-is */ }
  }
  if (!fileId) {
    res.status(400).set('Content-Type', 'text/plain').send('Missing fileId');
    return;
  }

  // Prevent path traversal (e.g. fileId=../../../etc/passwd)
  if (fileId.includes('..') || fileId.startsWith('/')) {
    res.status(400).set('Content-Type', 'text/plain').send('Invalid fileId');
    return;
  }

  // Only allow files under fee-receipts/
  if (!fileId.startsWith('fee-receipts/')) {
    res.status(400).set('Content-Type', 'text/plain').send('Invalid fileId path');
    return;
  }

  const bucketName = config.STORAGE.FIREBASE_STORAGE_BUCKET;
  try {
    const bucket = admin.storage().bucket(bucketName);
    const file = bucket.file(fileId);

    const [exists] = await file.exists();
    if (!exists) {
      logger.warn(`downloadFee: file not found. bucket=${bucketName} fileId=${fileId}`);
      // List first few files under fee-receipts/ to help debug path mismatch
      try {
        const [files] = await bucket.getFiles({ prefix: 'fee-receipts/', maxResults: 5 });
        const names = (files || []).map(f => f.name);
        logger.warn(`downloadFee: sample files in bucket: ${JSON.stringify(names)}`);
      } catch (listErr) {
        logger.warn(`downloadFee: list failed: ${listErr.message}`);
      }
      res.status(404).set('Content-Type', 'text/plain').send('File not found');
      return;
    }

    if (req.method === 'HEAD') {
      res.set({
        'Content-Type': PDF_CONTENT_TYPE,
        'Content-Disposition': `attachment; filename="${DISPOSITION_FILENAME}"`
      });
      res.status(200).end();
      return;
    }

    // Stream the file directly to the response (no redirect, no token in URL).
    // This is what WhatsApp/Exotel need: GET → PDF bytes → 200 OK.
    res.set({
      'Content-Type': PDF_CONTENT_TYPE,
      'Content-Disposition': `attachment; filename="${DISPOSITION_FILENAME}"`
    });

    const readStream = file.createReadStream();
    readStream.on('error', (err) => {
      logger.error(`downloadFee stream error: ${err.message}`);
      if (!res.headersSent) res.status(500).set('Content-Type', 'text/plain').send('Failed to stream file');
      else res.end();
    });
    readStream.pipe(res);
  } catch (error) {
    logger.error(`downloadFee error: ${error.message}`);
    if (!res.headersSent) {
      res.status(500).set('Content-Type', 'text/plain').send('Internal error');
    }
  }
}

// invoker: 'public' allows unauthenticated access (browser, Exotel, WhatsApp).
// Without this, Google Cloud returns 403 Forbidden for anonymous callers.
exports.downloadFee = onRequest({ invoker: 'public' }, handleDownloadFee);
