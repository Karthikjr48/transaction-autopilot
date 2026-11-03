# PayPal Merchant Portal
> High-performance enterprise commerce management platform for PayPal merchants with integrated AI Assistant and real-time Sandbox API processing.

---

## 🌟 Key Architecture & Capabilities

* **Dual-Service Architecture:**
  - **Backend API Gateway (`http://localhost:5000`):** Node.js Express server with direct PayPal Orders v2 integration, live OAuth verification, persistent JSON storage, and rate-limiting.
  - **Frontend UI Client (`http://localhost:3000`):** React 19 + TypeScript + Vite + Tailwind CSS high-contrast dashboard with zero visual clutter.
* **Authoritative Truthful Metrics:** Zero synthetic or mocked data. All store statistics reflect genuine PayPal Sandbox order records.
* **AI Payment Assistant:**
  - Automatic payment link generation and email dispatch.
  - Automatic INR to USD currency conversion for seamless international PayPal settlement.
  - Instant 1-click payment link copying.
* **Transactional Email Engine:** Real-time email dispatch with persistent idempotency and automatic sandbox routing.
* **Disputes & Invoicing Management:** Built-in dispute tracking and customer invoice creation.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js** (v18 or higher recommended)
- **npm** (bundled with Node.js)

### 2. Environment Configuration
Ensure your `.env` file is present in the root directory:
```env
PORT=5000
UI_PORT=3000
BACKEND_URL=http://localhost:5000
PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
```

### 3. Launching the Application
Start both the backend server and frontend client simultaneously with one command:
```bash
npm run start:dual
```
Or simply:
```bash
node start-all.js
```

### 4. Access URLs
- **Merchant Dashboard:** [http://localhost:3000](http://localhost:3000)
- **API Gateway & Health:** [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## 📂 Project Directory Structure

```
PayPal-Merchant-Portal/
├── backend/                  # Express controllers, services, and persistence
│   ├── services/             # Email, data persistence, and templating
│   └── ...
├── config/                   # Environment configuration & validator
├── data/                     # Persistent JSON stores (orders, email-events)
├── dist/                     # Optimized production web assets
├── public/                   # Static branding & assets
├── src/                      # React 19 + TypeScript application
│   ├── components/           # Dashboard views, AI Agent, Orders, Invoices
│   ├── api.ts                # Typed client API layer
│   ├── App.tsx               # Root layout & navigation
│   └── main.tsx              # React entrypoint
├── index.html                # Single-page application entrypoint
├── package.json              # Project dependencies & scripts
├── render.yaml               # Cloud deployment blueprint
├── server.js                 # Production PayPal API gateway
├── start-all.js              # One-click dual-server launcher
├── ui-server.js              # Production static UI server
├── vite.config.ts            # Clean Vite bundler configuration
└── .env                      # Application credentials
```

---

## 🛡️ Security & Integrity
- Client credentials and API secrets are never exposed to browser clients.
- Rate limiting and CSRF protection active across all mutation endpoints.
- High-contrast, accessibility-tested fintech user interface.
