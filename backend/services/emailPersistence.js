/**
 * Email Persistence Service — Transaction-Autopilot
 * Manages persistent storage of email notification events, delivery states,
 * and idempotency keys to prevent duplicate emails across server restarts.
 * 
 * Uses atomic JSON file persistence in data/email-events.json.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { config } from '../../config/env.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const EVENTS_FILE = path.join(DATA_DIR, 'email-events.json');

// In-memory cache backed by persistent file
const eventsMap = new Map();
let isDirty = false;
let saveTimeout = null;

/**
 * Ensure data directory and load existing persisted events
 */
function initStorage() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(EVENTS_FILE)) {
      const raw = fs.readFileSync(EVENTS_FILE, 'utf8');
      if (raw && raw.trim()) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const evt of parsed) {
            if (evt && evt.id) {
              eventsMap.set(evt.id, evt);
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('[EmailPersistence] Warning: Could not initialize storage file:', err.message);
  }
}

// Initialize on module load
initStorage();

/**
 * Schedule atomic disk write with debouncing
 */
function scheduleSave() {
  isDirty = true;
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    flushToDisk();
  }, 200);
}

/**
 * Atomic flush to disk
 */
export function flushToDisk() {
  if (!isDirty && fs.existsSync(EVENTS_FILE)) return;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tempFile = `${EVENTS_FILE}.tmp.${Date.now()}`;
    const data = JSON.stringify(Array.from(eventsMap.values()), null, 2);
    fs.writeFileSync(tempFile, data, 'utf8');
    fs.renameSync(tempFile, EVENTS_FILE);
    isDirty = false;
  } catch (err) {
    console.error('[EmailPersistence] Error writing email events to disk:', err.message);
  }
}

/**
 * Generate a deterministic idempotency key for an email event
 */
export function generateIdempotencyKey(orderId, eventType, uniqueDiscriminator = '') {
  const cleanOrder = String(orderId || 'GENERIC').trim();
  const cleanType = String(eventType || 'UNKNOWN').trim().toUpperCase();
  const cleanDisc = String(uniqueDiscriminator || '').trim();
  return crypto.createHash('sha256')
    .update(`${cleanOrder}:${cleanType}:${cleanDisc}`)
    .digest('hex');
}

/**
 * Mask order ID for privacy: '8UC45598PW2909820' -> '8UC4••••9820'
 */
export function maskOrderRef(orderId) {
  if (!orderId || typeof orderId !== 'string') return 'ORD-••••';
  const clean = orderId.trim();
  if (clean.length <= 8) return clean;
  return `${clean.slice(0, 4)}••••${clean.slice(-4)}`;
}

/**
 * Mask recipient email for safe display: 'john.doe@example.com' -> 'j•••e@example.com'
 */
export function maskEmail(email) {
  if (!email || typeof email !== 'string' || !email.includes('@')) return 'unavailable';
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local[0] || '*'}*@${domain}`;
  return `${local[0]}••••${local.slice(-1)}@${domain}`;
}

/**
 * Check if an email event with this idempotency key has already been dispatched/accepted
 */
export function findEventByIdempotencyKey(idempotencyKey) {
  if (!idempotencyKey) return null;
  for (const evt of eventsMap.values()) {
    if (evt.idempotencyKey === idempotencyKey) {
      return evt;
    }
  }
  return null;
}

/**
 * Record a new email event in QUEUED state
 */
export function recordQueuedEvent({
  eventType,
  orderId,
  recipientEmail,
  subject,
  idempotencyKey,
  metadata = {}
}) {
  const eventId = `evt_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const now = new Date().toISOString();

  const event = {
    id: eventId,
    idempotencyKey: idempotencyKey || generateIdempotencyKey(orderId, eventType),
    eventType, // PAYMENT_CAPTURED, PAYMENT_FAILED, INVOICE_CREATED, REFUND_ISSUED, ORDER_STATUS_CHANGED
    orderId: orderId || null,
    orderRef: maskOrderRef(orderId),
    recipientEmail: recipientEmail || null,
    maskedRecipient: maskEmail(recipientEmail),
    subject: subject || 'Transaction-Autopilot Notification',
    status: 'QUEUED', // QUEUED, ACCEPTED_BY_PROVIDER, DELIVERED, BOUNCED, FAILED
    provider: (config.email?.provider || 'resend').toLowerCase(),
    providerMessageId: null,
    smtpResponse: null,
    retryCount: 0,
    maxRetries: 3,
    lastAttempt: null,
    error: null,
    metadata: {
      ...metadata,
      // Strictly sanitize any amounts or payment payloads from metadata
      amount: undefined,
      captureId: undefined,
      card: undefined,
      bank: undefined
    },
    createdAt: now,
    updatedAt: now
  };

  eventsMap.set(eventId, event);
  scheduleSave();
  return event;
}

/**
 * Update event delivery status
 */
export function updateEventStatus(eventId, {
  status,
  providerMessageId = null,
  smtpResponse = null,
  error = null,
  incrementRetry = false
}) {
  const event = eventsMap.get(eventId);
  if (!event) return null;

  event.status = status;
  event.updatedAt = new Date().toISOString();
  event.lastAttempt = new Date().toISOString();

  if (providerMessageId) event.providerMessageId = providerMessageId;
  if (smtpResponse) event.smtpResponse = smtpResponse;
  if (error) event.error = typeof error === 'string' ? error : (error.message || 'Delivery error');
  if (incrementRetry) event.retryCount = (event.retryCount || 0) + 1;

  scheduleSave();
  return event;
}

/**
 * Retrieve all events (sorted latest first) with privacy masking
 */
export function getAllEvents({ limit = 50, maskDetails = true } = {}) {
  const sorted = Array.from(eventsMap.values()).sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  const sliced = sorted.slice(0, limit);
  if (!maskDetails) return sliced;

  return sliced.map(evt => ({
    id: evt.id,
    eventType: evt.eventType,
    orderRef: evt.orderRef,
    maskedRecipient: evt.maskedRecipient,
    status: evt.status,
    provider: evt.provider,
    providerMessageId: evt.providerMessageId,
    retryCount: evt.retryCount,
    error: evt.error,
    createdAt: evt.createdAt,
    updatedAt: evt.updatedAt
  }));
}

/**
 * Get aggregate operational stats (Non-financial)
 */
export function getOperationalEmailStats() {
  let queued = 0;
  let accepted = 0;
  let delivered = 0;
  let bounced = 0;
  let failed = 0;

  for (const evt of eventsMap.values()) {
    switch (evt.status) {
      case 'QUEUED': queued++; break;
      case 'ACCEPTED_BY_PROVIDER': accepted++; break;
      case 'DELIVERED': delivered++; break;
      case 'BOUNCED': bounced++; break;
      case 'FAILED': failed++; break;
      default: break;
    }
  }

  // Calculate 24-hour activity curve (email count per bucket)
  const now = new Date();
  const hourlyCounts = [];
  for (let i = 23; i >= 0; i--) {
    const bucketTime = new Date(now.getTime() - i * 3600 * 1000);
    const hourLabel = `${String(bucketTime.getHours()).padStart(2, '0')}:00`;
    hourlyCounts.push({ hour: hourLabel, count: 0 });
  }

  const twentyFourHoursAgo = now.getTime() - 24 * 3600 * 1000;
  for (const evt of eventsMap.values()) {
    const t = new Date(evt.createdAt).getTime();
    if (t >= twentyFourHoursAgo) {
      const evtHour = `${String(new Date(t).getHours()).padStart(2, '0')}:00`;
      const bucket = hourlyCounts.find(b => b.hour === evtHour);
      if (bucket) bucket.count++;
    }
  }

  return {
    totalEvents: eventsMap.size,
    queued,
    accepted,
    delivered,
    bounced,
    failed,
    totalDispatched: accepted + delivered,
    hourlyActivity: hourlyCounts
  };
}

/**
 * Clear store (used in testing)
 */
export function reloadFromDisk() {
  eventsMap.clear();
  initStorage();
  return Array.from(eventsMap.values());
}

export function _resetStoreForTesting() {
  eventsMap.clear();
  isDirty = false;
  if (saveTimeout) clearTimeout(saveTimeout);
  try {
    if (fs.existsSync(EVENTS_FILE)) {
      fs.unlinkSync(EVENTS_FILE);
    }
  } catch (_) {}
}

export default {
  generateIdempotencyKey,
  maskOrderRef,
  maskEmail,
  findEventByIdempotencyKey,
  recordQueuedEvent,
  updateEventStatus,
  getAllEvents,
  getOperationalEmailStats,
  flushToDisk,
  _resetStoreForTesting
};
