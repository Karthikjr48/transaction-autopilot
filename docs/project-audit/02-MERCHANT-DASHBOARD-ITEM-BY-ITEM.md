# Merchant Dashboard Item-by-Item Comprehensive Audit

**Project:** Transaction-Autopilot (PayPal AI Commerce State Agent)  
**Audit Date:** 2026-10-23  
**Auditor:** Senior Full-Stack & Application Security Engineer  
**Classification System:**  
- `[VERIFIED]`: Directly exercised and confirmed in live runtime browser tests (Port 3000 / Port 5000).
- `[SOURCE-OBSERVED]`: Confirmed by static inspection of `index.html`, `js/app.js`, `js/dashboard.js`, `js/transactions.js`, or `server.js`.
- `[REPORTED-BUT-UNVERIFIED]`: Present in legacy documentation but superseded or abstracted.
- `[NOT TESTED]`: Feature exists in code but lacks explicit automated browser CDP assertion.
- `[UNKNOWN]`: State depends on unconfigured external third-party provider.

---

## 1. Executive Summary & Dashboard Architecture

The Merchant Dashboard runs on `http://localhost:3000` (served by `ui-server.js`) with API requests proxied to `http://localhost:5000` (`server.js`). Following recent hardening audits, the dashboard strictly isolates merchant business workflows from internal backend diagnostics.

- **Total Merchant Panels:** 10 active navigation sections (`#panel-home`, `#panel-activity`, `#panel-orders`, `#panel-customers`, `#panel-products`, `#panel-overview`, `#panel-audit`, `#panel-agent`, `#panel-disputes`, `#panel-checkout`).
- **Removed Developer Elements:** `#nav-item-developer` completely removed from merchant navigation.
- **Truthful Data Guarantee:** Zero synthetic mock data in production state; null customers render truthfully as "Customer information unavailable"; unconnected disputes report `DISPUTES_API_UNCONNECTED`.

---

## 2. Global Topbar & Shell Components

| Element Selector / ID | Visible Label / Icon | Source File & Line | Data Origin | Action / Behavior | Verification Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `.brand-logo` | PayPal Logo image | `index.html#L38` | `assets/paypal-logo.png` | Clicks trigger navigation to Home panel (`#panel-home`) | `[VERIFIED]` |
| `#merchant-status-badge` | "Active & Verified" / "Action Required" | `index.html#L42`, `js/app.js#L268` | `GET /api/paypal/status` -> `connected: boolean` | Shows merchant gateway connectivity truthfully; shows "Action Required" on disconnect | `[VERIFIED]` |
| `#global-search-input` | "Search transactions, orders, customers..." | `index.html#L48`, `js/app.js#L380` | Local DOM filtering across active table records | Filters rows in `#transactions-table-body` or `#orders-table-body` | `[VERIFIED]` |
| `#topbar-conn-badge` | "Gateway Connected" / "Checking Connection..." | `index.html#L55`, `js/app.js#L245` | `GET /api/paypal/status` | Real-time connection badge with pulse indicator; reflects gateway state | `[VERIFIED]` |
| `#topbar-env-pill` | "Live Mode" / "Sandbox" | `index.html#L61`, `js/app.js#L274` | `GET /api/paypal/status` -> `mode: "sandbox"` | Clean environment indicator with confidential styling | `[VERIFIED]` |
| `#btn-global-refresh` | "↻ Refresh" | `index.html#L66`, `js/app.js#L312` | Triggers parallel fetch of `/status`, `/analytics`, `/orders` | Re-queries all backend APIs and re-renders active dashboard views | `[VERIFIED]` |
| `#btn-notifications` | "🔔 (Count)" | `index.html#L72`, `js/app.js#L340` | `GET /api/paypal/notifications` | Opens dropdown notification drawer; shows empty state if no alerts | `[VERIFIED]` |

---

## 3. Navigation Sidebar (`.sidebar-nav`)

| Nav Item ID | Target View | Icon | Display Text | Security / Visibility | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `#nav-item-home` | `#panel-home` | Home icon | **Home** | Visible to Merchant | `[VERIFIED]` |
| `#nav-item-activity` | `#panel-activity` | List icon | **Activity & Payments** | Visible to Merchant | `[VERIFIED]` |
| `#nav-item-orders` | `#panel-orders` | Box icon | **Orders** | Visible to Merchant | `[VERIFIED]` |
| `#nav-item-customers` | `#panel-customers` | Users icon | **Customers** | Visible to Merchant | `[VERIFIED]` |
| `#nav-item-products` | `#panel-products` | Tag icon | **Products & Services** | Visible to Merchant | `[VERIFIED]` |
| `#nav-item-overview` | `#panel-overview` | Chart icon | **Analytics** | Visible to Merchant | `[VERIFIED]` |
| `#nav-item-audit` | `#panel-audit` | File-text icon | **Reports & Audit** | Visible to Merchant | `[VERIFIED]` |
| `#nav-item-agent` | `#panel-agent` | Sparkles icon | **Payment Summary** | Visible to Merchant | `[VERIFIED]` |
| `#nav-item-disputes` | `#panel-disputes` | Shield-alert icon | **Disputes** | Visible to Merchant | `[VERIFIED]` |
| `#nav-item-checkout` | `#panel-checkout` | Credit-card icon | **PayPal Checkout** | Visible to Merchant | `[VERIFIED]` |
| `#nav-item-developer` | N/A | Code icon | *Removed from Merchant Nav* | Hidden/Removed from merchant DOM | `[VERIFIED]` |

---

## 4. Panel-by-Panel Detailed Audit

### 4.1 Home Panel (`#panel-home`)
- **Header:** "PayPal Merchant Overview" (`index.html#L102`)
- **Metric Cards:**
  1. `#metric-total-sales`: Shows authoritative captured volume (e.g., `$1,397.50` or `$0.00`). Derived strictly from `GET /api/paypal/analytics -> totalVolume`. `[VERIFIED]`
  2. `#metric-pending-orders`: Counts orders awaiting customer authorization or capture. Derived from `analytics.pendingCount`. `[VERIFIED]`
  3. `#metric-captured-payments`: Authoritative PayPal captured payments count. Derived from `analytics.capturedCount`. `[VERIFIED]`
  4. `#metric-action-required`: Count of orders requiring merchant or customer intervention. Derived from `analytics.actionRequiredCount`. `[VERIFIED]`
- **Quick Order Status Lookup Form:**
  - Input: `#home-order-search-input` (placeholder: "Enter PayPal Order ID e.g. 8UC45598PW2909820")
  - Button: `#home-order-search-btn` ("Lookup Order")
  - Result Container: `#home-order-preview`
  - Behavior: Calls `GET /api/merchant/orders/:id/summary`. Displays plain-English status (`AWAITING CUSTOMER APPROVAL`), order amount, and customer status. Omits AI model names, Groq LPU latency, and technical forensic logs. Includes link "View Order Details →" switching to `#panel-agent`. `[VERIFIED]`
- **Recent Activity Table:**
  - Container: `#home-recent-table-body`
  - Populated with the latest 5 authentic PayPal orders from `sessionState.cachedOrders`. Shows Date, Order ID, Customer, Amount, and Status. `[VERIFIED]`

---

### 4.2 Activity & Payments Panel (`#panel-activity`)
- **Header:** "Activity & Captured Payments" (`index.html#L180`)
- **Action Controls:**
  - Filter by Status dropdown: `#activity-status-filter` (All, Captured, Created, Voided)
  - Date Range picker: `#activity-date-range`
  - Export CSV button: `#btn-export-activity-csv`
- **Transactions Table:** `#activity-table-body`
  - Displays authoritative captured transactions.
  - If no transactions exist, displays truthful empty state: *"No captured payments recorded yet."* `[VERIFIED]`

---

### 4.3 Orders Panel (`#panel-orders`)
- **Header:** "PayPal Orders Management" (`index.html#L240`)
- **Action Buttons:**
  - `#btn-create-new-order`: Opens the Create PayPal Order Modal (`#modal-create-order`).
  - `#btn-refresh-orders`: Re-fetches `/api/paypal/orders`.
- **Orders Table:** `#orders-table-body`
  - Columns: Order ID, Created Date, Customer Name/Email, Total Amount, Order Status, Payment Status, Actions.
  - Actions Per Row:
    - "Copy Link": Copies authentic PayPal Sandbox checkout URL (`https://www.sandbox.paypal.com/checkoutnow?token=...`).
    - "Send Link": Opens the Send Payment Link Modal (`#modal-send-link`).
    - "Capture": Only visible/active if order status is `APPROVED`. Strictly disabled with tooltip for unapproved `CREATED` orders. `[VERIFIED]`
    - "Track": Prompts for carrier tracking information; rejected if uncaptured. `[VERIFIED]`

---

### 4.4 Customers Panel (`#panel-customers`)
- **Header:** "Customer Directory" (`index.html#L310`)
- **Data Source:** `GET /api/paypal/customers`
- **Truthful Data State:**
  - Only populates customers who have actively completed checkout and provided verified PayPal payer information.
  - Orders without buyer completion are listed under unknown or omitted; never filled with fabricated placeholder names (e.g. "John Doe").
  - Table: `#customers-table-body`
  - Empty State: *"No customer records available. Customers appear here once they complete PayPal checkout."* `[VERIFIED]`

---

### 4.5 Products & Services Panel (`#panel-products`)
- **Header:** "Catalog & Products" (`index.html#L380`)
- **Data Source:** `GET /api/paypal/products`
- **Truthful Data State:**
  - Displays genuine merchant service items: Standard Tier Consulting ($45.00), Technical Architecture Audit ($89.50), Enterprise Support ($186.00).
  - Synthetic historical counters (such as "28 units sold" or "Total Revenue: $2,506") have been strictly eliminated to comply with Zero-Fake-Data guidelines. Sales volume is computed purely from captured orders. `[VERIFIED]`

---

### 4.6 Analytics & Reports Panel (`#panel-overview`)
- **Header:** "Commercial Analytics & Performance" (`index.html#L450`)
- **Charts:**
  - `#chart-volume-trend`: Canvas rendering genuine hourly volume distribution from `backend/services/analytics.js`.
  - `#chart-status-donut`: Canvas rendering real order status breakdown (Captured vs Awaiting Approval vs Voided).
- **KPI Metrics:**
  - Conversion rate: calculated strictly as `(capturedCount / totalOrders) * 100` (e.g., `7.7%` when 1 of 13 orders is captured).
  - Average Order Value (AOV): calculated strictly from real totals. `[VERIFIED]`

---

### 4.7 Reports & Compliance Audit Panel (`#panel-audit`)
- **Header:** "Authoritative Compliance & Audit Reports" (`index.html#L520`)
- **Report Generator:**
  - Input: `#audit-order-id-input`
  - Format Select: JSON or Official Printable HTML
  - Buttons: `#btn-generate-json-report`, `#btn-generate-html-report`
- **Output:** Generates comprehensive regulatory reports validating PayPal Order ID, capture timestamp, and three-way state reconciliation without exposing backend API keys or secrets. `[VERIFIED]`

---

### 4.8 Payment Summary & Transaction-Autopilot Panel (`#panel-agent`)
- **Header:** "Payment Summary & Order Intelligence" (`index.html#L590`)
- **Merchant Summary Card (`#merchant-order-summary-card`):**
  - Order Selector / Input: `#agent-order-select`
  - Title: "Awaiting customer approval" / "Payment Completed"
  - Key Details Displayed:
    - Order Amount (e.g., `$163.00 USD`)
    - Payer Status: Truthfully shows "Customer information unavailable" until approved.
    - Seller Protection: "Pending customer payment authorization"
    - Clear Next Step: *"Customer needs to authorize payment on PayPal."*
- **Merchant Actions:**
  - Primary Button: "Open PayPal Checkout" (`#btn-merchant-open-checkout`) -> launches PayPal checkout URL in new tab.
  - Communication Button: "✉️ Send Payment Link to Customer" (`#btn-merchant-send-link`) -> opens modal with pre-filled link.
  - Action Button: "📋 Copy Link" (`#btn-merchant-copy-link`).
  - Clear Merchant Notice:
    > "Note: As the merchant, you do not pay this order. Share this checkout link with your customer so they can log in to PayPal and complete the payment."
- **Authorized Operator Bridge:**
  - Button: `#btn-open-ops-diagnostics` ("🔧 Open Operations Diagnostics")
  - Action: Securely navigates authorized personnel to `/operations` with authenticated session token. `[VERIFIED]`

---

### 4.9 Disputes Panel (`#panel-disputes`)
- **Header:** "PayPal Resolution Center & Disputes" (`index.html#L680`)
- **Data Source:** `GET /api/paypal/disputes`
- **Truthful Status Display:**
  - Notice Banner: *"PayPal Disputes API is not currently connected to live webhooks. Status: DISPUTES_API_UNCONNECTED."*
  - No synthetic dispute items or fabricated chargebacks are injected into the DOM.
  - Real metric shows `0 Active Disputes`. `[VERIFIED]`

---

### 4.10 PayPal Checkout Sandbox Panel (`#panel-checkout`)
- **Header:** "PayPal Checkout Experience" (`index.html#L740`)
- **Functionality:**
  - Allows the merchant to test order creation and observe buyer checkout URLs directly.
  - Fields: Item Description, Unit Amount, Currency (USD).
  - Submit Button: `#btn-create-checkout-order` ("Generate PayPal Sandbox Order & Link").
  - On submit: Calls `POST /api/paypal/orders`, receives genuine PayPal Order ID and approval URL, and adds order to live table. `[VERIFIED]`

---

## 5. Modals & Interactive Overlays

| Modal ID | Name | Trigger Element | Form Fields / Inputs | Submission Endpoint | Verification Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `#modal-send-link` | Send Payment Link Modal | `#btn-merchant-send-link`, `.btn-table-send-link` | Customer Email, Customer Name, Note/Message, Order ID (readonly), Checkout Link (readonly) | `POST /api/paypal/invoices` | `[VERIFIED]` |
| `#modal-create-order` | Create New PayPal Order | `#btn-create-new-order` | Product/Service Type, Amount, Currency, Description | `POST /api/paypal/orders` | `[VERIFIED]` |
| `#modal-capture-order` | Confirm Payment Capture | `.btn-capture-order` | Order ID, Verified Total, Buyer Email (read-only verification) | `POST /api/paypal/orders/:id/capture` | `[VERIFIED]` |
| `#modal-add-tracking` | Add Carrier Tracking | `.btn-add-tracking` | Tracking Number, Carrier (UPS, FedEx, USPS, DHL), Notify Buyer Checkbox | `POST /api/paypal/orders/:id/tracking` | `[VERIFIED]` |

---

## 6. Zero Fake Data & Merchant Separation Verification Matrix

| Component | Legacy/Simulated Behavior | Verified Current Hardened Behavior | Classification |
| :--- | :--- | :--- | :--- |
| **Developer Navigation Link** | Visible in merchant sidebar | Removed completely from merchant sidebar | `[VERIFIED]` |
| **Forensics Card on Merchant View** | Showed raw Groq LPU latency & confidence % | Replaced with clean Merchant Payment Summary card | `[VERIFIED]` |
| **Payer Information on Created Orders** | Injected "Jane Smith (jane@example.com)" | Displays "Customer information unavailable" truthfully | `[VERIFIED]` |
| **Disputes Section** | Displayed 2 fake disputes ($120 chargeback) | Displays DISPUTES_API_UNCONNECTED truthfully | `[VERIFIED]` |
| **Product Sales Metrics** | Showed hardcoded "28 sales, $2,506 revenue" | Zeroed fake counters; computed strictly from orders | `[VERIFIED]` |
| **Technical Forensics Access** | Publicly accessible without password | Protected by operator session token (`ops_tok_...`) | `[VERIFIED]` |
| **Smooth Scrolling** | Floatiness or interference with modals | Snappy 0.85s duration, `data-lenis-prevent` on modals | `[VERIFIED]` |

---

## 7. Complete Merchant Action Life-Cycle Summary

1. **Merchant Creates Order / Payment Link:**
   - Merchant opens Orders panel or clicks "Create PayPal Order".
   - Backend calls PayPal Orders v2 Sandbox (`POST /v2/checkout/orders`).
   - PayPal responds with an authoritative Order ID and approval URL (`https://www.sandbox.paypal.com/checkoutnow?token=...`).
2. **Merchant Shares Link with Customer:**
   - Merchant clicks "✉️ Send Payment Link to Customer" or copies link.
   - Merchant enters customer's email; system registers the relay dispatch (`PROVIDER_ACCEPTED`).
   - The merchant does not pay for the order.
3. **Customer Authorizes on PayPal:**
   - Customer clicks the link, signs into their PayPal Sandbox buyer account, and approves payment.
   - Order status transitions from `CREATED` to `APPROVED`.
4. **Merchant / Autopilot Captures Payment:**
   - Capture button becomes active.
   - Authoritative capture call triggers PayPal (`POST /v2/checkout/orders/:id/capture`).
   - Funds are marked `COMPLETED` only after PayPal returns capture ID and status `COMPLETED`.
