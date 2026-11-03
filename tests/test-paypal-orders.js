/**
 * PayPal Orders v2 & AI State Forensics Test Suite
 * Validates requirements:
 * 1. Live order retrieval from https://api-m.sandbox.paypal.com/v2/checkout/orders
 * 2. Accurate distinction between CREATED, APPROVED, COMPLETED, and uncaptured states
 * 3. Fulfillment status accurately reported as TRACKING_UNAVAILABLE for CREATED orders
 * 4. Zero fake data: payerEmail/payerName null when buyer has not checked out
 * 5. Separation of missing prerequisites from confirmed failures
 * 6. Zero client secret or access token exposure
 * 7. Graceful error handling on non-existent order IDs
 * 8. Carrier tracking rejection on uncaptured orders (HTTP 422 ORDER_NOT_CAPTURED)
 */

import { evaluateOrderForensics } from '../server.js';

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}`;
let TARGET_ORDER_ID = '8UC45598PW2909820';

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

async function resolveActiveOrderId() {
  try {
    const res = await fetch(`${BASE_URL}/api/paypal/orders/${TARGET_ORDER_ID}`);
    if (res.ok) {
      const data = await res.json();
      if (data.order && data.order.id) {
        return { orderId: data.order.id, amount: data.order.amount };
      }
    }
  } catch (_) {}

  // Prior order unavailable or expired -> mint fresh sandbox test order
  console.log('  [Self-Healing] Sandbox order expired or unavailable. Minting fresh PayPal Sandbox test order...');
  const createRes = await fetch(`${BASE_URL}/api/paypal/create-test-order`, { method: 'POST' });
  const createData = await createRes.json();
  if (createData.success && createData.order) {
    TARGET_ORDER_ID = createData.order.id;
    console.log(`  [Self-Healing] Minted fresh PayPal Sandbox order: ${TARGET_ORDER_ID} ($${createData.order.amount})`);
    return { orderId: createData.order.id, amount: createData.order.amount };
  }
  throw new Error('Unable to resolve active PayPal Sandbox order');
}

async function runTests() {
  console.log('\n======================================================');
  console.log('PAYPAL ORDERS V2 & AI STATE FORENSICS TEST SUITE');
  console.log('======================================================\n');

  const { orderId: targetOrderId, amount: expectedAmount } = await resolveActiveOrderId();

  // TEST 1: Live Order Retrieval from PayPal Orders v2
  console.log(`[Test 1: Live Order Retrieval for ${targetOrderId}]`);
  let orderData = null;
  try {
    const res = await fetch(`${BASE_URL}/api/paypal/orders/${targetOrderId}`);
    const data = await res.json();
    orderData = data.order;

    assert(res.status === 200, `GET /api/paypal/orders/${targetOrderId} returned HTTP 200`);
    assert(data.success === true, `Response reports success: true`);
    assert(orderData.id === targetOrderId, `Order ID matches authoritative ID: ${orderData.id}`);
    assert(orderData.status === 'CREATED', `Order status is verified as CREATED (Got: ${orderData.status})`);
    assert(typeof orderData.amount === 'number' && orderData.amount > 0, `Order amount is verified as numeric positive (Got: $${orderData.amount})`);
    assert(orderData.currency === 'USD', `Currency is USD (Got: ${orderData.currency})`);
    assert(orderData.intent === 'CAPTURE', `Intent is CAPTURE (Got: ${orderData.intent})`);
    assert(orderData.captureStatus === 'UNCAPTURED', `Capture status confirmed as UNCAPTURED`);
    assert(orderData.hasTracking === false, `Tracking confirmed not yet registered in PayPal`);
    assert(orderData.payerEmail === null, `Zero fake data: payerEmail is null (not checked out)`);
    assert(orderData.payerName === null, `Zero fake data: payerName is null (not checked out)`);
    assert(Array.isArray(orderData.links) && orderData.links.length > 0, `PayPal HATEOAS links present: ${orderData.links.length} links`);
    assert(!!data.syncTime, `Synchronization timestamp present: ${data.syncTime}`);
  } catch (err) {
    assert(false, `Test 1 threw error: ${err.message}`);
  }

  // TEST 2: Authoritative AI Forensics Analysis
  console.log(`\n[Test 2: Authoritative AI State Forensics on ${targetOrderId}]`);
  try {
    const res = await fetch(`${BASE_URL}/api/agent/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ops-autopilot-secret-key-2026'
      },
      body: JSON.stringify({ orderId: targetOrderId })
    });
    const data = await res.json();
    const analysis = data.analysis;

    assert(res.status === 200, `POST /api/agent/analyze returned HTTP 200`);
    assert(data.success === true, `Analysis reports success: true`);
    assert(analysis.orderId === targetOrderId, `Analysis targets verified Order ID: ${analysis.orderId}`);
    assert(analysis.commercialHealth === 'PENDING_BUYER_ACTION', `Commercial health classified accurately as PENDING_BUYER_ACTION (Got: ${analysis.commercialHealth})`);
    assert(analysis.captureStatus === 'UNCAPTURED', `Capture status accurately classified as UNCAPTURED`);
    assert(analysis.fulfillmentStatus === 'TRACKING_UNAVAILABLE', `Fulfillment status accurately reported as TRACKING_UNAVAILABLE (Got: ${analysis.fulfillmentStatus})`);
    assert(analysis.confidence >= 90, `Diagnostic confidence is high: ${analysis.confidence}%`);
    assert(analysis.confirmedFailures.length === 0, `Zero false failures reported (confirmedFailures: 0)`);
    assert(analysis.missingInfo.length > 0, `Missing prerequisites identified: ${analysis.missingInfo.length} items`);
    assert(analysis.verifiedFacts.length > 0, `Authoritative verified facts documented: ${analysis.verifiedFacts.length} facts`);
    assert(analysis.recommendedActions.length >= 2, `Merchant recovery actions recommended: ${analysis.recommendedActions.length} steps`);
    
    // Check checkout URL in recommended actions
    const hasCheckoutAction = analysis.recommendedActions.some(a => a.url && a.url.includes('sandbox.paypal.com'));
    assert(hasCheckoutAction, `Action includes PayPal Sandbox checkout approval URL`);

    // Evidence audit block
    assert(!!analysis.evidence, `Evidence audit block present`);
    assert(analysis.evidence.order_id === targetOrderId, `Evidence confirms live PayPal order ID`);
    assert(analysis.evidence.order_status === 'CREATED', `Evidence confirms PayPal status CREATED`);
  } catch (err) {
    assert(false, `Test 2 threw error: ${err.message}`);
  }

  // TEST 3: Zero Credential or Token Exposure
  console.log('\n[Test 3: Security & Credential Redaction in Order Endpoints]');
  try {
    const res = await fetch(`${BASE_URL}/api/paypal/orders/${targetOrderId}`);
    const data = await res.json();
    const rawJson = JSON.stringify(data);

    assert(!data.clientSecret, `Order response does NOT expose clientSecret`);
    assert(!data.accessToken, `Order response does NOT expose accessToken`);
    assert(!rawJson.includes('EEqAKFNkjjIrgCjSoeig25A4B94'), `PayPal Client Secret is NOT found anywhere in payload`);
    assert(!rawJson.includes('A21A'), `Bearer access token is NOT leaked in payload`);
  } catch (err) {
    assert(false, `Test 3 threw error: ${err.message}`);
  }

  // TEST 4: Non-Existent Order Error Handling
  console.log('\n[Test 4: Non-Existent Order ID Handling]');
  try {
    const res = await fetch(`${BASE_URL}/api/paypal/orders/NON_EXISTENT_ORDER_99999`);
    const data = await res.json();

    assert(res.status === 404, `Non-existent order returned HTTP 404 (Got: ${res.status})`);
    assert(data.success === false, `Response reported success: false`);
    assert(data.error.includes('PayPal Orders API Error'), `Clean PayPal API error message returned: ${data.error}`);
  } catch (err) {
    assert(false, `Test 4 threw error: ${err.message}`);
  }

  // TEST 5: Carrier Tracking Rejection on Uncaptured Orders
  console.log('\n[Test 5: Carrier Tracking Rejection on Uncaptured Orders]');
  try {
    const res = await fetch(`${BASE_URL}/api/paypal/orders/${targetOrderId}/tracking`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPERATOR_SECRET_KEY || 'ops-autopilot-secret-key-2026'}`
      },
      body: JSON.stringify({
        trackingNumber: '9400111899562537624890',
        carrier: 'USPS'
      })
    });
    const data = await res.json();

    assert(res.status === 422, `Tracking endpoint returned HTTP 422 for uncaptured order (Got: ${res.status})`);
    assert(data.success === false, `Response reports success: false`);
    assert(data.code === 'ORDER_NOT_CAPTURED', `Error code confirmed as ORDER_NOT_CAPTURED (Got: ${data.code})`);
    assert(data.currentStatus === 'CREATED', `Reports current uncaptured status as CREATED`);
  } catch (err) {
    assert(false, `Test 5 threw error: ${err.message}`);
  }

  // TEST 6: State Transition Forensics with Carrier Tracking Added
  console.log('\n[Test 6: Forensic State Transition to TRACKED]');
  try {
    const simulatedCapturedOrder = {
      id: targetOrderId,
      status: 'COMPLETED',
      intent: 'CAPTURE',
      amount: expectedAmount,
      currency: 'USD',
      captureStatus: 'COMPLETED',
      hasTracking: true,
      trackingNumber: '1Z9999999999999999',
      carrier: 'UPS',
      payerEmail: 'procurement@acme-corp.internal',
      payerName: 'Acme Procurement Team'
    };

    const forensics = evaluateOrderForensics(simulatedCapturedOrder);
    assert(forensics.commercialHealth === 'HEALTHY', `Commercial health transitions to HEALTHY once tracked (Got: ${forensics.commercialHealth})`);
    assert(forensics.fulfillmentStatus.includes('TRACKED'), `Fulfillment status confirms TRACKED (Got: ${forensics.fulfillmentStatus})`);
    assert(forensics.verifiedFacts.some(f => f.includes('Carrier Tracking Number')), `Forensics notes carrier tracking number`);
    assert(forensics.recommendedActions[0].type === 'NOMINAL', `Action indicates nominal transit monitoring`);
  } catch (err) {
    assert(false, `Test 6 threw error: ${err.message}`);
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
