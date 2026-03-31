# WhatsApp Fee Receipt (waPdf) – Functions to merge into the other website

Copy the **`waPdf`** folder into your other website’s **`functions`** directory so both apps run in the same Firebase project.

---

## 1. Copy the folder

Copy the entire **`waPdf`** folder into your other project’s **`functions`** directory:

```
your-other-project/
  functions/
    index.js          ← your existing main entry
    ...               ← your existing files
    waPdf/            ← paste the whole waPdf folder here
      app.js
      config.js
      downloadFee.js
      index.js
      controllers/
      middleware/
      routes/
      services/
      utils/
```

---

## 2. Wire waPdf into your main `functions/index.js`

In your **main** `functions/index.js`, add:

```js
const { onRequest } = require('firebase-functions/v2/https');

// Your existing app and exports...
// const app = express();
// exports.yourapp = onRequest(app);

// WhatsApp Fee Receipt (waPdf) – add these two lines:
const waPdf = require('./waPdf');
exports.waPdfApi = onRequest(waPdf.app);
exports.downloadFee = waPdf.downloadFee;
```

So you keep all your current exports and add **`waPdfApi`** and **`downloadFee`**.

---

## 3. Add npm dependencies (if missing)

In **`functions/package.json`**, ensure these are present (add any that you don’t already have):

```json
{
  "dependencies": {
    "axios": "^1.6.0",
    "busboy": "^1.6.0",
    "cors": "^2.8.5",
    "express": "^4.18.2",
    "firebase-admin": "^12.0.0",
    "firebase-functions": "^4.5.0",
    "raw-body": "^3.0.2",
    "uuid": "^9.0.0"
  }
}
```

Then run:

```bash
cd functions
npm install
```

---

## 4. Hosting rewrites for the fee receipt site

For the **fee receipt** Hosting site (e.g. `wa-pdf.web.app`), your `firebase.json` should route API and download to these functions:

```json
{
  "hosting": {
    "sites": {
      "wa-pdf": {
        "public": "frontend",
        "rewrites": [
          { "source": "/api/**", "function": "waPdfApi" },
          { "source": "**", "destination": "/index.html" }
        ]
      }
    }
  }
}
```

- **`/api/upload/send-pdf`** and **`/api/health`** → handled by **`waPdfApi`**.
- The document link used by Exotel/WhatsApp uses **`downloadFee`** (full URL like  
  `https://REGION-PROJECT.cloudfunctions.net/downloadFee?fileId=...`).  
  Your frontend or config should use that URL; no Hosting rewrite is required for it.

---

## 5. Environment variables (`.env` or Firebase config)

Set these for the **fee receipt** flow (in `functions/.env` or Firebase Functions config):

- **Exotel:**  
  `EXOTEL_API_KEY`, `EXOTEL_API_TOKEN`, `EXOTEL_SID`, `EXOTEL_TEMPLATE_NAME`, `EXOTEL_FROM_NUMBER`, optional `EXOTEL_WABA_ID`, `EXOTEL_STATUS_CALLBACK`
- **Storage:**  
  `STORAGE_BUCKET` (e.g. `ssec-outing.firebasestorage.app`)
- **Optional:**  
  `BASE_URL`, `DOWNLOAD_PROXY_BASE_URL`, `CLEANUP_DELAY_MS`, `CLEANUP_ENABLED`

`waPdf/config.js` reads these; no need to change your main app’s config unless you want to share values.

---

## 6. Deploy

From the **other** project root:

```bash
firebase deploy --only functions
```

After deploy:

- Your existing functions keep working.
- **`waPdfApi`** serves the fee receipt API.
- **`downloadFee`** serves the PDF proxy for WhatsApp.

The fee receipt site (e.g. wa-pdf.web.app) should call the same project’s Hosting + these two functions so both sites work together.
