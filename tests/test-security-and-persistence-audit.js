/**
 * Automated Verification Suite: Security Hardening & Persistence Audit
 * Covers the 6 Core Security & Data Integrity Pillars:
 * 1. Server-side Authentication & Authorization (/api/agent/analyze & role headers)
 * 2. Official PayPal Webhook Signature Verification (SSRF protection & forged header rejection)
 * 3. Multi-layer Idempotency (Capture locks, Webhook replay, Invoice creation, Email dispatches)
 * 4. Authoritative PayPal Confirmation Before Email Dispatch
 * 5. Strict Merchant Dashboard Privacy (Zero financial amounts or payloads)
 * 6. Disk Persistence Across Server Restarts (Orders, Invoices, Webhooks, Idempotency, Emails)
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  writeJsonFileAtomic,
  saveOrder,
  loadOrders,
  getOrder,
  saveInvoice,
  loadInvoices,
  getInvoice,
  findInvoiceByReferenceOrIdempotency,
  saveWebhookEvent,
  loadWebhookEvents,
  getWebhookEvents,
  loadProcessedWebhookIds,
  markWebhookProcessed,
  isWebhookProcessed,
  saveOrderIdempotencyKey,
  getOrderIdempotencyKey,
  loadIdempotencyKeys,
  loadMerchantSettings,
  saveMerchantSettings
} from '../backend/services/dataPersistence.js';

import {
  recordQueuedEvent,
  flushToDisk,
  reloadFromDisk,
  getAllEvents
} from '../backend/services/emailPersistence.js';

import emailService from '../backend/services/emailService.js';
import { verifyPayPalWebhookSignature } from '../server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const API_URL = 'http://localhost:5000';

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

function assert(condition, message) {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  \x1b[32m✔ PASS:\x1b[0m ${message}`);
  } else {
    failedChecks++;
    console.error(`  \x1b[31m✖ FAIL:\x1b[0m ${message}`);
  }
}

async function requestJson(url, options = {}) {
  const fetchOptions = {
    method: options.method || 'GET',
    headers: options.headers || {}
  };
  if (options.body) {
    fetchOptions.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
    if (!fetchOptions.headers['Content-Type']) {
      fetchOptions.headers['Content-Type'] = 'application/json';
    }
  }
  const res = await fetch(url, fetchOptions);
  let body = null;
  try {
    body = await res.json();
  } catch (e) {
    body = null;
  }
  return { status: res.status, headers: Object.fromEntries(res.headers.entries()), body };
}

async function runSecurityAndPersistenceAudit() {
  console.log('======================================================================');
  console.log('🛡️ TRANSACTION-AUTOPILOT — 6-PILLAR SECURITY & PERSISTENCE AUDIT');
  console.log('======================================================================\n');

  // Setup test order for authorization checks
  const createRes = await requestJson(`${API_URL}/api/paypal/create-test-order`, { method: 'POST' });
  const testOrderId = createRes.body?.order?.id || '8UC45598PW2909820';

  // --------------------------------------------------------------------------
  // PILLAR 1: Server-Side Authentication & Authorization
  // --------------------------------------------------------------------------
  console.log('[Pillar 1: Server-Side Authentication & Role Authorization]');

  // 1.1 Missing credentials
  const noAuthRes = await requestJson(`${API_URL}/api/agent/analyze`, {
    method: 'POST',
    body: { orderId: testOrderId }
  });
  assert(noAuthRes.status === 401, `Unauthenticated request rejected with HTTP 401 (Got: ${noAuthRes.status})`);
  assert(noAuthRes.body?.error?.includes('Unauthorized'), 'Clean unauthorized error returned');

  // 1.2 Forged x-client-role: operations without token
  const forgedRoleRes = await requestJson(`${API_URL}/api/agent/analyze`, {
    method: 'POST',
    headers: { 'x-client-role': 'operations' },
    body: { orderId: testOrderId }
  });
  assert(forgedRoleRes.status === 401, `Forged role header rejected with HTTP 401 (Got: ${forgedRoleRes.status})`);
  assert(forgedRoleRes.body?.error?.includes('Header "x-client-role" alone is not proof of identity'), 'Explicitly notes role header is untrusted');

  // 1.3 Client role: merchant
  const merchantRoleRes = await requestJson(`${API_URL}/api/agent/analyze`, {
    method: 'POST',
    headers: { 'x-client-role': 'merchant' },
    body: { orderId: testOrderId }
  });
  assert(merchantRoleRes.status === 403, `Merchant role blocked with HTTP 403 Forbidden (Got: ${merchantRoleRes.status})`);
  assert(merchantRoleRes.body?.error?.includes('Merchant role is not authorized'), 'Access denied message returned for merchant');

  // 1.4 Valid server-side operator session token
  const authRes = await requestJson(`${API_URL}/api/operations/auth`, {
    method: 'POST',
    body: { secretKey: 'ops-autopilot-secret-key-2026' }
  });
  assert(authRes.status === 200 && Boolean(authRes.body?.token), 'Operator login succeeds with valid secret key');
  const validToken = authRes.body?.token;

  const authorizedRes = await requestJson(`${API_URL}/api/agent/analyze`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${validToken}` },
    body: { orderId: testOrderId }
  });
  assert(authorizedRes.status === 200, `Authorized operator granted HTTP 200 OK (Got: ${authorizedRes.status})`);
  assert(authorizedRes.body?.success === true, 'Analysis performed for authorized operator');
  console.log();

  // --------------------------------------------------------------------------
  // PILLAR 2: Official PayPal Webhook Signature Verification & SSRF Protection
  // --------------------------------------------------------------------------
  console.log('[Pillar 2: Official PayPal Webhook Signature Verification]');

  // 2.1 SSRF Protection: Reject cert URL with non-paypal domain
  const ssrfHeaders = {
    'paypal-auth-algo': 'SHA256withRSA',
    'paypal-cert-url': 'https://evil-attacker-site.com/cert.pem',
    'paypal-transmission-id': 'trans-test-123',
    'paypal-transmission-sig': 'sig-test-123',
    'paypal-transmission-time': new Date().toISOString()
  };
  const ssrfVerify = await verifyPayPalWebhookSignature(ssrfHeaders, { test: 1 }, async () => 'test_token');
  assert(ssrfVerify.verified === false, 'SSRF Protection: Non-paypal.com cert URL strictly rejected');
  assert(ssrfVerify.error?.includes('Untrusted certificate authority host'), 'SSRF error clearly explains cert domain violation');

  // 2.2 SSRF Protection: Reject insecure HTTP cert URL
  const httpCertHeaders = {
    'paypal-auth-algo': 'SHA256withRSA',
    'paypal-cert-url': 'http://api.paypal.com/cert.pem',
    'paypal-transmission-id': 'trans-test-123',
    'paypal-transmission-sig': 'sig-test-123',
    'paypal-transmission-time': new Date().toISOString()
  };
  const httpCertVerify = await verifyPayPalWebhookSignature(httpCertHeaders, { test: 1 }, async () => 'test_token');
  assert(httpCertVerify.verified === false, 'SSRF Protection: Insecure HTTP protocol strictly rejected');

  // 2.3 Webhook Ingestion API Rejection on Invalid Signature
  const forgedWebhookRes = await requestJson(`${API_URL}/api/webhooks/paypal`, {
    method: 'POST',
    headers: ssrfHeaders,
    body: { id: `WH-FORGED-${Date.now()}`, event_type: 'PAYMENT.CAPTURE.COMPLETED' }
  });
  assert(forgedWebhookRes.status === 401, `Forged webhook rejected with HTTP 401 (Got: ${forgedWebhookRes.status})`);
  assert(forgedWebhookRes.body?.error?.includes('Authoritative PayPal webhook signature verification failed'), 'Clear signature verification rejection');

  // 2.4 Simulated webhooks safely processed without sending real customer emails
  const simWebhookRes = await requestJson(`${API_URL}/api/webhooks/paypal`, {
    method: 'POST',
    body: {
      id: `SIM-WH-${Date.now()}`,
      event_type: 'CHECKOUT.ORDER.APPROVED',
      summary: 'Simulated Approval Event',
      simulated: true
    }
  });
  assert(simWebhookRes.status === 200, `Simulated webhook accepted for demo/test (Got: ${simWebhookRes.status})`);
  assert(simWebhookRes.body?.status === 'PROCESSED', 'Simulated webhook processed');
  console.log();

  // --------------------------------------------------------------------------
  // PILLAR 3: Multi-Layer Idempotency
  // --------------------------------------------------------------------------
  console.log('[Pillar 3: Multi-Layer Idempotency Verification]');

  // 3.1 Webhook Replay Idempotency
  const uniqueEventId = `WH-IDEM-AUDIT-${Date.now()}`;
  const firstWebhookRes = await requestJson(`${API_URL}/api/webhooks/paypal`, {
    method: 'POST',
    body: {
      id: uniqueEventId,
      event_type: 'CHECKOUT.ORDER.APPROVED',
      simulated: true
    }
  });
  assert(firstWebhookRes.status === 200 && firstWebhookRes.body?.status === 'PROCESSED', 'First webhook delivery ingested successfully');

  // Replay identical event
  const replayWebhookRes = await requestJson(`${API_URL}/api/webhooks/paypal`, {
    method: 'POST',
    body: {
      id: uniqueEventId,
      event_type: 'CHECKOUT.ORDER.APPROVED',
      simulated: true
    }
  });
  assert(replayWebhookRes.status === 200, 'Replayed webhook returned HTTP 200');
  assert(replayWebhookRes.body?.message?.includes('already processed'), 'Replayed webhook recognized as duplicate (idempotent ignore)');

  // 3.2 Invoice Creation Idempotency
  const invoiceIdemKey = `INV-IDEM-${Date.now()}`;
  const createInvRes1 = await requestJson(`${API_URL}/api/paypal/invoices`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${validToken}` },
    body: {
      orderId: 'ORD-IDEM-001',
      customerEmail: 'test-idem@merchant.local',
      customerName: 'Idempotency Tester',
      items: [{ name: 'Test Product', quantity: 1, unitPrice: 50 }],
      currency: 'USD',
      idempotencyKey: invoiceIdemKey
    }
  });
  assert(createInvRes1.status === 200 && createInvRes1.body?.invoice?.id, 'First invoice creation succeeds');
  const firstInvId = createInvRes1.body?.invoice?.id;

  // Duplicate create with same idempotency key
  const createInvRes2 = await requestJson(`${API_URL}/api/paypal/invoices`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${validToken}` },
    body: {
      orderId: 'ORD-IDEM-001',
      customerEmail: 'test-idem@merchant.local',
      customerName: 'Idempotency Tester',
      items: [{ name: 'Test Product', quantity: 1, unitPrice: 50 }],
      currency: 'USD',
      idempotencyKey: invoiceIdemKey
    }
  });
  assert(createInvRes2.status === 200, 'Duplicate invoice creation returned HTTP 200');
  assert(createInvRes2.body?.duplicate === true || createInvRes2.body?.invoice?.id === firstInvId, 'Returned identical invoice without duplicating');

  // 3.3 Email Notification Idempotency
  const emailIdemKey = `EML-IDEM-${Date.now()}`;
  const firstEmailResult = await emailService.sendPaymentCapturedEmail({
    order: { id: 'ORD-EML-001', status: 'COMPLETED', amount: 50, currency: 'USD', payerEmail: 'test@merchant.local', payerName: 'Tester' },
    capture: { id: 'CAP-EML-001', status: 'COMPLETED' },
    idempotencyKey: emailIdemKey
  });
  assert(firstEmailResult.success === true, 'First transactional email dispatch accepted');

  const duplicateEmailResult = await emailService.sendPaymentCapturedEmail({
    order: { id: 'ORD-EML-001', status: 'COMPLETED', amount: 50, currency: 'USD', payerEmail: 'test@merchant.local', payerName: 'Tester' },
    capture: { id: 'CAP-EML-001', status: 'COMPLETED' },
    idempotencyKey: emailIdemKey
  });
  assert(duplicateEmailResult.success === true && duplicateEmailResult.duplicate === true, 'Duplicate email dispatch blocked by persistent idempotency key');
  console.log();

  // --------------------------------------------------------------------------
  // PILLAR 4: Authoritative PayPal Confirmation Before Email Dispatch
  // --------------------------------------------------------------------------
  console.log('[Pillar 4: Authoritative State Confirmation Before Email Dispatch]');

  // 4.1 Payment captured email blocked when status is CREATED or UNCAPTURED
  const uncompletedOrder = {
    id: 'ORD-UNCONFIRMED-01',
    status: 'CREATED',
    amount: 99,
    currency: 'USD',
    payerEmail: 'buyer@example.com'
  };
  const uncompletedCaptureResult = await emailService.sendPaymentCapturedEmail({
    order: uncompletedOrder,
    capture: { status: 'PENDING' }
  });
  assert(uncompletedCaptureResult.success === false, 'Payment email blocked when order status is CREATED/PENDING');
  assert(uncompletedCaptureResult.reason?.includes('COMPLETED'), 'Explains payment state must be authoritative COMPLETED');

  // 4.2 Webhook simulation does not send emails
  const simCountBefore = getAllEvents().length;
  await requestJson(`${API_URL}/api/paypal/webhooks/simulate`, {
    method: 'POST',
    body: { eventType: 'PAYMENT.CAPTURE.COMPLETED', orderId: testOrderId }
  });
  const simCountAfter = getAllEvents().length;
  assert(simCountAfter === simCountBefore, 'Simulated webhook ingestion triggered ZERO customer emails');
  console.log();

  // --------------------------------------------------------------------------
  // PILLAR 5: Strict Merchant Dashboard Privacy (Zero Financial Leakage)
  // --------------------------------------------------------------------------
  console.log('[Pillar 5: Merchant Dashboard Privacy & Zero Financial Leakage]');

  // 5.1 GET /api/merchant/dashboard/overview
  const overviewRes = await requestJson(`${API_URL}/api/merchant/dashboard/overview`);
  assert(overviewRes.status === 200, 'GET /api/merchant/dashboard/overview returned HTTP 200');
  const overview = overviewRes.body || {};
  assert(overview.totalRevenue === undefined, 'Overview strictly omits totalRevenue');
  assert(overview.volume === undefined, 'Overview strictly omits financial volume');
  assert(overview.amount === undefined, 'Overview strictly omits financial amounts');
  assert(overview.smtpHealth !== undefined, 'Operational SMTP health is exposed');
  assert(overview.operationalMetrics?.emailsDispatched !== undefined, 'Operational email counts are exposed');

  // 5.2 GET /api/merchant/orders
  const ordersRes = await requestJson(`${API_URL}/api/merchant/orders`);
  assert(ordersRes.status === 200, 'GET /api/merchant/orders returned HTTP 200');
  const merchantOrders = ordersRes.body?.orders || [];
  let leakedOrderAmount = false;
  let leakedCurrency = false;
  let leakedCaptureId = false;

  for (const ord of merchantOrders) {
    if (ord.amount !== undefined) leakedOrderAmount = true;
    if (ord.currency !== undefined) leakedCurrency = true;
    if (ord.captureId !== undefined) leakedCaptureId = true;
  }
  assert(!leakedOrderAmount, 'Zero orders leak financial amount in /api/merchant/orders');
  assert(!leakedCurrency, 'Zero orders leak currency in /api/merchant/orders');
  assert(!leakedCaptureId, 'Zero orders leak PayPal captureId in /api/merchant/orders');

  // 5.3 GET /api/merchant/invoices
  const invoicesRes = await requestJson(`${API_URL}/api/merchant/invoices`);
  assert(invoicesRes.status === 200, 'GET /api/merchant/invoices returned HTTP 200');
  const merchantInvoices = invoicesRes.body?.invoices || [];
  let leakedInvoiceAmount = false;
  for (const inv of merchantInvoices) {
    if (typeof inv.amount === 'number' || (typeof inv.amount === 'string' && !inv.amount.includes('•'))) {
      leakedInvoiceAmount = true;
    }
  }
  assert(!leakedInvoiceAmount, 'Invoices in /api/merchant/invoices have financial amounts masked');
  console.log();

  // --------------------------------------------------------------------------
  // PILLAR 6: Persistence Across Server Restarts
  // --------------------------------------------------------------------------
  console.log('[Pillar 6: Disk Persistence Across Server Restarts]');

  const restartTimestamp = Date.now();
  const testEntities = {
    order: {
      id: `PERSIST-ORD-${restartTimestamp}`,
      paypalReference: 'ORD-PERSIST-REF',
      amount: 45.00,
      currency: 'USD',
      paypalStatus: 'COMPLETED',
      captureStatus: 'CAPTURED',
      payerEmail: 'persisted@merchant.local'
    },
    invoice: {
      id: `INV-PERSIST-${restartTimestamp}`,
      orderId: `PERSIST-ORD-${restartTimestamp}`,
      reference: `INV-REF-${restartTimestamp}`,
      customerEmail: 'persisted-customer@merchant.local',
      status: 'SENT',
      deliveryStatus: 'ACCEPTED_BY_PROVIDER'
    },
    webhook: {
      id: `WH-PERSIST-${restartTimestamp}`,
      event_type: 'PAYMENT.CAPTURE.COMPLETED',
      summary: 'Persisted webhook event'
    },
    processedWebhookId: `WH-PROC-PERSIST-${restartTimestamp}`,
    idempotencyKey: `CAP-IDEM-${restartTimestamp}`
  };

  // 1. Write entities through persistence services
  saveOrder(testEntities.order);
  saveInvoice(testEntities.invoice);
  saveWebhookEvent(testEntities.webhook);
  markWebhookProcessed(testEntities.processedWebhookId);
  saveOrderIdempotencyKey(testEntities.order.id, testEntities.idempotencyKey);
  const queuedEmail = recordQueuedEvent({
    orderId: testEntities.order.id,
    eventType: 'PAYMENT_CAPTURED',
    recipient: 'persisted@merchant.local',
    idempotencyKey: `EML-PERSIST-${restartTimestamp}`
  });
  flushToDisk();

  // 2. Simulate complete server restart: Reload all stores strictly from disk
  const reloadedOrders = loadOrders();
  const reloadedInvoices = loadInvoices();
  const reloadedWebhooks = loadWebhookEvents();
  const reloadedProcessedIds = loadProcessedWebhookIds();
  const reloadedIdempotencyKeys = loadIdempotencyKeys();
  const reloadedEmailEvents = reloadFromDisk();

  // 3. Verify survival
  const foundOrder = reloadedOrders.find(o => o.id === testEntities.order.id);
  assert(Boolean(foundOrder), `Order ${testEntities.order.id} survived restart`);
  assert(foundOrder?.paypalStatus === 'COMPLETED', 'Order status preserved accurately');

  const foundInvoice = reloadedInvoices.find(i => i.id === testEntities.invoice.id);
  assert(Boolean(foundInvoice), `Invoice ${testEntities.invoice.id} survived restart`);

  const foundWebhook = reloadedWebhooks.find(w => w.id === testEntities.webhook.id);
  assert(Boolean(foundWebhook), `Webhook event ${testEntities.webhook.id} survived restart`);

  const isProcessedSurvived = reloadedProcessedIds.has(testEntities.processedWebhookId);
  assert(isProcessedSurvived, `Processed webhook ID ${testEntities.processedWebhookId} survived restart`);

  const retrievedIdemKey = getOrderIdempotencyKey(testEntities.order.id);
  assert(retrievedIdemKey === testEntities.idempotencyKey, `Order idempotency key ${testEntities.idempotencyKey} survived restart`);

  const foundEmail = reloadedEmailEvents.find(e => e.id === queuedEmail.id);
  assert(Boolean(foundEmail), `Email event ${queuedEmail.id} survived restart`);

  // Clean up restart test entities to keep persistent store clean
  const cleanOrders = loadOrders().filter(o => o.id !== testEntities.order.id);
  writeJsonFileAtomic(path.resolve(__dirname, '..', 'data', 'orders.json'), cleanOrders);
  const cleanInvoices = loadInvoices().filter(i => i.id !== testEntities.invoice.id);
  writeJsonFileAtomic(path.resolve(__dirname, '..', 'data', 'invoices.json'), cleanInvoices);

  console.log('\n======================================================');
  console.log(`TOTAL SECURITY & PERSISTENCE CHECKS: ${totalChecks} | PASSED: ${passedChecks} | FAILED: ${failedChecks}`);
  console.log('======================================================');

  if (failedChecks === 0) {
    console.log('✨ ALL 6 SECURITY & PERSISTENCE PILLARS 100% VERIFIED!\n');
    return true;
  } else {
    console.error(`✖ ${failedChecks} checks failed.`);
    process.exit(1);
  }
}

runSecurityAndPersistenceAudit().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
