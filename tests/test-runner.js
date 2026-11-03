/**
 * Transaction-Autopilot — Automated Test Runner
 * Headless ES Module validation for store mutations, metrics math, and compliance logging
 */

import { INITIAL_TRANSACTIONS, INITIAL_APPROVALS, INITIAL_AUDIT_LOGS } from '../js/data.js';
import { store } from '../js/state.js';

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

console.log('\n========================================');
console.log('Transaction-Autopilot — Test Suite');
console.log('========================================\n');

// 1. Data Integrity Tests
console.log('[Test Suite 1: Data Integrity]');
assert(INITIAL_TRANSACTIONS.length >= 8, `Expected at least 8 transactions, found ${INITIAL_TRANSACTIONS.length}`);
assert(INITIAL_APPROVALS.length >= 3, `Expected at least 3 approval items, found ${INITIAL_APPROVALS.length}`);
assert(INITIAL_AUDIT_LOGS.length >= 4, `Expected at least 4 audit log entries, found ${INITIAL_AUDIT_LOGS.length}`);

// 2. Flagship Scenario Validation
console.log('\n[Test Suite 2: Flagship Scenario TRX-9042]');
const flagship = INITIAL_TRANSACTIONS.find(t => t.id === 'TRX-9042');
assert(!!flagship, 'Flagship transaction TRX-9042 exists in dataset');
assert(flagship.paypalStatus === 'COMPLETED', 'TRX-9042 PayPal status is COMPLETED');
assert(flagship.merchantStatus === 'CREATED', 'TRX-9042 Merchant status is CREATED');
assert(flagship.fulfillmentStatus === 'NOT_DETECTED', 'TRX-9042 Fulfillment status is NOT_DETECTED');
assert(flagship.overallHealth === 'CRITICAL', 'TRX-9042 Overall health is CRITICAL');
assert(flagship.aiDiagnosis && flagship.aiDiagnosis.confidence >= 90, 'TRX-9042 has high-confidence AI diagnosis');
assert(flagship.aiDiagnosis.verifiedFacts.length > 0, 'TRX-9042 has documented verified facts');
assert(flagship.aiDiagnosis.hypotheses.length > 0, 'TRX-9042 has documented root-cause hypotheses');

// 3. KPI Metrics Math
console.log('\n[Test Suite 3: Dashboard Metrics Math]');
const metrics = store.getDashboardMetrics();
const expectedVolume = store.transactions.reduce((acc, t) => acc + t.amount, 0);
assert(metrics.totalVolume === expectedVolume, `Total volume correctly computed: $${metrics.totalVolume}`);
assert(metrics.totalCount === store.transactions.length, `Total transaction count matches store count`);
assert(metrics.pendingApprovalsCount === 3, `Pending approvals count initially 3`);

// 4. Human Approval Workflow Execution
console.log('\n[Test Suite 4: Human-in-the-Loop Approval Mutation]');
const initialAuditLength = store.auditLogs.length;
const approveResult = store.approveAction('APP-101', 'Test operator sign-off');
assert(approveResult.success === true, 'Approval APP-101 executed successfully');

const app101 = store.approvals.find(a => a.id === 'APP-101');
assert(app101.status === 'APPROVED', 'Approval item status updated to APPROVED');
assert(app101.operatorNote === 'Test operator sign-off', 'Operator note recorded accurately');

const trx9042 = store.getTransactionById('TRX-9042');
assert(trx9042.fulfillmentStatus === 'DISPATCH_QUEUED', 'Transaction TRX-9042 fulfillment status updated to DISPATCH_QUEUED');
assert(store.auditLogs.length === initialAuditLength + 1, 'Audit log length incremented by 1');
assert(store.auditLogs[0].action === 'ACTION_APPROVED', 'Audit log prepended with ACTION_APPROVED');

// 5. Human Rejection Workflow Execution
console.log('\n[Test Suite 5: Human-in-the-Loop Rejection]');
const rejectResult = store.rejectAction('APP-102', 'Dispute already handled offline');
assert(rejectResult.success === true, 'Rejection APP-102 executed successfully');

const app102 = store.approvals.find(a => a.id === 'APP-102');
assert(app102.status === 'REJECTED', 'Approval item status updated to REJECTED');
assert(store.auditLogs[0].action === 'ACTION_REJECTED', 'Audit log prepended with ACTION_REJECTED');

console.log('\n========================================');
console.log(`Results: ${passed} Passed, ${failed} Failed`);
console.log('========================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
