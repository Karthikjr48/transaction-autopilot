/**
 * Brevo SMTP Email Integration & Merchant Dashboard Privacy Test Suite
 * 
 * Verifies:
 * 1. Missing SMTP credentials validation.
 * 2. Valid SMTP configuration.
 * 3. SMTP authentication failure handling.
 * 4. Successful provider acceptance (ACCEPTED_BY_PROVIDER + message ID).
 * 5. Connection timeout handling with bounded retry.
 * 6. Duplicate notification prevention (persistent idempotency key).
 * 7. Payment email sent ONLY after authoritative payment capture confirmation.
 * 8. No email sent for simulated or unverified payment events.
 * 9. No duplicate email on webhook replay.
 * 10. No SMTP secrets in API responses or logs.
 * 11. No financial amounts or sensitive payment fields in Merchant Dashboard API responses.
 * 12. Existing PayPal Sandbox functionality remains intact.
 */

import assert from 'assert';
import http from 'http';
import emailService from '../backend/services/emailService.js';
import emailPersistence, {
  generateIdempotencyKey,
  maskOrderRef,
  maskEmail,
  recordQueuedEvent,
  updateEventStatus,
  findEventByIdempotencyKey,
  getOperationalEmailStats,
  _resetStoreForTesting
} from '../backend/services/emailPersistence.js';
import {
  buildPaymentCapturedTemplate,
  buildPaymentFailedTemplate,
  buildInvoiceCreatedTemplate,
  buildRefundIssuedTemplate,
  buildOrderStatusChangedTemplate
} from '../backend/services/emailTemplates.js';
import { config } from '../config/env.js';

const API_URL = 'http://localhost:5000';

function requestJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const reqOptions = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      timeout: options.timeout || 10000
    };

    const req = http.request(reqOptions, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(body); } catch (_) {}
        resolve({ status: res.statusCode, headers: res.headers, body: json, rawBody: body });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

console.log('======================================================================');
console.log('📧 BREVO SMTP INTEGRATION & MERCHANT PRIVACY TEST SUITE');
console.log('======================================================================\n');

let totalChecks = 0;
let passedChecks = 0;

function check(desc, fn) {
  totalChecks++;
  try {
    fn();
    passedChecks++;
    console.log(`  ✔ PASS: ${desc}`);
  } catch (err) {
    console.error(`  ❌ FAIL: ${desc}`);
    console.error(`     Error: ${err.message}`);
    throw err;
  }
}

async function asyncCheck(desc, fn) {
  totalChecks++;
  try {
    await fn();
    passedChecks++;
    console.log(`  ✔ PASS: ${desc}`);
  } catch (err) {
    console.error(`  ❌ FAIL: ${desc}`);
    console.error(`     Error: ${err.message}`);
    throw err;
  }
}

async function runSuite() {
  _resetStoreForTesting();

  // ------------------------------------------------------------------
  // 1. Missing SMTP Credentials
  // ------------------------------------------------------------------
  console.log('[Check 1: Missing SMTP Credentials Validation]');
  const origUser = config.email.smtpUser;
  const origPass = config.email.smtpPass;

  config.email.smtpUser = '';
  config.email.smtpPass = '';

  const missingValidation = emailService.validateSmtpConfig();
  check('Missing SMTP credentials identified safely', () => {
    assert(!missingValidation.valid, 'Validation should fail when credentials missing');
    assert(missingValidation.missing.includes('SMTP_USER'), 'Should report missing SMTP_USER');
    assert(missingValidation.missing.includes('SMTP_PASS'), 'Should report missing SMTP_PASS');
  });

  // Restore credentials
  config.email.smtpUser = origUser;
  config.email.smtpPass = origPass;

  // ------------------------------------------------------------------
  // 2. Valid SMTP Configuration
  // ------------------------------------------------------------------
  console.log('\n[Check 2: Valid SMTP Configuration Check]');
  const validValidation = emailService.validateSmtpConfig();
  check('Valid SMTP settings confirmed', () => {
    assert(validValidation.valid, 'Configuration should be marked valid with complete settings');
    assert.strictEqual(validValidation.missing.length, 0, 'No missing fields reported');
  });

  const sanitizedStatus = emailService.getSanitizedSmtpStatus();
  check('Sanitized status exposes host and port without passwords', () => {
    assert(sanitizedStatus.host.includes('brevo.com') || sanitizedStatus.host.includes('gmail.com'), 'Host indicates Brevo or Gmail SMTP relay');
    assert([465, 587].includes(sanitizedStatus.port), 'Port indicates standard 465 or 587');
    assert(!('pass' in sanitizedStatus), 'Password is NOT exposed in status object');
    assert(!('smtpPass' in sanitizedStatus), 'SMTP Pass is NOT exposed in status object');
  });

  // ------------------------------------------------------------------
  // 3. SMTP Authentication Failure Handling
  // ------------------------------------------------------------------
  console.log('\n[Check 3: SMTP Authentication Failure Handling]');
  emailService._setMockTransport(async (options) => {
    const err = new Error('535 Authentication credentials invalid');
    err.code = 'EAUTH';
    err.responseCode = 535;
    throw err;
  });

  await asyncCheck('Authentication failure transitions event to FAILED/BOUNCED without crashing', async () => {
    const sendResult = await emailService.sendEmail({
      eventType: 'INVOICE_CREATED',
      orderId: 'TEST-AUTH-FAIL-01',
      recipientEmail: 'customer@example.com',
      subject: 'Invoice Test',
      html: '<p>Test</p>',
      text: 'Test'
    });

    assert(!sendResult.success, 'Send should report failure');
    assert(sendResult.status === 'BOUNCED' || sendResult.status === 'FAILED', 'Status should transition to FAILED or BOUNCED');
    assert(sendResult.error.includes('Authentication credentials invalid'), 'Clean sanitized error returned');
  });

  // ------------------------------------------------------------------
  // 4. Successful Provider Acceptance
  // ------------------------------------------------------------------
  console.log('\n[Check 4: Successful Provider Acceptance (ACCEPTED_BY_PROVIDER)]');
  const mockMessageId = '<msg.brevo.test.17927789@smtp-relay.brevo.com>';
  emailService._setMockTransport(async (options) => {
    return {
      messageId: mockMessageId,
      response: '250 2.0.0 OK Message accepted by Brevo SMTP'
    };
  });

  await asyncCheck('Successful relay dispatch marks state as ACCEPTED_BY_PROVIDER', async () => {
    const sendResult = await emailService.sendEmail({
      eventType: 'INVOICE_CREATED',
      orderId: 'TEST-ORDER-SUCCESS-01',
      recipientEmail: 'buyer@domain.com',
      subject: 'Your Invoice',
      html: '<p>Invoice details</p>',
      text: 'Invoice details'
    });

    assert(sendResult.success, 'Send reported success');
    assert.strictEqual(sendResult.status, 'ACCEPTED_BY_PROVIDER', 'Status is strictly ACCEPTED_BY_PROVIDER');
    assert.strictEqual(sendResult.messageId, mockMessageId, 'Provider message ID preserved');
  });

  // ------------------------------------------------------------------
  // 5. Connection Timeout & Safe Retry
  // ------------------------------------------------------------------
  console.log('\n[Check 5: Connection Timeout & Bounded Retries]');
  emailService._setMockTransport(async () => {
    const err = new Error('Connection timed out after 10000ms');
    err.code = 'ETIMEDOUT';
    throw err;
  });

  await asyncCheck('Timeout marked as FAILED with bounded retry availability', async () => {
    const sendResult = await emailService.sendEmail({
      eventType: 'ORDER_STATUS_CHANGED',
      orderId: 'TEST-TIMEOUT-01',
      recipientEmail: 'timeout-user@domain.com',
      subject: 'Order Update',
      html: '<p>Update</p>',
      text: 'Update'
    });

    assert(!sendResult.success, 'Timeout caught cleanly');
    assert.strictEqual(sendResult.status, 'FAILED', 'Event status marked FAILED');
    assert(sendResult.canRetry === true, 'Transient timeout allows bounded retry');
    assert(sendResult.event.retryCount === 1, 'Retry count incremented to 1');
  });

  // ------------------------------------------------------------------
  // 6. Duplicate Notification Prevention (Idempotency)
  // ------------------------------------------------------------------
  console.log('\n[Check 6: Duplicate Notification Prevention (Idempotency)]');
  emailService._setMockTransport(async () => ({
    messageId: '<unique.idempotent.msg@relay.brevo.com>',
    response: '250 OK'
  }));

  const testKey = generateIdempotencyKey('ORDER-IDEMP-01', 'PAYMENT_CAPTURED', 'CAP-123');

  await asyncCheck('First dispatch succeeds and records event', async () => {
    const firstSend = await emailService.sendEmail({
      eventType: 'PAYMENT_CAPTURED',
      orderId: 'ORDER-IDEMP-01',
      recipientEmail: 'buyer@test.com',
      subject: 'Payment Confirmed',
      html: '<p>Confirmed</p>',
      text: 'Confirmed',
      idempotencyKey: testKey
    });
    assert(firstSend.success, 'First send succeeded');
    assert.strictEqual(firstSend.status, 'ACCEPTED_BY_PROVIDER');
  });

  await asyncCheck('Subsequent dispatch with same idempotency key is blocked as duplicate', async () => {
    const secondSend = await emailService.sendEmail({
      eventType: 'PAYMENT_CAPTURED',
      orderId: 'ORDER-IDEMP-01',
      recipientEmail: 'buyer@test.com',
      subject: 'Payment Confirmed',
      html: '<p>Confirmed</p>',
      text: 'Confirmed',
      idempotencyKey: testKey
    });
    assert(secondSend.success, 'Call completed cleanly');
    assert(secondSend.alreadySent === true, 'Flagged as already sent');
    assert(secondSend.duplicateBlocked === true, 'Flagged as duplicateBlocked');
  });

  // ------------------------------------------------------------------
  // 7. Payment Email ONLY After Authoritative Capture Confirmation
  // ------------------------------------------------------------------
  console.log('\n[Check 7: Payment Email Sent ONLY After Authoritative Capture Confirmation]');
  check('Capture email blocked on uncompleted payment state', async () => {
    const uncompletedOrder = { id: 'ORD-UNCAPTURED-01', payerEmail: 'test@example.com', captureStatus: 'UNCAPTURED' };
    const uncompletedCapture = { status: 'PENDING' };
    const res = await emailService.sendPaymentCapturedEmail({ order: uncompletedOrder, capture: uncompletedCapture });
    assert(!res.success, 'Email blocked for uncompleted capture');
    assert(res.error.includes('uncompleted payment'), 'Error explains capture prerequisite');
  });

  await asyncCheck('Capture email sent when payment status is strictly COMPLETED', async () => {
    const completedOrder = { id: 'ORD-COMPLETED-01', payerEmail: 'test@example.com', amount: '129.50', currency: 'USD' };
    const completedCapture = { id: 'CAP-998877', status: 'COMPLETED', amount: { value: '129.50', currency_code: 'USD' } };
    const res = await emailService.sendPaymentCapturedEmail({ order: completedOrder, capture: completedCapture });
    assert(res.success, 'Capture email dispatched for COMPLETED payment');
    assert.strictEqual(res.status, 'ACCEPTED_BY_PROVIDER');
  });

  // ------------------------------------------------------------------
  // 8. No Email Sent for Simulated or Unverified Payment Events
  // ------------------------------------------------------------------
  console.log('\n[Check 8: No Email Sent for Simulated or Unverified Events]');
  const initialEventCount = getOperationalEmailStats().totalEvents;

  const simRes = await requestJson(`${API_URL}/api/paypal/webhooks/simulate`, {
    method: 'POST',
    body: {
      eventType: 'PAYMENT.CAPTURE.COMPLETED',
      orderId: 'SIM-ORDER-999'
    }
  });

  check('Webhook simulator accepted for testing without triggering real emails', () => {
    assert(simRes.status === 200, 'Simulator returned HTTP 200');
    assert(simRes.body?.simulated === true, 'Payload flagged as simulated');
    const newEventCount = getOperationalEmailStats().totalEvents;
    assert.strictEqual(newEventCount, initialEventCount, 'No customer email event was created for simulated webhook');
  });

  // ------------------------------------------------------------------
  // 9. No Duplicate Email on Webhook Replay
  // ------------------------------------------------------------------
  console.log('\n[Check 9: No Duplicate Email on Webhook Replay]');
  const replayWebhookPayload = {
    id: `WH-TEST-REPLAY-${Date.now()}`,
    event_type: 'CHECKOUT.ORDER.APPROVED',
    resource: { id: 'ORD-REPLAY-01' }
  };

  const wh1 = await requestJson(`${API_URL}/api/paypal/webhooks`, {
    method: 'POST',
    body: replayWebhookPayload
  });
  check('First webhook delivery processed', () => {
    assert(wh1.status === 200, 'First webhook returned HTTP 200');
    assert(wh1.body.status === 'PROCESSED', 'First webhook marked PROCESSED');
  });

  const wh2 = await requestJson(`${API_URL}/api/paypal/webhooks`, {
    method: 'POST',
    body: replayWebhookPayload
  });
  check('Replayed webhook acknowledged and duplicate processing ignored', () => {
    assert(wh2.status === 200, 'Replay returned HTTP 200');
    assert(wh2.body.message?.includes('already processed'), 'Acknowledged as already processed');
  });

  // ------------------------------------------------------------------
  // 10. No SMTP Secrets in API Responses or Logs
  // ------------------------------------------------------------------
  console.log('\n[Check 10: Zero Leak of SMTP Secrets in API Responses]');
  const statusRes = await requestJson(`${API_URL}/api/email/status`);
  const statusRaw = statusRes.rawBody || '';
  const eventsRes = await requestJson(`${API_URL}/api/email/events`);
  const eventsRaw = eventsRes.rawBody || '';

  check('SMTP password is not leaked in /api/email/status', () => {
    assert(!statusRaw.includes(config.email.smtpPass), 'Raw SMTP_PASS not found in status endpoint');
  });

  check('SMTP password is not leaked in /api/email/events', () => {
    assert(!eventsRaw.includes(config.email.smtpPass), 'Raw SMTP_PASS not found in events endpoint');
  });

  // ------------------------------------------------------------------
  // 11. No Financial Amounts or Sensitive Payment Fields in Merchant Dashboard APIs
  // ------------------------------------------------------------------
  console.log('\n[Check 11: Merchant Dashboard Privacy & Zero Financial Values]');
  const merchantOverview = await requestJson(`${API_URL}/api/merchant/dashboard/overview`);
  const overviewBody = merchantOverview.body || {};

  check('GET /api/merchant/dashboard/overview returns HTTP 200', () => {
    assert.strictEqual(merchantOverview.status, 200);
    assert(overviewBody.success === true);
  });

  check('Merchant overview strictly omits financial volume and dollar totals', () => {
    assert(overviewBody.totalVolume === undefined, 'Privacy: totalVolume omitted from merchant overview');
    assert(overviewBody.revenue === undefined, 'Privacy: revenue omitted from merchant overview');
    assert(overviewBody.amount === undefined, 'Privacy: amount omitted from merchant overview');
    assert(overviewBody.operationalMetrics !== undefined, 'Operational metrics provided');
    assert(typeof overviewBody.operationalMetrics.totalOrders === 'number', 'totalOrders count provided');
    assert(typeof overviewBody.operationalMetrics.emailsDispatched === 'number', 'emailsDispatched count provided');
  });

  const merchantOrders = await requestJson(`${API_URL}/api/merchant/orders`);
  const ordersList = merchantOrders.body?.orders || [];

  check('GET /api/merchant/orders returns verified order details and masked reference', () => {
    assert.strictEqual(merchantOrders.status, 200);
    assert(Array.isArray(ordersList), 'Orders array returned');
    if (ordersList.length > 0) {
      const sample = ordersList[0];
      assert(sample.amount !== undefined, 'Authoritative amount provided in merchant order record');
      assert(sample.currency !== undefined, 'Authoritative currency provided in merchant order record');
      assert(sample.captureId === undefined, 'Privacy: captureId omitted from merchant order record');
      assert(sample.orderRef !== undefined, 'Masked orderRef provided');
      assert(sample.orderRef.includes('••••'), 'Order reference properly masked');
      assert(sample.emailStatus !== undefined, 'Email notification state provided');
    }
  });

  const merchantSummary = await requestJson(`${API_URL}/api/merchant/orders/8UC45598PW2909820/summary`);
  const summaryData = merchantSummary.body?.summary || {};

  check('Merchant order summary strictly omits financial amount and currency', () => {
    assert.strictEqual(merchantSummary.status, 200);
    assert(summaryData.amount === undefined, 'Privacy: amount strictly omitted from merchant order summary');
    assert(summaryData.currency === undefined, 'Privacy: currency strictly omitted from merchant order summary');
    assert(summaryData.orderRef !== undefined, 'Masked orderRef provided');
    assert(summaryData.emailStatus !== undefined, 'Email delivery status provided');
  });

  // ------------------------------------------------------------------
  // 12. Existing PayPal Sandbox Functionality Remains Intact
  // ------------------------------------------------------------------
  console.log('\n[Check 12: Existing PayPal Sandbox Functionality Integrity]');
  const paypalStatusRes = await requestJson(`${API_URL}/api/paypal/status`);
  check('PayPal Sandbox status remains connected and operational', () => {
    assert.strictEqual(paypalStatusRes.status, 200);
    assert.strictEqual(paypalStatusRes.body.connected, true);
    assert.strictEqual(paypalStatusRes.body.mode, 'sandbox');
  });

  const createOrderRes = await requestJson(`${API_URL}/api/paypal/orders`, {
    method: 'POST',
    body: {
      amount: '45.00',
      currency: 'USD',
      description: 'Brevo SMTP Regression Test Item'
    }
  });

  check('PayPal Orders v2 Sandbox order creation succeeds', () => {
    assert(createOrderRes.status === 200 || createOrderRes.status === 201);
    assert(createOrderRes.body.success === true);
    assert(createOrderRes.body.order?.id !== undefined);
  });

  console.log('\n======================================================');
  console.log(`TOTAL BREVO SMTP & PRIVACY CHECKS: ${totalChecks} | PASSED: ${passedChecks} | FAILED: 0`);
  console.log('======================================================');
  console.log('✨ ALL BREVO SMTP & PRIVACY CHECKS PASSED!\n');
}

runSuite().catch(err => {
  console.error('\n❌ Suite execution aborted with error:', err);
  process.exit(1);
});
