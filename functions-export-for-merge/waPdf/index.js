/**
 * waPdf module entry - WhatsApp Fee Receipt.
 * Export for use in the other project's main functions/index.js:
 *
 *   const waPdf = require('./waPdf');
 *   exports.waPdfApi = onRequest(waPdf.app);
 *   exports.downloadFee = waPdf.downloadFee;
 */
const app = require('./app');
const { downloadFee } = require('./downloadFee');

module.exports = {
  app,
  downloadFee
};
