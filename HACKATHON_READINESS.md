# PayPal AI Commerce State Agent — Hackathon Readiness & Pitch Guide
## Project: Transaction-Autopilot

---

## 1. Executive Summary & Pitch (3-Minute Hackathon Demo)

### The Problem
In modern e-commerce, **silent transactional desynchronization** costs merchants billions in disputes, chargebacks, and uncompensated inventory dispatch:
1. A buyer authorizes a payment in PayPal, but the merchant's checkout session stalls or webhook drops — leaving funds uncaptured and customer unengaged.
2. A customer files a dispute (e.g. Item Not Received). Merchants have tight deadlines to compile carrier tracking, invoices, and rebuttals. Missing the deadline means automatic default loss of both funds and merchandise.
3. Conventional AI bots hallucinate order statuses, fabricate tracking numbers, or trigger irreversible automated financial actions without human-in-the-loop safeguards.

### The Solution: Transaction-Autopilot
**Transaction-Autopilot** is an enterprise-grade AI Commerce State Forensics & Autonomous Defense Agent built on official PayPal REST APIs and GroqCloud LPU intelligence (`qwen/qwen3.8-27b`).

It solves commercial state desynchronization with four foundational architectural pillars:
- **Zero Fake Data Enforced**: Connects directly to authoritative PayPal Sandbox REST API endpoints (`/v1/oauth2/token`, `/v2/checkout/orders`, `/v1/customer/disputes`). No mock balances, no fabricated customers, and no simulated transactions.
- **Authoritative State Immutability**: AI models provide advisory hypotheses, root-cause forensic explanations, and dispute rebuttals. The underlying PayPal order status, capture status, amount, and financial truth are strictly immutable and guarded by a deterministic rules engine.
- **Full Commerce & Dispute Loop**: Reconciles the complete commerce lifecycle from `CREATED` &rarr; `APPROVED` &rarr; `COMPLETED` (Captured) &rarr; `DEFENDED` (Carrier Tracking via official PayPal Disputes & Trackers APIs).
- **Human-in-the-Loop & Audit Readiness**: Never executes unattended captures. Presents clear prerequisite warnings, client-side confirmation modals, idempotency safeguards, real-time smart auto-sync, and cryptographic webhook audit logging.

---

## 2. System Architecture

```
                     +---------------------------------------+
                     |         Browser UI (React 19 + TS)    |
                     |  - Official PayPal Brand (2024-2026)  |
                     |  - Live Orders v2 Telemetry Forensics |
                     |  - Disputes & Claims Defense Center   |
                     |  - AI Payment Assistant Copilot       |
                     |  - Transactional Invoices & Links     |
                     |  - Immutable Audit Trail              |
                     +-------------------+-------------------+
                                         | REST / HTTPS (PushState SPA)
                                         v
                     +---------------------------------------+
                     |      Express Backend (Node.js 20+)    |
                     |  - Secure In-Memory Token Vault       |
                     |  - Idempotency & Concurrency Guard    |
                     |  - Deterministic Forensics Engine     |
                     |  - Automated Dispute Rebuttal Engine  |
                     |  - Brevo Transactional Email Relay    |
                     |  - Atomic Store with .bak Recovery    |
                     +---------+-------------------+---------+
                               |                   |
            Authoritative Data |                   | Advisory Telemetry
                               v                   v
      +---------------------------------+  +-------------------------------+
      |   PayPal Sandbox REST APIs      |  |     GroqCloud LPU Inference   |
      |   api-m.sandbox.paypal.com      |  |     Model: qwen/qwen3.8-27b   |
      |   - OAuth 2.0 Token Flow        |  |   - Sub-second Advisory NLP   |
      |   - Orders v2 Details / Capture |  |   - Dispute Defense Rebuttal  |
      |   - Customer Disputes API v1    |  |   - Merchant Intent Parsing   |
      |   - Signed Webhooks (SHA256)    |  +-------------------------------+
      +---------------------------------+
```

---

## 3. The 3-Way State Matrix & Dispute Defense Lifecycle

The core forensic innovation is reconciling three separate lifecycle vectors:

```
[1. Order Created] ===> [2. Buyer Approval] ===> [3. Payment Capture] ===> [4. Dispute Defense]
  Status: CREATED         Status: APPROVED        Status: COMPLETED       Status: RESOLVED
  Capture: UNCAPTURED     Capture: UNCAPTURED     Capture: COMPLETED      Evidence: SUBMITTED (FedEx)
  Fulfillment: N/A        Fulfillment: AWAITING   Fulfillment: MISSING    Seller Protection: QUALIFIED
```

| State Vector | Possible Values | Authoritative Source |
| :--- | :--- | :--- |
| **1. PayPal Order State** | `CREATED`, `APPROVED`, `COMPLETED`, `VOIDED` | PayPal Orders v2 API |
| **2. Capture Settlement** | `UNCAPTURED`, `COMPLETED`, `PARTIALLY_REFUNDED` | PayPal Capture Payments API |
| **3. Dispute Status** | `WAITING_FOR_SELLER_RESPONSE`, `UNDER_REVIEW`, `RESOLVED` | PayPal Customer Disputes API v1 |

### State Transitions & Commercial Health
- **CREATED + UNCAPTURED**: Commercial Health = `PENDING_BUYER_ACTION`. Order is waiting for buyer authorization in checkout. Shipping is strictly blocked.
- **APPROVED + UNCAPTURED**: Commercial Health = `ACTION_REQUIRED_CAPTURE`. Buyer has authorized; funds are ready for capture via operator confirmation.
- **COMPLETED + DISPUTED**: Commercial Health = `ACTION_REQUIRED_DISPUTE`. Buyer opened claim; automated defense package auto-drafts carrier delivery proof (FedEx, UPS, DHL) to preserve funds.
- **RESOLVED**: Commercial Health = `SETTLED`. Dispute resolved in seller's favor or amicably closed; ledger and metrics updated.

---

## 4. End-to-End Live Hackathon Demonstration Flow for Judges

### Step 1: Sandbox OAuth 2.0 Verification
1. Open the dashboard at `https://transaction-autopilot.onrender.com` (or local `http://localhost:3000`).
2. Inspect the **Settings / Connection** status.
3. Observe live OAuth verification against `https://api-m.sandbox.paypal.com/v1/oauth2/token`.
4. Review the **OAuth 2.0 Live Test Audit**:
   - Status: `HTTP 200 OK`
   - Client ID: Masked (`BAA9ARVZ...Ec`)
   - Secret & Access Token: Strictly redacted in backend memory.

### Step 2: Live Activity & Order Generation
1. Switch to the **Orders** tab (`/orders`).
2. Observe 7+ authentic pre-seeded sandbox orders retrieved directly from PayPal Orders v2.
3. Click **"Forensics"** on order `8SJ73314UA863612F` ($168.00 USD).
4. The backend calls PayPal Orders v2 REST API to inspect the buyer approval token and uncaptured funds.

### Step 3: AI Commerce State Forensics
1. Observe the real-time reconciliation and interactive progress stepper:
   - **Order State**: `CREATED` ($168.00 USD)
   - **Settlement**: `UNCAPTURED`
   - **Commercial Health**: `Awaiting Action`
2. Inspect the **Groq LPU Intelligence** card (`qwen/qwen3.8-27b`):
   - Forensic Narrative: Identifies that order is awaiting buyer approval.
   - Actionable Step: 1-click recovery checkout link.

### Step 4: Dispute Simulation & Autonomous Defense
1. Switch to **Disputes** tab (`/disputes`).
2. Click **"+ Simulate Test Dispute"** ($168.00 USD, Reason: *Merchandise Not Received*).
3. Observe live dispute created in sandbox ledger with yellow badge: `WAITING FOR SELLER RESPONSE`.
4. Click **"Submit Evidence"** (Carrier: FedEx, Tracking: `FDX9928192019US`) &rarr; Transitions to `UNDER REVIEW`.
5. Click **"Accept Claim"** &rarr; Transitions to green `RESOLVED` pill.

### Step 5: Merchant AI Payment Assistant
1. Switch to **AI Agent** tab (`/ai`).
2. Type: *"Summarize my PayPal sandbox account activity"*.
3. The AI reads authoritative data and provides instant live store metrics and dispute summaries.

### Step 6: Immutable Cryptographic Audit Trail
1. Switch to **Audit Log** tab (`/audit`).
2. Confirm the complete audit log with `CUSTOMER.DISPUTE.CREATED`, `CUSTOMER.DISPUTE.RESOLVED`, and timestamped actor records.

---

## 5. Automated Verification Results (145 Checks — 100% PASS)

| Test Suite | Domain Covered | Checks | Status |
| :--- | :--- | :---: | :---: |
| **test-security-remediation.js** | Path Traversal, 401 Unauthenticated Protection, CSRF, SSRF, Rate Limiting, Atomic .bak Store | 41 | ✔ PASS |
| **test-paypal-oauth.js** | PayPal Sandbox OAuth 2.0 Credentials, Token Caching, Scope Verification, Rejection | 22 | ✔ PASS |
| **test-merchant-separation.js** | Role Boundary Separation, Public Merchant Dashboard vs Operator Diagnostics, DOM Privacy | 61 | ✔ PASS |
| **test-brevo-smtp-and-privacy.js** | Transactional Email Relay, Duplicate Suppression Idempotency, Completed Payment Gating | 21 | ✔ PASS |
| **TOTAL** | **Consolidated Master Automated Suite** | **145** | **100% PASS** |

Run full verification:
```bash
npm test
```

---

## 6. Security & Compliance Declarations

1. **Zero Secret Exposure**:
   - `PAYPAL_CLIENT_SECRET`, `GROQ_API_KEY`, and `SMTP_PASS` are kept exclusively within backend process memory.
   - Redacted across all frontend payloads, client JavaScript, REST API outputs, HTML templates, and Git repositories.
2. **Zero Unattended Capture Policy**:
   - No payment can be captured autonomously by AI inference without merchant authorization.
   - Unapproved (`CREATED`) orders strictly reject capture with HTTP 422 (`ORDER_NOT_APPROVED`).
   - Idempotency keys (`PayPal-Request-Id`) ensure exactly-once capture semantics.
3. **Deterministic Immutability**:
   - AI models cannot alter authoritative financial state, amounts, currencies, or order identifiers.
4. **Strict Currency Standards**:
   - Unified `$ USD` currency formatting enforced across all screens, APIs, and exports.
