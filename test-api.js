/**
 * Test script to verify the API is reachable before testing on the website.
 * Run: node test-api.js
 * Optional: node test-api.js https://your-custom-url.web.app
 *
 * Uses same request shape as the frontend (fetch + FormData).
 */

const BASE_URL = process.argv[2] || 'https://wa-pdf.web.app';

// Minimal valid PDF buffer
function getMinimalPdfBuffer() {
  return Buffer.from(
    '%PDF-1.4 1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj xref 0 4 trailer<</Size 4/Root 1 0 R>> startxref %%EOF',
    'utf8'
  );
}

async function runTests() {
  console.log('\n=== API connectivity test ===');
  console.log('Base URL:', BASE_URL);
  console.log('');

  // --- 1. Health check (GET) ---
  console.log('1. GET /api/health');
  try {
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    const contentType = healthRes.headers.get('content-type') || '';
    const text = await healthRes.text();

    console.log('   Status:', healthRes.status);
    if (healthRes.ok) {
      if (contentType.includes('application/json')) {
        const data = JSON.parse(text);
        console.log('   OK - API is reachable');
        console.log('   Response:', JSON.stringify(data, null, 2).replace(/\n/g, '\n   '));
      } else {
        console.log('   WARN - Response is not JSON. First 200 chars:', text.slice(0, 200));
      }
    } else {
      console.log('   FAIL - Body:', text.slice(0, 300));
    }
  } catch (err) {
    console.log('   FAIL -', err.message);
    console.log('   (Check: Is the site live? Is the Cloud Function deployed?)');
  }

  console.log('');

  // --- 2. POST /api/upload/send-pdf (same as frontend: FormData + pdf + phoneNumber) ---
  console.log('2. POST /api/upload/send-pdf (FormData, same as website)');
  try {
    const formData = new FormData();
    formData.append('phoneNumber', '919080577774');
    const pdfBlob = new Blob([getMinimalPdfBuffer()], { type: 'application/pdf' });
    formData.append('pdf', pdfBlob, 'test.pdf');

    const postRes = await fetch(`${BASE_URL}/api/upload/send-pdf`, {
      method: 'POST',
      body: formData,
    });

    const text = await postRes.text();
    const contentType = postRes.headers.get('content-type') || '';

    console.log('   Status:', postRes.status);
    if (postRes.ok) {
      if (contentType.includes('application/json')) {
        const data = JSON.parse(text);
        console.log('   OK - API returned JSON');
        console.log('   success:', data.success, data.message ? '- ' + data.message : '');
      } else {
        console.log('   Response (first 200 chars):', text.slice(0, 200));
      }
    } else {
      console.log('   Response:', text.slice(0, 500));
      if (text.includes('<!') || text.toLowerCase().includes('html')) {
        console.log('   (Server returned HTML - API may not be deployed or URL is wrong.)');
      }
    }
  } catch (err) {
    console.log('   FAIL -', err.message);
  }

  console.log('\n=== Done ===\n');
}

runTests();
