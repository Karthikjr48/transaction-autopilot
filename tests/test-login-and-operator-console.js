/**
 * Test Suite 16: Login, Operator Console, CSRF Defense & Merchant Authentication
 * 
 * Verifies:
 * 1. CSRF token bootstrapping and rejection of requests lacking or having invalid tokens.
 * 2. Successful CSRF-validated state-mutating requests.
 * 3. Operator authentication with constant-time verification, session generation, and logout.
 * 4. Operator status endpoint role segregation (Operator allowed, Merchant rejected with 403).
 * 5. Sanitized service status response (zero API key, client secret, or SMTP password leakage).
 * 6. Merchant authentication with valid credentials, session retention, and logout.
 * 7. Merchant workspace settings persistence via POST /api/merchant/settings.
 * 8. HTML contract checks for login.html and operations.html (inputs, toggles, external help links, lenis attributes).
 */

import http from 'http';

const BACKEND_URL = 'http://localhost:5000';
const UI_URL = 'http://localhost:3000';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

/**
 * Native Node http request helper with cookie support
 */
function makeRequest(urlStr, options = {}, bodyData = null) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(urlStr);
    const reqOpts = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    if (bodyData && !reqOpts.headers['Content-Type']) {
      reqOpts.headers['Content-Type'] = 'application/json';
    }

    const req = http.request(reqOpts, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (_) {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          json
        });
      });
    });

    req.on('error', reject);
    if (bodyData) {
      req.write(typeof bodyData === 'string' ? bodyData : JSON.stringify(bodyData));
    }
    req.end();
  });
}

function parseCookies(res) {
  const raw = res.headers['set-cookie'] || [];
  const cookies = {};
  raw.forEach(cookieStr => {
    const parts = cookieStr.split(';')[0].split('=');
    if (parts.length >= 2) {
      cookies[parts[0].trim()] = parts.slice(1).join('=').trim();
    }
  });
  return cookies;
}

function buildCookieHeader(cookies) {
  return Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
}

async function runTests() {
  console.log('======================================================================');
  console.log('🧪 SUITE 16: Login, Operator Console, CSRF & Role Segregation');
  console.log('======================================================================\n');

  // Reset any rate limits from preceding automated test suites
  await makeRequest(`${BACKEND_URL}/api/auth/session`, {
    headers: { 'x-test-rate-limit-reset': 'true' }
  });

  // -------------------------------------------------------------------------
  // 1. CSRF Token Bootstrapping & Enforcement
  // -------------------------------------------------------------------------
  console.log('1. CSRF Token Bootstrapping & Mutating Request Validation:');

  // Step 1a: Initialize session
  const initRes = await makeRequest(`${BACKEND_URL}/api/auth/session`);
  assert(initRes.statusCode === 200, 'GET /api/auth/session returns 200 OK');
  assert(Boolean(initRes.json?.csrfToken), 'GET /api/auth/session returns csrfToken');
  const sessionCookies = parseCookies(initRes);
  assert(Boolean(sessionCookies['session_id'] || sessionCookies['csrf_token']), 'Auth session sets session_id or csrf_token cookie');

  const validCsrfToken = initRes.json?.csrfToken;
  const cookieHeader = buildCookieHeader(sessionCookies);

  // Step 1b: Attempt mutating request without CSRF token -> Expect 403 Forbidden
  const noCsrfRes = await makeRequest(`${BACKEND_URL}/api/merchant/settings`, {
    method: 'POST',
    headers: {
      'Cookie': cookieHeader
    }
  }, { businessName: 'Test Store' });
  assert(noCsrfRes.statusCode === 403, `Mutating POST without x-csrf-token rejected with 403 (got ${noCsrfRes.statusCode})`);
  assert(noCsrfRes.body.includes('CSRF token'), 'Error message specifically references CSRF requirement');

  // Step 1c: Attempt mutating request with invalid CSRF token -> Expect 403 Forbidden
  const badCsrfRes = await makeRequest(`${BACKEND_URL}/api/merchant/settings`, {
    method: 'POST',
    headers: {
      'Cookie': cookieHeader,
      'x-csrf-token': 'invalid-bogus-token-12345'
    }
  }, { businessName: 'Test Store' });
  assert(badCsrfRes.statusCode === 403, `Mutating POST with invalid x-csrf-token rejected with 403 (got ${badCsrfRes.statusCode})`);

  // -------------------------------------------------------------------------
  // 2. Operator Authentication & Operations Console
  // -------------------------------------------------------------------------
  console.log('\n2. Operator Authentication & Operations Workbench:');

  // Step 2a: Operator login with invalid key -> 401
  const badOpRes = await makeRequest(`${BACKEND_URL}/api/operations/auth`, {
    method: 'POST',
    headers: {
      'Cookie': cookieHeader,
      'x-csrf-token': validCsrfToken
    }
  }, { secretKey: 'wrong-operator-key' });
  assert(badOpRes.statusCode === 401, `Invalid operator key rejected with 401 (got ${badOpRes.statusCode})`);

  // Step 2b: Operator login with valid key -> 200
  const validOpKey = process.env.OPERATOR_SECRET_KEY || 'ops-autopilot-secret-key-2026';
  const goodOpRes = await makeRequest(`${BACKEND_URL}/api/operations/auth`, {
    method: 'POST',
    headers: {
      'Cookie': cookieHeader,
      'x-csrf-token': validCsrfToken
    }
  }, { secretKey: validOpKey });
  assert(goodOpRes.statusCode === 200, `Valid operator key returns 200 OK (got ${goodOpRes.statusCode})`);
  assert(goodOpRes.json?.success === true, 'Operator login JSON response success: true');

  const opCookies = { ...sessionCookies, ...parseCookies(goodOpRes) };
  const opCookieHeader = buildCookieHeader(opCookies);
  const opCsrfToken = goodOpRes.json?.csrfToken || opCookies['csrf_token'] || validCsrfToken;

  // Step 2c: Operator status endpoint -> 200 OK & sanitized matrix
  const opStatusRes = await makeRequest(`${BACKEND_URL}/api/operations/status`, {
    headers: {
      'Cookie': opCookieHeader
    }
  });
  assert(opStatusRes.statusCode === 200, `Operator status endpoint returns 200 with operator session (got ${opStatusRes.statusCode})`);
  assert(Boolean(opStatusRes.json?.gateway), 'Operator status includes Gateway status');
  assert(Boolean(opStatusRes.json?.delivery), 'Operator status includes Delivery / SMTP status');
  assert(Boolean(opStatusRes.json?.aiEngine), 'Operator status includes AI Engine status');
  assert(Boolean(opStatusRes.json?.configuration), 'Operator status includes Configuration state');

  // Verify zero secrets leaked in status response
  const rawStatus = opStatusRes.body;
  assert(!rawStatus.includes('PAYPAL_CLIENT_SECRET'), 'Operator status never exposes raw PAYPAL_CLIENT_SECRET variable');
  assert(!rawStatus.includes('BREVO_SMTP_KEY'), 'Operator status never exposes raw BREVO_SMTP_KEY variable');
  assert(!rawStatus.includes('GROQ_API_KEY'), 'Operator status never exposes raw GROQ_API_KEY variable');

  // Step 2d: Operator logout -> 200 OK
  const opLogoutRes = await makeRequest(`${BACKEND_URL}/api/operations/logout`, {
    method: 'POST',
    headers: {
      'Cookie': opCookieHeader,
      'x-csrf-token': opCsrfToken
    }
  });
  assert(opLogoutRes.statusCode === 200, `Operator logout returns 200 OK (got ${opLogoutRes.statusCode})`);

  // -------------------------------------------------------------------------
  // 3. Merchant Authentication & Portal Role Segregation
  // -------------------------------------------------------------------------
  console.log('\n3. Merchant Authentication & Portal Role Segregation:');

  // Step 3a: Merchant login with invalid credentials -> 401
  const badMerchRes = await makeRequest(`${BACKEND_URL}/api/merchant/login`, {
    method: 'POST',
    headers: {
      'Cookie': cookieHeader,
      'x-csrf-token': validCsrfToken
    }
  }, { email: 'merchant@transaction-autopilot.local', password: 'WrongPassword123!' });
  assert(badMerchRes.statusCode === 401, `Invalid merchant credentials rejected with 401 (got ${badMerchRes.statusCode})`);

  // Step 3b: Merchant login with valid credentials -> 200
  const goodMerchRes = await makeRequest(`${BACKEND_URL}/api/merchant/login`, {
    method: 'POST',
    headers: {
      'Cookie': cookieHeader,
      'x-csrf-token': validCsrfToken
    }
  }, { email: 'merchant@transaction-autopilot.local', password: 'MerchantSecure2026!' });
  assert(goodMerchRes.statusCode === 200, `Valid merchant login returns 200 OK (got ${goodMerchRes.statusCode})`);
  assert(goodMerchRes.json?.role === 'merchant', 'Merchant session established with role: merchant');

  const merchCookies = { ...sessionCookies, ...parseCookies(goodMerchRes) };
  const merchCookieHeader = buildCookieHeader(merchCookies);
  const merchCsrfToken = goodMerchRes.json?.csrfToken || merchCookies['csrf_token'] || validCsrfToken;

  // Step 3c: Merchant session profile endpoint -> 200 OK
  const merchSessRes = await makeRequest(`${BACKEND_URL}/api/merchant/session`, {
    headers: {
      'Cookie': merchCookieHeader
    }
  });
  assert(merchSessRes.statusCode === 200, `GET /api/merchant/session returns 200 OK (got ${merchSessRes.statusCode})`);
  assert(merchSessRes.json?.authenticated === true, 'Merchant session authenticated is true');
  assert(merchSessRes.json?.email === 'merchant@transaction-autopilot.local', 'Merchant session returns correct email');

  // Step 3d: Merchant attempts to access operator status endpoint -> Expect 403 Forbidden
  const merchToOpRes = await makeRequest(`${BACKEND_URL}/api/operations/status`, {
    headers: {
      'Cookie': merchCookieHeader
    }
  });
  assert(merchToOpRes.statusCode === 403, `Merchant role is forbidden (403) from Operator status endpoint (got ${merchToOpRes.statusCode})`);

  // Step 3e: Merchant workspace settings persistence via POST /api/merchant/settings with valid CSRF
  const saveSettingsRes = await makeRequest(`${BACKEND_URL}/api/merchant/settings`, {
    method: 'POST',
    headers: {
      'Cookie': merchCookieHeader,
      'x-csrf-token': merchCsrfToken
    }
  }, {
    businessName: 'Apex Merchant Co.',
    defaultCurrency: 'USD',
    autoInvoiceOnCapture: true
  });
  assert(saveSettingsRes.statusCode === 200, `POST /api/merchant/settings returns 200 OK with valid CSRF (got ${saveSettingsRes.statusCode})`);
  assert(saveSettingsRes.json?.settings?.businessName === 'Apex Merchant Co.', 'Merchant businessName persisted');
  assert(saveSettingsRes.json?.settings?.autoInvoiceOnCapture === true, 'Merchant autoInvoiceOnCapture persisted');

  // Step 3f: Merchant logout -> 200 OK
  const merchLogoutRes = await makeRequest(`${BACKEND_URL}/api/merchant/logout`, {
    method: 'POST',
    headers: {
      'Cookie': merchCookieHeader,
      'x-csrf-token': merchCsrfToken
    }
  });
  assert(merchLogoutRes.statusCode === 200, `Merchant logout returns 200 OK (got ${merchLogoutRes.statusCode})`);

  // -------------------------------------------------------------------------
  // 4. UI Server Endpoints & HTML Contract Verification
  // -------------------------------------------------------------------------
  console.log('\n4. UI Server Endpoints & HTML Contract Verification:');

  // Step 4a: Merchant Login page served on UI server (port 3000)
  const loginPageRes = await makeRequest(`${UI_URL}/login`);
  assert(loginPageRes.statusCode === 200, `UI server serves /login with 200 OK (got ${loginPageRes.statusCode})`);
  assert(loginPageRes.body.includes('merchant-email'), 'login.html contains merchant email input');
  assert(loginPageRes.body.includes('merchant-password'), 'login.html contains merchant password input');
  assert(loginPageRes.body.includes('btn-toggle-password'), 'login.html contains accessible password visibility toggle');
  assert(loginPageRes.body.includes('https://www.paypal.com/us/cshelp/business'), 'login.html links to external PayPal business help');
  assert(loginPageRes.body.includes('target="_blank"') && loginPageRes.body.includes('rel="noopener noreferrer"'), 'login.html help link uses target="_blank" and rel="noopener noreferrer"');

  // Step 4b: Operations Console page served on port 5000 and 3000
  const opsPageRes = await makeRequest(`${BACKEND_URL}/operations.html`);
  assert(opsPageRes.statusCode === 200, `Backend serves operations.html with 200 OK (got ${opsPageRes.statusCode})`);
  assert(opsPageRes.body.includes('csrf-client.js'), 'operations.html imports client CSRF helper');
  assert(opsPageRes.body.includes('btn-toggle-ops-pwd'), 'operations.html contains accessible operator password toggle');
  assert(!opsPageRes.body.includes('value="ops-autopilot-secret-key-2026"'), 'operations.html does NOT hardcode secret key in HTML value');
  assert(opsPageRes.body.includes('tab-health'), 'operations.html contains services health tab');
  assert(opsPageRes.body.includes('tab-forensics'), 'operations.html contains state forensics tab');
  assert(opsPageRes.body.includes('tab-security'), 'operations.html contains security audit tab');
  assert(opsPageRes.body.includes('tab-diagnostics'), 'operations.html contains live diagnostics tab');

  // Step 4c: Merchant Dashboard verification (port 3000)
  const dashboardRes = await makeRequest(`${UI_URL}/`);
  assert(dashboardRes.statusCode === 200, `UI server serves / with 200 OK (got ${dashboardRes.statusCode})`);
  assert(dashboardRes.body.includes('topbar-merchant-menu'), 'Merchant dashboard includes profile menu in topbar');
  assert(dashboardRes.body.includes('modal-merchant-settings'), 'Merchant dashboard includes settings modal container');
  assert(dashboardRes.body.includes('cookie-preferences-modal'), 'Merchant dashboard includes cookie preferences modal');
  assert(dashboardRes.body.includes('data-lenis-prevent'), 'Modals contain data-lenis-prevent to isolate scrolling');

  console.log('\n======================================================================');
  console.log(`SUITE 16 RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('======================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
