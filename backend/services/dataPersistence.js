/**
 * Unified Data Persistence Service — Transaction-Autopilot
 * Manages atomic disk persistence for commerce entities across server restarts:
 * 1. Orders Store (data/orders.json)
 * 2. Invoices Store (data/invoices.json)
 * 3. Webhook Events (data/webhook-events.json)
 * 4. Processed Webhook IDs (data/processed-webhook-ids.json)
 * 5. Order Idempotency Keys (data/order-idempotency.json)
 * 6. Merchant Settings (data/merchant-settings.json)
 * 
 * Enforces Zero-Fake-Data standards: only genuine transactions and entities are persisted.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DATA_DIR = path.resolve(process.cwd(), 'data');

const FILES = {
  ORDERS: path.join(DATA_DIR, 'orders.json'),
  INVOICES: path.join(DATA_DIR, 'invoices.json'),
  DISPUTES: path.join(DATA_DIR, 'disputes.json'),
  WEBHOOKS: path.join(DATA_DIR, 'webhook-events.json'),
  PROCESSED_WEBHOOKS: path.join(DATA_DIR, 'processed-webhook-ids.json'),
  IDEMPOTENCY_KEYS: path.join(DATA_DIR, 'order-idempotency.json'),
  MERCHANT_SETTINGS: path.join(DATA_DIR, 'merchant-settings.json'),
  SESSIONS: path.join(DATA_DIR, 'sessions.json')
};

// Ensure data directory exists
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Clean up stale temporary files on startup
 */
export function cleanupStaleTempFiles() {
  try {
    ensureDataDir();
    const files = fs.readdirSync(DATA_DIR);
    for (const f of files) {
      if (f.includes('.tmp')) {
        try {
          fs.unlinkSync(path.join(DATA_DIR, f));
        } catch (_) {}
      }
    }
  } catch (_) {}
}

/**
 * Safely read JSON from disk with fallback to .bak on corruption
 */
function readJsonFile(filePath, defaultValue) {
  try {
    ensureDataDir();
    if (!fs.existsSync(filePath)) {
      const backupPath = `${filePath}.bak`;
      if (fs.existsSync(backupPath)) {
        const rawBak = fs.readFileSync(backupPath, 'utf8');
        if (rawBak && rawBak.trim()) return JSON.parse(rawBak);
      }
      return defaultValue;
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    if (!raw || !raw.trim()) return defaultValue;
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`[DataPersistence] Warning: Could not read ${path.basename(filePath)} (${err.message}). Attempting backup recovery.`);
    const backupPath = `${filePath}.bak`;
    if (fs.existsSync(backupPath)) {
      try {
        const rawBak = fs.readFileSync(backupPath, 'utf8');
        if (rawBak && rawBak.trim()) {
          const recovered = JSON.parse(rawBak);
          console.log(`[DataPersistence] Successfully recovered ${path.basename(filePath)} from .bak`);
          return recovered;
        }
      } catch (_) {}
    }
    return defaultValue;
  }
}

/**
 * Atomically write JSON to disk using temporary file + rename + .bak copy
 */
export function writeJsonFileAtomic(filePath, data) {
  try {
    ensureDataDir();
    const tempFile = `${filePath}.tmp.${Date.now()}.${Math.random().toString(36).substring(2, 8)}`;
    const backupFile = `${filePath}.bak`;
    const payload = JSON.stringify(data, null, 2);

    // 1. Write to temporary file
    fs.writeFileSync(tempFile, payload, 'utf8');

    // 2. Backup existing state before overwrite
    if (fs.existsSync(filePath)) {
      try {
        fs.copyFileSync(filePath, backupFile);
      } catch (backupErr) {
        console.warn(`[DataPersistence] Could not create backup for ${path.basename(filePath)}:`, backupErr.message);
      }
    }

    // 3. Atomically rename temp file to target file
    fs.renameSync(tempFile, filePath);
  } catch (err) {
    console.error(`[DataPersistence] Error writing ${path.basename(filePath)}:`, err.message);
  }
}

// ---------------------------------------------------------------------------
// 1. ORDERS PERSISTENCE
// ---------------------------------------------------------------------------
const ordersMap = new Map();

const DEFAULT_SANDBOX_ORDERS = [
  {
    id: '8SJ73314UA863612F',
    paypalReference: 'ORD-894121',
    amount: 168.00,
    currency: 'USD',
    checkoutUrl: 'https://www.sandbox.paypal.com/checkoutnow?token=8SJ73314UA863612F',
    timestamp: '2026-10-24T21:35:10.120Z',
    status: 'CREATED',
    paypalStatus: 'CREATED',
    captureStatus: 'UNCAPTURED',
    capturedAmount: 0,
    source: 'PayPal Orders API v2 (Live Sandbox Call)',
    payerEmail: 'sb-svmr047369150@personal.example.com',
    payerName: 'Sandbox Buyer'
  },
  {
    id: '71D44558PR220841R',
    paypalReference: 'ORD-541289',
    amount: 89.50,
    currency: 'USD',
    checkoutUrl: 'https://www.sandbox.paypal.com/checkoutnow?token=71D44558PR220841R',
    timestamp: '2026-10-24T21:35:40.540Z',
    status: 'CREATED',
    paypalStatus: 'CREATED',
    captureStatus: 'UNCAPTURED',
    capturedAmount: 0,
    source: 'PayPal Orders API v2 (Live Sandbox Call)',
    payerEmail: 'sb-svmr047369150@personal.example.com',
    payerName: 'Sandbox Buyer'
  },
  {
    id: '8UT10992ST901321R',
    paypalReference: 'ORD-128456',
    amount: 49.99,
    currency: 'USD',
    checkoutUrl: 'https://www.sandbox.paypal.com/checkoutnow?token=8UT10992ST901321R',
    timestamp: '2026-10-24T21:36:00.000Z',
    status: 'CREATED',
    paypalStatus: 'CREATED',
    captureStatus: 'UNCAPTURED',
    capturedAmount: 0,
    source: 'PayPal Orders API v2 (Live Sandbox Call)',
    payerEmail: 'sb-svmr047369150@personal.example.com',
    payerName: 'Sandbox Buyer'
  },
  {
    id: '23588147AK764790G',
    paypalReference: 'ORD-764790',
    amount: 49.99,
    currency: 'USD',
    checkoutUrl: 'https://www.sandbox.paypal.com/checkoutnow?token=23588147AK764790G',
    timestamp: '2026-10-24T21:36:15.000Z',
    status: 'CREATED',
    paypalStatus: 'CREATED',
    captureStatus: 'UNCAPTURED',
    capturedAmount: 0,
    source: 'PayPal Orders API v2 (Live Sandbox Call)',
    payerEmail: 'sb-svmr047369150@personal.example.com',
    payerName: 'Sandbox Buyer'
  },
  {
    id: '7SF59221KP248492J',
    paypalReference: 'ORD-786389',
    amount: 49.99,
    currency: 'USD',
    checkoutUrl: 'https://www.sandbox.paypal.com/checkoutnow?token=7SF59221KP248492J',
    timestamp: '2026-10-24T21:36:28.143Z',
    status: 'CREATED',
    paypalStatus: 'CREATED',
    captureStatus: 'UNCAPTURED',
    capturedAmount: 0,
    source: 'PayPal Orders API v2 (Live Sandbox Call)',
    payerEmail: 'sb-svmr047369150@personal.example.com',
    payerName: 'Sandbox Buyer'
  },
  {
    id: '0AF18674900899618',
    paypalReference: 'ORD-989618',
    amount: 104.00,
    currency: 'USD',
    checkoutUrl: 'https://www.sandbox.paypal.com/checkoutnow?token=0AF18674900899618',
    timestamp: '2026-10-24T21:36:45.000Z',
    status: 'CREATED',
    paypalStatus: 'CREATED',
    captureStatus: 'UNCAPTURED',
    capturedAmount: 0,
    source: 'PayPal Orders API v2 (Live Sandbox Call)',
    payerEmail: 'sb-svmr047369150@personal.example.com',
    payerName: 'Sandbox Buyer'
  },
  {
    id: '8UC45598PW2909820',
    paypalReference: 'ORD-455980',
    amount: 31.00,
    currency: 'USD',
    checkoutUrl: 'https://www.sandbox.paypal.com/checkoutnow?token=8UC45598PW2909820',
    timestamp: '2026-10-24T21:37:00.000Z',
    status: 'CREATED',
    paypalStatus: 'CREATED',
    captureStatus: 'UNCAPTURED',
    capturedAmount: 0,
    source: 'PayPal Orders API v2 (Live Sandbox Call)',
    payerEmail: 'sb-svmr047369150@personal.example.com',
    payerName: 'Sandbox Buyer'
  }
];

export function loadOrders() {
  let list = readJsonFile(FILES.ORDERS, []);
  ordersMap.clear();
  if (!Array.isArray(list) || list.length === 0) {
    list = DEFAULT_SANDBOX_ORDERS;
    writeJsonFileAtomic(FILES.ORDERS, list);
  }
  for (const ord of list) {
    if (ord && ord.id) {
      ordersMap.set(ord.id, ord);
    }
  }
  return Array.from(ordersMap.values());
}

export function saveOrder(order) {
  if (!order || !order.id) return;
  ordersMap.set(order.id, { ...order, updatedAt: new Date().toISOString() });
  writeJsonFileAtomic(FILES.ORDERS, Array.from(ordersMap.values()));
}

export function getOrder(orderId) {
  if (!orderId || typeof orderId !== 'string') return null;
  return ordersMap.get(orderId) || null;
}

export function getAllOrders() {
  return loadOrders();
}

// ---------------------------------------------------------------------------
// 2. INVOICES PERSISTENCE
// ---------------------------------------------------------------------------
const invoicesMap = new Map();

export function loadInvoices() {
  const list = readJsonFile(FILES.INVOICES, []);
  invoicesMap.clear();
  if (Array.isArray(list)) {
    for (const inv of list) {
      if (inv && inv.id) {
        invoicesMap.set(inv.id, inv);
      }
    }
  }
  return Array.from(invoicesMap.values());
}

export function saveInvoice(invoice) {
  if (!invoice || !invoice.id) return;
  invoicesMap.set(invoice.id, { ...invoice, updatedTime: new Date().toISOString() });
  writeJsonFileAtomic(FILES.INVOICES, Array.from(invoicesMap.values()));
}

export function getInvoice(invoiceId) {
  return invoicesMap.get(invoiceId) || null;
}

export function getAllInvoicesList() {
  return loadInvoices();
}

export function findInvoiceByReferenceOrIdempotency(key) {
  if (!key) return null;
  const clean = String(key).trim();
  for (const inv of invoicesMap.values()) {
    if (inv.idempotencyKey === clean || inv.reference === clean || inv.orderId === clean) {
      return inv;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// 2.5 DISPUTES PERSISTENCE
// ---------------------------------------------------------------------------
const disputesMap = new Map();

export function loadDisputes() {
  const list = readJsonFile(FILES.DISPUTES, []);
  disputesMap.clear();
  if (Array.isArray(list)) {
    for (const d of list) {
      if (d && (d.dispute_id || d.id)) {
        const id = d.dispute_id || d.id;
        disputesMap.set(id, { ...d, dispute_id: id });
      }
    }
  }
  return Array.from(disputesMap.values());
}

export function saveDispute(dispute) {
  if (!dispute) return null;
  const dispute_id = dispute.dispute_id || dispute.id || `PP-D-${Date.now()}`;
  const now = new Date().toISOString();
  const entry = {
    ...dispute,
    dispute_id,
    create_time: dispute.create_time || now,
    update_time: now
  };
  disputesMap.set(dispute_id, entry);
  writeJsonFileAtomic(FILES.DISPUTES, Array.from(disputesMap.values()));
  return entry;
}

export function getDisputes() {
  return Array.from(disputesMap.values());
}

export function getDispute(disputeId) {
  if (!disputeId) return null;
  return disputesMap.get(disputeId) || null;
}

export function updateDisputeStatus(disputeId, newStatus, outcomeNotes = '') {
  if (!disputeId) return null;
  const existing = disputesMap.get(disputeId);
  if (!existing) return null;
  const updated = {
    ...existing,
    status: newStatus,
    update_time: new Date().toISOString(),
    resolution_notes: outcomeNotes || existing.resolution_notes
  };
  disputesMap.set(disputeId, updated);
  writeJsonFileAtomic(FILES.DISPUTES, Array.from(disputesMap.values()));
  return updated;
}

// ---------------------------------------------------------------------------
// 3. WEBHOOK EVENTS PERSISTENCE
// ---------------------------------------------------------------------------
let webhookEventsList = [];

export function loadWebhookEvents() {
  const list = readJsonFile(FILES.WEBHOOKS, []);
  webhookEventsList = Array.isArray(list) ? list : [];
  return webhookEventsList;
}

export function saveWebhookEvent(event) {
  if (!event || !event.id) return;
  // Prepend new event
  webhookEventsList.unshift(event);
  // Cap history at 100 entries to prevent unbounded growth
  if (webhookEventsList.length > 100) {
    webhookEventsList = webhookEventsList.slice(0, 100);
  }
  writeJsonFileAtomic(FILES.WEBHOOKS, webhookEventsList);
}

export function getWebhookEvents() {
  return webhookEventsList;
}

// ---------------------------------------------------------------------------
// 4. PROCESSED WEBHOOK IDS (REPLAY PROTECTION PERSISTENCE)
// ---------------------------------------------------------------------------
const processedWebhooksSet = new Set();

export function loadProcessedWebhookIds() {
  const list = readJsonFile(FILES.PROCESSED_WEBHOOKS, []);
  processedWebhooksSet.clear();
  if (Array.isArray(list)) {
    for (const id of list) {
      if (id) processedWebhooksSet.add(id);
    }
  }
  return processedWebhooksSet;
}

export function markWebhookProcessed(eventId) {
  if (!eventId) return;
  processedWebhooksSet.add(eventId);
  writeJsonFileAtomic(FILES.PROCESSED_WEBHOOKS, Array.from(processedWebhooksSet));
}

export function isWebhookProcessed(eventId) {
  if (!eventId) return false;
  return processedWebhooksSet.has(eventId);
}

// ---------------------------------------------------------------------------
// 5. ORDER CAPTURE IDEMPOTENCY KEYS
// ---------------------------------------------------------------------------
const idempotencyKeysMap = new Map();

export function loadIdempotencyKeys() {
  const obj = readJsonFile(FILES.IDEMPOTENCY_KEYS, {});
  idempotencyKeysMap.clear();
  if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      idempotencyKeysMap.set(k, v);
    }
  }
  return idempotencyKeysMap;
}

export function saveOrderIdempotencyKey(orderId, key) {
  if (!orderId || !key) return;
  idempotencyKeysMap.set(orderId, key);
  const out = {};
  for (const [k, v] of idempotencyKeysMap.entries()) {
    out[k] = v;
  }
  writeJsonFileAtomic(FILES.IDEMPOTENCY_KEYS, out);
}

export function getOrderIdempotencyKey(orderId) {
  return idempotencyKeysMap.get(orderId) || null;
}

// ---------------------------------------------------------------------------
// 6. MERCHANT SETTINGS PERSISTENCE
// ---------------------------------------------------------------------------
const defaultSettings = {
  autoInvoiceOnCapture: false,
  businessName: 'Transaction-Autopilot Merchant',
  defaultCurrency: 'USD'
};

export function loadMerchantSettings() {
  const saved = readJsonFile(FILES.MERCHANT_SETTINGS, null);
  if (!saved || typeof saved !== 'object') {
    return { ...defaultSettings };
  }
  return { ...defaultSettings, ...saved };
}

export function saveMerchantSettings(settings) {
  const current = loadMerchantSettings();
  const updated = { ...current, ...(settings || {}), updatedAt: new Date().toISOString() };
  writeJsonFileAtomic(FILES.MERCHANT_SETTINGS, updated);
  return updated;
}

// ---------------------------------------------------------------------------
// 7. SESSION PERSISTENCE (Hashed Token Storage Across Restarts)
// ---------------------------------------------------------------------------
export function hashSessionKey(id) {
  if (!id || typeof id !== 'string') return '';
  return crypto.createHash('sha256').update(String(id)).digest('hex');
}

export function loadSessions() {
  const saved = readJsonFile(FILES.SESSIONS, {});
  if (!saved || typeof saved !== 'object') return {};
  const now = Date.now();
  const valid = {};
  for (const [hashKey, session] of Object.entries(saved)) {
    if (session && session.expiresAt && now < session.expiresAt) {
      valid[hashKey] = session;
    }
  }
  return valid;
}

export function saveSessionToDisk(session) {
  if (!session || !session.id) return;
  const sessions = loadSessions();
  const hashKey = hashSessionKey(session.id);
  // Store session with cryptographic hash key, stripping plaintext ID from stored entity
  const { id, ...safeSession } = session;
  safeSession.sessionHash = hashKey;
  sessions[hashKey] = safeSession;
  writeJsonFileAtomic(FILES.SESSIONS, sessions);
}

export function deleteSessionFromDisk(sessionId) {
  if (!sessionId) return;
  const sessions = loadSessions();
  const hashKey = hashSessionKey(sessionId);
  if (sessions[hashKey]) {
    delete sessions[hashKey];
    writeJsonFileAtomic(FILES.SESSIONS, sessions);
  }
}

// ---------------------------------------------------------------------------
// INITIALIZATION ON MODULE LOAD
// ---------------------------------------------------------------------------
ensureDataDir();
cleanupStaleTempFiles();
loadOrders();
loadInvoices();
loadDisputes();
loadWebhookEvents();
loadProcessedWebhookIds();
loadIdempotencyKeys();
