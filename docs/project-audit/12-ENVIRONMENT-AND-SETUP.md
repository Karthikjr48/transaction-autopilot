# Environment Configuration & Operational Setup Guide

**Project:** Transaction-Autopilot (PayPal AI Commerce State Agent)  
**Audit Date:** 2026-10-23  
**Status:** Verified Operational on Windows / Linux / macOS  

---

## 1. System Prerequisites

Before running Transaction-Autopilot, ensure your environment meets the following specifications:
- **Node.js:** v18.0.0 or higher (Tested and verified on Node.js v20.x and v22.x).
- **npm:** v9.0.0 or higher.
- **Operating System:** Windows 10/11, macOS (Apple Silicon / Intel), or Linux (Ubuntu 22.04+).
- **Network Access:** Outbound HTTPS access to:
  - `api-m.sandbox.paypal.com` (Port 443)
  - `api.groq.com` (Port 443)
  - `www.sandbox.paypal.com` (Port 443)

---

## 2. Environment Configuration (`.env`)

Create a `.env` file in the project root by copying the provided `.env.example`:

```bash
cp .env.example .env
```

### Detailed Environment Variables Reference

| Variable Name | Required | Default Value | Description & Purpose |
| :--- | :--- | :--- | :--- |
| `PORT` | Optional | `5000` | Port for the authoritative Backend API gateway and Operations Console. |
| `UI_PORT` | Optional | `3000` | Port for the merchant frontend static server and reverse proxy. |
| `BACKEND_URL` | Optional | `http://localhost:5000` | Target URL used by `ui-server.js` to reverse-proxy `/api/*` requests. |
| `PAYPAL_MODE` | Required | `sandbox` | Gateway mode (`sandbox` or `live`). Currently locked to `sandbox` for safety. |
| `PAYPAL_CLIENT_ID` | Required | N/A | PayPal REST App Client ID from developer.paypal.com. |
| `PAYPAL_CLIENT_SECRET` | Required | N/A | PayPal REST App Client Secret. Masked and isolated to server memory. |
| `GROQ_API_KEY` | Optional | N/A | GroqCloud API key for LPU inference. Fallback rules activate if omitted. |
| `GROQ_MODEL` | Optional | `qwen/qwen3.8-27b` | Model identifier used for Groq AI inference. |
| `OPERATOR_SECRET` | Required | N/A | Master passphrase required to authenticate to the Operations Console. |
| `EMAIL_PROVIDER` | Optional | `none` | Invoicing delivery provider (`'none'`, `'relay'`, or `'smtp'`). |

### How to Obtain PayPal Sandbox Credentials:
1. Log in to the [PayPal Developer Dashboard](https://developer.paypal.com/).
2. Navigate to **Apps & Credentials** > Select **Sandbox**.
3. Create an App (or select Default Application).
4. Copy the **Client ID** and **Secret** into your `.env` file.
5. Create Sandbox Test Accounts (one **Business-Merchant**, one **Personal-Buyer**).

---

## 3. Installation & Startup Procedures

### 3.1 Step 1: Install Dependencies
```bash
npm install
```
This installs the required dependencies: `express`, `cors`, `dotenv`, `lenis`, and devDependency `puppeteer-core`.

### 3.2 Step 2: Start the Dual Architecture
To launch both the Backend API and Merchant Frontend concurrently:
```bash
node start-all.js
```

Terminal output will confirm:
```
======================================================
🚀 Starting PayPal Commerce Dual Architecture
   • PayPal Sandbox Backend  : http://localhost:5000
   • PayPal UI Client        : http://localhost:3000
======================================================

🎨 PayPal UI Client running on http://localhost:3000
🔒 Connected to PayPal Sandbox Backend on http://localhost:5000

🚀 Transaction-Autopilot Server running on http://localhost:5000
🔒 PayPal Mode: SANDBOX (api-m.sandbox.paypal.com)
```

### 3.3 Standalone Startup Options
If running services in separate containers or terminals:
```bash
# Terminal 1: Backend API Gateway
node server.js

# Terminal 2: Merchant Frontend & Proxy
node ui-server.js
```

---

## 4. Verification & Health Checks

Once started, verify the deployment:

1. **Merchant Dashboard:** Open [http://localhost:3000](http://localhost:3000) in a browser.
   - Verify topbar shows `Gateway Connected` with a green pulse.
   - Verify 10 merchant tabs are accessible.
2. **Backend API Manifest:**
   ```bash
   curl http://localhost:5000/
   ```
   Should return JSON with `service: "Transaction-Autopilot Backend API"`.
3. **Backend Operations Console:** Open [http://localhost:5000/operations](http://localhost:5000/operations) (or [http://localhost:3000/operations](http://localhost:3000/operations)).
4. **Execute Automated Verification:**
   ```bash
   node tests/test-all.js
   ```
   All 11 suites should pass with zero failures.

---

## 5. Troubleshooting & Common Issues

| Issue / Error | Probable Root Cause | Resolution Step |
| :--- | :--- | :--- |
| `Error: listen EADDRINUSE :::5000` | Port 5000 is occupied by an existing process. | Identify and terminate the process holding port 5000 (`Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess` or kill background task). |
| `PayPal OAuth Error (401): Client Authentication failed` | Invalid PayPal Client ID or Secret in `.env`. | Re-verify credentials in developer.paypal.com and update `.env`. |
| `Top-bar shows "Gateway Offline"` | Backend server is not running or PayPal rejected OAuth. | Check backend terminal logs and click "↻ Refresh" in the topbar. |
| `Groq inference timed out` | Outbound network latency or Groq API rate limit. | The deterministic fallback engine will automatically handle the request. Check your API key at console.groq.com. |
| `Payment link opens blank page` | Popup blocker in browser. | Allow popups for `localhost:3000` or use `[📋 Copy Link]` and open in a new tab. |
