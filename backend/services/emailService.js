/**
 * Brevo SMTP Email Service — Transaction-Autopilot
 * Manages transactional email communication via Brevo SMTP (smtp-relay.brevo.com:587)
 * using Nodemailer.
 * 
 * Enforces:
 * - Zero secret leakage (SMTP passwords never logged or returned in APIs)
 * - Persistent idempotency to prevent duplicate emails across restarts
 * - Accurate delivery states (QUEUED, ACCEPTED_BY_PROVIDER, DELIVERED, BOUNCED, FAILED)
 * - Safe retries with bounded exponential backoff
 * - Mock transport capability for non-destructive unit/integration testing
 */

import nodemailer from 'nodemailer';
import { config } from '../../config/env.js';
import {
  generateIdempotencyKey,
  maskOrderRef,
  maskEmail,
  findEventByIdempotencyKey,
  recordQueuedEvent,
  updateEventStatus,
  getOperationalEmailStats,
  getAllEvents
} from './emailPersistence.js';
import {
  buildPaymentCapturedTemplate,
  buildPaymentFailedTemplate,
  buildInvoiceCreatedTemplate,
  buildRefundIssuedTemplate,
  buildOrderStatusChangedTemplate,
  buildPaymentLinkTemplate,
  buildRecurringBillingNoticeTemplate
} from './emailTemplates.js';

// Active Nodemailer transporter instance (or mock)
let activeTransporter = null;
let mockTransportOverride = null;

// Status cache for SMTP service health
let smtpHealthStatus = {
  provider: config.email.provider,
  status: 'INITIALIZING', // INITIALIZING, CONNECTED, CONFIG_REQUIRED, AUTH_FAILED, ERROR
  host: config.email.smtpHost,
  port: config.email.smtpPort,
  secure: config.email.smtpSecure,
  from: config.email.fromAddress,
  lastCheck: null,
  error: null
};

/**
 * Validate required SMTP / Resend configuration without leaking secrets
 */
export function validateSmtpConfig() {
  const missing = [];
  const provider = (config.email.provider || 'resend').toLowerCase();

  if (provider === 'resend') {
    if (!config.email.resendApiKey) missing.push('RESEND_API_KEY');
    if (!config.email.fromAddress) missing.push('EMAIL_FROM');
  } else if (provider === 'brevo' || provider === 'smtp' || provider === 'gmail') {
    if (!config.email.smtpHost) missing.push('SMTP_HOST');
    if (!config.email.smtpPort) missing.push('SMTP_PORT');
    if (!config.email.smtpUser) missing.push('SMTP_USER');
    if (!config.email.smtpPass) missing.push('SMTP_PASS');
    if (!config.email.fromAddress) missing.push('EMAIL_FROM');
  }

  return {
    valid: missing.length === 0,
    provider,
    missing,
    error: missing.length > 0
      ? `Email configuration incomplete. Missing required variables: ${missing.join(', ')}`
      : null
  };
}

/**
 * Get sanitized email provider status for merchant/operator consumption
 */
export function getSanitizedSmtpStatus() {
  const validation = validateSmtpConfig();
  const provider = (config.email.provider || 'gmail').toLowerCase();
  return {
    provider,
    status: smtpHealthStatus.status,
    host: provider === 'resend' ? 'api.resend.com' : (config.email.smtpHost || (provider === 'gmail' ? 'smtp.gmail.com' : 'smtp-relay.brevo.com')),
    port: provider === 'resend' ? 443 : (config.email.smtpPort || (provider === 'gmail' ? 465 : 587)),
    secure: provider === 'resend' ? true : (config.email.smtpSecure !== undefined ? Boolean(config.email.smtpSecure) : provider === 'gmail'),
    from: config.email.fromAddress || (provider === 'resend' ? 'onboarding@resend.dev' : 'unconfigured@merchant.local'),
    configured: validation.valid,
    missingFields: validation.missing,
    lastCheck: smtpHealthStatus.lastCheck,
    error: smtpHealthStatus.error
  };
}

/**
 * Set a mock transport override for non-destructive unit/integration testing
 */
export function _setMockTransport(mockFn) {
  mockTransportOverride = mockFn;
  if (mockFn) {
    smtpHealthStatus.status = 'CONNECTED';
    smtpHealthStatus.lastCheck = new Date().toISOString();
    smtpHealthStatus.error = null;
  }
}

/**
 * Reset active transporter (e.g. after configuration change)
 */
export function resetTransporter() {
  activeTransporter = null;
}

/**
 * Initialize or get active transporter
 */
export function getTransporter() {
  if (mockTransportOverride) {
    return {
      sendMail: mockTransportOverride,
      verify: async () => true
    };
  }

  if (activeTransporter) {
    return activeTransporter;
  }

  const validation = validateSmtpConfig();
  if (!validation.valid) {
    smtpHealthStatus.status = 'CONFIG_REQUIRED';
    smtpHealthStatus.error = validation.error;
    return null;
  }

  activeTransporter = nodemailer.createTransport({
    host: config.email.smtpHost || 'smtp-relay.brevo.com',
    port: config.email.smtpPort || 587,
    secure: Boolean(config.email.smtpSecure),
    auth: {
      user: config.email.smtpUser,
      pass: config.email.smtpPass
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    logger: false,
    debug: false
  });

  return activeTransporter;
}

/**
 * Verify live connection to Brevo SMTP
 */
export async function verifySmtpConnection() {
  if (mockTransportOverride) {
    smtpHealthStatus.status = 'CONNECTED';
    smtpHealthStatus.lastCheck = new Date().toISOString();
    smtpHealthStatus.error = null;
    return { success: true, status: 'CONNECTED', message: 'Mock SMTP Transport verified' };
  }

  const validation = validateSmtpConfig();
  if (!validation.valid) {
    smtpHealthStatus.status = 'CONFIG_REQUIRED';
    smtpHealthStatus.lastCheck = new Date().toISOString();
    smtpHealthStatus.error = validation.error;
    return { success: false, status: 'CONFIG_REQUIRED', error: validation.error };
  }

  const provider = (config.email.provider || 'resend').toLowerCase();

  if (provider === 'resend') {
    try {
      if (!config.email.resendApiKey || !config.email.resendApiKey.startsWith('re_')) {
        throw new Error('Invalid Resend API key format (expected re_...)');
      }

      // Test key validity with Resend API
      const testRes = await fetch('https://api.resend.com/emails', {
        headers: { 'Authorization': `Bearer ${config.email.resendApiKey}` }
      });
      const data = await testRes.json().catch(() => ({}));
      
      const isAuthed = testRes.ok || data.name === 'restricted_api_key' || (data.message && data.message.includes('restricted to only send emails'));

      if (isAuthed) {
        smtpHealthStatus.status = 'CONNECTED';
        smtpHealthStatus.lastCheck = new Date().toISOString();
        smtpHealthStatus.error = null;
        return { success: true, status: 'CONNECTED', message: 'Resend API authenticated successfully (Sending Mode Active)' };
      } else {
        throw new Error(data.message || 'Resend API authentication failed');
      }
    } catch (err) {
      smtpHealthStatus.status = 'AUTH_FAILED';
      smtpHealthStatus.lastCheck = new Date().toISOString();
      smtpHealthStatus.error = `Resend authentication error: ${err.message}`;
      return { success: false, status: 'AUTH_FAILED', error: smtpHealthStatus.error };
    }
  }

  // For Gmail, Brevo, or standard SMTP
  try {
    resetTransporter();
    const transporter = getTransporter();
    if (!transporter) {
      throw new Error('Transporter unavailable');
    }
    await transporter.verify();
    smtpHealthStatus.status = 'CONNECTED';
    smtpHealthStatus.lastCheck = new Date().toISOString();
    smtpHealthStatus.error = null;
    const providerLabel = provider === 'gmail' ? 'Gmail SMTP' : provider === 'brevo' ? 'Brevo SMTP' : 'Custom SMTP';
    return { success: true, status: 'CONNECTED', message: `${providerLabel} connection verified successfully (Full Outbound Active)` };
  } catch (err) {
    const isIpRestricted = err.responseCode === 525 || (err.message && err.message.includes('525'));
    const isAuth = err.code === 'EAUTH' || err.responseCode === 535 || isIpRestricted;
    smtpHealthStatus.status = isIpRestricted ? 'IP_UNAUTHORIZED' : (isAuth ? 'AUTH_FAILED' : 'ERROR');
    smtpHealthStatus.lastCheck = new Date().toISOString();
    smtpHealthStatus.error = isIpRestricted
      ? 'SMTP 525 5.7.1 Unauthorized IP address.'
      : isAuth
      ? 'SMTP Authentication failed. Check SMTP_USER / GMAIL_USER and App Password.'
      : `SMTP Connection error: ${err.message}`;

    return {
      success: false,
      status: smtpHealthStatus.status,
      error: smtpHealthStatus.error,
      responseCode: err.responseCode
    };
  }
}

/**
 * Core transactional email sender
 * Strictly implements idempotency, delivery state transitions, and audit logging.
 */
export async function sendEmail({
  eventType,
  orderId,
  recipientEmail,
  subject,
  html,
  text,
  idempotencyKey = null,
  metadata = {}
}) {
  const cleanEmail = (recipientEmail || '').trim();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, error: 'Valid recipient email address is required.' };
  }

  const generatedKey = idempotencyKey || generateIdempotencyKey(orderId, eventType, cleanEmail);

  // 1. Idempotency Check: Prevent duplicate sends
  const existingEvent = findEventByIdempotencyKey(generatedKey);
  if (existingEvent && (existingEvent.status === 'ACCEPTED_BY_PROVIDER' || existingEvent.status === 'DELIVERED')) {
    return {
      success: true,
      duplicate: true,
      alreadySent: true,
      duplicateBlocked: true,
      event: existingEvent,
      message: 'Email notification has already been accepted by delivery provider.'
    };
  }

  // 2. Record Event as QUEUED in persistent store
  const event = existingEvent || recordQueuedEvent({
    eventType,
    orderId,
    recipientEmail: cleanEmail,
    subject,
    idempotencyKey: generatedKey,
    metadata
  });

  const provider = (config.email.provider || 'resend').toLowerCase();

  // 3A. Dispatch via Resend REST API if provider is Resend
  if (provider === 'resend') {
    try {
      const fromAddr = config.email.fromAddress || 'onboarding@resend.dev';
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.email.resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: fromAddr,
          to: cleanEmail,
          subject,
          html,
          text
        })
      });

      const resendData = await resendRes.json().catch(() => ({}));
      if (!resendRes.ok) {
        // If Resend Sandbox restriction (403: can only send to owner email)
        const ownerEmail = config.email.testRecipient || 'loyolaignatiuskarthik@gmail.com';
        if (resendRes.status === 403 && resendData.message?.includes('own email address') && cleanEmail.toLowerCase() !== ownerEmail.toLowerCase()) {
          console.warn(`[Resend Sandbox Policy] Recipient ${cleanEmail} is restricted by Resend sandbox. Re-routing delivery to verified account owner: ${ownerEmail}`);
          
          const forwardNotice = `<div style="background:#f0f9ff;border:1px solid #bae6fd;padding:12px 16px;border-radius:8px;margin-bottom:20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0369a1;font-size:13px;">
            <strong>ℹ️ Resend Sandbox Delivery Notice:</strong><br/>
            This email was generated for customer <strong>${cleanEmail}</strong>. Because the Resend sandbox environment (<code>onboarding@resend.dev</code>) restricts outbound delivery to the account owner, this message was safely delivered to your registered inbox: <strong>${ownerEmail}</strong>.
          </div>`;

          const forwardRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${config.email.resendApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from: fromAddr,
              to: ownerEmail,
              subject: `[Sandbox Delivery for ${cleanEmail}] ${subject}`,
              html: `${forwardNotice}${html}`,
              text: `[Sandbox Forward for ${cleanEmail}]\n\n${text}`
            })
          });

          const forwardData = await forwardRes.json().catch(() => ({}));
          if (forwardRes.ok) {
            const providerMessageId = forwardData.id || `<${event.id}@resend.com>`;
            updateEventStatus(event.id, {
              status: 'ACCEPTED_BY_PROVIDER',
              providerMessageId,
              smtpResponse: `200 OK (Delivered to ${ownerEmail} via Resend Sandbox)`,
              error: null
            });

            console.log(`[Resend Sandbox] Event ${event.eventType} safely delivered to owner inbox ${ownerEmail} (${providerMessageId})`);

            return {
              success: true,
              status: 'ACCEPTED_BY_PROVIDER',
              messageId: providerMessageId,
              event,
              forwardedTo: ownerEmail,
              originalRecipient: cleanEmail,
              resendSandboxRestriction: true
            };
          }
        }

        throw new Error(resendData.message || `Resend API returned HTTP ${resendRes.status}`);
      }

      const providerMessageId = resendData.id || `<${event.id}@resend.com>`;

      updateEventStatus(event.id, {
        status: 'ACCEPTED_BY_PROVIDER',
        providerMessageId,
        smtpResponse: '200 OK (Resend REST API)',
        error: null
      });

      console.log(`[Resend API] Event ${event.eventType} for Order ${maskOrderRef(orderId)} accepted (${providerMessageId})`);

      return {
        success: true,
        status: 'ACCEPTED_BY_PROVIDER',
        messageId: providerMessageId,
        event
      };
    } catch (err) {
      const sanitizedError = err.message || 'Resend dispatch failure';
      updateEventStatus(event.id, {
        status: 'FAILED',
        error: sanitizedError,
        incrementRetry: true
      });

      console.error(`[Resend API] Delivery error for event ${event.id}:`, sanitizedError);

      return {
        success: false,
        status: 'FAILED',
        error: sanitizedError,
        canRetry: event.retryCount < event.maxRetries,
        event
      };
    }
  }

  // 3B. Obtain Transporter (SMTP / Brevo fallback)
  const transporter = getTransporter();
  if (!transporter) {
    const validation = validateSmtpConfig();
    const errorMsg = validation.error || 'SMTP delivery provider is not configured.';
    updateEventStatus(event.id, {
      status: 'FAILED',
      error: errorMsg,
      incrementRetry: true
    });
    return {
      success: false,
      requiresConfig: true,
      error: errorMsg,
      event
    };
  }

  // 4. Dispatch Email via SMTP (Gmail / Brevo / Standard SMTP)
  try {
    const fromAddr = config.email.fromAddress || config.email.smtpUser || 'loyolaignatiuskarthik@gmail.com';
    const fromName = 'PayPal Commerce Merchant';
    const mailOptions = {
      from: `"${fromName}" <${fromAddr}>`,
      to: cleanEmail,
      subject,
      html,
      text,
      headers: {
        'X-Autopilot-Event-ID': event.id,
        'X-Autopilot-Order-Ref': maskOrderRef(orderId),
        'List-Unsubscribe': `<mailto:${fromAddr}?subject=unsubscribe>`,
        'Precedence': 'bulk',
        'X-Auto-Response-Suppress': 'OOF, AutoReply',
        'Feedback-ID': `${event.eventType}:TransactionAutopilot:PayPalCommerce`
      }
    };

    const info = await transporter.sendMail(mailOptions);
    const providerMessageId = info.messageId || `<${event.id}@${provider === 'gmail' ? 'gmail.com' : 'relay.brevo.com'}>`;
    const responseCode = info.response || '250 OK';

    // 5. Update Status to ACCEPTED_BY_PROVIDER
    updateEventStatus(event.id, {
      status: 'ACCEPTED_BY_PROVIDER',
      providerMessageId,
      smtpResponse: responseCode,
      error: null
    });

    console.log(`[${provider.toUpperCase()} SMTP] Event ${event.eventType} for Order ${maskOrderRef(orderId)} delivered (${providerMessageId})`);

    return {
      success: true,
      status: 'ACCEPTED_BY_PROVIDER',
      messageId: providerMessageId,
      event
    };
  } catch (err) {
    const sanitizedError = err.message || 'SMTP transmission failure';
    const isPermanent = err.responseCode && err.responseCode >= 500 && err.responseCode < 600;
    const finalStatus = isPermanent ? 'BOUNCED' : 'FAILED';

    updateEventStatus(event.id, {
      status: finalStatus,
      error: sanitizedError,
      incrementRetry: true
    });

    console.error(`[Brevo SMTP] Delivery error for event ${event.id}:`, sanitizedError);

    return {
      success: false,
      status: finalStatus,
      error: sanitizedError,
      canRetry: !isPermanent && event.retryCount < event.maxRetries,
      event
    };
  }
}

/**
 * 1. Send Payment Captured Email
 * Triggered ONLY after authoritative confirmation from PayPal capture.
 */
export async function sendPaymentCapturedEmail({ order, capture, idempotencyKey: customIdemKey }) {
  if (!order || !capture) {
    return {
      success: false,
      reason: 'Authoritative order and capture evidence required.',
      error: 'Authoritative order and capture evidence required.'
    };
  }

  const recipient = order.payerEmail || capture.payer?.email_address;
  if (!recipient) {
    return {
      success: false,
      reason: 'No authoritative customer email provided in PayPal capture.',
      error: 'No authoritative customer email provided in PayPal capture.'
    };
  }

  // Verify authoritative state
  const captureStatus = capture.status || order.captureStatus;
  const orderStatus = order.status || order.paypalStatus;
  if (captureStatus !== 'COMPLETED' || (orderStatus && orderStatus !== 'COMPLETED')) {
    const statusMsg = `Cannot send payment capture email for uncompleted payment (Status: ${captureStatus || orderStatus}). Must be authoritative COMPLETED state.`;
    return {
      success: false,
      reason: statusMsg,
      error: statusMsg
    };
  }

  const orderRef = maskOrderRef(order.id);
  const amountVal = capture.amount?.value || order.amount;
  const currencyVal = capture.amount?.currency_code || order.currency || 'USD';
  const amountDisplay = amountVal ? `$${Number(amountVal).toFixed(2)} ${currencyVal}` : '';

  const { subject, html, text } = buildPaymentCapturedTemplate({
    orderRef,
    customerName: order.payerName || capture.payer?.name?.given_name || 'Customer',
    itemDescription: order.description || 'PayPal Order Payment',
    amountDisplay,
    timestamp: capture.create_time || new Date().toISOString()
  });

  const idempotencyKey = customIdemKey || generateIdempotencyKey(order.id, 'PAYMENT_CAPTURED', capture.id || 'CAP');

  return await sendEmail({
    eventType: 'PAYMENT_CAPTURED',
    orderId: order.id,
    recipientEmail: recipient,
    subject,
    html,
    text,
    idempotencyKey,
    metadata: { orderId: order.id }
  });
}

/**
 * 2. Send Payment Failed Email
 * Triggered ONLY when payment authorization or capture fails authoritatively.
 */
export async function sendPaymentFailedEmail({ order, error, checkoutUrl }) {
  if (!order) {
    return { success: false, error: 'Order required for payment failure notice.' };
  }

  const recipient = order.payerEmail;
  if (!recipient) {
    return { success: false, error: 'Customer email unavailable for failed payment notification.' };
  }

  const orderRef = maskOrderRef(order.id);
  const reason = typeof error === 'string' ? error : (error?.message || 'Payment authorization declined');

  const { subject, html, text } = buildPaymentFailedTemplate({
    orderRef,
    customerName: order.payerName || 'Customer',
    checkoutUrl: checkoutUrl || order.checkoutUrl,
    reason,
    timestamp: new Date().toISOString()
  });

  const idempotencyKey = generateIdempotencyKey(order.id, 'PAYMENT_FAILED', String(Date.now()).slice(0, -4));

  return await sendEmail({
    eventType: 'PAYMENT_FAILED',
    orderId: order.id,
    recipientEmail: recipient,
    subject,
    html,
    text,
    idempotencyKey,
    metadata: { orderId: order.id }
  });
}

/**
 * 3. Send Invoice Created Email
 * Dispatches invoice payment request to recipient.
 */
export async function sendInvoiceEmail({ invoice, checkoutUrl }) {
  if (!invoice || !invoice.customerEmail) {
    return { success: false, error: 'Valid invoice and recipient email required.' };
  }

  const amountDisplay = invoice.amount ? `$${Number(invoice.amount).toFixed(2)} ${invoice.currency || 'USD'}` : '';

  const { subject, html, text } = buildInvoiceCreatedTemplate({
    invoiceNumber: invoice.invoiceNumber || invoice.id,
    customerName: invoice.customerName || 'Customer',
    itemDescription: invoice.itemDescription,
    amountDisplay,
    checkoutUrl: checkoutUrl || invoice.checkoutUrl,
    notes: invoice.notes || invoice.note,
    timestamp: invoice.createdTime || new Date().toISOString()
  });

  const idempotencyKey = generateIdempotencyKey(invoice.orderId || invoice.id, 'INVOICE_CREATED', invoice.id);

  return await sendEmail({
    eventType: 'INVOICE_CREATED',
    orderId: invoice.orderId || invoice.id,
    recipientEmail: invoice.customerEmail,
    subject,
    html,
    text,
    idempotencyKey,
    metadata: { invoiceId: invoice.id }
  });
}

/**
 * 4. Send Refund Update Email
 * Triggered ONLY after refund is confirmed by PayPal.
 */
export async function sendRefundEmail({ order, refund }) {
  if (!order || !refund) {
    return { success: false, error: 'Order and refund confirmation required.' };
  }

  const recipient = order.payerEmail;
  if (!recipient) {
    return { success: false, error: 'Customer email unavailable for refund notice.' };
  }

  const orderRef = maskOrderRef(order.id);
  const refundAmount = refund.amount?.value;
  const currency = refund.amount?.currency_code || 'USD';
  const amountDisplay = refundAmount ? `$${Number(refundAmount).toFixed(2)} ${currency}` : '';

  const { subject, html, text } = buildRefundIssuedTemplate({
    orderRef,
    customerName: order.payerName || 'Customer',
    amountDisplay,
    refundStatus: refund.status || 'COMPLETED',
    timestamp: refund.create_time || new Date().toISOString()
  });

  const idempotencyKey = generateIdempotencyKey(order.id, 'REFUND_ISSUED', refund.id || 'REF');

  return await sendEmail({
    eventType: 'REFUND_ISSUED',
    orderId: order.id,
    recipientEmail: recipient,
    subject,
    html,
    text,
    idempotencyKey,
    metadata: { orderId: order.id }
  });
}

/**
 * 5. Send Order Status Changed Email
 * Triggered on state transitions such as carrier tracking added.
 */
export async function sendOrderStatusEmail({ order, newStatus, carrier, trackingNumber, trackingUrl }) {
  if (!order) {
    return { success: false, error: 'Order required for status update notice.' };
  }

  const recipient = order.payerEmail;
  if (!recipient) {
    return { success: false, error: 'Customer email unavailable for order update.' };
  }

  const orderRef = maskOrderRef(order.id);

  const { subject, html, text } = buildOrderStatusChangedTemplate({
    orderRef,
    customerName: order.payerName || 'Customer',
    newStatus,
    carrier,
    trackingNumber,
    trackingUrl,
    timestamp: new Date().toISOString()
  });

  const idempotencyKey = generateIdempotencyKey(order.id, 'ORDER_STATUS_CHANGED', `${newStatus}:${trackingNumber || ''}`);

  return await sendEmail({
    eventType: 'ORDER_STATUS_CHANGED',
    orderId: order.id,
    recipientEmail: recipient,
    subject,
    html,
    text,
    idempotencyKey,
    metadata: { orderId: order.id, newStatus }
  });
}

/**
 * 6. Send Payment Link Email
 * Dispatches an authentic PayPal Orders checkout link to a customer's email.
 */
export async function sendPaymentLinkEmail({ order, recipientEmail, checkoutUrl, itemDescription, amountDisplay }) {
  if (!order || !order.id) {
    return { success: false, error: 'Order reference required for payment link email.' };
  }

  const recipient = recipientEmail || order.payerEmail;
  if (!recipient || !recipient.includes('@')) {
    return { success: false, error: 'Valid customer email required for payment link email.' };
  }

  const url = checkoutUrl || order.checkoutUrl || `https://www.sandbox.paypal.com/checkoutnow?token=${encodeURIComponent(order.id)}`;
  const orderRef = maskOrderRef(order.id);
  const amountVal = amountDisplay || (order.amount ? `$${Number(order.amount).toFixed(2)} ${order.currency || 'USD'}` : '');

  const { subject, html, text } = buildPaymentLinkTemplate({
    orderRef,
    recipientName: order.payerName || 'Valued Customer',
    itemDescription: itemDescription || 'PayPal Order Payment',
    amountDisplay: amountVal,
    checkoutUrl: url,
    timestamp: new Date().toISOString()
  });

  const idempotencyKey = generateIdempotencyKey(order.id, 'PAYMENT_LINK', recipient);

  return await sendEmail({
    eventType: 'PAYMENT_LINK',
    orderId: order.id,
    recipientEmail: recipient,
    subject,
    html,
    text,
    idempotencyKey,
    metadata: { orderId: order.id, checkoutUrl: url }
  });
}

/**
 * 7. Send Recurring Billing & Subscription Notification
 * Dispatches automated Braintree recurring billing & subscription renewal notices.
 */
export async function sendRecurringBillingEmail({
  subscriptionId,
  customerEmail,
  customerName,
  planName,
  amountDisplay,
  nextBillingDate,
  status = 'ACTIVE',
  updatePaymentUrl
}) {
  const subId = subscriptionId || `SUB-${Date.now().toString(36).toUpperCase()}`;
  const recipient = customerEmail;
  if (!recipient || !recipient.includes('@')) {
    return { success: false, error: 'Valid customer email required for subscription email.' };
  }

  const { subject, html, text } = buildRecurringBillingNoticeTemplate({
    subscriptionId: subId,
    customerName: customerName || 'Valued Customer',
    planName: planName || 'PayPal Commerce Subscription',
    amountDisplay,
    nextBillingDate,
    status,
    updatePaymentUrl
  });

  const idempotencyKey = generateIdempotencyKey(subId, `RECURRING_${status}`, recipient);

  return await sendEmail({
    eventType: 'RECURRING_BILLING',
    orderId: subId,
    recipientEmail: recipient,
    subject,
    html,
    text,
    idempotencyKey,
    metadata: { subscriptionId: subId, planName, status }
  });
}

export default {
  validateSmtpConfig,
  getSanitizedSmtpStatus,
  verifySmtpConnection,
  sendEmail,
  sendPaymentCapturedEmail,
  sendPaymentFailedEmail,
  sendInvoiceEmail,
  sendRefundEmail,
  sendOrderStatusEmail,
  sendPaymentLinkEmail,
  sendRecurringBillingEmail,
  getOperationalEmailStats,
  getAllEvents,
  _setMockTransport
};
