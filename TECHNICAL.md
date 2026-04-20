# Technical Reference — Digital Fee Receipt Portal

This document explains exactly how the system works, what every part does, and how to maintain or modify it. Written for the developer's own reference.

---

## How the System Works (End-to-End Flow)

```
Staff browser
    │
    │  1. Staff uploads PDF + phone number via the webpage
    ▼
Firebase Hosting (wa-pdf.web.app)
    │
    │  2. Browser sends the PDF and number to the backend API
    ▼
Firebase Cloud Function ("api")
    │
    │  3. Function receives the file, validates it (PDF? Under 5MB?)
    │  4. Uploads PDF to Firebase Cloud Storage (gets a public URL)
    │  5. Sends that URL + template name to Exotel's WhatsApp API
    ▼
Exotel WhatsApp API
    │
    │  6. Exotel fetches the PDF from the storage URL
    │  7. Sends it to the student's WhatsApp as a document message
    ▼
Student's WhatsApp
    │
    │  8. Student receives PDF receipt
    ▼
Firebase Storage cleanup
    │  9. PDF is deleted from storage after 2 hours (configurable)
```

---

## Project Structure Explained

```
wa-pdf-webpage/
│
├── frontend/                   ← What users see in the browser
│   ├── index.html              ← The entire UI (HTML + CSS in one file)
│   ├── app.ts                  ← TypeScript source (edit this when changing JS logic)
│   ├── app.js                  ← Compiled JS (this is what the browser actually runs)
│   ├── tsconfig.json           ← Tells TypeScript compiler to only look at app.ts
│   └── assets/
│       ├── college-logo.png    ← Wide navbar logo (appears in left panel)
│       └── ssec-logo.jpg       ← Round SSEC badge (appears as browser tab favicon)
│
├── functions/                  ← The backend, deployed as Firebase Cloud Functions
│   ├── index.js                ← Entry point: defines the "api" and "downloadFee" functions
│   ├── config.js               ← Reads all settings from .env or Firebase config
│   ├── .env                    ← Secret credentials (NOT committed to git)
│   ├── controllers/
│   │   └── pdfController.js    ← Handles the /api/upload/send-pdf request
│   ├── routes/
│   │   └── upload.js           ← Defines the API route
│   ├── services/
│   │   ├── exotelService.js    ← Builds and sends the WhatsApp API call to Exotel
│   │   └── storageService.js   ← Uploads/deletes PDF from Firebase Storage
│   ├── middleware/
│   │   ├── fileValidation.js   ← Checks file is PDF and under 5MB
│   │   └── parseMultipart.js   ← Parses the multipart form data (file upload)
│   ├── utils/
│   │   ├── logger.js           ← Logging helper (writes to Cloud Functions logs)
│   │   └── urlGenerator.js     ← Generates the download proxy URL for WhatsApp
│   └── downloadFee.js          ← Separate function: streams PDF to WhatsApp without redirect
│
├── backend/                    ← Local Express server for development/testing only
│   └── (same structure as functions/ but uses local file storage)
│
├── firebase.json               ← Firebase deploy config (which folder = frontend, etc.)
├── .firebaserc                 ← Firebase project name (ssec-outing / wa-pdf)
├── storage.rules               ← Firebase Storage access rules
├── .gitignore                  ← Files excluded from git (secrets, node_modules, logs)
├── env.example                 ← Template showing what .env variables are needed
└── package.json                ← Root scripts (npm install installs both functions + backend)
```

---

## Environment Variables (functions/.env)

These are the secret settings that the deployed backend reads. Never commit this file.

| Variable | What it is | Current value |
|---|---|---|
| `EXOTEL_API_KEY` | Exotel API username | 
| `EXOTEL_API_TOKEN` | Exotel API password | 
| `EXOTEL_SID` | Your Exotel account SID | `sreesakthiengineeringcollege1` |
| `EXOTEL_TEMPLATE_NAME` | WhatsApp template name (must match Exotel dashboard) | `college_fee_receipt_2` |
| `EXOTEL_FROM_NUMBER` | Sender WhatsApp number | `919442027368` |
| `EXOTEL_WABA_ID` | WhatsApp Business Account ID | 
| `STORAGE_BUCKET` | Firebase Storage bucket name | `ssec-outing.firebasestorage.app` |
| `BASE_URL` | The live website URL | `https://wa-pdf.web.app` |

**Important:** After changing anything in `functions/.env`, you must run `firebase deploy --only functions` for the change to take effect on the live site.

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | Vanilla TypeScript + HTML/CSS | No framework needed for a single form |
| Backend | Node.js 20 + Express.js | Handles file upload and API calls |
| Cloud runtime | Firebase Cloud Functions (2nd gen) | Serverless, scales automatically, no server to manage |
| Static hosting | Firebase Hosting | Serves the frontend, routes /api to the function |
| File storage | Firebase Cloud Storage | Stores PDFs temporarily with public URLs for WhatsApp |
| WhatsApp | Exotel WhatsApp Business API v2 | Sends the document message to the student |

---

## Deploy Commands

```bash
# Deploy EVERYTHING (frontend + backend) — use after any change
firebase deploy

# Deploy only the frontend (index.html, app.js, assets)
# Use when: you only changed UI files
firebase deploy --only hosting

# Deploy only the backend (functions/)
# Use when: you changed config.js, exotelService.js, .env, or any functions/ file
firebase deploy --only functions
```

After changing `functions/.env` (like the template name), always use `firebase deploy --only functions`.

---

## API Endpoint

The frontend calls this single endpoint:

```
POST /api/upload/send-pdf
Content-Type: multipart/form-data

Fields:
  phoneNumber  (string)  — 10-digit Indian mobile number
  pdf          (file)    — PDF file, max 5MB
```

Response (success):
```json
{ "success": true, "messageId": "SM...", "phoneNumber": "919876543210" }
```

Response (failure):
```json
{ "success": false, "message": "Error description here" }
```

---

## Phone Number Handling

- User types 10 digits (the +91 prefix is visual-only in the UI)
- `formatPhoneNumber()` in `exotelService.js` prepends `91` if the number is 10 digits
- Final number sent to Exotel: `919876543210` (12 digits, no +, no spaces)

---

## File Storage Flow

1. PDF uploaded to Firebase Storage at path: `fee-receipts/{uuid}_{original-filename}.pdf`
2. A public download URL is generated
3. That URL is passed to Exotel — Exotel fetches the PDF directly from this URL
4. A cleanup timer deletes the file from storage after **2 hours** (configurable via `CLEANUP_DELAY_MS`)

The `downloadFee` Cloud Function acts as a proxy — it streams the PDF directly, avoiding Firebase Storage's redirect/token behaviour which WhatsApp cannot follow.

---

## Common Issues & Fixes

| Problem | Likely cause | Fix |
|---|---|---|
| Template not found error | Template name in `.env` doesn't match Exotel dashboard | Update `EXOTEL_TEMPLATE_NAME` in `functions/.env`, redeploy functions |
| Message sent but wrong body text | Old template is still active | Update template on Exotel dashboard or wait for new template approval |
| PDF not delivered, only text | Document URL unreachable by Exotel | Check Firebase Storage rules allow public read |
| API returns 401 | Wrong API key/token | Update `EXOTEL_API_KEY` and `EXOTEL_API_TOKEN` in `functions/.env` |
| Works locally but not deployed | `.env` change not deployed | Run `firebase deploy --only functions` after every `.env` change |

---

## Git & Version Control

- Repository is on GitHub under the `main` branch
- Sensitive files (`.env`, `firebase-service-account.json`, `node_modules`, `logs`) are excluded via `.gitignore`
- Firebase credentials are never committed
- After any code change, commit and push, then run `firebase deploy`

---

*Last updated: April 2026*
