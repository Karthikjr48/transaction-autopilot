# Comprehensive Guide — AI Commerce State Agent with PayPal Sandbox Integration

This guide provides a complete, step-by-step walkthrough explaining the architecture, security, and developer workflows for this project in simple English.

---

## 1. How the Frontend UI Works

The frontend is a lightweight Single Page Application (SPA) built using standard HTML5, CSS3, and modern JavaScript:
- **PayPal Visual Identity**: Styled after the official PayPal web and mobile app design system (PDS 60), featuring:
  - Official PayPal logo mark SVG (`https://www.paypalobjects.com/marketing/web/logos/paypal-mark-color_new.svg`).
  - Signature brand colors: Deep Blue (`#003087`), Primary Blue (`#0070E0`), Deep Navy (`#012169`), and Background Grey (`#F5F7FA`).
  - 1000px rounded pill buttons (`border-radius: 1000px;`) and segment pill tabs.
  - Mobile-app bottom navigation dock for touch devices.
- **State-Driven Routing**:
  - **Disconnected State (Initial)**: All transaction tables, fake balances, and mock metrics are hidden. Only the Sandbox Connection screen and setup guide are shown.
  - **Connected State**: Once verified with PayPal OAuth 2.0, displays live transaction data or a clean empty state with a 1-click test order generator.
  - **AI Forensic Workspace**: Evaluates the selected PayPal order to identify unfulfilled merchant orders.

---

## 2. How the Backend Communicates with PayPal

Modern payment gateways require all communications with private credentials to occur server-side:
- The backend (`server.js`) runs a Node.js Express server.
- The backend uses HTTPS to talk directly to PayPal's official Sandbox Gateway:
  ```
  https://api-m.sandbox.paypal.com
  ```
- The frontend **never calls PayPal directly**. Instead:
  1. The browser talks to your local backend (`http://localhost:5000/api/...`).
  2. Your local backend securely talks to PayPal's Sandbox server (`api-m.sandbox.paypal.com`).
  3. This ensures client secrets are never exposed in browser network inspection.

---

## 3. How Sandbox Credentials are Configured Securely

To prevent credentials from leaking:
1. **Option A (Environment Variables)**: Stored in `.env`:
   ```bash
   PAYPAL_CLIENT_ID=your_client_id_here
   PAYPAL_CLIENT_SECRET=your_client_secret_here
   ```
2. **Option B (In-Browser Setup)**: When entered via the UI connection form:
   - Sent via `POST /api/paypal/connect` to the backend.
   - Stored strictly in the server's private process memory (`sessionState`).
   - The endpoint `/api/paypal/status` only returns masked strings (e.g. `AYSq38D_...`) and a boolean flag (`connected: true`).

---

## 4. How the OAuth Access Token is Obtained

PayPal uses standard OAuth 2.0 Client Credentials Grant:
1. The backend encodes the credentials into HTTP Basic Authorization format:
   ```javascript
   const authString = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
   ```
2. The backend sends a `POST` request to PayPal:
   - **URL**: `https://api-m.sandbox.paypal.com/v1/oauth2/token`
   - **Headers**:
     - `Authorization`: `Basic <authString>`
     - `Content-Type`: `application/x-www-form-urlencoded`
   - **Body**: `grant_type=client_credentials`
3. PayPal verifies the credentials and returns a short-lived JSON response:
   ```json
   {
     "access_token": "A21AA...secure_token...",
     "token_type": "Bearer",
     "app_id": "APP-80W284485P519543T",
     "expires_in": 32400
   }
   ```
4. The backend caches this token for 9 hours (`32,400` seconds) and automatically includes it as `Bearer <access_token>` in all subsequent requests.

---

## 5. How Payment and Order Data is Retrieved

Once authenticated, the backend retrieves transaction records using two PayPal REST APIs:
1. **PayPal Reporting API (`/v1/reporting/transactions`)**:
   - Queries settled payments, refunds, and authorizations within a date range:
     ```
     GET https://api-m.sandbox.paypal.com/v1/reporting/transactions?start_date=2026-09-11T00:00:00.000Z&end_date=2026-10-11T23:59:59.999Z&fields=all
     ```
   - Returns transaction amounts, currency codes, payer emails, and shipping addresses.
2. **PayPal Checkout Orders API (`/v2/checkout/orders`)**:
   - Inspects checkout orders created through PayPal buttons or REST endpoints.

---

## 6. How the Frontend Receives and Displays the Retrieved Data

1. The frontend invokes `GET /api/paypal/transactions`.
2. The backend responds with:
   ```json
   {
     "success": true,
     "count": 1,
     "transactions": [ ... ]
   }
   ```
3. **Empty State Handling**: If `count === 0`, the UI displays a clean empty state card: *"No Transactions in this Sandbox Account Yet"*, with a 1-click button to **"Generate Sandbox Test Order"**.
4. **Active State**: If records exist, the UI renders the data-dense table with transaction IDs, payer names, currencies, and status badges.

---

## 7. How Webhooks Work

In a live production environment:
1. When an event happens (e.g. buyer completes payment), PayPal sends an asynchronous HTTP `POST` payload to your webhook listener endpoint.
2. **Security & Cryptographic Verification**:
   - To prevent spoofing, PayPal signs every webhook with headers:
     - `PAYPAL-TRANSMISSION-ID`
     - `PAYPAL-TRANSMISSION-TIME`
     - `PAYPAL-TRANSMISSION-SIG`
     - `PAYPAL-CERT-URL`
     - `PAYPAL-AUTH-ALGO`
   - The backend validates the signature against PayPal's public certificate before trusting the event payload.

---

## 8. How the AI Agent Analyses the Available Data

The **AI Commerce State Agent** operates on real transaction records to detect commercial completeness:
- **3-Way State Reconciliation**:
  1. **Payment Gateway State**: Is the money captured in PayPal? (`COMPLETED` vs `PENDING`)
  2. **Merchant Order State**: Is the order reference logged?
  3. **Carrier Fulfillment State**: Is a shipping tracking number attached?
- **Forensic Diagnosis**:
  - If payment is captured but tracking is missing, the agent flags the order as **`COMMERCIALLY_INCOMPLETE`**.
  - Distinguishes **Authoritative Verified Facts** from **Root-Cause Hypotheses** and **Missing Data**.
  - Recommends actionable merchant recovery steps (e.g., query ERP, invoke PayPal Add Tracking API, send customer shipping assurance).

---

## 9. How to Test the Complete Workflow

### Step 1: Start the Backend Server
```bash
cd Transaction-Autopilot
npm start
```
The server will boot on `http://localhost:5000`.

### Step 2: Open in Browser
Visit `http://localhost:5000` in your web browser.
- Verify that **no mock data or fake balances appear**.
- You will see the PayPal Sandbox connection screen.

### Step 3: Connect Your Sandbox Credentials
1. Paste your Sandbox `Client ID` and `Secret Key` from [developer.paypal.com](https://developer.paypal.com/dashboard/applications/sandbox).
2. Click **Connect PayPal Sandbox**.
3. You will receive a green toast confirmation: *"Successfully authenticated with PayPal Sandbox API!"*.

### Step 4: Generate a Test Order & Run AI Forensics
1. In the **Sandbox Activity** tab, click **+ Generate Sandbox Test Order**.
2. The backend executes a live `POST /v2/checkout/orders` call to PayPal Sandbox.
3. A real order will appear in the table with state `CREATED` and `Missing Tracking`.
4. Click **Run AI Analysis** to inspect the 3-way matrix and forensic recommendations.

---

## 10. How to Identify and Fix Common Connection Errors

| Error | Cause | Resolution |
|---|---|---|
| `401 Unauthorized: invalid_client` | The Client ID or Secret was mistyped or copied from Live instead of Sandbox. | Go to `developer.paypal.com` > Apps & Credentials > ensure the **Sandbox** toggle is selected, then copy both keys again. |
| `Cannot connect to server` | Node.js backend is not running on port 5000. | Run `npm start` in the terminal inside `Transaction-Autopilot`. |
| `Empty transaction list` | Your Sandbox account has no past orders. | Click **"Generate Sandbox Test Order"** to create an immediate test order via the PayPal Orders API. |
| `CORS / Network Error` | Frontend was opened via `file://` instead of the local server. | Always access the application via `http://localhost:5000`. |
