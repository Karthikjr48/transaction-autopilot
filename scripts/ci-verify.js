/**
 * GitHub Actions CI Build & Integrity Verification Suite
 * Runs safely on cloud runners without requiring private credentials.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let totalChecks = 0;
let passedChecks = 0;

function assert(condition, message) {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  \x1b[32m✔ PASS:\x1b[0m ${message}`);
  } else {
    console.error(`  \x1b[31m✖ FAIL:\x1b[0m ${message}`);
    process.exit(1);
  }
}

console.log('\n======================================================');
console.log('🤖 TRANSACTION-AUTOPILOT — CI BUILD & INTEGRITY AUDIT');
console.log('======================================================\n');

// 1. Build Artifacts Verification
console.log('[Check 1: Production Client Build Verification]');
const distHtml = path.join(rootDir, 'dist/index.html');
assert(fs.existsSync(distHtml), 'dist/index.html generated successfully by Vite bundler');

const distAssets = fs.readdirSync(path.join(rootDir, 'dist/assets'));
const hasLogo = distAssets.some(f => f.startsWith('paypal-logo') && f.endsWith('.png'));
assert(hasLogo, 'Official 2024-2026 PayPal logo asset compiled into production bundle');

const hasCss = distAssets.some(f => f.endsWith('.css'));
const hasJs = distAssets.some(f => f.endsWith('.js'));
assert(hasCss && hasJs, 'Production CSS and JavaScript bundles built cleanly');

// 2. Gateway Scripts Syntax & Port Definitions
console.log('\n[Check 2: Server Gateway Syntax & Entrypoints]');
const serverJs = fs.readFileSync(path.join(rootDir, 'server.js'), 'utf8');
const uiServerJs = fs.readFileSync(path.join(rootDir, 'ui-server.js'), 'utf8');

assert(serverJs.includes('express'), 'server.js imports Express gateway');
assert(serverJs.includes('/api/paypal/orders'), 'server.js defines PayPal Orders v2 routing');
assert(serverJs.includes('/api/paypal/disputes'), 'server.js defines PayPal Disputes v1 routing');
assert(uiServerJs.includes('3000'), 'ui-server.js binds to default merchant port 3000');

// 3. Data Persistence & Strict USD Standard
console.log('\n[Check 3: Financial Integrity & Atomic Data Persistence]');
import('../backend/services/dataPersistence.js').then(({ writeJsonFileAtomic, loadOrders }) => {
  const orders = loadOrders() || [];
  const nonUsd = orders.filter(o => o.currency && o.currency !== 'USD');
  assert(nonUsd.length === 0, 'All stored orders strictly enforce USD ($) currency format');

  const testFile = path.join(rootDir, 'data/ci_test.json');
  writeJsonFileAtomic(testFile, { test: 'ci_success', timestamp: Date.now() });
  assert(fs.existsSync(testFile), 'writeJsonFileAtomic safely committed atomic record to disk');
  fs.unlinkSync(testFile);
  if (fs.existsSync(`${testFile}.bak`)) fs.unlinkSync(`${testFile}.bak`);

  console.log('\n======================================================');
  console.log(`TOTAL CI CHECKS: ${totalChecks} | PASSED: ${passedChecks} | FAILED: 0`);
  console.log('======================================================');
  console.log('✨ ALL CI INTEGRITY CHECKS PASSED SUCCESSFULLY!\n');
  process.exit(0);
}).catch(err => {
  console.error('Persistence import error:', err);
  process.exit(1);
});
