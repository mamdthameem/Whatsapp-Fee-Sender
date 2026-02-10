/**
 * Exotel WhatsApp API service (Cloud Functions)
 */
const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');

function formatPhoneNumber(phoneNumber) {
  let cleaned = phoneNumber.replace(/\D/g, '');
  if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
  if (!cleaned.startsWith('91') && cleaned.length === 10) cleaned = '91' + cleaned;
  if (cleaned.length < 10) throw new Error('Phone number too short');
  if (cleaned.length > 15) cleaned = cleaned.substring(0, 15);
  return cleaned;
}

exports.sendDocumentMessage = async (phoneNumber, documentUrl, fileName) => {
  try {
    const formattedNumber = formatPhoneNumber(phoneNumber);
    const { API_KEY: apiKey, API_TOKEN: apiToken, SID: sid } = config.EXOTEL;
    const endpoint = `https://api.exotel.com/v2/accounts/${sid}/messages`;
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const finalDocumentUrl = documentUrl.startsWith('http') ? documentUrl : encodeURI(documentUrl);

    if (!documentUrl || !documentUrl.startsWith('http')) {
      throw new Error(`Invalid document URL: ${documentUrl}`);
    }

    const payload = {
      custom_data: `Fee Receipt - ${sanitizedFileName}`,
      whatsapp: {
        messages: [{
          from: config.EXOTEL.FROM_NUMBER,
          to: formattedNumber,
          content: {
            type: 'template',
            template: {
              name: config.EXOTEL.TEMPLATE_NAME,
              language: { policy: 'deterministic', code: 'en' },
              components: [
                {
                  type: 'header',
                  parameters: [{
                    type: 'document',
                    document: { link: finalDocumentUrl, filename: sanitizedFileName }
                  }]
                },
                {
                  type: 'body',
                  parameters: []
                }
              ]
            }
          }
        }]
      }
    };

    // Add optional status_callback if configured
    if (config.EXOTEL.STATUS_CALLBACK) {
      payload.status_callback = config.EXOTEL.STATUS_CALLBACK;
    }

    logger.info(`Sending WhatsApp message to ${formattedNumber}`);
    logger.debug(`Payload: ${JSON.stringify(payload, null, 2)}`);

    const response = await axios.post(endpoint, payload, {
      headers: { 'Content-Type': 'application/json' },
      auth: { username: apiKey, password: apiToken },
      timeout: 30000
    });

    // Parse response according to actual Exotel API format
    // Response structure: response.data.response.whatsapp.messages[0].data.sid
    const messageData = response.data?.response?.whatsapp?.messages?.[0];
    const messageId = messageData?.data?.sid || messageData?.sid || response.data?.request_id || 'unknown';
    const status = messageData?.status || 'success';

    logger.info(`WhatsApp message sent. Message ID: ${messageId}, Status: ${status}`);

    return { 
      success: true, 
      messageId, 
      status,
      requestId: response.data?.request_id,
      response: response.data 
    };
  } catch (error) {
    logger.error(`Exotel API Error: ${error.message}`);
    if (error.response) {
      logger.error(`Response status: ${error.response.status}`);
      logger.error(`Response data: ${JSON.stringify(error.response.data, null, 2)}`);
      
      // Try to extract meaningful error message
      const errorData = error.response.data;
      const errorMsg = errorData?.message 
        || errorData?.error 
        || errorData?.error_data?.message
        || errorData?.response?.whatsapp?.messages?.[0]?.error_data?.message
        || JSON.stringify(errorData);
      
      throw new Error(`Failed to send WhatsApp message: ${errorMsg}`);
    }
    throw new Error(`Failed to send WhatsApp message: ${error.message}`);
  }
};
