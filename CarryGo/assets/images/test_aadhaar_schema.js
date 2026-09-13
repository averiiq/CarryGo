const apiKey = 'key_live_416614ac6953471ebf15142f75db722e';
const apiSecret = 'secret_live_fac826b1d2c74cd0b021ec72e84c04ad';
const baseUrl = 'https://api.sandbox.co.in';

async function run() {
  const authRes = await fetch(`${baseUrl}/authenticate`, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'x-api-secret': apiSecret,
      'x-api-version': '2.0',
    }
  });
  const authData = await authRes.json();
  const token = authData.access_token || authData.data?.access_token;
  console.log('Got token:', token ? 'YES' : 'NO');

  const testBodies = [
    { aadhaar_number: '554433221100', consent: 'y', reason: 'KYC' },
    { aadhaar_number: '554433221100' },
    { aadhaar_no: '554433221100' },
    { '@entity': 'in.co.sandbox.kyc.aadhaar.okyc.otp.request', aadhaar_number: '554433221100', consent: 'y', reason: 'KYC' },
    { '@entity': 'in.co.sandbox.kyc.aadhaar.okyc.otp.request', aadhaar_number: '554433221100' },
    { aadhaar_number: '554433221100', consent: true },
    { data: { aadhaar_number: '554433221100' } },
  ];

  const testUrls = [
    `${baseUrl}/kyc/aadhaar/okyc/otp`,
    `${baseUrl}/kyc/aadhaar/okyc/otp/request`,
    `${baseUrl}/kyc/aadhaar/okyc/request`,
    `${baseUrl}/kyc/aadhaar/generate-otp`,
    `${baseUrl}/kyc/aadhaar/otp`,
  ];

  for (const url of testUrls) {
    for (const body of testBodies) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': token,
            'x-api-key': apiKey,
            'x-api-version': '2.0',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });
        const text = await res.text();
        if (res.status !== 404 && !text.includes('Not Found')) {
          console.log(`URL: ${url} | Status: ${res.status}`);
          console.log(`Body: ${JSON.stringify(body)}`);
          console.log(`Response: ${text}\n`);
        }
      } catch (err) {
        // ignore
      }
    }
  }
}

run();
