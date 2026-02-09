# College WhatsApp Fee Receipt System

Complete solution for college admin staff to send fee receipts to students via WhatsApp using Exotel API. The system runs as a Windows Service and provides a simple web interface for sending PDF documents.

## Features

- ✅ Simple web interface for admin staff
- ✅ PDF upload and validation (max 5MB)
- ✅ WhatsApp message delivery via Exotel API
- ✅ Temporary secure URLs (10-minute expiry)
- ✅ Local or AWS S3 storage support
- ✅ Automatic file cleanup and archiving
- ✅ Comprehensive transaction logging
- ✅ Windows Service integration (auto-start on boot)
- ✅ Health check endpoint

## Prerequisites

- **Windows Server** (or Windows 10/11 for testing)
- **Node.js** (v14 or higher) - [Download](https://nodejs.org/)
- **Exotel WhatsApp Business Account** with API access
- **Approved WhatsApp Template** from Exotel

## Installation

### Step 1: Download/Clone Project

Extract the project to a folder on your Windows server, for example:
```
C:\CollegeWhatsAppSystem\
```

### Step 2: Install Dependencies

Open Command Prompt or PowerShell in the project folder and run:

```bash
cd backend
npm install
```

This will install all required Node.js packages.

### Step 3: Configure Environment Variables

1. Copy the example environment file:
   ```bash
   copy env.example backend\.env
   ```

2. Edit `backend\.env` and add your Exotel credentials:
   ```env
   # Exotel WhatsApp API Credentials
   EXOTEL_API_KEY=your_api_key_here
   EXOTEL_API_TOKEN=your_api_token_here
   EXOTEL_SID=your_sid_here
   EXOTEL_SUBDOMAIN=@api.in.exotel.com
   EXOTEL_TEMPLATE_NAME=your_template_name
   EXOTEL_WABA_ID=your_waba_id_here
   
   # Server Configuration
   PORT=3000
   BASE_URL=http://localhost:3000
   
   # Storage (use 'local' or 's3')
   STORAGE_TYPE=local
   ```

### Step 4: Test Locally (Optional)

Before installing as a service, test the application:

```bash
cd backend
node server.js
```

Open browser: http://localhost:3000

If everything works, stop the server (Ctrl+C) and proceed to service installation.

### Step 5: Install as Windows Service

1. **Right-click** `windows-service\install-service.bat`
2. Select **"Run as administrator"**
3. Follow the prompts

The script will:
- Install Node.js dependencies
- Download NSSM (Non-Sucking Service Manager)
- Create Windows Service: `CollegeWhatsAppService`
- Configure auto-start on boot

### Step 6: Start the Service

1. **Right-click** `windows-service\start-service.bat`
2. Select **"Run as administrator"**
3. The service will start automatically

The application is now running and will start automatically on system boot!

## Usage

### Access the Web Interface

Open your web browser and navigate to:
```
http://localhost:3000
```

Or if accessing from another computer on the network:
```
http://[SERVER_IP]:3000
```

### Send a Fee Receipt

1. Enter the student's WhatsApp number (10-digit Indian or international format)
2. Click "Choose File" and select a PDF fee receipt (max 5MB)
3. Click "Send Fee Receipt"
4. Wait for confirmation message

### View Logs

Application logs are stored in:
- `backend\logs\activity.log` - All transactions and errors
- `logs\service.log` - Service output
- `logs\service-error.log` - Service errors

## Service Management

### Start Service
```bash
# Using batch file (as Administrator)
windows-service\start-service.bat

# Or using Windows command
sc start CollegeWhatsAppService
```

### Stop Service
```bash
# Using batch file (as Administrator)
windows-service\stop-service.bat

# Or using Windows command
sc stop CollegeWhatsAppService
```

### Check Service Status
```bash
sc query CollegeWhatsAppService
```

### Uninstall Service
```bash
# Using batch file (as Administrator)
windows-service\uninstall-service.bat
```

## Configuration

### Storage Options

#### Local Storage (Default)
```env
STORAGE_TYPE=local
LOCAL_STORAGE_PATH=./uploads
```
PDFs are stored in the `backend\uploads\` folder.

#### AWS S3 Storage
```env
STORAGE_TYPE=s3
S3_BUCKET=your-bucket-name
S3_REGION=ap-south-1
```
Configure AWS credentials via:
- AWS CLI: `aws configure`
- Environment variables: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`

### File Cleanup

Files are automatically:
1. Archived immediately after successful send
2. Deleted from archive after URL expiry (10 minutes + 5 min buffer)

To disable cleanup:
```env
CLEANUP_ENABLED=false
```

### URL Expiry

Temporary URLs expire after 10 minutes. To change:
```env
# In config.js, URL.EXPIRY_TIME is set to 10 minutes
# Modify backend/config.js if needed
```

## API Endpoints

### POST /api/upload/send-pdf
Send fee receipt via WhatsApp

**Request:**
- `phoneNumber` (string): Student's WhatsApp number
- `pdf` (file): PDF fee receipt file

**Response:**
```json
{
  "success": true,
  "message": "PDF sent successfully via WhatsApp",
  "messageId": "msg_id_123",
  "phoneNumber": "919876543210",
  "fileName": "fee_receipt.pdf",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### GET /api/health
Health check endpoint

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:00Z",
  "storage": "local",
  "environment": "production"
}
```

### GET /download/:uniqueId
Download PDF via temporary URL (local storage only)

## WhatsApp Template Requirements

Your Exotel WhatsApp template must be:
- **Category:** Utility
- **Header Type:** Document
- **Body Text:** "Please find attached your fee receipt."
- **No variables** required in body

Template name must match `EXOTEL_TEMPLATE_NAME` in `.env` file.

## Troubleshooting

### Service Won't Start

1. **Check Node.js installation:**
   ```bash
   node --version
   ```

2. **Check .env file exists:**
   - File should be at `backend\.env`
   - Verify all Exotel credentials are filled

3. **Check port availability:**
   - Port 3000 must be free
   - Change PORT in `.env` if needed

4. **View error logs:**
   ```bash
   type logs\service-error.log
   type backend\logs\activity.log
   ```

### WhatsApp Not Sending

1. **Verify Exotel credentials:**
   - Check API key, token, and SID in `.env`
   - Ensure credentials are correct

2. **Check template name:**
   - Template name must match exactly
   - Template must be approved in Exotel dashboard

3. **Verify phone number format:**
   - Should be 10-15 digits
   - International format: +91XXXXXXXXXX

4. **Check Exotel account:**
   - Verify account has sufficient credits
   - Check template approval status

### Files Not Being Cleaned Up

1. **Check cleanup is enabled:**
   ```env
   CLEANUP_ENABLED=true
   ```

2. **Verify folder permissions:**
   - Service must have write access to `uploads\` and `archives\` folders

3. **Check logs for errors:**
   ```bash
   type backend\logs\activity.log
   ```

### Frontend Not Loading

1. **Check service is running:**
   ```bash
   sc query CollegeWhatsAppService
   ```

2. **Verify port:**
   - Default is 3000
   - Check firewall allows connections

3. **Try accessing health endpoint:**
   ```
   http://localhost:3000/api/health
   ```

## Project Structure

```
college-whatsapp-system/
├── backend/
│   ├── server.js              # Main Express server
│   ├── config.js              # Configuration
│   ├── package.json           # Dependencies
│   ├── routes/
│   │   └── upload.js         # Upload endpoint
│   ├── controllers/
│   │   └── pdfController.js  # Business logic
│   ├── services/
│   │   ├── exotelService.js  # Exotel API
│   │   └── storageService.js # File storage
│   ├── middleware/
│   │   └── fileValidation.js # File validation
│   ├── utils/
│   │   ├── logger.js         # Logging
│   │   └── urlGenerator.js   # URL management
│   ├── uploads/              # Local PDF storage
│   ├── archives/             # Archived PDFs
│   └── logs/                  # Application logs
├── frontend/
│   └── index.html            # Admin interface
├── windows-service/
│   ├── install-service.bat   # Install service
│   ├── start-service.bat     # Start service
│   ├── stop-service.bat      # Stop service
│   └── uninstall-service.bat # Remove service
├── env.example               # Environment template
└── README.md                 # This file
```

## Security Considerations

1. **Environment Variables:** Never commit `.env` file to version control
2. **Temporary URLs:** PDFs accessible for only 10 minutes
3. **File Validation:** Only PDF files accepted, max 5MB
4. **Phone Validation:** Requires valid format
5. **Auto-Cleanup:** Files deleted after expiry
6. **Logging:** All transactions logged with timestamps

## Support

### Exotel API Documentation
- [Exotel Send Messages API](https://developer.exotel.com/api/send-messages-api)
- [Exotel WhatsApp Templates](https://developer.exotel.com/api/create-whatsapp-templates)

### Common Issues

**Q: Service installs but won't start**
A: Check `.env` file exists and has valid credentials. View `logs\service-error.log` for details.

**Q: Can't access from other computers**
A: Check Windows Firewall allows port 3000. Update `BASE_URL` in `.env` to server's IP address.

**Q: PDFs not being sent**
A: Verify Exotel template is approved and template name matches exactly in `.env`.

## License

This project is for internal college use.

## Version

Version 1.0.0 - Initial release
