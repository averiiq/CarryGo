const apiKey = 'key_live_416614ac6953471ebf15142f75db722e';
const apiSecret = 'secret_live_fac826b1d2c74cd0b021ec72e84c04ad';
const baseUrl = 'https://api.sandbox.co.in';

async function testAuth() {
  console.log('Testing Sandbox /authenticate...');
  try {
    const res = await fetch(`${baseUrl}/authenticate`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'x-api-secret': apiSecret,
        'x-api-version': '2.0',
      }
    });
    console.log('Auth status:', res.status);
    const data = await res.json();
    console.log('Auth response:', JSON.stringify(data, null, 2));
    return data.access_token || data.data?.access_token;
  } catch (err) {
    console.error('Auth error:', err);
  }
}

async function testEndpoints(token) {
  console.log('\nTesting Aadhaar endpoints...');
  const endpoints = [
    { url: `${baseUrl}/kyc/aadhaar/okyc/otp`, body: { '@entity': 'in.co.sandbox.kyc.aadhaar.okyc.otp.request', aadhaar_number: '123456789012' } },
    { url: `${baseUrl}/kyc/aadhaar/okyc/otp`, body: { aadhaar_number: '123456789012' } },
    { url: `${baseUrl}/kyc/aadhaar/verify/generate-otp`, body: { aadhaar_number: '123456789012' } },
  ];

  for (const ep of endpoints) {
    console.log(`\nTrying ${ep.url}...`);
    try {
      const headers = {
        'Content-Type': 'application/json',
        'x-api-version': '2.0',
      };
      if (token) {
        headers['Authorization'] = token;
        headers['x-api-key'] = apiKey;
      } else {
        headers['x-api-key'] = apiKey;
        headers['x-api-secret'] = apiSecret;
      }
      const res = await fetch(ep.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(ep.body),
      });
      console.log('Status:', res.status);
      const text = await res.text();
      console.log('Response:', text);
    } catch (err) {
      console.error('Error:', err.message);
    }
  }
}

async function run() {
  const token = await testAuth();
  await testEndpoints(token);
}

run();
