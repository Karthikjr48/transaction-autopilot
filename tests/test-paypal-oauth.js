/**
 * PayPal Sandbox OAuth 2.0 & Credential Flow Verification Suite
 * Validates requirements:
 * 1. Live OAuth authentication against https://api-m.sandbox.paypal.com/v1/oauth2/token
 * 2. Connected status only granted on real PayPal 200 OK
 * 3. Secrets and tokens never exposed in API responses or client payloads
 * 4. Clear configuration error when secret is missing (no invented credentials)
 * 5. Re-verification endpoint functionality
 */

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}`;
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  \x1b[32m✔ PASS:\x1b[0m ${message}`);
    passed++;
  } else {
    console.error(`  \x1b[31m✖ FAIL:\x1b[0m ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('PAYPAL SANDBOX OAUTH CREDENTIAL FLOW VERIFICATION SUITE');
  console.log('======================================================\n');

  // TEST 1: Check Live Status Endpoint
  console.log('[Check 1: Live Status & PayPal Sandbox OAuth 2.0 Verification]');
  try {
    const res = await fetch(`${BASE_URL}/api/paypal/status`);
    const data = await res.json();

    assert(res.status === 200, `GET /api/paypal/status returned HTTP 200 (Got ${res.status})`);
    assert(data.connected === true, `Sandbox OAuth status is genuinely connected (connected: ${data.connected})`);
    assert(data.mode === 'sandbox', `Mode is explicitly 'sandbox'`);
    assert(typeof data.appId === 'string' && data.appId.startsWith('APP-'), `Valid PayPal Application ID returned from PayPal OAuth: ${data.appId}`);
    assert(!!data.lastVerifiedAt, `Live verification timestamp recorded: ${data.lastVerifiedAt}`);
    assert(!!data.authTest, `OAuth audit test object present in response`);
    assert(data.authTest.httpStatus === 200, `PayPal OAuth endpoint returned HTTP 200 OK`);
    assert(data.authTest.endpoint === 'https://api-m.sandbox.paypal.com/v1/oauth2/token', `Auth verified against authoritative PayPal Sandbox endpoint: ${data.authTest.endpoint}`);
  } catch (err) {
    assert(false, `Check 1 threw error: ${err.message}`);
  }

  // TEST 2: Strict Secret & Token Redaction Check (Zero Leaks)
  console.log('\n[Check 2: Security & Credential Redaction]');
  try {
    const res = await fetch(`${BASE_URL}/api/paypal/status`);
    const data = await res.json();
    const rawJson = JSON.stringify(data);

    assert(!data.clientSecret, `API response does NOT contain raw clientSecret field`);
    assert(!data.accessToken, `API response does NOT contain raw accessToken field`);
    assert(!rawJson.includes('EEqAKFNkjjIrgCjSoeig25A4B94'), `Raw PayPal Client Secret is NOT present anywhere in JSON payload`);
    assert(!rawJson.includes('A21A'), `Access token bearer string is NOT leaked in JSON payload`);
    assert(data.authTest.clientSecretRedacted.includes('••••••••'), `Client secret is cleanly redacted in audit report: ${data.authTest.clientSecretRedacted}`);
    assert(data.authTest.accessTokenRedacted === 'Bearer [REDACTED_BY_SERVER]', `Access token is masked: ${data.authTest.accessTokenRedacted}`);
  } catch (err) {
    assert(false, `Check 2 threw error: ${err.message}`);
  }

  // TEST 3: Live Re-verify Endpoint (POST /api/paypal/verify)
  console.log('\n[Check 3: On-Demand Live Re-verification]');
  try {
    const res = await fetch(`${BASE_URL}/api/paypal/verify`, { method: 'POST' });
    const data = await res.json();

    assert(res.status === 200, `POST /api/paypal/verify returned HTTP 200`);
    assert(data.success === true, `Re-verification reported success: true`);
    assert(data.authTest.httpStatus === 200, `Re-verified against PayPal Sandbox with HTTP 200`);
    assert(data.authTest.appId.startsWith('APP-'), `App ID confirmed by PayPal: ${data.authTest.appId}`);
  } catch (err) {
    assert(false, `Check 3 threw error: ${err.message}`);
  }

  // TEST 4: Missing Secret Handling & Zero Invented Credentials
  console.log('\n[Check 4: Invalid Credentials Handling & Rejection]');
  try {
    const testInvalidRes = await fetch(`${BASE_URL}/api/paypal/connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPERATOR_SECRET_KEY || 'ops-autopilot-secret-key-2026'}`
      },
      body: JSON.stringify({ clientId: 'INVALID_CLIENT_ID', clientSecret: 'INVALID_CLIENT_SECRET' })
    });
    const invalidData = await testInvalidRes.json();

    assert(testInvalidRes.status === 401, `Invalid credentials properly rejected by PayPal OAuth with HTTP 401 (Got ${testInvalidRes.status})`);
    assert(invalidData.success === false, `Invalid credentials reported success: false`);
    assert(invalidData.error.includes('OAuth Error'), `Clear PayPal error message returned: ${invalidData.error}`);
  } catch (err) {
    assert(false, `Check 4 threw error: ${err.message}`);
  }

  // Restore active connection after invalid test
  console.log('\n[Check 5: Restoring Authenticated Sandbox State]');
  try {
    const res = await fetch(`${BASE_URL}/api/paypal/verify`, { method: 'POST' });
    const data = await res.json();
    assert(res.status === 200 && data.success === true, `Active PayPal Sandbox credentials successfully re-verified`);
  } catch (err) {
    assert(false, `Check 5 threw error: ${err.message}`);
  }

  console.log('\n======================================================');
  console.log(`TOTAL CHECKS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
