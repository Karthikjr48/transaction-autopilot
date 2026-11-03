/**
 * PayPal & Braintree Official Email Templates Module — V2 Ultra-Premium Edition
 * 
 * Design Standards:
 * - Fluid, unboxed layout (Zero clunky nested boxes or thick borders).
 * - Full Dual-Mode Support:
 *   • Pure, radiant Light Mode (white canvas, deep navy typography #001435, subtle hairlines)
 *   • Rich, sleek Dark Mode (Obsidian Navy #0b0f19 / #111827, pure crisp white #ffffff, light slate #cbd5e1)
 * - Official PayPal Rebrand Logos with automatic dark-mode switching (ppcom.png / ppcom-white.png).
 * - Native [data-ogsc] / [data-ogsb] support for Microsoft Outlook Mobile & Web Dark Mode.
 * - Human-readable dates (e.g. "Oct 30, 2026, 04:30 AM").
 * - Authentic PayPal Blue pill CTA button (#0070ba).
 * - 100% Table-based XHTML 1.0 architecture for 100% cross-client reliability (Outlook, Gmail, iOS, Android).
 * - Anti-Spam Optimization: ZERO square brackets in subject lines to maximize inbox delivery.
 */

/**
 * Escape HTML special characters
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Format timestamp into human-readable date & time
 */
export function formatEmailDate(dateInput) {
  try {
    const d = dateInput ? new Date(dateInput) : new Date();
    if (isNaN(d.getTime())) return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (_) {
    return 'Recent';
  }
}

/**
 * Master PayPal Sandbox Email Layout Wrapper
 * Supports both Light and Dark modes gracefully with zero boxiness.
 */
function wrapPayPalLayout({ title, previewText, headline, subHeadline, bodyContent, ctaText, ctaUrl, securityNote }) {
  const safeTitle = escapeHtml(title);
  const safePreview = escapeHtml(previewText);
  const safeHeadline = escapeHtml(headline);
  const safeSubHeadline = subHeadline ? escapeHtml(subHeadline) : '';

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <meta name="format-detection" content="telephone=no" />
  <title>${safeTitle}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td, p, a, span { font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif !important; }
  </style>
  <![endif]-->
  <style type="text/css">
    :root {
      color-scheme: light dark;
      supported-color-schemes: light dark;
    }
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-collapse: collapse !important; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; display: block; }
    
    body {
      height: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      background-color: #f6f9fc;
      font-family: 'PayPal Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #001435;
    }

    /* Mobile Responsive Breakpoints */
    @media screen and (max-width: 600px) {
      .email-outer-table { padding: 0 !important; }
      .email-container { width: 100% !important; max-width: 100% !important; border-radius: 0 !important; border: none !important; }
      .mobile-pad { padding-left: 20px !important; padding-right: 20px !important; }
      .mobile-header-pad { padding-left: 20px !important; padding-right: 20px !important; padding-top: 20px !important; padding-bottom: 16px !important; }
      .cta-button-link { display: block !important; width: 100% !important; box-sizing: border-box !important; text-align: center !important; }
      .hero-amount { font-size: 36px !important; }
    }

    /* Dark Mode Engine (Apple Mail, iOS Mail, Android) */
    @media (prefers-color-scheme: dark) {
      body, .email-outer-bg { background-color: #0b0f19 !important; }
      .email-container { background-color: #111827 !important; border-color: #1f2937 !important; }
      .text-main { color: #ffffff !important; }
      .text-sub { color: #cbd5e1 !important; }
      .text-muted { color: #94a3b8 !important; }
      .hairline { border-color: #1f2937 !important; }
      .badge-sandbox { background-color: #1f2937 !important; color: #38bdf8 !important; border-color: #0284c7 !important; }
      .sandbox-note { background-color: #172554 !important; border-left-color: #38bdf8 !important; }
      .sandbox-note-text { color: #bfdbfe !important; }
      .footer-bg { background-color: #0b0f19 !important; border-color: #1f2937 !important; }
      .footer-text { color: #64748b !important; }
      .logo-light { display: none !important; }
      .logo-dark { display: block !important; }
    }

    /* Microsoft Outlook Dark Mode Selectors */
    [data-ogsb] .email-outer-bg { background-color: #0b0f19 !important; }
    [data-ogsb] .email-container { background-color: #111827 !important; }
    [data-ogsc] .text-main { color: #ffffff !important; }
    [data-ogsc] .text-sub { color: #cbd5e1 !important; }
    [data-ogsc] .text-muted { color: #94a3b8 !important; }
    [data-ogsc] .hairline { border-color: #1f2937 !important; }
    [data-ogsc] .badge-sandbox { background-color: #1f2937 !important; color: #38bdf8 !important; }
    [data-ogsc] .sandbox-note-text { color: #bfdbfe !important; }
    [data-ogsb] .sandbox-note { background-color: #172554 !important; }
    [data-ogsc] .footer-text { color: #64748b !important; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f6f9fc; color: #001435;" class="email-outer-bg">

  <!-- Preheader Snippet -->
  <div style="display: none; font-size: 1px; color: #f6f9fc; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; mso-hide: all;">
    ${safePreview} &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>

  <!-- Background Wrapper -->
  <table border="0" cellpadding="0" cellspacing="0" width="100%" class="email-outer-bg email-outer-table" style="background-color: #f6f9fc; table-layout: fixed; width: 100%;">
    <tr>
      <td align="center" style="padding: 24px 12px 48px 12px;" class="email-outer-table">

        <!-- Main Card: 580px Golden Width, Sleek Minimal Boundary -->
        <table border="0" cellpadding="0" cellspacing="0" width="580" class="email-container" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #edf2f7; max-width: 580px; width: 100%;">
          
          <!-- Header: Official PayPal Logo + Subtle Sandbox Status -->
          <tr>
            <td style="padding: 24px 32px 18px 32px; border-bottom: 1px solid #f1f5f9;" class="mobile-header-pad hairline">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="left" valign="middle">
                    <!-- Standard Colored Logo (Light Mode) -->
                    <img src="https://www.paypalobjects.com/webstatic/i/logo/rebrand/ppcom.png" class="logo-light" width="124" height="33" alt="PayPal" style="display: block; border: 0; outline: none;" />
                    <!-- Crisp White Logo (Dark Mode) -->
                    <!--[if !mso]><!-->
                    <img src="https://www.paypalobjects.com/webstatic/i/logo/rebrand/ppcom-white.png" class="logo-dark" width="124" height="33" alt="PayPal" style="display: none; border: 0; outline: none;" />
                    <!--<![endif]-->
                  </td>
                  <td align="right" valign="middle">
                    <!-- Clean Minimalist Sandbox Tag -->
                    <span class="badge-sandbox" style="display: inline-block; font-size: 11px; font-weight: 700; color: #0070ba; text-transform: uppercase; letter-spacing: 0.08em; background-color: #f0f7ff; padding: 4px 10px; border-radius: 12px; border: 1px solid #bae6fd; font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif;">
                      SANDBOX
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Area -->
          <tr>
            <td style="padding: 32px 32px 28px 32px;" class="mobile-pad">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                
                <!-- Headline -->
                <tr>
                  <td style="font-size: 22px; font-weight: 800; color: #001435; line-height: 1.3; padding-bottom: 6px;" class="text-main">
                    ${safeHeadline}
                  </td>
                </tr>

                <!-- Subheadline -->
                ${safeSubHeadline ? `
                <tr>
                  <td style="font-size: 15px; color: #475569; line-height: 1.5; padding-bottom: 20px;" class="text-sub">
                    ${safeSubHeadline}
                  </td>
                </tr>` : `<tr><td style="height: 12px;"></td></tr>`}

                <!-- Dynamic Content Body (Amounts, itemized rows) -->
                <tr>
                  <td>
                    ${bodyContent}
                  </td>
                </tr>

                <!-- Centered Signature PayPal CTA Button -->
                ${ctaText && ctaUrl ? `
                <tr>
                  <td align="center" style="padding-top: 28px; padding-bottom: 12px;">
                    <table border="0" cellspacing="0" cellpadding="0" style="margin: 0 auto; width: auto;">
                      <tr>
                        <td align="center" style="background-color: #0070ba; border-radius: 24px;">
                          <a href="${escapeHtml(ctaUrl)}" target="_blank" class="cta-button-link" style="display: inline-block; padding: 14px 44px; font-size: 15px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 24px; font-family: 'PayPal Sans', -apple-system, BlinkMacSystemFont, Arial, sans-serif;">
                            ${escapeHtml(ctaText)}
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>` : ''}

                <!-- Refined Sandbox Notice Bar -->
                <tr>
                  <td style="padding-top: 24px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" class="sandbox-note" style="background-color: #f8fafc; border-left: 3px solid #0070ba; border-radius: 4px;">
                      <tr>
                        <td style="padding: 12px 16px; font-size: 12px; line-height: 1.5; color: #475569;" class="sandbox-note-text">
                          <strong style="color: #0070ba;">🧪 PayPal Sandbox:</strong>
                          ${securityNote || 'This message was generated from the PayPal Developer Sandbox testing environment. No real funds were charged or transferred.'}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Footer Area -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 32px; border-top: 1px solid #edf2f7; text-align: center; color: #64748b; font-size: 12px; line-height: 1.6;" class="mobile-pad footer-bg hairline">
              <p style="margin: 0 0 8px 0;">
                <a href="https://developer.paypal.com/home" style="color: #0070ba; text-decoration: none; font-weight: 600;">PayPal Developer Portal</a> &nbsp;&bull;&nbsp;
                <a href="https://www.sandbox.paypal.com" style="color: #0070ba; text-decoration: none; font-weight: 600;">PayPal Sandbox Log In</a> &nbsp;&bull;&nbsp;
                <a href="https://www.paypal.com/security" style="color: #0070ba; text-decoration: none; font-weight: 600;">Security Center</a>
              </p>
              <p style="margin: 0 0 6px 0; color: #64748b;" class="footer-text">
                This automated test notification was dispatched by PayPal Sandbox APIs.
              </p>
              <p style="margin: 0 0 6px 0; color: #94a3b8; font-size: 11px;" class="footer-text">
                Copyright &copy; 1999–2026 PayPal, Inc. All rights reserved. 2211 N. First St., San Jose, CA 95131.
              </p>
              <p style="margin: 0; color: #94a3b8; font-size: 11px;" class="footer-text">
                <a href="https://www.paypal.com/privacy" style="color: #64748b; text-decoration: underline;">Privacy</a> &nbsp;&bull;&nbsp; 
                <a href="https://www.paypal.com/legal" style="color: #64748b; text-decoration: underline;">Legal Agreements</a>
              </p>
            </td>
          </tr>

        </table><!-- End Main Card -->

      </td>
    </tr>
  </table>

</body>
</html>`;
}

/**
 * 1. Payment Request / Send Payment Link Template
 * Zero square brackets in subject. Clean natural subject line.
 */
export function buildPaymentLinkTemplate({
  orderRef,
  recipientName,
  itemDescription,
  amountDisplay,
  checkoutUrl,
  merchantName = 'PayPal Commerce Merchant',
  timestamp
}) {
  const safeName = recipientName ? escapeHtml(recipientName) : 'Valued Customer';
  const safeRef = escapeHtml(orderRef);
  const safeDesc = escapeHtml(itemDescription || 'PayPal Sandbox Order');
  const safeAmount = escapeHtml(amountDisplay || '$0.00');
  const safeMerchant = escapeHtml(merchantName);
  const safeDate = formatEmailDate(timestamp);

  // Anti-Spam: Clean natural subject line without square brackets
  const subject = `Payment request for ${safeAmount} from ${safeMerchant}`;
  const previewText = `${safeMerchant} requested payment of ${safeAmount}. Review details and test checkout.`;

  const html = wrapPayPalLayout({
    title: subject,
    previewText,
    headline: `Payment Request from ${safeMerchant}`,
    subHeadline: `Hello ${safeName}, ${safeMerchant} has requested payment for your order. Review the summary below and complete payment via PayPal Sandbox.`,
    ctaText: 'Pay with PayPal Sandbox',
    ctaUrl: checkoutUrl,
    bodyContent: `
      <!-- Airy Hero Amount (No Boxes) -->
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="padding: 10px 0 20px 0;">
        <tr>
          <td align="center">
            <div style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px;" class="text-muted">Total Amount Due</div>
            <div class="hero-amount text-main" style="font-size: 42px; font-weight: 800; color: #001435; line-height: 1.1; letter-spacing: -0.02em;">
              ${safeAmount}
            </div>
            <div style="font-size: 13px; color: #64748b; margin-top: 6px;" class="text-muted">
              Order Ref: <span style="font-family: SFMono-Regular, Consolas, Monaco, monospace; font-weight: 600;" class="text-main">${safeRef}</span>
            </div>
          </td>
        </tr>
      </table>

      <!-- Itemized Details (Clean Hairlines, Zero Outer Box) -->
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 16px;">
        <tr>
          <td style="padding: 12px 0; font-size: 14px; color: #64748b;" class="text-muted">Description</td>
          <td align="right" style="padding: 12px 0; font-size: 14px; font-weight: 600; color: #001435;" class="text-main">${safeDesc}</td>
        </tr>
        <tr><td colspan="2" style="border-bottom: 1px solid #f1f5f9;" class="hairline"></td></tr>
        <tr>
          <td style="padding: 12px 0; font-size: 14px; color: #64748b;" class="text-muted">Merchant / Seller</td>
          <td align="right" style="padding: 12px 0; font-size: 14px; font-weight: 600; color: #001435;" class="text-main">${safeMerchant}</td>
        </tr>
        <tr><td colspan="2" style="border-bottom: 1px solid #f1f5f9;" class="hairline"></td></tr>
        <tr>
          <td style="padding: 12px 0; font-size: 14px; color: #64748b;" class="text-muted">Request Date</td>
          <td align="right" style="padding: 12px 0; font-size: 14px; font-weight: 600; color: #001435;" class="text-main">${safeDate}</td>
        </tr>
        <tr><td colspan="2" style="border-bottom: 1px solid #f1f5f9;" class="hairline"></td></tr>
        <tr>
          <td style="padding: 16px 0 6px 0; font-size: 15px; font-weight: 700; color: #001435;" class="text-main">Total to Pay</td>
          <td align="right" style="padding: 16px 0 6px 0; font-size: 18px; font-weight: 800; color: #0070ba;">${safeAmount}</td>
        </tr>
      </table>
    `
  });

  const text = `PAYPAL SANDBOX PAYMENT REQUEST\n\nHello ${safeName},\n\n${safeMerchant} has generated a PayPal Sandbox payment request for ${safeAmount}.\nOrder Reference: ${safeRef}\nDescription: ${safeDesc}\nDate: ${safeDate}\n\nTest Checkout URL: ${checkoutUrl}\n\nThis is a Sandbox transaction. No real money will be charged.`;

  return { subject, html, text };
}

/**
 * 2. Payment Captured / Receipt Email Template
 */
export function buildPaymentCapturedTemplate({
  orderRef,
  customerName,
  itemDescription,
  amountDisplay,
  timestamp,
  merchantName = 'PayPal Commerce Merchant',
  paymentMethod = 'PayPal Sandbox Balance'
}) {
  const safeName = customerName ? escapeHtml(customerName) : 'Valued Customer';
  const safeRef = escapeHtml(orderRef);
  const safeDesc = escapeHtml(itemDescription || 'PayPal Sandbox Order');
  const safeAmount = escapeHtml(amountDisplay || '$0.00');
  const safeMerchant = escapeHtml(merchantName);
  const safeMethod = escapeHtml(paymentMethod);
  const safeDate = formatEmailDate(timestamp);

  const subject = `Receipt for your payment of ${safeAmount} to ${safeMerchant}`;
  const previewText = `You sent a test payment of ${safeAmount} to ${safeMerchant}. View receipt details.`;

  const html = wrapPayPalLayout({
    title: subject,
    previewText,
    headline: 'You sent a payment (Sandbox)',
    subHeadline: `Hello ${safeName}, you sent a test payment of ${safeAmount} to ${safeMerchant} in the PayPal Sandbox environment.`,
    ctaText: 'View in PayPal Sandbox Activity',
    ctaUrl: 'https://www.sandbox.paypal.com/myaccount/transactions',
    bodyContent: `
      <!-- Airy Hero Amount -->
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="padding: 10px 0 20px 0;">
        <tr>
          <td align="center">
            <div style="font-size: 12px; font-weight: 700; color: #16a34a; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px;">Payment Completed</div>
            <div class="hero-amount text-main" style="font-size: 42px; font-weight: 800; color: #001435; line-height: 1.1; letter-spacing: -0.02em;">
              ${safeAmount}
            </div>
            <div style="font-size: 13px; color: #64748b; margin-top: 6px;" class="text-muted">
              PayPal Order ID: <span style="font-family: SFMono-Regular, Consolas, Monaco, monospace; font-weight: 600;" class="text-main">${safeRef}</span>
            </div>
          </td>
        </tr>
      </table>

      <!-- Itemized Details -->
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 16px;">
        <tr>
          <td style="padding: 12px 0; font-size: 14px; color: #64748b;" class="text-muted">Recipient / Merchant</td>
          <td align="right" style="padding: 12px 0; font-size: 14px; font-weight: 600; color: #001435;" class="text-main">${safeMerchant}</td>
        </tr>
        <tr><td colspan="2" style="border-bottom: 1px solid #f1f5f9;" class="hairline"></td></tr>
        <tr>
          <td style="padding: 12px 0; font-size: 14px; color: #64748b;" class="text-muted">Item Description</td>
          <td align="right" style="padding: 12px 0; font-size: 14px; font-weight: 600; color: #001435;" class="text-main">${safeDesc}</td>
        </tr>
        <tr><td colspan="2" style="border-bottom: 1px solid #f1f5f9;" class="hairline"></td></tr>
        <tr>
          <td style="padding: 12px 0; font-size: 14px; color: #64748b;" class="text-muted">Payment Method</td>
          <td align="right" style="padding: 12px 0; font-size: 14px; font-weight: 600; color: #001435;" class="text-main">${safeMethod}</td>
        </tr>
        <tr><td colspan="2" style="border-bottom: 1px solid #f1f5f9;" class="hairline"></td></tr>
        <tr>
          <td style="padding: 12px 0; font-size: 14px; color: #64748b;" class="text-muted">Date &amp; Time</td>
          <td align="right" style="padding: 12px 0; font-size: 14px; font-weight: 600; color: #001435;" class="text-main">${safeDate}</td>
        </tr>
        <tr><td colspan="2" style="border-bottom: 1px solid #f1f5f9;" class="hairline"></td></tr>
        <tr>
          <td style="padding: 16px 0 6px 0; font-size: 15px; font-weight: 700; color: #001435;" class="text-main">Total Amount</td>
          <td align="right" style="padding: 16px 0 6px 0; font-size: 18px; font-weight: 800; color: #0070ba;">${safeAmount}</td>
        </tr>
      </table>
    `
  });

  const text = `PAYPAL SANDBOX PAYMENT RECEIPT\n\nHello ${safeName},\n\nYou sent a test payment of ${safeAmount} to ${safeMerchant}.\nOrder ID: ${safeRef}\nItem: ${safeDesc}\nPayment Method: ${safeMethod}\nDate: ${safeDate}\n\nPayPal Sandbox Test Mode: No real funds were charged.`;

  return { subject, html, text };
}

/**
 * 3. Braintree Recurring Billing & Subscription Notice
 */
export function buildRecurringBillingNoticeTemplate({
  subscriptionId,
  customerName,
  planName = 'PayPal Commerce Subscription',
  amountDisplay,
  nextBillingDate,
  status = 'ACTIVE',
  updatePaymentUrl = 'https://www.sandbox.paypal.com/myaccount/autopay',
  merchantName = 'PayPal Commerce Merchant'
}) {
  const safeName = customerName ? escapeHtml(customerName) : 'Valued Customer';
  const safeSubId = escapeHtml(subscriptionId);
  const safePlan = escapeHtml(planName);
  const safeAmount = escapeHtml(amountDisplay || '$0.00');
  const safeDate = formatEmailDate(nextBillingDate);
  const safeMerchant = escapeHtml(merchantName);

  let headline = `Important notice regarding your subscription to ${safeMerchant}`;
  let subHeadline = `Hello ${safeName}, here is the latest update regarding your recurring subscription.`;
  let statusBadge = 'ACTIVE';

  if (status === 'FIRST_DECLINE') {
    headline = `Action Required: We couldn't process your subscription payment`;
    subHeadline = `Hello ${safeName}, we were unable to process your recurring payment for ${safePlan}. Your subscription is now past due.`;
    statusBadge = 'PAST DUE / RETRYING';
  } else if (status === 'PAST_DUE') {
    headline = `Your subscription to ${safeMerchant} is past due`;
    subHeadline = `Hello ${safeName}, multiple attempts to charge your payment method were unsuccessful. Please update your billing details to maintain service.`;
    statusBadge = 'PAST DUE';
  } else if (status === 'RENEWED') {
    headline = `Your recurring payment to ${safeMerchant} was successful`;
    subHeadline = `Hello ${safeName}, your recurring subscription to ${safePlan} has been renewed.`;
  }

  const subject = status === 'FIRST_DECLINE' || status === 'PAST_DUE'
    ? `Action Required: Update billing details for ${safePlan}`
    : `Recurring billing receipt for ${safePlan}`;

  const previewText = `${headline}. Amount: ${safeAmount}. Review subscription details.`;

  const html = wrapPayPalLayout({
    title: subject,
    previewText,
    headline,
    subHeadline,
    ctaText: status === 'FIRST_DECLINE' || status === 'PAST_DUE' ? 'Update Payment Method' : 'Manage Subscription in Sandbox',
    ctaUrl: updatePaymentUrl,
    securityNote: 'PayPal Braintree recurring billing ensures automated, secure tokenized renewals. Your full card numbers are never stored on merchant servers.',
    bodyContent: `
      <!-- Hero Amount -->
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="padding: 10px 0 20px 0;">
        <tr>
          <td align="center">
            <div style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px;" class="text-muted">Subscription Cycle</div>
            <div class="hero-amount text-main" style="font-size: 42px; font-weight: 800; color: #001435; line-height: 1.1; letter-spacing: -0.02em;">
              ${safeAmount}
            </div>
            <div style="font-size: 13px; color: #64748b; margin-top: 6px;" class="text-muted">
              Subscription ID: <span style="font-family: SFMono-Regular, Consolas, Monaco, monospace; font-weight: 600;" class="text-main">${safeSubId}</span>
            </div>
          </td>
        </tr>
      </table>

      <!-- Itemized Details -->
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 16px;">
        <tr>
          <td style="padding: 12px 0; font-size: 14px; color: #64748b;" class="text-muted">Plan Name</td>
          <td align="right" style="padding: 12px 0; font-size: 14px; font-weight: 600; color: #001435;" class="text-main">${safePlan}</td>
        </tr>
        <tr><td colspan="2" style="border-bottom: 1px solid #f1f5f9;" class="hairline"></td></tr>
        <tr>
          <td style="padding: 12px 0; font-size: 14px; color: #64748b;" class="text-muted">Merchant</td>
          <td align="right" style="padding: 12px 0; font-size: 14px; font-weight: 600; color: #001435;" class="text-main">${safeMerchant}</td>
        </tr>
        <tr><td colspan="2" style="border-bottom: 1px solid #f1f5f9;" class="hairline"></td></tr>
        <tr>
          <td style="padding: 12px 0; font-size: 14px; color: #64748b;" class="text-muted">Status</td>
          <td align="right" style="padding: 12px 0; font-size: 14px; font-weight: 700; color: ${status === 'PAST_DUE' ? '#b91c1c' : '#15803d'};">${statusBadge}</td>
        </tr>
        <tr><td colspan="2" style="border-bottom: 1px solid #f1f5f9;" class="hairline"></td></tr>
        <tr>
          <td style="padding: 12px 0; font-size: 14px; color: #64748b;" class="text-muted">Next Billing Date</td>
          <td align="right" style="padding: 12px 0; font-size: 14px; font-weight: 600; color: #001435;" class="text-main">${safeDate}</td>
        </tr>
      </table>
    `
  });

  const text = `PAYPAL SANDBOX SUBSCRIPTION NOTICE\n\nHello ${safeName},\n\nSubscription: ${safePlan} (${safeSubId})\nStatus: ${statusBadge}\nAmount: ${safeAmount}\nNext Date: ${safeDate}\n\nManage: ${updatePaymentUrl}`;

  return { subject, html, text };
}

/**
 * 4. Invoice Created Template
 */
export function buildInvoiceCreatedTemplate({
  invoiceNumber,
  customerName,
  itemDescription,
  amountDisplay,
  checkoutUrl,
  notes,
  timestamp,
  merchantName = 'PayPal Commerce Merchant'
}) {
  const safeName = customerName ? escapeHtml(customerName) : 'Valued Customer';
  const safeInv = escapeHtml(invoiceNumber || 'INV-001');
  const safeDesc = escapeHtml(itemDescription || 'PayPal Sandbox Invoice');
  const safeAmount = escapeHtml(amountDisplay || '$0.00');
  const safeNotes = notes ? escapeHtml(notes) : null;
  const safeMerchant = escapeHtml(merchantName);
  const safeDate = formatEmailDate(timestamp);

  const subject = `Invoice ${safeInv} from ${safeMerchant} for ${safeAmount}`;
  const previewText = `${safeMerchant} sent you an invoice for ${safeAmount}. Review line items.`;

  const html = wrapPayPalLayout({
    title: subject,
    previewText,
    headline: `Invoice from ${safeMerchant}`,
    subHeadline: `Hello ${safeName}, ${safeMerchant} sent you Invoice #${safeInv} for ${safeAmount}.`,
    ctaText: 'View and Pay Invoice in Sandbox',
    ctaUrl: checkoutUrl,
    bodyContent: `
      <!-- Hero Amount -->
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="padding: 10px 0 20px 0;">
        <tr>
          <td align="center">
            <div style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px;" class="text-muted">Total Balance Due</div>
            <div class="hero-amount text-main" style="font-size: 42px; font-weight: 800; color: #001435; line-height: 1.1; letter-spacing: -0.02em;">
              ${safeAmount}
            </div>
            <div style="font-size: 13px; color: #64748b; margin-top: 6px;" class="text-muted">
              Invoice: <span style="font-family: SFMono-Regular, Consolas, Monaco, monospace; font-weight: 600;" class="text-main">${safeInv}</span>
            </div>
          </td>
        </tr>
      </table>

      <!-- Itemized Details -->
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 16px;">
        <tr>
          <td style="padding: 12px 0; font-size: 14px; color: #64748b;" class="text-muted">Item / Description</td>
          <td align="right" style="padding: 12px 0; font-size: 14px; font-weight: 600; color: #001435;" class="text-main">${safeDesc}</td>
        </tr>
        <tr><td colspan="2" style="border-bottom: 1px solid #f1f5f9;" class="hairline"></td></tr>
        <tr>
          <td style="padding: 12px 0; font-size: 14px; color: #64748b;" class="text-muted">Issued Date</td>
          <td align="right" style="padding: 12px 0; font-size: 14px; font-weight: 600; color: #001435;" class="text-main">${safeDate}</td>
        </tr>
        ${safeNotes ? `
        <tr><td colspan="2" style="border-bottom: 1px solid #f1f5f9;" class="hairline"></td></tr>
        <tr>
          <td style="padding: 12px 0; font-size: 14px; color: #64748b;" class="text-muted">Memo</td>
          <td align="right" style="padding: 12px 0; font-size: 14px; font-weight: 500; color: #1e293b;" class="text-main">${safeNotes}</td>
        </tr>` : ''}
        <tr><td colspan="2" style="border-bottom: 1px solid #f1f5f9;" class="hairline"></td></tr>
        <tr>
          <td style="padding: 16px 0 6px 0; font-size: 15px; font-weight: 700; color: #001435;" class="text-main">Total Balance Due</td>
          <td align="right" style="padding: 16px 0 6px 0; font-size: 18px; font-weight: 800; color: #0070ba;">${safeAmount}</td>
        </tr>
      </table>
    `
  });

  const text = `PAYPAL SANDBOX INVOICE\n\nFrom: ${safeMerchant}\nInvoice: ${safeInv}\nDescription: ${safeDesc}\nAmount Due: ${safeAmount}\nDate: ${safeDate}\n${safeNotes ? `Memo: ${safeNotes}\n` : ''}\nPay securely via PayPal Sandbox: ${checkoutUrl}`;

  return { subject, html, text };
}

/**
 * 5. Refund Issued Template
 */
export function buildRefundIssuedTemplate({
  orderRef,
  customerName,
  amountDisplay,
  refundStatus = 'COMPLETED',
  timestamp,
  merchantName = 'PayPal Commerce Merchant'
}) {
  const safeName = customerName ? escapeHtml(customerName) : 'Valued Customer';
  const safeRef = escapeHtml(orderRef);
  const safeAmount = escapeHtml(amountDisplay || '$0.00');
  const safeMerchant = escapeHtml(merchantName);
  const safeDate = formatEmailDate(timestamp);

  const subject = `Refund of ${safeAmount} issued by ${safeMerchant}`;
  const previewText = `A test refund of ${safeAmount} has been credited back in the Sandbox environment.`;

  const html = wrapPayPalLayout({
    title: subject,
    previewText,
    headline: 'You received a refund (Sandbox)',
    subHeadline: `Hello ${safeName}, ${safeMerchant} has processed a test refund of ${safeAmount} for your order.`,
    ctaText: 'View in PayPal Sandbox Activity',
    ctaUrl: 'https://www.sandbox.paypal.com/myaccount/transactions',
    bodyContent: `
      <!-- Hero Amount -->
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="padding: 10px 0 20px 0;">
        <tr>
          <td align="center">
            <div style="font-size: 12px; font-weight: 700; color: #16a34a; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px;">Refund Credited</div>
            <div class="hero-amount" style="font-size: 42px; font-weight: 800; color: #15803d; line-height: 1.1; letter-spacing: -0.02em;">
              +${safeAmount}
            </div>
            <div style="font-size: 13px; color: #64748b; margin-top: 6px;" class="text-muted">
              Order Ref: <span style="font-family: SFMono-Regular, Consolas, Monaco, monospace; font-weight: 600;" class="text-main">${safeRef}</span>
            </div>
          </td>
        </tr>
      </table>

      <!-- Itemized Details -->
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 16px;">
        <tr>
          <td style="padding: 12px 0; font-size: 14px; color: #64748b;" class="text-muted">Merchant</td>
          <td align="right" style="padding: 12px 0; font-size: 14px; font-weight: 600; color: #001435;" class="text-main">${safeMerchant}</td>
        </tr>
        <tr><td colspan="2" style="border-bottom: 1px solid #f1f5f9;" class="hairline"></td></tr>
        <tr>
          <td style="padding: 12px 0; font-size: 14px; color: #64748b;" class="text-muted">Refund Status</td>
          <td align="right" style="padding: 12px 0; font-size: 14px; font-weight: 700; color: #15803d;">COMPLETED (SANDBOX)</td>
        </tr>
        <tr><td colspan="2" style="border-bottom: 1px solid #f1f5f9;" class="hairline"></td></tr>
        <tr>
          <td style="padding: 12px 0; font-size: 14px; color: #64748b;" class="text-muted">Date &amp; Time</td>
          <td align="right" style="padding: 12px 0; font-size: 14px; font-weight: 600; color: #001435;" class="text-main">${safeDate}</td>
        </tr>
      </table>
    `
  });

  const text = `PAYPAL SANDBOX REFUND\n\nHello ${safeName},\n\n${safeMerchant} refunded ${safeAmount} for order ${safeRef}.\nDate: ${safeDate}\n\nPayPal Sandbox Activity: https://www.sandbox.paypal.com/myaccount/transactions`;

  return { subject, html, text };
}

/**
 * 6. Payment Failed Template
 */
export function buildPaymentFailedTemplate({
  orderRef,
  customerName,
  checkoutUrl,
  reason = 'Payment authorization declined',
  timestamp,
  merchantName = 'PayPal Commerce Merchant'
}) {
  const safeName = customerName ? escapeHtml(customerName) : 'Valued Customer';
  const safeRef = escapeHtml(orderRef);
  const safeReason = escapeHtml(reason);
  const safeMerchant = escapeHtml(merchantName);
  const safeDate = formatEmailDate(timestamp);

  const subject = `Payment update for order ${safeRef}`;
  const previewText = `Your test payment to ${safeMerchant} could not be completed.`;

  const html = wrapPayPalLayout({
    title: subject,
    previewText,
    headline: 'Payment authorization unsuccessful',
    subHeadline: `Hello ${safeName}, we were unable to complete your test payment to ${safeMerchant}.`,
    ctaText: 'Retry Payment on PayPal Sandbox',
    ctaUrl: checkoutUrl,
    bodyContent: `
      <!-- Reason Callout -->
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fef2f2; border-left: 3px solid #ef4444; border-radius: 4px; margin-bottom: 20px;">
        <tr>
          <td style="padding: 14px 18px;">
            <div style="font-size: 12px; font-weight: 700; color: #b91c1c; text-transform: uppercase;">Status: Declined (Sandbox)</div>
            <div style="font-size: 14px; color: #991b1b; line-height: 1.4; margin-top: 4px;">${safeReason}</div>
            <div style="font-size: 12px; color: #7f1d1d; margin-top: 6px;">Zero real funds were charged.</div>
          </td>
        </tr>
      </table>

      <!-- Itemized Details -->
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 16px;">
        <tr>
          <td style="padding: 12px 0; font-size: 14px; color: #64748b;" class="text-muted">Order Reference</td>
          <td align="right" style="padding: 12px 0; font-size: 14px; font-weight: 600; color: #001435;" class="text-main">${safeRef}</td>
        </tr>
        <tr><td colspan="2" style="border-bottom: 1px solid #f1f5f9;" class="hairline"></td></tr>
        <tr>
          <td style="padding: 12px 0; font-size: 14px; color: #64748b;" class="text-muted">Date &amp; Time</td>
          <td align="right" style="padding: 12px 0; font-size: 14px; font-weight: 600; color: #001435;" class="text-main">${safeDate}</td>
        </tr>
      </table>
    `
  });

  const text = `PAYPAL SANDBOX PAYMENT DECLINED\n\nHello ${safeName},\n\nPayment to ${safeMerchant} for order ${safeRef} failed in Sandbox.\nReason: ${safeReason}\nDate: ${safeDate}\n\nRetry URL: ${checkoutUrl}`;

  return { subject, html, text };
}

/**
 * 7. Order Status / Shipment Update Template
 */
export function buildOrderStatusChangedTemplate({
  orderRef,
  customerName,
  newStatus,
  carrier,
  trackingNumber,
  trackingUrl,
  timestamp,
  merchantName = 'PayPal Commerce Merchant'
}) {
  const safeName = customerName ? escapeHtml(customerName) : 'Valued Customer';
  const safeRef = escapeHtml(orderRef);
  const safeStatus = escapeHtml(newStatus || 'SHIPPED');
  const safeCarrier = carrier ? escapeHtml(carrier) : 'Standard Shipping';
  const safeTrack = trackingNumber ? escapeHtml(trackingNumber) : null;
  const safeMerchant = escapeHtml(merchantName);
  const safeDate = formatEmailDate(timestamp);

  const subject = `Order update from ${safeMerchant}: ${safeStatus}`;
  const previewText = `Order ${safeRef} status updated to ${safeStatus}. Track delivery.`;

  const html = wrapPayPalLayout({
    title: subject,
    previewText,
    headline: 'Your order is on its way (Sandbox)',
    subHeadline: `Hello ${safeName}, ${safeMerchant} has updated the delivery status for your order.`,
    ctaText: trackingUrl ? 'Track Package' : 'View in PayPal Sandbox Activity',
    ctaUrl: trackingUrl || 'https://www.sandbox.paypal.com/myaccount/transactions',
    bodyContent: `
      <!-- Status Hero -->
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="padding: 10px 0 20px 0;">
        <tr>
          <td align="center">
            <div style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px;" class="text-muted">Shipment Status</div>
            <div class="hero-amount text-main" style="font-size: 36px; font-weight: 800; color: #001435; line-height: 1.1;">
              ${safeStatus}
            </div>
            <div style="font-size: 13px; color: #64748b; margin-top: 6px;" class="text-muted">
              Carrier: <strong class="text-main">${safeCarrier}</strong> ${safeTrack ? `&bull; Tracking: <strong style="font-family: monospace;" class="text-main">${safeTrack}</strong>` : ''}
            </div>
          </td>
        </tr>
      </table>

      <!-- Itemized Details -->
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 16px;">
        <tr>
          <td style="padding: 12px 0; font-size: 14px; color: #64748b;" class="text-muted">Order Reference</td>
          <td align="right" style="padding: 12px 0; font-size: 14px; font-weight: 600; color: #001435;" class="text-main">${safeRef}</td>
        </tr>
        <tr><td colspan="2" style="border-bottom: 1px solid #f1f5f9;" class="hairline"></td></tr>
        <tr>
          <td style="padding: 12px 0; font-size: 14px; color: #64748b;" class="text-muted">Status Update Date</td>
          <td align="right" style="padding: 12px 0; font-size: 14px; font-weight: 600; color: #001435;" class="text-main">${safeDate}</td>
        </tr>
      </table>
    `
  });

  const text = `PAYPAL SANDBOX ORDER UPDATE\n\nHello ${safeName},\n\nOrder: ${safeRef}\nStatus: ${safeStatus}\nCarrier: ${safeCarrier}\n${safeTrack ? `Tracking: ${safeTrack}\n` : ''}\nDate: ${safeDate}`;

  return { subject, html, text };
}

export default {
  escapeHtml,
  formatEmailDate,
  buildPaymentLinkTemplate,
  buildPaymentCapturedTemplate,
  buildRecurringBillingNoticeTemplate,
  buildInvoiceCreatedTemplate,
  buildRefundIssuedTemplate,
  buildPaymentFailedTemplate,
  buildOrderStatusChangedTemplate
};
