/**
 * Master Automated Test Runner — Transaction-Autopilot
 * Executes all 6 test suites sequentially and provides a consolidated summary report.
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const suites = [
  { name: 'Store Mutations & Approval Workflows', file: 'test-runner.js' },
  { name: 'PayPal Sandbox OAuth 2.0 Credentials Flow', file: 'test-paypal-oauth.js' },
  { name: 'PayPal Orders v2 & AI State Forensics', file: 'test-paypal-orders.js' },
  { name: 'Groq AI Intelligence (qwen/qwen3.8-27b)', file: 'test-groq-intelligence.js' },
  { name: 'Payment Capture & Compliance Audit Reports', file: 'test-paypal-capture-and-reports.js' },
  { name: 'PayPal Merchant Portal Enterprise Features', file: 'test-merchant-portal-features.js' },
  { name: 'Master Merchant Dashboard & API Integrity', file: 'test-dashboard-comprehensive.js' },
  { name: 'Lenis Smooth Scrolling & Accessibility Guardrails', file: 'test-smooth-scroll.js' },
  { name: 'Runtime & Payment Safety Audit (Browser + Sandbox)', file: 'test-runtime-and-payment-safety.js' },
  { name: 'Merchant & Backend Operations Separation (Clean UI & Technical Console)', file: 'test-merchant-separation.js' },
  { name: 'Complete Project Cleanup, Port Separation, Zero-Fake-Data & Invoicing', file: 'test-audit-and-zero-fake-data.js' },
  { name: 'Brevo SMTP Integration & Merchant Dashboard Privacy Verification', file: 'test-brevo-smtp-and-privacy.js' },
  { name: 'Security Hardening & Server Restart Persistence Audit', file: 'test-security-and-persistence-audit.js' },
  { name: 'Complete Security Remediation & Cookie/Session Protection', file: 'test-security-remediation.js' },
  { name: 'Premium Merchant Dashboard Redesign & Cookie Consent', file: 'test-redesign-and-cookie-consent.js' },
  { name: 'Login, Operator Console, CSRF Defense & Role Segregation', file: 'test-login-and-operator-console.js' }
];

console.log('======================================================================');
console.log('🚀 TRANSACTION-AUTOPILOT — MASTER AUTOMATED TEST SUITE');
console.log('   Target: PayPal Sandbox + Groq AI Intelligence + Forensics Engine');
console.log('======================================================================\n');

let totalPassed = 0;
let totalFailed = 0;
let suitesPassed = 0;
let suitesFailed = 0;

for (const suite of suites) {
  console.log(`\n----------------------------------------------------------------------`);
  console.log(`▶ Executing Suite: ${suite.name} (${suite.file})`);
  console.log(`----------------------------------------------------------------------`);

  const filePath = path.join(__dirname, suite.file);
  const exitCode = await new Promise((resolve) => {
    const child = spawn(process.execPath, [filePath], {
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '..')
    });
    child.on('exit', (code) => resolve(code || 0));
  });

  if (exitCode === 0) {
    suitesPassed++;
  } else {
    suitesFailed++;
  }
}

console.log('\n======================================================================');
console.log('🏁 MASTER TEST RUNNER SUMMARY');
console.log('======================================================================');
console.log(`Suites Passed: ${suitesPassed} / ${suites.length}`);
console.log(`Suites Failed: ${suitesFailed} / ${suites.length}`);
console.log('======================================================================\n');

if (suitesFailed > 0) {
  process.exit(1);
} else {
  console.log('✨ ALL AUTOMATED CHECKS PASSED PERFECTLY!\n');
  process.exit(0);
}
