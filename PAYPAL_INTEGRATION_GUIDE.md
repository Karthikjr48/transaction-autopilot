# Comprehensive Guide — AI Commerce State Agent with PayPal Sandbox Integration

This guide provides a complete walkthrough explaining the architecture, security, and developer workflows for this project.

---

## 1. How the Frontend UI Works

The frontend is a modern Single Page Application (SPA) built using React 19, TypeScript, Vite 8, and Tailwind CSS v4:
- **PayPal Visual Identity**: Styled with the official 2024–2026 PayPal brand identity:
  - Official bold black PayPal wordmark.
  - High-contrast fintech aesthetic with dark navy sidebar (`#0F172A`), white card surfaces, and accessible typography.
  - HTML5 PushState routing supporting `/orders`, `/transactions`, `/ai`, `/disputes`, `/invoices`, `/links`, `/audit`, `/settings`, and `/sitemap.xml`.
  - Fully responsive mobile drawer and touch navigation.
- **State-Driven Routing**:
  - **Connected State**: Displays live transaction and order data, seeded with authentic sandbox orders and real-time refresh.
  - **Disputes Center**: Full lifecycle dispute manager supporting test simulation, evidence upload, and claim acceptance.
  - **AI Forensic Workspace**: Evaluates checkout approval tokens, uncaptured authorizations, and risk profiles.

---

## 2. How the Backend Communicates with PayPal

Modern payment gateways require all communications with private credentials to occur server-side:
- The backend (`server.js`) runs a Node.js Express server on port 5000.
- The backend communicates via HTTPS with PayPal's official Sandbox Gateway:
  ```
  https://api-m.sandbox.paypal.com
  ```
- The frontend **never calls PayPal directly**. Instead:
  1. The browser talks to the local backend gateway (`http://localhost:5000/api/...`).
  2. The local backend securely calls PayPal's Sandbox server (`api-m.sandbox.paypal.com`).
  3. This ensures client secrets are never exposed in browser network inspection.

---

## 3. How Sandbox Credentials are Configured Securely

To prevent credentials from leaking:
1. **Environment Variables**: Stored in `.env` (or `.env.example` template):
   ```bash
   PAYPAL_MODE=sandbox
   PAYPAL_CLIENT_ID=your_client_id_here
   PAYPAL_CLIENT_SECRET=your_client_secret_here
   ```
2. **In-Memory Token Vault**:
   - Stored strictly in the server's private process memory (`sessionState`).
   - The status endpoint `/api/paypal/status` only returns masked strings (e.g. `BAA9ARVZ...2_Ec`) and a boolean flag (`connected: true`).
   - Secrets are masked with `•••••••••••••••• (Protected in server process)`.

---

## 4. How the OAuth Access Token is Obtained

PayPal uses standard OAuth 2.0 Client Credentials Grant:
1. The backend encodes credentials into HTTP Basic Authorization format:
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
     "app_id": "APP-33U08664X74004022",
     "expires_in": 32400
   }
   ```
4. The backend caches this token and automatically refreshes it before expiration.

---

## 5. PayPal REST APIs Integrated

1. **PayPal Orders v2 API**:
   - `POST /v2/checkout/orders` (Order creation with `CAPTURE` intent)
   - `GET /v2/checkout/orders/{id}` (Order telemetry & token state audit)
   - `POST /v2/checkout/orders/{id}/capture` (Safe idempotent payment capture)
2. **PayPal Customer Disputes API v1**:
   - `GET /v1/customer/disputes` (Live dispute ingestion and status tracking)
   - `POST /api/paypal/disputes/simulate` (Test dispute generator for merchant drill)
   - `POST /v1/customer/disputes/{id}/provide-evidence` (Carrier tracking submission)
   - `POST /v1/customer/disputes/{id}/accept-claim` (Claim resolution)
3. **PayPal Webhooks API**:
   - Cryptographic signature validation via `PAYPAL-TRANSMISSION-SIG`
   - Ingestion of `CHECKOUT.ORDER.APPROVED`, `PAYMENT.CAPTURE.COMPLETED`, and `CUSTOMER.DISPUTE.*`
