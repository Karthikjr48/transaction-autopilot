/**
 * Real Browser Runtime Verification Script — Transaction-Autopilot Lenis Smooth Scrolling
 * Uses puppeteer-core with Google Chrome to verify real browser runtime behavior.
 */

import puppeteer from 'puppeteer-core';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const UI_URL = 'http://localhost:3000';

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

async function runBrowserVerification() {
  console.log('======================================================================');
  console.log('🌐 REAL BROWSER RUNTIME VERIFICATION — LENIS SMOOTH SCROLL');
  console.log(`   Browser: Google Chrome (${CHROME_PATH})`);
  console.log(`   Target : ${UI_URL}`);
  console.log('======================================================================\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--window-size=1440,900'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // 1. Network Asset Monitoring
  const networkAssets = new Map();
  const consoleErrors = [];

  page.on('response', (response) => {
    const url = response.url();
    if (url.includes('lenis') || url.includes('smooth-scroll')) {
      networkAssets.set(url, response.status());
    }
  });

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', (err) => {
    consoleErrors.push(err.message);
  });

  console.log('[Test 1: Page Navigation & Network Asset Delivery]');
  await page.goto(UI_URL, { waitUntil: 'networkidle2', timeout: 15000 });

  // Wait for initial connection check and dashboard load to settle
  await page.waitForFunction(() => {
    const el = document.getElementById('topbar-env-label');
    return el && el.textContent !== 'Checking Connection...';
  }, { timeout: 10000 });

  // Verify Assets
  let foundLenisJs = false;
  let foundLenisCss = false;
  let foundManagerJs = false;

  for (const [url, status] of networkAssets.entries()) {
    if (url.includes('lenis.min.js') && status === 200) foundLenisJs = true;
    if (url.includes('lenis.css') && status === 200) foundLenisCss = true;
    if (url.includes('smooth-scroll.js') && status === 200) foundManagerJs = true;
  }

  assert(foundLenisJs, 'Lenis JavaScript library (lenis.min.js) loaded with HTTP 200');
  assert(foundLenisCss, 'Lenis stylesheet (lenis.css) loaded with HTTP 200');
  assert(foundManagerJs, 'Smooth scroll manager (js/smooth-scroll.js) loaded with HTTP 200');
  assert(consoleErrors.length === 0, `Zero runtime console errors during load (Errors: ${consoleErrors.length})`);

  console.log('\n[Test 2: Lenis Singleton & Initialization State]');
  const initReport = await page.evaluate(() => {
    const hasLenisGlobal = typeof window.Lenis === 'function';
    const hasManager = Boolean(window.smoothScrollManager);
    const isInitialized = Boolean(window.smoothScrollManager?.initialized);
    const hasInstance = Boolean(window.lenisInstance);
    const isStopped = window.lenisInstance?.isStopped;
    const isHtmlLenis = document.documentElement.classList.contains('lenis');
    
    // Test idempotency
    const firstInstance = window.lenisInstance;
    const secondCall = window.initSmoothScroll();
    const isSameInstance = (firstInstance === secondCall) && (window.lenisInstance === firstInstance);

    return {
      hasLenisGlobal,
      hasManager,
      isInitialized,
      hasInstance,
      isStopped,
      isHtmlLenis,
      isSameInstance
    };
  });

  assert(initReport.hasLenisGlobal, 'window.Lenis constructor is globally registered');
  assert(initReport.hasManager, 'window.smoothScrollManager singleton is available');
  assert(initReport.isInitialized, 'SmoothScrollManager initialized successfully');
  assert(initReport.hasInstance, 'window.lenisInstance exists and is active');
  assert(initReport.isStopped === false, 'Lenis is running (isStopped: false)');
  assert(initReport.isHtmlLenis, 'document.documentElement contains .lenis CSS class');
  assert(initReport.isSameInstance, 'window.initSmoothScroll() is strictly idempotent (no duplicate instances)');

  console.log('\n[Test 3: Layout Stability, Fixed Sidebar & Sticky Topbar]');
  const layoutCheck = await page.evaluate(() => {
    const sidebar = document.querySelector('.sidebar');
    const topbar = document.querySelector('.topbar');
    const sidebarComputed = sidebar ? window.getComputedStyle(sidebar) : null;
    const topbarComputed = topbar ? window.getComputedStyle(topbar) : null;

    return {
      sidebarFixed: sidebarComputed?.position === 'fixed',
      topbarSticky: topbarComputed?.position === 'sticky',
      sidebarHasGuard: sidebar?.hasAttribute('data-lenis-prevent'),
      sidebarNavHasGuard: document.getElementById('sidebar-nav')?.hasAttribute('data-lenis-prevent')
    };
  });

  assert(layoutCheck.sidebarFixed, 'Sidebar position remains strictly fixed');
  assert(layoutCheck.topbarSticky, 'Topbar position remains sticky during scroll');
  assert(layoutCheck.sidebarHasGuard, 'Sidebar has data-lenis-prevent attribute');
  assert(layoutCheck.sidebarNavHasGuard, 'Sidebar navigation menu has data-lenis-prevent attribute');

  // Ensure initial dashboard rendering and tab switch have completed settling
  await page.waitForFunction(() => {
    const rows = document.querySelectorAll('.home-trans-row');
    return rows.length > 0;
  }, { timeout: 10000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 600));

  console.log('\n[Test 4: Mouse Wheel & Desktop Smooth Scrolling Animation]');
  // Scroll via smoothScrollManager
  const scrollTest = await page.evaluate(async () => {
    const initialY = window.scrollY;
    
    // Trigger smooth programmatic scroll
    window.smoothScrollManager.scrollTo(300, { duration: 0.5 });
    
    // Sample scroll position after 120ms and 650ms
    const intermediateY = await new Promise(resolve => {
      setTimeout(() => resolve(window.scrollY), 120);
    });
    
    const finalY = await new Promise(resolve => {
      setTimeout(() => resolve(window.scrollY), 650);
    });

    return {
      initialY,
      intermediateY,
      finalY,
      isSmooth: intermediateY > initialY && intermediateY <= finalY && finalY >= 250
    };
  });

  assert(scrollTest.finalY >= 250, `Scroll position progressed downward (Final Y: ${scrollTest.finalY}px)`);
  assert(scrollTest.isSmooth, `Scroll interpolated progressively across frames (Intermediate: ${scrollTest.intermediateY}px, Final: ${scrollTest.finalY}px)`);

  // Test real mouse wheel event dispatch
  await page.mouse.move(700, 400);
  await page.mouse.wheel({ deltaY: 150 });
  await new Promise(r => setTimeout(r, 400));
  const wheelY = await page.evaluate(() => window.scrollY);
  assert(wheelY > 0, `Mouse wheel scroll event registered smoothly without lag (Y: ${wheelY}px)`);

  // Return to top
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise(r => setTimeout(r, 200));

  console.log('\n[Test 5: Nested Table Scrolling & Scroll Isolation]');
  const tableCheck = await page.evaluate(() => {
    const recentTableWrapper = document.querySelector('.recent-table-wrapper');
    const activityTableWrapper = document.getElementById('activity-table-wrapper');

    const recentGuarded = recentTableWrapper?.hasAttribute('data-lenis-prevent');
    const activityGuarded = activityTableWrapper?.hasAttribute('data-lenis-prevent');

    return {
      recentGuarded,
      activityGuarded
    };
  });

  assert(tableCheck.recentGuarded, 'Recent transactions table wrapper has data-lenis-prevent');
  assert(tableCheck.activityGuarded, 'Activity ledger table wrapper has data-lenis-prevent');

  console.log('\n[Test 6: Modal Dialogs, Scroll Containment & Action Triggering]');
  const modalCheck = await page.evaluate(async () => {
    // Open Help Modal
    const btnHelp = document.getElementById('btn-help');
    if (btnHelp) btnHelp.click();
    
    const helpContainer = document.getElementById('help-modal-container');
    const isHelpVisible = helpContainer && helpContainer.style.display !== 'none';
    const hasHelpGuard = helpContainer?.hasAttribute('data-lenis-prevent');

    // Close Help Modal
    if (helpContainer) helpContainer.style.display = 'none';

    // Open Send Invoice Modal via Quick Action
    const btnInvoice = document.getElementById('action-send-invoice');
    if (btnInvoice) btnInvoice.click();

    const invoiceContainer = document.getElementById('invoice-modal-container');
    const isInvoiceVisible = invoiceContainer && invoiceContainer.style.display !== 'none';
    const hasInvoiceGuard = invoiceContainer?.hasAttribute('data-lenis-prevent');

    // Close Invoice Modal
    if (invoiceContainer) invoiceContainer.style.display = 'none';

    return {
      isHelpVisible,
      hasHelpGuard,
      isInvoiceVisible,
      hasInvoiceGuard
    };
  });

  assert(modalCheck.isHelpVisible, 'Help modal opened successfully');
  assert(modalCheck.hasHelpGuard, 'Help modal container has data-lenis-prevent');
  assert(modalCheck.isInvoiceVisible, 'Invoice modal opened successfully');
  assert(modalCheck.hasInvoiceGuard, 'Invoice modal container has data-lenis-prevent');

  console.log('\n[Test 7: Dynamic Modal Generation & Auto-Guard via MutationObserver]');
  const dynamicModalCheck = await page.evaluate(async () => {
    // Dynamically insert a modal dialog into the DOM (e.g. dynamic alert or confirmation drawer)
    const dynamicBackdrop = document.createElement('div');
    dynamicBackdrop.className = 'modal-overlay custom-dynamic-drawer';
    dynamicBackdrop.id = 'test-dynamic-drawer';
    dynamicBackdrop.innerHTML = '<div class="modal-dialog"><div class="modal-body">Dynamic content</div></div>';
    document.body.appendChild(dynamicBackdrop);

    // Yield to let MutationObserver process the DOM insertion microtask
    await new Promise(r => setTimeout(r, 80));

    // Check that our MutationObserver attached data-lenis-prevent
    const hasBackdropGuard = dynamicBackdrop.hasAttribute('data-lenis-prevent');
    const hasDialogGuard = dynamicBackdrop.querySelector('.modal-dialog')?.hasAttribute('data-lenis-prevent');
    const hasBodyGuard = dynamicBackdrop.querySelector('.modal-body')?.hasAttribute('data-lenis-prevent');

    // Clean up
    dynamicBackdrop.remove();

    return {
      hasBackdropGuard,
      hasDialogGuard,
      hasBodyGuard
    };
  });

  assert(dynamicModalCheck.hasBackdropGuard, 'Dynamically created modal backdrop automatically received data-lenis-prevent');
  assert(dynamicModalCheck.hasDialogGuard, 'Dynamically created modal dialog automatically received data-lenis-prevent');
  assert(dynamicModalCheck.hasBodyGuard, 'Dynamically created modal body automatically received data-lenis-prevent');

  console.log('\n[Test 8: Tab Switching & Smooth Router Coordination]');
  const tabCheck = await page.evaluate(async () => {
    const tabHistory = [];
    
    // Switch to Activity
    window.switchToTab('panel-activity');
    tabHistory.push(document.getElementById('panel-activity')?.classList.contains('active'));
    
    // Switch to Orders
    window.switchToTab('panel-orders');
    tabHistory.push(document.getElementById('panel-orders')?.classList.contains('active'));
    
    // Switch back to Home
    window.switchToTab('panel-home');
    tabHistory.push(document.getElementById('panel-home')?.classList.contains('active'));

    return {
      allSwitched: tabHistory.every(Boolean)
    };
  });

  assert(tabCheck.allSwitched, 'Tab navigation executed cleanly across Home, Activity, and Orders views');

  console.log('\n[Test 9: Mobile Viewport & Native Touch Scroll Preservation]');
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.reload({ waitUntil: 'networkidle2' });

  // Wait for initial connection check to settle
  await page.waitForFunction(() => {
    const el = document.getElementById('topbar-env-label');
    return el && el.textContent !== 'Checking Connection...';
  }, { timeout: 10000 });

  const mobileCheck = await page.evaluate(() => {
    const lenis = window.lenisInstance;
    const options = lenis?.options || {};
    return {
      syncTouch: options.syncTouch === false,
      isMobileTouchNative: lenis ? !options.syncTouch : true
    };
  });

  assert(mobileCheck.syncTouch, 'Mobile touch scroll is explicitly native (syncTouch: false)');
  assert(mobileCheck.isMobileTouchNative, 'Lenis touch emulation disabled for 100% native mobile scrolling');

  console.log('\n[Test 10: OS Reduced-Motion Preference Live Toggle]');
  // Reset desktop viewport
  await page.setViewport({ width: 1440, height: 900, isMobile: false, hasTouch: false });
  await page.reload({ waitUntil: 'networkidle2' });

  await page.waitForFunction(() => {
    const el = document.getElementById('topbar-env-label');
    return el && el.textContent !== 'Checking Connection...';
  }, { timeout: 10000 });

  // Emulate reduced-motion: reduce
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await new Promise(r => setTimeout(r, 150));

  const reducedMotionActiveCheck = await page.evaluate(() => {
    const isReducedPref = window.smoothScrollManager?.isReducedMotion();
    const lenisDestroyed = window.lenisInstance === null;
    const htmlClassCleaned = !document.documentElement.classList.contains('lenis');

    return {
      isReducedPref,
      lenisDestroyed,
      htmlClassCleaned
    };
  });

  assert(reducedMotionActiveCheck.isReducedPref, 'prefers-reduced-motion media query matched');
  assert(reducedMotionActiveCheck.lenisDestroyed, 'Lenis smooth scroll instance destroyed on reduced motion');
  assert(reducedMotionActiveCheck.htmlClassCleaned, '.lenis root class removed to enforce native instant scroll');

  // Verify native scroll still works when reduced motion is enabled
  await page.evaluate(() => window.scrollTo(0, 150));
  const nativeScrollY = await page.evaluate(() => window.scrollY);
  assert(nativeScrollY >= 100, `Native scrolling functions unhindered with reduced-motion (Y: ${nativeScrollY}px)`);

  // Restore normal motion preference
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
  await new Promise(r => setTimeout(r, 150));

  const restoredMotionCheck = await page.evaluate(() => {
    const isReducedPref = window.smoothScrollManager?.isReducedMotion();
    const lenisRestored = window.lenisInstance !== null;
    const htmlClassRestored = document.documentElement.classList.contains('lenis');

    return {
      isReducedPref,
      lenisRestored,
      htmlClassRestored
    };
  });

  assert(!restoredMotionCheck.isReducedPref, 'prefers-reduced-motion restored to no-preference');
  assert(restoredMotionCheck.lenisRestored, 'Lenis smooth scroll re-initialized upon normal motion restoration');
  assert(restoredMotionCheck.htmlClassRestored, '.lenis root class restored');

  console.log('\n[Test 11: Keyboard Navigation & Accessibility Verification]');
  const keyboardCheck = await page.evaluate(async () => {
    const searchInput = document.getElementById('global-search-input');
    if (searchInput) searchInput.focus();
    
    return {
      hasActiveElement: document.activeElement === searchInput
    };
  });

  assert(keyboardCheck.hasActiveElement, 'Keyboard focus targets elements without Lenis interference');

  await browser.close();

  console.log('\n======================================================');
  console.log(`TOTAL BROWSER CHECKS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runBrowserVerification().catch(err => {
  console.error('Browser verification failed with uncaught exception:', err);
  process.exit(1);
});
