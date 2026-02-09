/**
 * Service to handle Exotel WhatsApp API calls
 * Sends document messages via Exotel's WhatsApp Business API
 */
const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Send document message via Exotel WhatsApp API
 * @param {string} phoneNumber - Destination WhatsApp number
 * @param {string} documentUrl - URL to the PDF document
 * @param {string} fileName - Original filename for display
 * @returns {Promise<Object>} Response with message ID and status
 */
exports.sendDocumentMessage = async (phoneNumber, documentUrl, fileName) => {
  try {
    // Format phone number: ensure it's in international format
    const formattedNumber = formatPhoneNumber(phoneNumber);

    // Prepare API endpoint
    const apiKey = config.EXOTEL.API_KEY;
    const apiToken = config.EXOTEL.API_TOKEN;
    const sid = config.EXOTEL.SID;
    
    // Construct Exotel API endpoint
    // Format: https://api.exotel.com/v2/accounts/{sid}/messages
    // Use Basic Auth with API key as username and API token as password
    const endpoint = `https://api.exotel.com/v2/accounts/${sid}/messages`;

    // Sanitize filename (remove special characters that might cause issues)
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    
    // Use document URL as-is (Firebase URLs are already properly formatted)
    // Only encode if it's not already a valid URL
    const finalDocumentUrl = documentUrl.startsWith('http') ? documentUrl : encodeURI(documentUrl);
    
    // Prepare request payload according to Exotel WhatsApp API format
    // Format: from (default), to (user entered), template with document header
    const payload = {
      custom_data: `Fee Receipt - ${sanitizedFileName}`,
      whatsapp: {
        messages: [
          {
            from: config.EXOTEL.FROM_NUMBER, // Default sender: +91 94420 27368
            to: formattedNumber, // User entered number
            content: {
              type: 'template',
              template: {
                name: config.EXOTEL.TEMPLATE_NAME, // Default: college_fee_receipt
                language: {
                  policy: 'deterministic',
                  code: 'en'
                },
                components: [
                  {
                    type: 'header',
                    parameters: [
                      {
                        type: 'document',
                        document: {
                          link: finalDocumentUrl,
                          filename: sanitizedFileName
                        }
                      }
                    ]
                  }
                ]
              }
            }
          }
        ]
      }
    };

    // Validate document URL before sending
    if (!documentUrl || !documentUrl.startsWith('http')) {
      throw new Error(`Invalid document URL: ${documentUrl}`);
    }

    // Validate URL is accessible (quick HEAD request)
    try {
      const urlCheck = await axios.head(documentUrl, { timeout: 5000 });
      logger.info(`Document URL is accessible (status: ${urlCheck.status})`);
    } catch (urlError) {
      logger.warn(`Warning: Document URL might not be accessible: ${urlError.message}`);
      // Continue anyway - Exotel will validate it
    }

    logger.info(`Sending WhatsApp message to ${formattedNumber} via Exotel`);
    logger.info(`Document URL: ${documentUrl}`);
    logger.info(`Document filename: ${fileName}`);
    logger.info(`API Endpoint: ${endpoint.replace(/:[^:@]+@/, ':****@')}`); // Hide credentials in logs
    logger.info(`Full payload: ${JSON.stringify(payload, null, 2)}`);

    // Make API call to Exotel with Basic Auth
    // API key as username, API token as password
    const response = await axios.post(endpoint, payload, {
      headers: {
        'Content-Type': 'application/json'
      },
      auth: {
        username: apiKey,
        password: apiToken
      },
      timeout: 30000 // 30 second timeout
    });

    logger.info(`Exotel API response: ${JSON.stringify(response.data)}`);

    // Extract message ID from response
    // Response structure may vary, adjust based on actual Exotel API response
    const messageId = response.data?.data?.messages?.[0]?.id 
      || response.data?.messages?.[0]?.id 
      || response.data?.messageId 
      || 'unknown';

    return {
      success: true,
      messageId: messageId,
      status: 'sent',
      response: response.data
    };

  } catch (error) {
    logger.error(`Exotel API Error: ${error.message}`);
    logger.error(`Error stack: ${error.stack}`);
    
    // Enhanced error logging - capture ALL details
    if (error.response) {
      logger.error(`=== EXOTEL API ERROR RESPONSE ===`);
      logger.error(`Response status: ${error.response.status}`);
      logger.error(`Response status text: ${error.response.statusText}`);
      logger.error(`Response headers: ${JSON.stringify(error.response.headers, null, 2)}`);
      logger.error(`Response data (full): ${JSON.stringify(error.response.data, null, 2)}`);
      
      // Try to extract detailed error message from various possible fields
      const responseData = error.response.data || {};
      const errorMessage = responseData.message 
        || responseData.error 
        || responseData.error_description
        || responseData.errors?.[0]?.message
        || responseData.errors?.[0]?.detail
        || JSON.stringify(responseData)
        || error.message;
      
      logger.error(`Extracted error message: ${errorMessage}`);
      logger.error(`=== END EXOTEL ERROR RESPONSE ===`);
      
      throw new Error(`Failed to send WhatsApp message: ${errorMessage}`);
    }
    
    if (error.request) {
      logger.error(`=== REQUEST ERROR (No Response) ===`);
      logger.error(`Request URL: ${endpoint}`);
      logger.error(`Request method: POST`);
      logger.error(`Request payload: ${JSON.stringify(payload, null, 2)}`);
      logger.error(`Error: ${error.message}`);
      logger.error(`=== END REQUEST ERROR ===`);
    }
    
    // If it's a different type of error
    logger.error(`Error type: ${error.constructor.name}`);
    logger.error(`Full error object: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`);
    
    throw new Error(`Failed to send WhatsApp message: ${error.message}`);
  }
};

/**
 * Format phone number to international format
 * Handles Indian numbers (10-digit) and international formats
 * @param {string} phoneNumber - Raw phone number input
 * @returns {string} Formatted international phone number
 */
function formatPhoneNumber(phoneNumber) {
  // Remove all non-digit characters
  let cleaned = phoneNumber.replace(/\D/g, '');

  // If starts with 0, remove it (Indian numbers)
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }

  // Add country code if not present (assume India +91 for 10-digit numbers)
  if (!cleaned.startsWith('91') && cleaned.length === 10) {
    cleaned = '91' + cleaned;
  }

  // Ensure minimum length
  if (cleaned.length < 10) {
    throw new Error('Phone number too short');
  }

  // Maximum length check
  if (cleaned.length > 15) {
    cleaned = cleaned.substring(0, 15);
  }

  return cleaned;
}
