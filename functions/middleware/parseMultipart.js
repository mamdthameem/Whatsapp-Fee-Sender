/**
 * Parse multipart/form-data for Cloud Functions using busboy.
 * Uses req.rawBody when set (Firebase v2), otherwise reads the request stream once.
 */
const Busboy = require('busboy');
const config = require('../config');
const logger = require('../utils/logger');

const MAX_FILE_SIZE = config.FILE.MAX_SIZE;

function parseMultipart(req, res, next) {
  const contentType = req.headers['content-type'] || '';
  if (!contentType.includes('multipart/form-data')) {
    return next();
  }

  const setupBusboy = (busboy) => {
    req.body = {};
    req.file = null;

    busboy.on('field', (name, value) => {
      req.body[name] = value;
    });

    const filePromises = [];

    busboy.on('file', (fieldname, file, info) => {
      const { filename, encoding, mimeType } = info;
      const chunks = [];
      const fileDone = new Promise((resolve, reject) => {
        file.on('data', (chunk) => chunks.push(chunk));
        file.on('end', () => {
          const buffer = Buffer.concat(chunks);
          req.file = {
            fieldname,
            originalname: filename || 'upload.pdf',
            encoding: encoding || '7bit',
            mimetype: mimeType || 'application/pdf',
            buffer,
            size: buffer.length,
          };
          resolve();
        });
        file.on('error', reject);
      });
      filePromises.push(fileDone);
    });

    busboy.on('error', (err) => {
      logger.error('parseMultipart busboy error: ' + err.message);
      next(err);
    });
    busboy.on('finish', () => {
      Promise.all(filePromises)
        .then(() => next())
        .catch(next);
    });
  };

  // 1) Use rawBody when set by Firebase/Cloud Functions v2 (full buffer)
  if (req.rawBody && Buffer.isBuffer(req.rawBody) && req.rawBody.length > 0) {
    const busboy = Busboy({ headers: req.headers, limits: { fileSize: MAX_FILE_SIZE } });
    setupBusboy(busboy);
    busboy.end(req.rawBody);
    return;
  }

  // 2) Stream directly from request (avoids buffering; works when body not pre-read)
  const busboy = Busboy({ headers: req.headers, limits: { fileSize: MAX_FILE_SIZE } });
  setupBusboy(busboy);
  req.pipe(busboy);
}

module.exports = parseMultipart;
