/**
 * PayPal Merchant Portal Enterprise Features Test Suite
 * Validates:
 * 1. Analytics calculation & breakdown (GET /api/paypal/analytics)
 * 2. PayPal Webhook ingestion listener (POST /api/webhooks/paypal)
 * 3. Webhook event stream history (GET /api/paypal/webhooks/events)
 * 4. Webhook event simulation (POST /api/paypal/webhooks/simulate)
 * 5. Autonomous Order Recovery action (POST /api/paypal/orders/:orderId/recover)
 */

import {
  getSandboxAnalytics,
  recordWebhookEvent,
  recoverOrderFulfillment
} from '../server.js';

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
console.log('PAYPAL MERCHANT PORTAL ENTERPRISE SUITE');
console.log('======================================================\n');

// Suite 1: Analytics Calculation
console.log('[Suite 1: Merchant Analytics Calculation]');
const analytics = getSandboxAnalytics();
assert(typeof analytics.totalVolume === 'number', 'Analytics reports numeric total volume');
assert(analytics.totalVolume > 0, `Total volume is positive (Got: $${analytics.totalVolume})`);
assert(Array.isArray(analytics.hourlyVolume), 'Analytics includes hourly volume curve array');
assert(analytics.hourlyVolume.length >= 5, 'Hourly volume curve contains multiple timeline points');
assert(typeof analytics.statusDistribution === 'object', 'Analytics includes status distribution object');
assert(typeof analytics.statusDistribution.healthy === 'number', 'Healthy percentage is numeric');
assert(typeof analytics.disputeRiskScore === 'string', 'Dispute risk score reported accurately');

// Suite 2: Webhook Event Ingestion & Simulation
console.log('\n[Suite 2: PayPal Webhook Ingestion & History]');
const sampleEvent = {
  id: `TEST-WH-${Date.now()}`,
  event_type: 'CHECKOUT.ORDER.APPROVED',
  summary: 'Buyer authorized PayPal checkout session',
  resource_id: '8UC45598PW2909820'
};
const recorded = recordWebhookEvent(sampleEvent);
assert(recorded.id === sampleEvent.id, 'Webhook event ID preserved');
assert(recorded.status === 'PROCESSED', 'Webhook event processed status recorded');

// Post to running server's webhook endpoint so server history registers the event
try {
  await fetch(`${BASE_URL}/api/webhooks/paypal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sampleEvent)
  });
} catch (e) {
  // Test server communication
}

// Suite 3: Autonomous Recovery Safeguards
console.log('\n[Suite 3: Autonomous Recovery Safeguards on Uncaptured Order]');
try {
  let targetOrderId = '8UC45598PW2909820';
  const orderCheck = await fetch(`${BASE_URL}/api/paypal/orders/${targetOrderId}`).catch(() => null);
  const orderData = orderCheck && orderCheck.ok ? await orderCheck.json() : null;
  if (!orderData || orderData.order?.status === 'COMPLETED' || orderData.order?.captureStatus === 'CAPTURED') {
    const mintRes = await fetch(`${BASE_URL}/api/paypal/create-test-order`, { method: 'POST' });
    const mintData = await mintRes.json();
    if (mintData?.success && mintData.order?.id) {
      targetOrderId = mintData.order.id;
    }
  }

  const recoveryResult = await recoverOrderFulfillment(targetOrderId);
  assert(recoveryResult.success === false, 'Recovery safely blocked for uncaptured order');
  assert(recoveryResult.recovered === false, 'Fulfillment recovery marked false');
  assert(!!recoveryResult.message, 'Clear explanatory reason provided for recovery hold');
} catch (err) {
  assert(false, `Unexpected recovery error: ${err.message}`);
}

// Suite 4: End-to-End HTTP Endpoints
console.log('\n[Suite 4: End-to-End Merchant HTTP Routes]');
try {
  const analyticsRes = await fetch(`${BASE_URL}/api/paypal/analytics`);
  assert(analyticsRes.status === 200, 'GET /api/paypal/analytics returned HTTP 200');
  const analyticsData = await analyticsRes.json();
  assert(analyticsData.success === true, 'Analytics endpoint reports success: true');

  const webhooksRes = await fetch(`${BASE_URL}/api/paypal/webhooks/events`);
  assert(webhooksRes.status === 200, 'GET /api/paypal/webhooks/events returned HTTP 200');
  const webhooksData = await webhooksRes.json();
  assert(Array.isArray(webhooksData.events), 'Webhooks endpoint returns events array');
  assert(webhooksData.events.length > 0, 'Webhook history contains processed events');

  const simRes = await fetch(`${BASE_URL}/api/paypal/webhooks/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventType: 'PAYMENT.CAPTURE.COMPLETED', orderId: '8UC45598PW2909820' })
  });
  assert(simRes.status === 200, 'POST /api/paypal/webhooks/simulate returned HTTP 200');
  const simData = await simRes.json();
  assert(simData.success === true, 'Simulation reports success: true');
  assert(simData.event.event_type === 'PAYMENT.CAPTURE.COMPLETED', 'Simulated event type preserved');
} catch (err) {
  assert(false, `HTTP route test failed: ${err.message}`);
}

console.log('\n======================================================');
console.log(`TOTAL CHECKS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log('======================================================\n');

if (failed > 0) process.exit(1);
