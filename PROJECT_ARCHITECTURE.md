# Project Architecture — Transaction-Autopilot

## 1. System Vision & Architecture

**Transaction Autopilot** is an autonomous reliability, dispute defense, and payment recovery layer for online merchants utilizing PayPal.

### The Problem It Solves:
In modern eCommerce architectures, the payment gateway (PayPal) and the downstream merchant fulfillment systems (Shopify, WooCommerce, ERP, 3PL Warehouses) operate via asynchronous webhooks and decoupled job queues.
- **The Failure Mode**: A PayPal checkout stalls, or an uncaptured authorization expires, or a buyer dispute is filed and times out due to manual evidence compilation.
- **The Consequence**: The merchant loses both the merchandise and payment processing goodwill, incurring chargeback fees and wasted inventory.
- **The Solution**: **Transaction Autopilot** sits across the transaction lifecycle, performing continuous **3-Way State Reconciliation** between:
  1. PayPal Payment State (Orders v2)
  2. Merchant Store Order State & Telemetry
  3. Dispute & Buyer Claims Management (Disputes v1)

---

## 2. Cross-System 3-Way Reconciliation Architecture

```
┌────────────────────────┐      ┌────────────────────────┐      ┌────────────────────────┐
│   PayPal Orders v2     │      │   Merchant Storefront  │      │  Disputes & Claims v1  │
│ (api-m.sandbox.paypal) │      │   (React 19 Dashboard) │      │ (api-m.sandbox.paypal) │
└──────────┬─────────────┘      └───────────┬────────────┘      └───────────┬────────────┘
           │                                │                               │
           ▼                                ▼                               ▼
  CHECKOUT.ORDER.APPROVED              ORDERS/QUERY                   CUSTOMER.DISPUTE.CREATED
  (Cryptographically Verified)         (Authoritative State)          (Seller Defense Required)
           │                                │                               │
           └───────────────────────┬────────┴───────────────────────────────┘
                                   │
                                   ▼
                ┌───────────────────────────────────────┐
                │ Transaction Autopilot Ingestion Engine│
                └──────────────────┬────────────────────┘
                                   │
                                   ▼
                ┌───────────────────────────────────────┐
                │ 3-Way Reconciliation State Matrix     │
                │  • Payment: CREATED / UNCAPTURED      │
                │  • Order: PENDING APPROVAL            │
                │  • Dispute: ACTION REQUIRED           │
                └──────────────────┬────────────────────┘
                                   │
                 Inconsistency     ▼
                 Detected? ──> ┌────────────────────────┐
                               │ AI Forensic Diagnostic │
                               │  • Authoritative Facts │
                               │  • Carrier Tracking    │
                               │  • Rebuttal Package    │
                               └───────────┬────────────┘
                                           │
                                           ▼
                               ┌────────────────────────┐
                               │  Safe Recovery Protocol│
                               │  (Brevo SMTP Relay)    │
                               └───────────┬────────────┘
                                           │
                        Sensitive Action?  ▼
                        ────────────────> ┌────────────────────────┐
                                          │  Merchant Confirmation │
                                          │  (1-Click Resolution)  │
                                          └───────────┬────────────┘
                                                      │ Operator Confirmed
                                                      ▼
                                          ┌────────────────────────┐
                                          │ Immutable Audit Trail  │
                                          │ (Cryptographic Log)    │
                                          └────────────────────────┘
```

---

## 3. Data & Security Boundaries

1. **Deterministic Authority vs AI Hypotheses**:
   - The AI diagnostic engine **does not mutate database records directly**.
   - Authoritative facts are derived strictly from cryptographically verified records (e.g. PayPal Webhook payload with `PAYPAL-TRANSMISSION-SIG` verified).
   - Possible root causes are explicitly labeled as **Hypotheses**, distinguishing what is known from what is inferred.
2. **Human-in-the-Loop Safeguards**:
   - Automated telemetry checks (read-only API queries to check order queue status) run continuously.
   - Any state mutation (settling disputes, capturing payments, dispatching recovery emails) **requires explicit merchant operator confirmation**.
3. **Role Separation**:
   - **Merchant Trust Zone**: Clean business interface with strictly sanitized values.
   - **Operator Diagnostics Zone**: Deep technical workbench accessible only via authorized operator routes.
4. **Resilient Persistence**:
   - Storage layer uses atomic writes with pre-write `.bak` snapshots. If any write process terminates unexpectedly, data rolls back automatically.
