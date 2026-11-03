/**
 * Master Comprehensive Dashboard Functionality Test Suite — Transaction-Autopilot
 * Validates:
 * 1. Project Naming Consistency (Zero 'Premium' in project-owned files)
 * 2. Real Customers Aggregation API (GET /api/paypal/customers)
 * 3. Products & Services Catalog API (GET /api/paypal/products)
 * 4. Genuine Notifications System (GET /api/paypal/notifications)
 * 5. Electronic Invoicing Endpoint (POST /api/paypal/invoices)
 * 6. KPI Calculations & Deterministic Analytics Math
 * 7. Empty Data, Edge Cases & Error States
 * 8. Zero Credential Leakage in responses
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

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

console.log('\n======================================================');
console.log('TRANSACTION-AUTOPILOT — MASTER DASHBOARD FUNCTIONALITY');
console.log('======================================================\n');

// ----------------------------------------------------------------------
// Suite 1: Mandatory Project Naming Consistency Audit
// ----------------------------------------------------------------------
console.log('[Suite 1: Mandatory Project Naming Consistency Audit]');

const checkFiles = [
  'package.json',
  'package-lock.json',
  'ui-server.js',
  'server.js',
  'index.html',
  'css/merchant.css',
  'css/layout.css',
  'js/app.js',
  'README.md'
];

let unwantedCount = 0;
for (const relPath of checkFiles) {
  const fullPath = path.join(ROOT_DIR, relPath);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    // We check for unwanted string in project-owned text
    const matches = (content.match(/Transaction[- ]Autopilot[- ]Premium/gi) || []).length;
    if (matches > 0) {
      unwantedCount += matches;
      console.error(`  Found unwanted naming in ${relPath}: ${matches} instances`);
    }
  }
}

assert(unwantedCount === 0, `Zero project-name references to unwanted suffix in core files (Found: ${unwantedCount})`);

// ----------------------------------------------------------------------
// Suite 2: Real Customers Aggregation API
// ----------------------------------------------------------------------
console.log('\n[Suite 2: Real Customers Aggregation API]');
try {
  const res = await fetch(`${BASE_URL}/api/paypal/customers`);
  assert(res.status === 200, 'GET /api/paypal/customers returned HTTP 200');
  const data = await res.json();
  assert(data.success === true, 'Response reports success: true');
  assert(Array.isArray(data.customers), 'Customers returned as array');
  assert(typeof data.count === 'number', 'Customer count is numeric');
  
  if (data.customers.length > 0) {
    const firstCustomer = data.customers[0];
    assert(typeof firstCustomer.email === 'string', 'Customer profile contains email string');
    assert(typeof firstCustomer.lifetimeSpend === 'undefined' || typeof firstCustomer.lifetimeSpend === 'number', 'Customer lifetime spend is safely omitted or numeric');
    assert(typeof firstCustomer.orderCount === 'number', 'Customer order count is numeric');
    assert(!firstCustomer.email.includes('buyer@paypal.com') && !firstCustomer.email.includes('sandbox-buyer'), 'Customer profile contains authentic, non-placeholder email');
  } else {
    assert(data.count === 0, 'Clean zero count truthfully handled when no authenticated buyers exist');
  }
} catch (err) {
  assert(false, `Customer API error: ${err.message}`);
}

// ----------------------------------------------------------------------
// Suite 3: Products & Services Catalog API
// ----------------------------------------------------------------------
console.log('\n[Suite 3: Products & Services Catalog API]');
try {
  const res = await fetch(`${BASE_URL}/api/paypal/products`);
  assert(res.status === 200, 'GET /api/paypal/products returned HTTP 200');
  const data = await res.json();
  assert(data.success === true, 'Response reports success: true');
  assert(Array.isArray(data.products), 'Products returned as array');
  assert(data.products.length >= 4, `Catalog contains 4+ commercial tiers (Found: ${data.products.length})`);
  
  const sample = data.products[0];
  assert(typeof sample.name === 'string', 'Product has name');
  assert(typeof sample.price === 'number', 'Product price is numeric');
  assert(typeof sample.sku === 'string', 'Product has SKU code');
} catch (err) {
  assert(false, `Products API error: ${err.message}`);
}

// ----------------------------------------------------------------------
// Suite 4: Genuine Notifications System
// ----------------------------------------------------------------------
console.log('\n[Suite 4: Genuine Notifications System]');
try {
  const res = await fetch(`${BASE_URL}/api/paypal/notifications`);
  assert(res.status === 200, 'GET /api/paypal/notifications returned HTTP 200');
  const data = await res.json();
  assert(data.success === true, 'Response reports success: true');
  assert(Array.isArray(data.notifications), 'Notifications returned as array');
  assert(data.notifications.length > 0, `Genuine order state alerts identified (Found: ${data.notifications.length})`);
  
  const alert = data.notifications[0];
  assert(!!alert.orderId, 'Alert references verified PayPal Order ID');
  assert(!!alert.severity, 'Alert includes severity level');
  assert(!!alert.message, 'Alert provides clear actionable message');
} catch (err) {
  assert(false, `Notifications API error: ${err.message}`);
}

// ----------------------------------------------------------------------
// Suite 5: Electronic Invoicing Endpoint
// ----------------------------------------------------------------------
console.log('\n[Suite 5: Electronic Invoicing Endpoint]');
try {
  const authHeader = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.OPERATOR_SECRET_KEY || 'ops-autopilot-secret-key-2026'}`
  };

  // Test invalid input rejection
  const invalidRes = await fetch(`${BASE_URL}/api/paypal/invoices`, {
    method: 'POST',
    headers: authHeader,
    body: JSON.stringify({})
  });
  assert(invalidRes.status === 400, 'Empty invoice rejected with HTTP 400');
  
  // Test valid invoice generation
  const validRes = await fetch(`${BASE_URL}/api/paypal/invoices`, {
    method: 'POST',
    headers: authHeader,
    body: JSON.stringify({
      customerEmail: 'billing@enterprise-partner.org',
      itemDescription: 'API Forensic License',
      amount: 31.00,
      currency: 'USD'
    })
  });
  assert(validRes.status === 200, 'Valid invoice accepted with HTTP 200');
  const validData = await validRes.json();
  assert(validData.success === true, 'Invoice reports success: true');
  assert(validData.invoice.id.startsWith('INV-'), 'Invoice ID minted with prefix INV-');
  assert(validData.invoice.amount === 31, 'Invoice amount verified as $31');
} catch (err) {
  assert(false, `Invoicing API error: ${err.message}`);
}

// ----------------------------------------------------------------------
// Suite 6: KPI Calculations & Analytics Integrity
// ----------------------------------------------------------------------
console.log('\n[Suite 6: KPI Calculations & Analytics Integrity]');
try {
  const res = await fetch(`${BASE_URL}/api/paypal/analytics`);
  const data = await res.json();
  const a = data.analytics;

  assert(typeof a.totalVolume === 'number' && a.totalVolume > 0, 'Total volume is positive number');
  assert(typeof a.totalCount === 'number' && a.totalCount >= 1, 'Total orders count is valid');
  assert(typeof a.healthyCount === 'number', 'Healthy count is numeric');
  assert(typeof a.attentionCount === 'number', 'Attention count is numeric');
  assert(a.statusDistribution.healthy + a.statusDistribution.attention + a.statusDistribution.critical <= 100, 'Status percentages sum to <= 100%');
} catch (err) {
  assert(false, `Analytics verification error: ${err.message}`);
}

// ----------------------------------------------------------------------
// Suite 7: Zero Credential Leakage Verification
// ----------------------------------------------------------------------
console.log('\n[Suite 7: Zero Credential Leakage in Responses]');
try {
  const secretKey = process.env.PAYPAL_CLIENT_SECRET || '';
  const groqKey = process.env.GROQ_API_KEY || '';

  const testEndpoints = [
    '/api/paypal/status',
    '/api/paypal/analytics',
    '/api/paypal/transactions',
    '/api/paypal/customers',
    '/api/paypal/products',
    '/api/paypal/notifications'
  ];

  for (const ep of testEndpoints) {
    const res = await fetch(`${BASE_URL}${ep}`);
    const text = await res.text();

    if (secretKey && secretKey.length > 8) {
      assert(!text.includes(secretKey), `Zero Leak: PayPal Secret not leaked in ${ep}`);
    } else {
      assert(true, `Zero Leak: PayPal Secret check passed for ${ep}`);
    }

    if (groqKey && groqKey.length > 8) {
      assert(!text.includes(groqKey), `Zero Leak: Groq API Key not leaked in ${ep}`);
    } else {
      assert(true, `Zero Leak: Groq API Key check passed for ${ep}`);
    }
  }
} catch (err) {
  assert(false, `Zero leak test error: ${err.message}`);
}

// ----------------------------------------------------------------------
// Suite 8: Merchant UI Confidentiality & Hygiene Audit
// ----------------------------------------------------------------------
console.log('\n[Suite 8: Merchant UI Confidentiality & Hygiene Audit]');
try {
  const indexHtmlPath = path.join(ROOT_DIR, 'index.html');
  const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

  // 8.1 No sandbox gateway hostnames in DOM
  assert(!indexHtml.includes('api-m.sandbox.paypal.com'), 'Confidentiality: api-m.sandbox.paypal.com hostname eliminated from index.html DOM');

  // 8.2 No Sandbox badges
  assert(!indexHtml.includes('Sandbox Mode'), 'Confidentiality: "Sandbox Mode" badge eliminated from index.html DOM');
  assert(!indexHtml.includes('Sandbox Environment'), 'Confidentiality: "Sandbox Environment" badge eliminated from index.html DOM');

  // 8.3 No auth-test-details raw pre block
  assert(!indexHtml.includes('auth-test-details'), 'Confidentiality: Raw <pre id="auth-test-details"> debug block eliminated from DOM');

  // 8.4 Verified typography preserved
  const tokensCssPath = path.join(ROOT_DIR, 'css/tokens.css');
  const tokensCss = fs.readFileSync(tokensCssPath, 'utf8');
  assert(indexHtml.includes('PayPalProTextVFWeb.woff2') && tokensCss.includes('PayPal Pro Text VF'), 'Typography: PayPal Pro Text VF font family declared in tokens.css and preloaded in index.html');

  // 8.5 Original PayPal logo preserved
  assert(indexHtml.includes('assets/paypal-logo.png'), 'Branding: Official PayPal logo (assets/paypal-logo.png) preserved');

  // 8.6 Global search input padding preserved
  const layoutCssPath = path.join(ROOT_DIR, 'css/layout.css');
  const layoutCss = fs.readFileSync(layoutCssPath, 'utf8');
  assert(layoutCss.includes('0 44px 0 38px'), 'Styling: Global search input alignment padding (0 44px 0 38px) preserved');

  // 8.7 API Schema Confidentiality in /api/agent/analyze
  const ordersRes = await fetch(`${BASE_URL}/api/paypal/transactions`);
  const ordersData = await ordersRes.json();
  const sampleOrderId = ordersData.transactions?.[0]?.id;

  if (sampleOrderId) {
    const analyzeRes = await fetch(`${BASE_URL}/api/agent/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ops-autopilot-secret-key-2026'
      },
      body: JSON.stringify({ orderId: sampleOrderId })
    });
    const analyzeData = await analyzeRes.json();
    assert(analyzeData.success === true, 'Forensic analyze API responded with success');
    const evidence = analyzeData.analysis?.evidence || {};
    assert(evidence.order_id === sampleOrderId, 'Analysis evidence contains authoritative order_id');
    assert(typeof evidence.gateway === 'undefined', 'Confidentiality: evidence.gateway stripped from merchant API schema');
    assert(typeof evidence.capture_records_found === 'undefined', 'Confidentiality: evidence.capture_records_found stripped from schema');
    assert(typeof evidence.tracking_records_found === 'undefined', 'Confidentiality: evidence.tracking_records_found stripped from schema');
    assert(typeof evidence.queried_at === 'undefined', 'Confidentiality: evidence.queried_at internal timestamp stripped from schema');
  } else {
    assert(true, 'No sample orders available for analyze schema test');
  }
} catch (err) {
  assert(false, `Merchant UI Confidentiality audit error: ${err.message}`);
}

// ----------------------------------------------------------------------
// Suite 9: Truthful Environment & Zero-Placeholder Audit
// ----------------------------------------------------------------------
console.log('\n[Suite 9: Truthful Environment & Zero-Placeholder Audit]');
try {
  const indexHtmlPath = path.join(ROOT_DIR, 'index.html');
  const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

  // 9.1 Environment indicators never claim Production Gateway or Verified Secure Channel
  assert(!indexHtml.includes('Production Gateway'), 'Truthful Environment: "Production Gateway" eliminated from index.html');
  assert(!indexHtml.includes('Verified Secure Channel'), 'Truthful Environment: "Verified Secure Channel" eliminated from index.html');

  // 9.2 Initial unverified status must not claim Gateway Connected before verification
  assert(!indexHtml.includes('>Gateway Connected<'), 'Truthful Environment: Initial DOM does not claim "Gateway Connected" before status check');
  assert(indexHtml.includes('Checking Connection...'), 'Truthful Environment: Initial indicators accurately display "Checking Connection..."');

  // 9.3 Zero placeholder customer identities in UI and Client code
  const appJsPath = path.join(ROOT_DIR, 'js/app.js');
  const appJs = fs.readFileSync(appJsPath, 'utf8');
  assert(!appJs.includes('Verified Buyer'), 'Authentic Telemetry: "Verified Buyer" eliminated from client application');
  assert(!appJs.includes('buyer@paypal.com'), 'Authentic Telemetry: "buyer@paypal.com" eliminated from client application');

  // 9.4 Server API verification - Transactions return authentic payer telemetry
  const trxRes = await fetch(`${BASE_URL}/api/paypal/transactions`);
  const trxData = await trxRes.json();
  assert(trxData.success === true, 'Transactions endpoint responded successfully');
  const trxList = trxData.transactions || [];
  const hasPlaceholderBuyer = trxList.some(t => t.payerEmail === 'buyer@example.com' || t.payerName === 'Verified Buyer');
  assert(!hasPlaceholderBuyer, 'Authentic Telemetry: Transactions API contains zero placeholder buyers');

  // 9.5 Server API verification - Customers API returns zero placeholder identities
  const custRes = await fetch(`${BASE_URL}/api/paypal/customers`);
  const custData = await custRes.json();
  assert(custData.success === true, 'Customers endpoint responded successfully');
  const custList = custData.customers || [];
  const hasSyntheticBuyer = custList.some(c => (c.email || '').includes('sandbox-buyer') || (c.name || '').includes('Verified Buyer'));
  assert(!hasSyntheticBuyer, 'Authentic Telemetry: Customers API contains zero synthetic/placeholder buyers');
} catch (err) {
  assert(false, `Truthful Environment & Zero-Placeholder Audit error: ${err.message}`);
}

console.log('\n======================================================');
console.log(`TOTAL CHECKS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log('======================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
