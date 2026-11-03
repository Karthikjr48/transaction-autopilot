/**
 * Test Suite: Premium Merchant Dashboard Redesign & Cookie Consent
 * Validates:
 * 1. Clean Home Page Operational Status Cards & Zero Financial Leakage
 * 2. Activity Table Empty State ("No orders yet — create a new order to get started")
 * 3. Active Catalog Tiers (Zero Dollar Signs / Prices)
 * 4. Cookie Consent Banner & Preferences Modal Markup and Accessibility
 * 5. Cookie Consent Persistence Schema (Strictly Necessary locked, Functional, Analytics, Marketing)
 * 6. Send Payment Link Email Workflow via Brevo SMTP
 * 7. Reduced-Motion Accessibility Rules
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-core';
import { buildPaymentLinkTemplate } from '../backend/services/emailTemplates.js';
import emailService from '../backend/services/emailService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const API_URL = 'http://localhost:5000';
const UI_URL = 'http://localhost:3000';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

let passed = 0;
let failed = 0;

function check(desc, fn) {
  try {
    fn();
    console.log(`  \x1b[32m✔ PASS:\x1b[0m ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  \x1b[31m✖ FAIL:\x1b[0m ${desc} — ${err.message}`);
    failed++;
  }
}

async function requestJson(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch (_) {
    body = text;
  }
  return { status: res.status, headers: res.headers, body, raw: text };
}

console.log('\n======================================================================');
console.log('🎨 PREMIUM DASHBOARD REDESIGN & COOKIE CONSENT VERIFICATION');
console.log('======================================================================\n');

// -------------------------------------------------------------------
// 1. HTML DOM Structure & Cookie Consent Markup
// -------------------------------------------------------------------
console.log('[Check 1: HTML DOM Structure & Cookie Consent Markup]');
const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');

check('index.html contains #cookie-consent-banner with role="dialog"', () => {
  assert(indexHtml.includes('id="cookie-consent-banner"'), 'Cookie banner ID present');
  assert(indexHtml.includes('role="dialog"'), 'Accessible dialog role present');
});

check('Cookie banner includes Accept All, Reject Non-Essential, and Manage Preferences buttons', () => {
  assert(indexHtml.includes('id="btn-cookie-accept-all"'), 'Accept all button present');
  assert(indexHtml.includes('id="btn-cookie-reject-all"'), 'Reject non-essential button present');
  assert(indexHtml.includes('id="btn-cookie-manage-prefs"'), 'Manage preferences button present');
});

check('index.html contains #cookie-preferences-modal with data-lenis-prevent', () => {
  assert(indexHtml.includes('id="cookie-preferences-modal"'), 'Preferences modal ID present');
  assert(indexHtml.includes('data-lenis-prevent'), 'Lenis scroll isolation present on modal');
});

check('Preferences modal includes all 4 required cookie categories', () => {
  assert(indexHtml.includes('Strictly Necessary Cookies'), 'Category 1: Strictly Necessary present');
  assert(indexHtml.includes('Functional &amp; Experience Cookies') || indexHtml.includes('Functional & Experience Cookies'), 'Category 2: Functional present');
  assert(indexHtml.includes('Operational Telemetry &amp; Diagnostics') || indexHtml.includes('Operational Telemetry & Diagnostics'), 'Category 3: Analytics present');
  assert(indexHtml.includes('Communication Preferences'), 'Category 4: Marketing/Communication present');
});

check('Strictly Necessary category toggle is locked and disabled', () => {
  assert(indexHtml.includes('id="cookie-cat-necessary" checked disabled'), 'Necessary toggle is locked and checked');
  assert(indexHtml.includes('cookie-badge-locked'), 'Always Active badge present');
});

check('Sidebar footer contains Cookie Preferences link', () => {
  assert(indexHtml.includes('id="btn-open-cookie-preferences"'), 'Sidebar cookie button present');
  assert(indexHtml.includes('Cookie Preferences'), 'Button text present');
});

// -------------------------------------------------------------------
// 2. Clean Merchant Home Page & Operational Status Cards
// -------------------------------------------------------------------
console.log('\n[Check 2: Clean Merchant Home Page & Operational Status Cards]');

check('Home dashboard metric grid contains 4 balanced operational cards', () => {
  assert(indexHtml.includes('Gateway Status'), 'Card 1: Gateway Status label present');
  assert(indexHtml.includes('Completed Orders'), 'Card 2: Completed Orders label present');
  assert(indexHtml.includes('Awaiting Buyer Action'), 'Card 3: Awaiting Buyer Action label present');
  assert(indexHtml.includes('Active Payment Links'), 'Card 4: Active Payment Links label present');
});

check('Home dashboard middle section features Operational Activity Timeline (no SMTP leaks)', () => {
  assert(indexHtml.includes('Operational Activity Timeline'), 'Timeline header present');
  assert(!indexHtml.includes('Email Notification Activity'), 'Email Notification Activity chart replaced');
  assert(indexHtml.includes('id="btn-home-create-link"'), 'Header Create Payment Link button present');
});

check('Top Products table strictly contains Active Catalog Tiers with ZERO dollar signs', () => {
  assert(indexHtml.includes('Active Catalog Tiers'), 'Catalog tiers header present');
  assert(indexHtml.includes('Enterprise Commerce Plan'), 'Product 1 present');
  assert(indexHtml.includes('SKU: ECP-001'), 'SKU 1 present');
  assert(!indexHtml.includes('$868.00'), 'Fake price $868 eliminated');
  assert(!indexHtml.includes('$558.00'), 'Fake price $558 eliminated');
  assert(!indexHtml.includes('$372.00'), 'Fake price $372 eliminated');
  assert(!indexHtml.includes('$186.00'), 'Fake price $186 eliminated');
});

// -------------------------------------------------------------------
// 3. CSS Design Tokens & Accessibility Verification
// -------------------------------------------------------------------
console.log('\n[Check 3: CSS Design Tokens & Accessibility Verification]');
const merchantCss = fs.readFileSync(path.join(rootDir, 'css', 'merchant.css'), 'utf8');

check('merchant.css defines .table-empty-state styling', () => {
  assert(merchantCss.includes('.table-empty-state'), 'Empty state CSS class defined');
  assert(merchantCss.includes('.empty-icon-wrap'), 'Empty icon wrap defined');
});

check('merchant.css defines .cookie-banner and .cookie-modal-dialog styling', () => {
  assert(merchantCss.includes('.cookie-banner'), 'Cookie banner CSS defined');
  assert(merchantCss.includes('.cookie-modal-dialog'), 'Cookie modal dialog CSS defined');
  assert(merchantCss.includes('.cookie-toggle-wrap'), 'Toggle switch CSS defined');
});

check('merchant.css includes @media (prefers-reduced-motion: reduce) overrides', () => {
  assert(merchantCss.includes('(prefers-reduced-motion: reduce)'), 'Reduced motion media query present');
  assert(merchantCss.includes('animation: none'), 'Animations disabled for reduced motion');
});

// -------------------------------------------------------------------
// 4. Payment Link Email Template & Workflow Verification
// -------------------------------------------------------------------
console.log('\n[Check 4: Payment Link Email Template & Workflow]');

check('buildPaymentLinkTemplate generates secure HTML and text templates', () => {
  const result = buildPaymentLinkTemplate({
    orderRef: 'ORD-998877',
    recipientName: 'Alex Customer',
    itemDescription: 'Annual Software License',
    amountDisplay: '$199.00 USD',
    checkoutUrl: 'https://www.sandbox.paypal.com/checkoutnow?token=TEST_TOKEN_998877',
    timestamp: '2026-10-24T00:00:00Z'
  });

  assert(result.subject.includes('ORD-998877'), 'Subject contains order reference');
  assert(result.html.includes('Complete Your Payment'), 'HTML includes header');
  assert(result.html.includes('Alex Customer'), 'HTML greets customer');
  assert(result.html.includes('Annual Software License'), 'HTML includes description');
  assert(result.html.includes('$199.00 USD'), 'HTML includes amount');
  assert(result.html.includes('TEST_TOKEN_998877'), 'HTML includes checkout token');
  assert(result.text.includes('PAYMENT REQUEST'), 'Plain text contains header');
  assert(result.text.includes('TEST_TOKEN_998877'), 'Plain text includes checkout url');
});

check('buildPaymentLinkTemplate escapes malicious inputs (XSS protection)', () => {
  const result = buildPaymentLinkTemplate({
    orderRef: '<script>alert(1)</script>',
    recipientName: '<b>Hacker</b>',
    itemDescription: '"><img src=x onerror=alert(1)>',
    amountDisplay: '$50.00',
    checkoutUrl: 'https://www.sandbox.paypal.com/checkoutnow?token=SAFE'
  });

  assert(!result.html.includes('<script>'), 'Script tag escaped');
  assert(result.html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'), 'Script tag properly sanitized');
  assert(!result.html.includes('<img'), 'HTML tag escaped');
  assert(result.html.includes('&lt;img'), 'Image tag properly sanitized');
});

check('sendPaymentLinkEmail validates recipient and order before dispatching', async () => {
  // Test invalid input rejection
  const invalidRes = await emailService.sendPaymentLinkEmail({
    order: null,
    recipientEmail: 'invalid-email'
  });
  assert.strictEqual(invalidRes.success, false, 'Invalid inputs rejected');
  assert(invalidRes.error !== undefined, 'Error message returned');
});

// -------------------------------------------------------------------
// 5. Live Server Endpoints & Privacy Verification
// -------------------------------------------------------------------
console.log('\n[Check 5: Live Server Endpoints & Zero Financial Privacy]');

const overviewRes = await requestJson(`${API_URL}/api/merchant/dashboard/overview`);
check('GET /api/merchant/dashboard/overview returns HTTP 200 with operational metrics', () => {
  assert.strictEqual(overviewRes.status, 200);
  assert.strictEqual(overviewRes.body.success, true);
  assert(overviewRes.body.operationalMetrics !== undefined);
  assert(overviewRes.body.totalVolume === undefined, 'Zero-financial: totalVolume omitted');
  assert(overviewRes.body.revenue === undefined, 'Zero-financial: revenue omitted');
  assert(overviewRes.body.amount === undefined, 'Zero-financial: amount omitted');
});

const ordersRes = await requestJson(`${API_URL}/api/merchant/orders`);
check('GET /api/merchant/orders returns masked orders without raw buyer emails or amounts', () => {
  assert.strictEqual(ordersRes.status, 200);
  assert(Array.isArray(ordersRes.body.orders), 'Orders array returned');
  if (ordersRes.body.orders.length > 0) {
    const o = ordersRes.body.orders[0];
    assert(o.amount === undefined, 'Zero-financial: amount omitted');
    assert(o.currency === undefined, 'Zero-financial: currency omitted');
    assert(o.captureId === undefined, 'Zero-financial: captureId omitted');
    if (o.customerEmail) {
      assert(o.customerEmail.includes('•'), 'Buyer email is masked for privacy');
    }
  }
});

// -------------------------------------------------------------------
// 6. Browser Verification: Full Cookie Consent Lifecycle & Enforcement
// -------------------------------------------------------------------
console.log('\n[Check 6: Headless Chrome Cookie Consent Lifecycle & Behavioral Enforcement]');

let browser = null;
try {
  browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // Case 1: First visit with no saved consent
  await page.goto(UI_URL, { waitUntil: 'networkidle2' });
  await page.evaluate(() => localStorage.removeItem('pp_cookie_consent_v1'));
  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 600));

  const firstVisitState = await page.evaluate(() => {
    const banner = document.getElementById('cookie-consent-banner');
    return {
      bannerVisible: banner && banner.style.display !== 'none',
      storedConsent: localStorage.getItem('pp_cookie_consent_v1'),
      hasAnalytics: window.hasConsentFor('analytics')
    };
  });

  check('Case 1: First visit with no saved consent shows banner and keeps optional tracking disabled', () => {
    assert.strictEqual(firstVisitState.bannerVisible, true, 'Cookie banner is visible on first visit');
    assert.strictEqual(firstVisitState.storedConsent, null, 'No consent stored initially');
    assert.strictEqual(firstVisitState.hasAnalytics, false, 'Analytics tracking disabled before consent');
  });

  // Case 2: Accept All
  const acceptAllState = await page.evaluate(() => {
    document.getElementById('btn-cookie-accept-all')?.click();
    const banner = document.getElementById('cookie-consent-banner');
    const stored = JSON.parse(localStorage.getItem('pp_cookie_consent_v1') || '{}');
    return {
      bannerHidden: !banner || banner.style.display === 'none',
      storedNecessary: stored.necessary,
      storedFunctional: stored.functional,
      storedAnalytics: stored.analytics,
      storedMarketing: stored.marketing,
      version: stored.version,
      hasAnalytics: window.hasConsentFor('analytics')
    };
  });

  check('Case 2: Accept All saves all categories as true and hides banner', () => {
    assert.strictEqual(acceptAllState.bannerHidden, true, 'Banner hidden after Accept All');
    assert.strictEqual(acceptAllState.storedNecessary, true, 'Strictly necessary is true');
    assert.strictEqual(acceptAllState.storedFunctional, true, 'Functional is true');
    assert.strictEqual(acceptAllState.storedAnalytics, true, 'Analytics is true');
    assert.strictEqual(acceptAllState.storedMarketing, true, 'Marketing is true');
    assert.strictEqual(acceptAllState.version, '1.0.0', 'Consent version is 1.0.0');
    assert.strictEqual(acceptAllState.hasAnalytics, true, 'Analytics enabled after Accept All');
  });

  // Case 3: Reload and persistence
  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 500));

  const reloadState = await page.evaluate(() => {
    const banner = document.getElementById('cookie-consent-banner');
    return {
      bannerHidden: !banner || banner.style.display === 'none',
      hasConsent: window.hasConsentFor('functional')
    };
  });

  check('Case 3: Stored consent persists across reload without re-displaying banner', () => {
    assert.strictEqual(reloadState.bannerHidden, true, 'Banner remains hidden on reload');
    assert.strictEqual(reloadState.hasConsent, true, 'Stored consent is preserved');
  });

  // Case 4: Reopen preferences from sidebar footer
  const modalOpenState = await page.evaluate(() => {
    document.getElementById('btn-open-cookie-preferences')?.click();
    const modal = document.getElementById('cookie-preferences-modal');
    const funcToggle = document.getElementById('cookie-cat-functional');
    const analToggle = document.getElementById('cookie-cat-analytics');
    return {
      modalVisible: modal && modal.style.display !== 'none',
      functionalChecked: funcToggle ? funcToggle.checked : false,
      analyticsChecked: analToggle ? analToggle.checked : false
    };
  });

  check('Case 4: Reopen preferences opens modal and reflects saved category states', () => {
    assert.strictEqual(modalOpenState.modalVisible, true, 'Preferences modal opened');
    assert.strictEqual(modalOpenState.functionalChecked, true, 'Functional toggle reflects saved state');
    assert.strictEqual(modalOpenState.analyticsChecked, true, 'Analytics toggle reflects saved state');
  });

  // Case 5: Custom category selection (Functional=true, Analytics=false, Marketing=false)
  const customSaveState = await page.evaluate(() => {
    const funcToggle = document.getElementById('cookie-cat-functional');
    const analToggle = document.getElementById('cookie-cat-analytics');
    const markToggle = document.getElementById('cookie-cat-marketing');
    if (funcToggle) funcToggle.checked = true;
    if (analToggle) analToggle.checked = false;
    if (markToggle) markToggle.checked = false;

    document.getElementById('btn-cookie-save-prefs')?.click();

    const stored = JSON.parse(localStorage.getItem('pp_cookie_consent_v1') || '{}');
    const modal = document.getElementById('cookie-preferences-modal');
    return {
      modalClosed: !modal || modal.style.display === 'none',
      functional: stored.functional,
      analytics: stored.analytics,
      marketing: stored.marketing,
      hasAnalytics: window.hasConsentFor('analytics'),
      hasFunctional: window.hasConsentFor('functional')
    };
  });

  check('Case 5: Custom selection accurately saves selected categories and disables unselected', () => {
    assert.strictEqual(customSaveState.modalClosed, true, 'Modal closed on save');
    assert.strictEqual(customSaveState.functional, true, 'Functional saved true');
    assert.strictEqual(customSaveState.analytics, false, 'Analytics saved false');
    assert.strictEqual(customSaveState.marketing, false, 'Marketing saved false');
    assert.strictEqual(customSaveState.hasAnalytics, false, 'Analytics tracking deactivated');
    assert.strictEqual(customSaveState.hasFunctional, true, 'Functional enabled');
  });

  // Case 6: Reject Non-Essential
  const rejectState = await page.evaluate(() => {
    document.getElementById('btn-open-cookie-preferences')?.click();
    document.getElementById('btn-cookie-modal-reject')?.click();
    const stored = JSON.parse(localStorage.getItem('pp_cookie_consent_v1') || '{}');
    return {
      functional: stored.functional,
      analytics: stored.analytics,
      marketing: stored.marketing,
      hasAnalytics: window.hasConsentFor('analytics'),
      hasFunctional: window.hasConsentFor('functional'),
      hasMarketing: window.hasConsentFor('marketing')
    };
  });

  check('Case 6: Reject Non-Essential disables all optional categories', () => {
    assert.strictEqual(rejectState.functional, false, 'Functional is false');
    assert.strictEqual(rejectState.analytics, false, 'Analytics is false');
    assert.strictEqual(rejectState.marketing, false, 'Marketing is false');
    assert.strictEqual(rejectState.hasAnalytics, false, 'hasConsentFor(analytics) is false');
    assert.strictEqual(rejectState.hasFunctional, false, 'hasConsentFor(functional) is false');
  });

  // Case 7: Withdraw consent via window.withdrawCookieConsent()
  const withdrawState = await page.evaluate(() => {
    window.saveCookieConsent({ functional: true, analytics: true, marketing: true });
    window.withdrawCookieConsent();
    const stored = JSON.parse(localStorage.getItem('pp_cookie_consent_v1') || '{}');
    return {
      analytics: stored.analytics,
      functional: stored.functional,
      hasAnalytics: window.hasConsentFor('analytics')
    };
  });

  check('Case 7: withdrawCookieConsent() immediately revokes optional permissions', () => {
    assert.strictEqual(withdrawState.analytics, false, 'Analytics withdrawn');
    assert.strictEqual(withdrawState.functional, false, 'Functional withdrawn');
    assert.strictEqual(withdrawState.hasAnalytics, false, 'hasConsentFor is false');
  });

  // Case 8: Corrupted/invalid stored consent safely handled
  const corruptHandling = await page.evaluate(() => {
    localStorage.setItem('pp_cookie_consent_v1', '{"corrupted": true}');
    const result = window.getStoredCookieConsent();
    const storageAfter = localStorage.getItem('pp_cookie_consent_v1');
    return { result, storageAfter };
  });

  check('Case 8: Corrupted stored consent safely discards bad data and resets to null', () => {
    assert.strictEqual(corruptHandling.result, null, 'Returns null on corrupted record');
    assert.strictEqual(corruptHandling.storageAfter, null, 'Corrupted localStorage item purged');
  });

  // Case 9: Keyboard navigation (Escape key closes preferences modal)
  const escapeKeyHandling = await page.evaluate(async () => {
    window.openCookiePreferencesModal();
    const modalBefore = document.getElementById('cookie-preferences-modal')?.style.display;
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    const modalAfter = document.getElementById('cookie-preferences-modal')?.style.display;
    return { modalBefore, modalAfter };
  });

  check('Case 9: Pressing Escape key closes preferences modal', () => {
    assert.strictEqual(escapeKeyHandling.modalBefore, 'flex', 'Modal opened before Escape');
    assert.strictEqual(escapeKeyHandling.modalAfter, 'none', 'Modal closed after Escape');
  });

  await browser.close();
} catch (err) {
  if (browser) await browser.close();
  console.error('  ✖ Browser verification error:', err.message);
  failed++;
}

// -------------------------------------------------------------------
// 7. Merchant Navigation & Information Separation Verification
// -------------------------------------------------------------------
console.log('\n[Check 7: Merchant Navigation & Information Separation]');

check('Sidebar navigation contains only merchant links and excludes developer links', () => {
  assert(indexHtml.includes('id="nav-item-home"'), 'Overview link present');
  assert(indexHtml.includes('id="nav-item-orders"'), 'Orders link present');
  assert(indexHtml.includes('id="nav-item-transactions"'), 'Transactions link present');
  assert(indexHtml.includes('id="nav-item-checkout"'), 'Payment Links link present');
  assert(indexHtml.includes('id="nav-item-invoices"'), 'Invoices link present');
  assert(indexHtml.includes('id="nav-item-customers"'), 'Customers link present');
  assert(indexHtml.includes('id="nav-item-help"'), 'Help link present');

  // Verify sidebar nav excludes developer/admin links
  const sidebarNavMatch = indexHtml.match(/<nav class="sidebar-nav"[\s\S]*?<\/nav>/);
  assert(sidebarNavMatch, 'Sidebar nav element found');
  const sidebarContent = sidebarNavMatch[0];
  assert(!sidebarContent.includes('panel-developer'), 'Developer panel unlinked in merchant nav');
  assert(!sidebarContent.includes('panel-sandbox'), 'Sandbox config unlinked in merchant nav');
  assert(!sidebarContent.includes('panel-recovery'), 'Recovery internals unlinked in merchant nav');
});

check('Merchant views in index.html strictly omit Brevo SMTP, Groq, qwen, and fake prices', () => {
  assert(!indexHtml.includes('Brevo SMTP relay'), 'Brevo SMTP relay text eliminated from merchant views');
  assert(!indexHtml.includes('Groq <code>qwen/qwen3.8-27b</code> Online'), 'Groq online text eliminated from merchant views');
  assert(!indexHtml.includes('$31.00 USD'), 'Fake prices eliminated from catalog cards');
});

check('Dedicated Invoices panel (#panel-invoices) exists with empty state', () => {
  assert(indexHtml.includes('id="panel-invoices"'), 'panel-invoices exists in DOM');
  assert(indexHtml.includes('Merchant Invoicing'), 'Invoices view title present');
  assert(indexHtml.includes('id="invoices-empty-state"'), 'Invoices empty state present');
  assert(indexHtml.includes('id="btn-invoices-panel-create"'), 'Create Invoice button present');
});

check('Dedicated Orders panel (#panel-orders) contains orders table and empty state', () => {
  assert(indexHtml.includes('id="panel-orders"'), 'panel-orders exists in DOM');
  assert(indexHtml.includes('id="orders-empty-state"'), 'Orders empty state present');
  assert(indexHtml.includes('id="orders-table-wrapper"'), 'Orders table wrapper present');
});

// -------------------------------------------------------------------
// 8. Negative Security Tests (Authorization & Asset Protection)
// -------------------------------------------------------------------
console.log('\n[Check 8: Negative Security Tests (Authorization & Asset Protection)]');

const unauthAnalyze = await requestJson(`${API_URL}/api/agent/analyze`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ orderId: 'FAKE-123' })
});
check('Unauthenticated request to /api/agent/analyze returns HTTP 401', () => {
  assert.strictEqual(unauthAnalyze.status, 401, 'HTTP 401 Unauthorized');
});

const spoofedRoleAnalyze = await requestJson(`${API_URL}/api/agent/analyze`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-client-role': 'operations'
  },
  body: JSON.stringify({ orderId: 'FAKE-123' })
});
check('Client-supplied role header x-client-role without token is rejected with HTTP 401', () => {
  assert.strictEqual(spoofedRoleAnalyze.status, 401, 'HTTP 401 Unauthorized');
});

const blockedEnv = await requestJson(`${UI_URL}/.env`);
check('Direct request for /.env on Port 3000 returns HTTP 403 Forbidden', () => {
  assert.strictEqual(blockedEnv.status, 403, 'HTTP 403 Forbidden');
});

const blockedServer = await requestJson(`${UI_URL}/server.js`);
check('Direct request for /server.js on Port 3000 returns HTTP 403 Forbidden', () => {
  assert.strictEqual(blockedServer.status, 403, 'HTTP 403 Forbidden');
});

// -------------------------------------------------------------------
// Summary
// -------------------------------------------------------------------
console.log('\n======================================================================');
console.log(`REDESIGN & COOKIE CONSENT SUMMARY: ${passed} Passed | ${failed} Failed`);
console.log('======================================================================\n');

process.exitCode = failed > 0 ? 1 : 0;
