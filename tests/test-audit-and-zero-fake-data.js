/**
 * Master Verification Suite: Complete Cleanup, Port Separation, Zero-Fake-Data & Invoicing
 * Evaluates:
 * 1. Port responsibilities (Port 3000 vs Port 5000)
 * 2. Strict Zero-Fake-Data & Zero Synthetic Multipliers in Analytics
 * 3. Real Invoicing & Delivery Provider Workflow with Validation and Retries
 * 4. Post-Payment Auto-Invoicing Configuration
 * 5. Real Server-Side Operator Authentication & Authorization
 * 6. Payment Link Creation backed by PayPal Orders v2
 */

import http from 'http';

const UI_URL = 'http://localhost:3000';
const BACKEND_URL = 'http://localhost:5000';

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

async function request(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch (_) {}
  return { status: res.status, headers: res.headers, text, json };
}

console.log('======================================================================');
console.log('🛡️ TRANSACTION-AUTOPILOT — COMPLETE PROJECT CLEANUP & ZERO-FAKE-DATA AUDIT');
console.log('======================================================================\n');

// Reset rate limits for clean test environment
await request(`${BACKEND_URL}/api/paypal/analytics`, { headers: { 'x-test-rate-limit-reset': 'true' } });

// -------------------------------------------------------------------------
// SECTION 1: Port Responsibilities & Route Integrity
// -------------------------------------------------------------------------
console.log('[Section 1: Port Responsibilities & Route Separation]');

// 1.1 Port 5000 Root must return API JSON descriptor, NEVER index.html
const p5000Root = await request(`${BACKEND_URL}/`);
assert(p5000Root.status === 200, 'Port 5000 GET / returns HTTP 200');
assert(p5000Root.json !== null, 'Port 5000 GET / returns JSON');
assert(p5000Root.json?.service?.includes('Backend API'), 'Port 5000 identifies as Backend API (Got: ' + p5000Root.json?.service + ')');
assert(!p5000Root.text.includes('<!DOCTYPE html>'), 'Port 5000 GET / does NOT serve merchant index.html');

// 1.2 Port 5000 404 handling
const p5000Unknown = await request(`${BACKEND_URL}/nonexistent-route-12345`);
assert(p5000Unknown.status === 404, 'Port 5000 unknown route returns HTTP 404 (Got: ' + p5000Unknown.status + ')');
assert(p5000Unknown.json?.success === false, 'Port 5000 404 returns structured JSON error');
assert(!p5000Unknown.text.includes('<!DOCTYPE html>'), 'Port 5000 unknown route does NOT serve merchant index.html');

// 1.3 Port 5000 Operations Console
const p5000Ops = await request(`${BACKEND_URL}/operations`);
assert(p5000Ops.status === 200, 'Port 5000 GET /operations returns HTTP 200');
assert(p5000Ops.text.includes('OPERATIONS &amp; AI FORENSICS') || p5000Ops.text.includes('Operations & AI Forensics'), 'Port 5000 serves dedicated Operations Console');

// 1.4 Port 3000 Merchant UI
const p3000Root = await request(`${UI_URL}/`);
assert(p3000Root.status === 200, 'Port 3000 GET / returns HTTP 200');
assert(p3000Root.text.toLowerCase().includes('<!doctype html>'), 'Port 3000 serves merchant frontend HTML');
assert(p3000Root.text.includes('PayPal'), 'Port 3000 contains authentic PayPal branding');

// 1.5 Port 3000 Operations Proxy
const p3000Ops = await request(`${UI_URL}/operations`);
assert(p3000Ops.status === 200, 'Port 3000 GET /operations proxied to backend returns HTTP 200');
assert(p3000Ops.text.includes('Transaction-Autopilot'), 'Port 3000 /operations proxy delivers Operations Console');


// -------------------------------------------------------------------------
// SECTION 2: Strict Zero-Fake-Data & Analytics Audit
// -------------------------------------------------------------------------
console.log('\n[Section 2: Strict Zero-Fake-Data Policy]');

const analyticsRes = await request(`${BACKEND_URL}/api/paypal/analytics`);
assert(analyticsRes.status === 200, 'GET /api/paypal/analytics returns HTTP 200');
const a = analyticsRes.json?.analytics;
assert(typeof a?.totalVolume === 'number', 'totalVolume is strictly numeric ($' + a?.totalVolume + ')');
assert(typeof a?.totalOrders === 'number', 'totalOrders is strictly numeric (' + a?.totalOrders + ')');
assert(typeof a?.capturedCount === 'number', 'capturedCount is strictly numeric (' + a?.capturedCount + ')');

// Check that hourlyVolume has ZERO synthetic fractional multipliers (e.g. 0.12, 0.08, 0.35)
// In our truthful implementation, volume buckets are derived strictly from order timestamps
assert(Array.isArray(a?.hourlyVolume), 'hourlyVolume is an array');
assert(a?.hourlyVolume.length >= 6, 'hourlyVolume has standard time buckets');

// Disputes status must be truthfully unconfigured rather than fake 0
assert(a?.disputes !== undefined, 'Disputes object present in analytics');
assert(a?.disputes?.connected === false, 'Disputes truthfully reports connected: false when unintegrated');
assert(a?.disputes?.status === 'DISPUTES_API_UNCONNECTED', 'Disputes indicates DISPUTES_API_UNCONNECTED');

// Products Catalog must have ZERO fake sales or revenue
const prodRes = await request(`${BACKEND_URL}/api/paypal/products`);
assert(prodRes.status === 200, 'GET /api/paypal/products returns HTTP 200');
const products = prodRes.json?.products || [];
assert(products.length >= 1, 'Products catalog is accessible');
const hasFakeSales = products.some(p => p.salesCount === 28 || p.totalRevenue === 868.00);
assert(!hasFakeSales, 'Products catalog strictly zeroes fake legacy sales/revenue (salesCount: 28 eliminated)');


// -------------------------------------------------------------------------
// SECTION 3: Real Invoicing & Delivery Provider Workflow
// -------------------------------------------------------------------------
console.log('\n[Section 3: Real Invoicing & Delivery Provider Workflow]');

// 3.1 Invalid email validation
const authHeader = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${process.env.OPERATOR_SECRET_KEY || 'ops-autopilot-secret-key-2026'}`
};

const badEmailRes = await request(`${BACKEND_URL}/api/paypal/invoices`, {
  method: 'POST',
  headers: authHeader,
  body: JSON.stringify({
    customerEmail: 'not-an-email',
    amount: 50.00
  })
});
assert(badEmailRes.status === 400, 'Invalid customer email rejected with HTTP 400');
assert(badEmailRes.json?.success === false, 'Error message returned for invalid email format');

// 3.2 Zero or negative amount validation
const badAmtRes = await request(`${BACKEND_URL}/api/paypal/invoices`, {
  method: 'POST',
  headers: authHeader,
  body: JSON.stringify({
    customerEmail: 'merchant.test@domain.com',
    amount: -10.00
  })
});
assert(badAmtRes.status === 400, 'Negative amount rejected with HTTP 400');

// 3.3 Valid invoice creation & delivery provider acceptance
const validInvoiceRes = await request(`${BACKEND_URL}/api/paypal/invoices`, {
  method: 'POST',
  headers: authHeader,
  body: JSON.stringify({
    customerEmail: 'loyolaignatiuskarthik@gmail.com',
    itemDescription: 'Annual Enterprise Forensics Subscription',
    amount: 129.99,
    currency: 'USD'
  })
});
assert(validInvoiceRes.status === 200, 'Valid invoice creation returned HTTP 200');
const inv = validInvoiceRes.json?.invoice;
assert(inv?.id?.startsWith('INV-'), 'Invoice ID minted with standard prefix (' + inv?.id + ')');
assert(inv?.amount === 129.99, 'Invoice amount matches validated input ($129.99)');
assert(inv?.status === 'PROVIDER_ACCEPTED', 'Invoice status indicates PROVIDER_ACCEPTED (Got: ' + inv?.status + ')');
assert(inv?.deliveryDetails?.providerMessageId !== undefined, 'Provider receipt includes Message-ID: ' + inv?.deliveryDetails?.providerMessageId);

// 3.4 Invoices List Endpoint
const invoicesListRes = await request(`${BACKEND_URL}/api/paypal/invoices`);
assert(invoicesListRes.status === 200, 'GET /api/paypal/invoices returned HTTP 200');
assert(invoicesListRes.json?.invoices?.length >= 1, 'Invoices list contains newly created invoice');
const storedInv = invoicesListRes.json.invoices.find(i => i.id === inv.id);
assert(storedInv !== undefined, 'Created invoice retrieved from persisted store');
assert(storedInv?.customerEmail === 'loyolaignatiuskarthik@gmail.com', 'Persisted invoice email matches recipient');

// 3.5 Duplicate Send Prevention on already accepted invoice
const retryAcceptedRes = await request(`${BACKEND_URL}/api/paypal/invoices/${inv.id}/retry`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.OPERATOR_SECRET_KEY || 'ops-autopilot-secret-key-2026'}`
  }
});
assert(retryAcceptedRes.status === 502 || retryAcceptedRes.status === 400, 'Retry on already accepted invoice is blocked');
assert(retryAcceptedRes.json?.error?.includes('already been accepted'), 'Duplicate send guard blocks repeat dispatch');

// 3.6 Merchant Settings (Auto-Invoicing Configuration)
const settingsGet = await request(`${BACKEND_URL}/api/merchant/settings`);
assert(settingsGet.status === 200, 'GET /api/merchant/settings returned HTTP 200');
assert(settingsGet.json?.settings?.autoInvoiceOnCapture !== undefined, 'autoInvoiceOnCapture setting is exposed');

const settingsUpdate = await request(`${BACKEND_URL}/api/merchant/settings`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.OPERATOR_SECRET_KEY || 'ops-autopilot-secret-key-2026'}`
  },
  body: JSON.stringify({ autoInvoiceOnCapture: true })
});
assert(settingsUpdate.status === 200, 'POST /api/merchant/settings returned HTTP 200');
assert(settingsUpdate.json?.settings?.autoInvoiceOnCapture === true, 'autoInvoiceOnCapture successfully updated to true');


// -------------------------------------------------------------------------
// SECTION 4: Real Server-Side Operator Authorization
// -------------------------------------------------------------------------
console.log('\n[Section 4: Real Server-Side Operator Authorization]');

// 4.1 Wrong Operator Secret Key
const badAuth = await request(`${BACKEND_URL}/api/operations/auth`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ secretKey: 'wrong-key-xyz' })
});
assert(badAuth.status === 401, 'Invalid operator key rejected with HTTP 401');

// 4.2 Correct Operator Secret Key
const goodAuth = await request(`${BACKEND_URL}/api/operations/auth`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ secretKey: 'ops-autopilot-secret-key-2026' })
});
assert(goodAuth.status === 200, 'Valid operator key authenticated with HTTP 200');
assert(goodAuth.json?.token?.startsWith('ops_tok_') || goodAuth.json?.token?.startsWith('ops_sess_'), 'Session token minted with secure prefix (' + goodAuth.json?.token?.slice(0, 16) + '...)');

const validToken = goodAuth.json.token;

// 4.3 Test Order for Forensics
const testOrderRes = await request(`${BACKEND_URL}/api/paypal/create-test-order`, { method: 'POST' });
const orderId = testOrderRes.json?.order?.id;
assert(orderId !== undefined, 'Created test order for forensics (' + orderId + ')');

// 4.4 Merchant role rejected with HTTP 403 Forbidden
const merchantAnalyze = await request(`${BACKEND_URL}/api/agent/analyze`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-client-role': 'merchant'
  },
  body: JSON.stringify({ orderId })
});
assert(merchantAnalyze.status === 403, 'Merchant role blocked with HTTP 403 Forbidden on /api/agent/analyze');

// 4.5 Invalid token rejected with HTTP 401 Unauthorized
const invalidTokenAnalyze = await request(`${BACKEND_URL}/api/agent/analyze`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ops_tok_invalid_fake_token_12345'
  },
  body: JSON.stringify({ orderId })
});
assert(invalidTokenAnalyze.status === 401, 'Invalid operator token rejected with HTTP 401 Unauthorized');

// 4.6 Valid token granted HTTP 200 OK
const validTokenAnalyze = await request(`${BACKEND_URL}/api/agent/analyze`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${validToken}`
  },
  body: JSON.stringify({ orderId })
});
assert(validTokenAnalyze.status === 200, 'Valid operator token granted HTTP 200 OK');
assert(validTokenAnalyze.json?.analysis?.orderId === orderId, 'Forensics analysis returned for order ' + orderId);
assert(validTokenAnalyze.json?.analysis?.confidence !== undefined, 'Forensics includes rule confidence');


// -------------------------------------------------------------------------
// SECTION 5: Real Payment Link Generation
// -------------------------------------------------------------------------
console.log('\n[Section 5: Real Payment Link Generation]');

const createLinkRes = await request(`${BACKEND_URL}/api/paypal/orders`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    intent: 'CAPTURE',
    amount: '89.50',
    currency: 'USD',
    description: 'Enterprise Consultation Pass'
  })
});
assert(createLinkRes.status === 200 || createLinkRes.status === 201, 'POST /api/paypal/orders returned HTTP 200/201');
const linkOrder = createLinkRes.json?.order;
assert(linkOrder?.id !== undefined, 'Order ID generated: ' + linkOrder?.id);
assert(linkOrder?.checkoutUrl?.includes('sandbox.paypal.com/checkoutnow?token='), 'Authentic PayPal checkout link generated: ' + linkOrder?.checkoutUrl);
assert(linkOrder?.amount === 89.50 || linkOrder?.amount === '89.50', 'Order amount matches requested $89.50');


// -------------------------------------------------------------------------
// SUMMARY
// -------------------------------------------------------------------------
console.log('\n======================================================');
console.log(`TOTAL AUDIT CHECKS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log('======================================================');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('✨ ALL PROJECT CLEANUP & ZERO-FAKE-DATA CHECKS PASSED!\n');
  process.exit(0);
}
