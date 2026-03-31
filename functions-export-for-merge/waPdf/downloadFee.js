/**
 * Firebase Cloud Function: downloadFee (waPdf)
 * Proxy that streams PDFs from Firebase Storage for WhatsApp (Exotel) document delivery.
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
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.status(405).set('Content-Type', 'text/plain').send('Method Not Allowed');
    return;
  }

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

  if (fileId.includes('..') || fileId.startsWith('/')) {
    res.status(400).set('Content-Type', 'text/plain').send('Invalid fileId');
    return;
  }

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

exports.downloadFee = onRequest({ invoker: 'public' }, handleDownloadFee);
