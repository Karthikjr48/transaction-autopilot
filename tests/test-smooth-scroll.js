/**
 * Transaction-Autopilot — Lenis Smooth Scrolling Verification Test Suite
 * Repository: https://github.com/darkroomengineering/lenis
 * 
 * Validates:
 * 1. Package Installation & Asset Serving (lenis.min.js, lenis.css, smooth-scroll.js)
 * 2. HTML Integration & Scroll Isolation Guards (data-lenis-prevent on sidebar, tables, modals)
 * 3. CSS Overrides & Reduced-Motion Accessibility Rules
 * 4. Restrained Configuration Parameters (duration, lerp, syncTouch, respectReducedMotion)
 * 5. Lifecycle Hooks & Tab-Switching Coordination
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const UI_PORT = process.env.UI_PORT || 3000;
const UI_URL = `http://localhost:${UI_PORT}`;

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
console.log('LENIS SMOOTH SCROLL INTEGRATION TEST SUITE');
console.log('======================================================\n');

// ----------------------------------------------------------------------
// Suite 1: Package Installation & Asset Serving
// ----------------------------------------------------------------------
console.log('[Suite 1: Package Installation & Asset Serving]');
try {
  const pkgJsonPath = path.join(ROOT_DIR, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
  assert(Boolean(pkg.dependencies && pkg.dependencies.lenis), 'package.json lists lenis dependency');

  const lenisDistJs = path.join(ROOT_DIR, 'node_modules/lenis/dist/lenis.min.js');
  const lenisDistCss = path.join(ROOT_DIR, 'node_modules/lenis/dist/lenis.css');
  const smoothScrollJs = path.join(ROOT_DIR, 'js/smooth-scroll.js');

  assert(fs.existsSync(lenisDistJs), 'node_modules/lenis/dist/lenis.min.js exists');
  assert(fs.existsSync(lenisDistCss), 'node_modules/lenis/dist/lenis.css exists');
  assert(fs.existsSync(smoothScrollJs), 'js/smooth-scroll.js exists');

  // Verify UI Server Serves Assets with HTTP 200
  const jsRes = await fetch(`${UI_URL}/node_modules/lenis/dist/lenis.min.js`);
  assert(jsRes.status === 200, `UI Server serves lenis.min.js with HTTP 200 (Got: ${jsRes.status})`);

  const cssRes = await fetch(`${UI_URL}/node_modules/lenis/dist/lenis.css`);
  assert(cssRes.status === 200, `UI Server serves lenis.css with HTTP 200 (Got: ${cssRes.status})`);

  const managerRes = await fetch(`${UI_URL}/js/smooth-scroll.js`);
  assert(managerRes.status === 200, `UI Server serves js/smooth-scroll.js with HTTP 200 (Got: ${managerRes.status})`);
} catch (err) {
  assert(false, `Suite 1 error: ${err.message}`);
}

// ----------------------------------------------------------------------
// Suite 2: HTML Integration & Scroll Isolation Guards
// ----------------------------------------------------------------------
console.log('\n[Suite 2: HTML Integration & Scroll Isolation Guards]');
try {
  const indexHtml = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');

  assert(indexHtml.includes('node_modules/lenis/dist/lenis.css'), 'index.html links lenis.css stylesheet');
  assert(indexHtml.includes('node_modules/lenis/dist/lenis.min.js'), 'index.html loads lenis.min.js script');
  assert(indexHtml.includes('js/smooth-scroll.js'), 'index.html loads js/smooth-scroll.js manager');

  // Scroll Isolation Guards (data-lenis-prevent)
  assert(indexHtml.includes('<aside class="sidebar" data-lenis-prevent>'), 'Sidebar element has data-lenis-prevent guard');
  assert(indexHtml.includes('id="sidebar-nav" data-lenis-prevent'), 'Sidebar nav list has data-lenis-prevent guard');
  assert(indexHtml.includes('class="recent-table-wrapper" data-lenis-prevent'), 'Recent table wrapper has data-lenis-prevent guard');
  assert(indexHtml.includes('id="activity-table-wrapper" class="pp-card" style="padding:0;overflow:hidden;" data-lenis-prevent'), 'Activity ledger table has data-lenis-prevent guard');
  assert(indexHtml.includes('id="capture-modal-container" data-lenis-prevent'), 'Capture modal container has data-lenis-prevent guard');
  assert(indexHtml.includes('id="notifications-modal-container" style="display:none;" data-lenis-prevent'), 'Notifications modal container has data-lenis-prevent guard');
  assert(indexHtml.includes('id="invoice-modal-container" style="display:none;" data-lenis-prevent'), 'Invoice modal container has data-lenis-prevent guard');
  assert(indexHtml.includes('id="help-modal-container" style="display:none;" data-lenis-prevent'), 'Help modal container has data-lenis-prevent guard');
} catch (err) {
  assert(false, `Suite 2 error: ${err.message}`);
}

// ----------------------------------------------------------------------
// Suite 3: CSS Behavior & Accessibility Safeguards
// ----------------------------------------------------------------------
console.log('\n[Suite 3: CSS Behavior & Accessibility Safeguards]');
try {
  const baseCss = fs.readFileSync(path.join(ROOT_DIR, 'css/base.css'), 'utf8');

  assert(baseCss.includes('html.lenis'), 'base.css defines html.lenis root styling');
  assert(baseCss.includes('scroll-behavior: auto !important;'), 'base.css disables browser native smooth-scroll when Lenis is active');
  assert(baseCss.includes('@media (prefers-reduced-motion: reduce)'), 'base.css contains prefers-reduced-motion media query');
  assert(baseCss.includes('overscroll-behavior: contain;'), 'base.css enforces overscroll-behavior: contain for guarded elements');
} catch (err) {
  assert(false, `Suite 3 error: ${err.message}`);
}

// ----------------------------------------------------------------------
// Suite 4: Restrained Configuration & Fintech Principles
// ----------------------------------------------------------------------
console.log('\n[Suite 4: Restrained Configuration & Fintech Principles]');
try {
  const managerCode = fs.readFileSync(path.join(ROOT_DIR, 'js/smooth-scroll.js'), 'utf8');

  assert(managerCode.includes('duration: 0.85'), 'Duration is restrained to 0.85s (snappy, no floatiness)');
  assert(managerCode.includes('lerp: 0.1'), 'Lerp is configured at 0.1 for high-precision fintech feel');
  assert(managerCode.includes('syncTouch: false'), 'Touch scrolling remains 100% native (syncTouch: false)');
  assert(managerCode.includes('respectReducedMotion: true'), 'Respects user OS reduced-motion preference (respectReducedMotion: true)');
  assert(managerCode.includes('autoRaf: true'), 'Utilizes internal autoRaf to prevent conflicting animation loops');
  assert(managerCode.includes('allowNestedScroll: true'), 'Allows native nested scrolling inside tables and modals');
  assert(managerCode.includes('initSmoothScroll'), 'Provides window.initSmoothScroll lifecycle function');
  assert(managerCode.includes('destroySmoothScroll'), 'Provides window.destroySmoothScroll cleanup function');
} catch (err) {
  assert(false, `Suite 4 error: ${err.message}`);
}

// ----------------------------------------------------------------------
// Suite 5: Application Coordination (Tab Switching & Dynamic Modals)
// ----------------------------------------------------------------------
console.log('\n[Suite 5: Application Coordination]');
try {
  const appJs = fs.readFileSync(path.join(ROOT_DIR, 'js/app.js'), 'utf8');

  assert(appJs.includes('window.smoothScrollManager.scrollTo'), 'switchToTab coordinates with smoothScrollManager');
  assert(appJs.includes('id="active-capture-modal-backdrop" data-lenis-prevent'), 'Dynamic capture modal backdrop contains data-lenis-prevent');
  assert(appJs.includes('id="active-tracking-modal-backdrop" data-lenis-prevent'), 'Dynamic tracking modal backdrop contains data-lenis-prevent');
} catch (err) {
  assert(false, `Suite 5 error: ${err.message}`);
}

console.log('\n======================================================');
console.log(`TOTAL CHECKS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log('======================================================\n');

if (failed > 0) {
  process.exitCode = 1;
} else {
  process.exitCode = 0;
}
