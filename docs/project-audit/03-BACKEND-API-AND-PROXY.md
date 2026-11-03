# Backend API Gateway & Proxy Architecture Specification

**Project:** Transaction-Autopilot (PayPal AI Commerce State Agent)  
**Backend Host:** `http://localhost:5000` (`server.js`)  
**Frontend Proxy:** `http://localhost:3000` (`ui-server.js`)  
**Audit Date:** 2026-10-23  
**Status:** 33 Endpoints Documented & Verified  

---

## 1. Gateway & Proxy Architecture

The application adopts a hardened dual-server design separating the merchant client host from the transactional API gateway:

1. **Merchant UI Server (`ui-server.js` on Port 3000):**
   - Serves static assets (`index.html`, `css/*`, `js/*`, `assets/*`).
   - Uses `http-proxy-middleware` / native HTTP request piping to route all `/api/*` requests directly to `http://localhost:5000`.
   - Proxies `/operations` to `http://localhost:5000/operations` while maintaining HTTP headers.
2. **Backend API Gateway (`server.js` on Port 5000):**
   - Configured with `cors()` accepting origin `http://localhost:3000`.
   - Express body parsing middleware with a strict `1mb` JSON limit.
   - Dual root handling on `GET /`: returns JSON descriptor to API consumers and tests, or serves `operations.html` to direct browser requests (`Accept: text/html`).
   - Restricts sensitive AI state forensic analysis (`/api/agent/analyze`) via `x-operator-token` header validation.

---

## 2. Exhaustive API Route Inventory (All 33 Endpoints)

### 2.1 System & Operations Routes

| # | Method | Endpoint Path | Auth / Role | Description & Behavior | Response Code | Status |
| :- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `GET` | `/` | Public | Dual root: Returns JSON API manifest to API/curl clients (`Accept: */*`), or serves `operations.html` to browsers (`Accept: text/html`). | `200 OK` | `[VERIFIED]` |
| 2 | `GET` | `/operations` | Public / Op | Serves `operations.html` dedicated technical console. | `200 OK` | `[VERIFIED]` |
| 3 | `POST`| `/api/operations/auth` | Master Key | Authenticates operator using `operatorSecret` in body. Returns session token (`ops_tok_...`). | `200 OK`, `401 Unauthorized` | `[VERIFIED]` |
| 4 | `GET` | `/api/health` | Public | Lightweight health check returning uptime, timestamp, and active PayPal mode (`sandbox`). | `200 OK` | `[VERIFIED]` |

---

### 2.2 PayPal Gateway & OAuth Management

| # | Method | Endpoint Path | Auth / Role | Description & Behavior | Response Code | Status |
| :- | :--- | :--- | :--- | :--- | :--- | :--- |
| 5 | `GET` | `/api/paypal/status` | Public | Returns live PayPal Sandbox gateway connectivity, app ID (`APP-...`), masked secrets, and verified timestamp. | `200 OK` | `[VERIFIED]` |
| 6 | `POST`| `/api/paypal/verify` | Public | Forces immediate live re-verification against PayPal Sandbox OAuth endpoint (`/v1/oauth2/token`). | `200 OK`, `401 Unauthorized` | `[VERIFIED]` |
| 7 | `POST`| `/api/paypal/disconnect` | Public | Simulates gateway disconnection for failover testing. Sets gateway state to offline. | `200 OK` | `[VERIFIED]` |

---

### 2.3 PayPal Orders v2 Processing

| # | Method | Endpoint Path | Auth / Role | Request Payload | Description & Verification Behavior | Response Code | Status |
| :- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 8 | `POST`| `/api/paypal/orders` | Public / Merchant | `{ amount, currency, description }` | Creates PayPal Orders v2 in Sandbox (`intent: CAPTURE`). Returns Order ID and approval URL. Payer email is strictly `null` at this stage. | `200 OK` / `201 Created` | `[VERIFIED]` |
| 9 | `GET` | `/api/paypal/orders` | Public / Merchant | Query: `?status=ALL&limit=20` | Retrieves cached & active PayPal orders. Payer info renders truthfully. | `200 OK` | `[VERIFIED]` |
| 10 | `GET` | `/api/paypal/orders/:id` | Public / Merchant | URL param: `id` | Fetches single order by PayPal Order ID from Sandbox or session cache. | `200 OK`, `404 Not Found` | `[VERIFIED]` |
| 11 | `POST`| `/api/paypal/orders/:id/capture` | Public / Merchant | URL param: `id` | **Capture Safeguard:** Captures authorized order. **STRICTLY BLOCKS** unapproved `CREATED` orders with `ORDER_NOT_APPROVED`. | `200 OK`, `422 Unprocessable` | `[VERIFIED]` |
| 12 | `POST`| `/api/paypal/orders/:id/tracking` | Public / Merchant | `{ trackingNumber, carrier }` | Adds carrier tracking to order. **STRICTLY BLOCKS** uncaptured orders with `ORDER_NOT_CAPTURED`. | `200 OK`, `422 Unprocessable` | `[VERIFIED]` |
| 13 | `POST`| `/api/paypal/orders/:id/void` | Public / Merchant | URL param: `id` | Voids an authorized order prior to capture. | `200 OK`, `400 Bad Request` | `[VERIFIED]` |

---

### 2.4 Merchant-Facing Summary Endpoints

| # | Method | Endpoint Path | Auth / Role | Description & Data Policy | Response Code | Status |
| :- | :--- | :--- | :--- | :--- | :--- | :--- |
| 14 | `GET` | `/api/merchant/orders/:id/summary` | Merchant | Generates clean merchant-facing order summary. Formats plain-English status, payment link, and buyer actions. Strictly strips AI model, Groq latency, rule confidence, and diagnostic payloads. | `200 OK`, `404 Not Found` | `[VERIFIED]` |
| 15 | `GET` | `/api/merchant/settings` | Merchant | Retrieves merchant configuration preferences (e.g., `autoInvoiceOnCapture`). | `200 OK` | `[VERIFIED]` |
| 16 | `POST`| `/api/merchant/settings` | Merchant | Updates merchant preferences with payload validation. | `200 OK`, `400 Bad Request` | `[VERIFIED]` |

---

### 2.5 Merchant Analytics & Catalogs (Zero-Fake-Data)

| # | Method | Endpoint Path | Auth / Role | Description & Data Policy | Response Code | Status |
| :- | :--- | :--- | :--- | :--- | :--- | :--- |
| 17 | `GET` | `/api/paypal/analytics` | Merchant | Real-time analytics computed strictly from authentic orders. Contains `totalVolume`, `capturedCount`, `pendingCount`, `hourlyVolume` array, and genuine dispute status. | `200 OK` | `[VERIFIED]` |
| 18 | `GET` | `/api/paypal/customers` | Merchant | Customer directory derived strictly from buyer-completed orders. Truthfully returns empty array when no buyers have completed checkout. | `200 OK` | `[VERIFIED]` |
| 19 | `GET` | `/api/paypal/products` | Merchant | Merchant catalog items with fixed prices. Zeroes synthetic historical sales counters. | `200 OK` | `[VERIFIED]` |
| 20 | `GET` | `/api/paypal/notifications` | Merchant | Real system notifications (e.g. gateway status, new orders). Empty when quiet. | `200 OK` | `[VERIFIED]` |
| 21 | `GET` | `/api/paypal/disputes` | Merchant | Real disputes feed. Returns `DISPUTES_API_UNCONNECTED` when webhook is unintegrated; zero synthetic chargebacks. | `200 OK` | `[VERIFIED]` |

---

### 2.6 Real Invoicing & Email Delivery Relay

| # | Method | Endpoint Path | Auth / Role | Request Payload | Description & Safeguards | Response Code | Status |
| :- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 22 | `POST`| `/api/paypal/invoices` | Merchant | `{ orderId, customerEmail, customerName, note }` | Validates email syntax, validates positive amount, registers dispatch in store, returns `PROVIDER_ACCEPTED` with RFC 2822 Message-ID receipt. | `200 OK`, `400 Bad Request` | `[VERIFIED]` |
| 23 | `GET` | `/api/paypal/invoices` | Merchant | None | Retrieves all sent/draft invoices from persisted store. | `200 OK` | `[VERIFIED]` |
| 24 | `GET` | `/api/paypal/invoices/:id` | Merchant | URL param: `id` | Retrieves single invoice by ID with delivery status audit trail. | `200 OK`, `404 Not Found` | `[VERIFIED]` |
| 25 | `POST`| `/api/paypal/invoices/:id/resend` | Merchant | URL param: `id` | Re-sends invoice. Contains idempotency guard blocking duplicate dispatch if already in terminal state. | `200 OK`, `429 Too Many Requests` | `[VERIFIED]` |

---

### 2.7 AI Intelligence & 3-Way State Forensics

| # | Method | Endpoint Path | Auth / Role | Security Controls | Description & Behavior | Response Code | Status |
| :- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 26 | `POST`| `/api/agent/analyze` | **Operator Token** (`x-operator-token`) | RBAC enforcement: Blocks unauthenticated or merchant requests with `403 Forbidden`. | Executes 3-Way State Forensics and Groq AI inference (`qwen/qwen3.8-27b`). Returns rule confidence, root-cause hypotheses, and verified facts. | `200 OK`, `401 Unauthorized`, `403 Forbidden` | `[VERIFIED]` |
| 27 | `GET` | `/api/agent/forensics/:id` | Operator Token | RBAC protected | Retrieves pre-computed forensic matrix for order ID. | `200 OK`, `403 Forbidden` | `[VERIFIED]` |
| 28 | `GET` | `/api/agent/report/:id` | Merchant / Op | Sanitized JSON | Generates regulatory compliance audit report in JSON format. Excludes all secrets and internal tokens. | `200 OK`, `404 Not Found` | `[VERIFIED]` |
| 29 | `GET` | `/api/agent/report/:id/html` | Merchant / Op | Printable HTML | Renders official, print-styled HTML audit report for tax and compliance record-keeping. | `200 OK`, `404 Not Found` | `[VERIFIED]` |

---

### 2.8 Webhooks & Approvals Queue

| # | Method | Endpoint Path | Auth / Role | Description & Verification Behavior | Response Code | Status |
| :- | :--- | :--- | :--- | :--- | :--- | :--- |
| 30 | `POST`| `/api/paypal/webhook` | External / PayPal | Ingests real PayPal webhook events (e.g. `CHECKOUT.ORDER.APPROVED`). Logs event ID and transitions order state. | `200 OK`, `400 Bad Request` | `[VERIFIED]` |
| 31 | `GET` | `/api/paypal/webhooks/history`| Operator | Retrieves history of genuinely received webhook events. Empty on clean start. | `200 OK` | `[VERIFIED]` |
| 32 | `GET` | `/api/approvals` | Operator | Returns items in the human-in-the-loop manual review queue. | `200 OK` | `[VERIFIED]` |
| 33 | `POST`| `/api/approvals/:id/action` | Operator | Approves or rejects a flagged transaction override with audit logging. | `200 OK`, `400 Bad Request` | `[VERIFIED]` |

---

## 3. Reverse Proxy Configuration (`ui-server.js`)

`ui-server.js` acts as an edge proxy for the merchant client. Its configuration ensures that frontend JavaScript can issue relative requests (`/api/...`) without cross-origin configuration issues:

```javascript
// ui-server.js (Lines 35–65)
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

app.use('/api', (req, res) => {
  const targetUrl = `${BACKEND_URL}/api${req.url}`;
  const options = {
    method: req.method,
    headers: { ...req.headers, host: new URL(BACKEND_URL).host }
  };
  const proxyReq = http.request(targetUrl, options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });
  req.pipe(proxyReq, { end: true });
});

app.use('/operations', (req, res) => {
  // Proxies /operations to Port 5000 /operations
});
```

---

## 4. Error Handling & Status Code Standards

| HTTP Status Code | Meaning in Transaction-Autopilot | Example Scenario |
| :--- | :--- | :--- |
| `200 OK` | Request succeeded; valid data returned. | Order retrieved, invoice created, status checked. |
| `201 Created` | New resource created on PayPal or locally. | PayPal Sandbox order created. |
| `400 Bad Request` | Malformed input, invalid email format, missing ID. | Invoice creation with invalid email syntax. |
| `401 Unauthorized` | Missing or invalid authentication token. | Operator auth attempted with bad secret. |
| `403 Forbidden` | Authenticated or merchant role attempting restricted access. | Merchant attempting to call `/api/agent/analyze`. |
| `404 Not Found` | Resource does not exist on PayPal or in memory store. | Requesting non-existent order `NON_EXISTENT_ID`. |
| `422 Unprocessable`| Business logic prerequisite failure. | Attempting to capture an unapproved `CREATED` order. |
| `429 Too Many` | Rate limit or duplicate dispatch blocked. | Attempting to re-send an already accepted invoice. |
| `500 Server Error` | Unhandled runtime exception or upstream network failure. | Upstream PayPal Sandbox endpoint unreachable. |
