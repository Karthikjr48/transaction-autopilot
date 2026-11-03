# Project Architecture — Transaction-Autopilot

## 1. System Vision & Architecture

**Transaction Autopilot** is an autonomous reliability and recovery layer for online merchants utilizing PayPal.

### The Problem It Solves:
In modern eCommerce architectures, the payment gateway (PayPal) and the downstream merchant fulfillment systems (Shopify, WooCommerce, ERP, 3PL Warehouses) operate via asynchronous webhooks and decoupled job queues.
- **The Failure Mode**: A PayPal capture succeeds (`PAYMENT.CAPTURE.COMPLETED`), but the merchant order never reaches the warehouse due to dropped webhooks, database race conditions, or inventory locks.
- **The Consequence**: The customer was charged, but 36–72 hours elapse without a shipping notice. The customer files a chargeback dispute, the merchant loses both the merchandise and payment processing goodwill.
- **The Solution**: **Transaction Autopilot** sits across the transaction lifecycle, performing continuous **3-Way State Reconciliation** between:
  1. PayPal Payment State
  2. Merchant Store Order State
  3. Fulfillment / Warehouse 3PL State

---

## 2. Cross-System 3-Way Reconciliation Architecture

```
┌────────────────────────┐      ┌────────────────────────┐      ┌────────────────────────┐
│     PayPal REST v2     │      │   Merchant Storefront  │      │  3PL Warehouse Logistics│
│ (api.sandbox.paypal)   │      │  (Shopify/WooCommerce) │      │   (ShipStation / WMS)  │
└──────────┬─────────────┘      └───────────┬────────────┘      └───────────┬────────────┘
           │                                │                               │
           ▼                                ▼                               ▼
  PAYMENT.CAPTURE.COMPLETED          ORDERS/CREATE                    FULFILLMENT/DISPATCH
  (Cryptographically Verified)       (Store Database Record)          (Tracking Number ACK)
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
                │  • Payment: CAPTURED                  │
                │  • Order: CREATED                     │
                │  • Fulfillment: NOT DETECTED (36h+)   │
                └──────────────────┬────────────────────┘
                                   │
                 Inconsistency     ▼
                 Detected? ──> ┌────────────────────────┐
                               │ AI Forensic Diagnostic │
                               │  • Authoritative Facts │
                               │  • Plausible Hypotheses│
                               │  • Missing Information │
                               └───────────┬────────────┘
                                           │
                                           ▼
                               ┌────────────────────────┐
                               │  Safe Recovery Protocol│
                               └───────────┬────────────┘
                                           │
                        Sensitive Action?  ▼
                        ────────────────> ┌────────────────────────┐
                                          │  Human Approval Queue  │
                                          │  (Mandatory Sign-off)  │
                                          └───────────┬────────────┘
                                                      │ Operator Confirmed
                                                      ▼
                                          ┌────────────────────────┐
                                          │ Immutable Audit Trail  │
                                          └────────────────────────┘
```

---

## 3. Data & Security Boundaries

1. **Deterministic Authority vs AI Hypotheses**:
   - The AI diagnostic engine **does not mutate database records directly**.
   - Authoritative facts are derived strictly from cryptographically verified records (e.g. PayPal Webhook payload with `PAYPAL-TRANSMISSION-SIG` verified).
   - Possible root causes are explicitly labeled as **Hypotheses**, distinguishing what is known from what is inferred.
2. **Human-in-the-Loop Safeguards**:
   - Automated probes (read-only API queries to check order queue status) can run autonomously.
   - Any state mutation (re-dispatching orders to 3PL, issuing refunds, re-attempting captures) **strictly requires explicit human operator confirmation** in the Approval Queue with recorded operator notes.
3. **Secret Isolation**:
   - No PayPal Client Secrets or webhook signing secrets exist in client-side code.
   - The frontend communicates via authenticated local states and will point to a protected backend proxy in production.

---

## 4. Path to Production: Backend Roadmap

For production deployment, this frontend pairs with a microservice stack:
- **Runtime**: Node.js / Express with TypeScript.
- **Database**: PostgreSQL with row-level locking for the transaction ledger.
- **PayPal SDK**: `@paypal/checkout-server-sdk` using PayPal REST API v2 (`/v2/checkout/orders` and `/v2/payments/captures`).
- **Webhook Gateway**: Dedicated Express route with `paypal-rest-sdk` validating headers:
  - `PAYPAL-AUTH-ALGO`
  - `PAYPAL-CERT-URL`
  - `PAYPAL-TRANSMISSION-ID`
  - `PAYPAL-TRANSMISSION-SIG`
  - `PAYPAL-TRANSMISSION-TIME`
- **Reconciliation Worker**: Distributed Redis BullMQ queue polling asynchronous order dispatch status on a 15-minute cadence.
