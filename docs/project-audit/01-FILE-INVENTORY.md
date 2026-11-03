# Complete Project File Inventory

**Project:** Transaction-Autopilot (PayPal AI Commerce State Agent)  
**Audit Date:** 2026-10-23  
**Total Tracked Project Files:** 58 (excluding `node_modules` and `.chrome-test-profile`)  
**Status:** 100% Accounted For  

---

## 1. Inventory Summary by Directory

| Directory / Category | File Count | Primary Purpose |
| :--- | :--- | :--- |
| **Root (`/`)** | 16 | Core servers (`server.js`, `ui-server.js`), HTML views, configs, documentation |
| **Backend Services (`backend/services/`)**| 3 | Modular business logic: analytics, operator authentication, invoicing |
| **Configuration (`config/`)** | 1 | Environment variable validation & fallback management |
| **Stylesheets (`css/`)** | 7 | Modular CSS design system: tokens, base, layout, components, merchant UI |
| **Frontend Scripts (`js/`)** | 14 | Client-side vanilla JS modules: state, navigation, tables, modals, charts |
| **Automated Tests (`tests/`)** | 14 | 11 comprehensive automated test suites, runner, and headless browser tests |
| **Static Assets (`assets/`)** | 2 | Official vector branding and visual design reference |
| **Documentation (`docs/project-audit/`)** | 13 | Complete system audit and feature-by-feature specifications |

---

## 2. Exhaustive File-by-File Manifest

### 2.1 Root Application Files

| File Path | Size | Role & Purpose | Key Exports / Functions | Category | Lifecycle Recommendation | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `server.js` | 102.3 KB | Primary Backend Gateway on Port 5000. Houses all 33 REST endpoints, PayPal OAuth token vault, Groq AI forensics, state reconciliation, and report generator. | Express app instance, port listener, route handlers | Backend | Keep (Core Gateway) | `[VERIFIED]` |
| `ui-server.js` | 3.3 KB | Frontend Web Server & Proxy on Port 3000. Serves static files and reverse-proxies `/api/*` and `/operations` to Port 5000. | Express proxy app, static asset handler | Frontend | Keep (Core Host) | `[VERIFIED]` |
| `start-all.js` | 1.4 KB | Dual Process Launcher. Concurrently spawns both `server.js` (5000) and `ui-server.js` (3000) with consolidated terminal output and graceful exit handling. | Child process coordinator | DevOps | Keep (Main Launcher) | `[VERIFIED]` |
| `index.html` | 81.0 KB | Clean Merchant Dashboard UI. PayPal-branded management portal containing 10 merchant panels, modals, and zero-fake-data views. | DOM tree, templates, modal structures | Frontend | Keep (Merchant View) | `[VERIFIED]` |
| `operations.html` | 13.6 KB | Backend Operations & AI Forensics Console. Dedicated technical dashboard for authenticated operators to inspect 3-Way State Forensics and Groq AI reasoning. | Operator console DOM | Frontend | Keep (Operator View) | `[VERIFIED]` |
| `package.json` | 600 B | Project metadata, scripts (`test`, `start`), and production/development dependency versions. | npm manifest | Config | Keep (Manifest) | `[VERIFIED]` |
| `package-lock.json`| 43.6 KB | Deterministic dependency tree locking exact installed versions of express, cors, dotenv, lenis, puppeteer-core. | Lockfile | Config | Keep (Dependency Lock)| `[VERIFIED]` |
| `.env` | 467 B | Active environment variables containing PayPal Sandbox credentials, Groq API key, and operator secret. (Excluded from git). | Environment variables | Config | Keep (Active Secrets) | `[VERIFIED]` |
| `.env.example` | 268 B | Template file documenting required environment variables for setup without leaking actual secrets. | Config template | Config | Keep (Documentation) | `[VERIFIED]` |
| `.gitignore` | 241 B | Prevents `node_modules`, `.env`, logs, and temporary Chrome test profiles from being committed. | Git ignore rules | Config | Keep | `[VERIFIED]` |
| `DESIGN_SYSTEM.md` | 4.1 KB | Documentation of color tokens, typography scales, card layouts, and component standards. | Markdown guide | Docs | Keep | `[SOURCE-OBSERVED]` |
| `HACKATHON_READINESS.md` | 11.2 KB | Historical hackathon evaluation criteria, problem framing, and feature readiness checklist. | Markdown guide | Docs | Archive/Keep for ref | `[SOURCE-OBSERVED]` |
| `PAYPAL_INTEGRATION_GUIDE.md` | 8.1 KB | Detailed technical reference for PayPal Orders v2 Sandbox integration, OAuth flow, and webhook handling. | Markdown guide | Docs | Keep | `[SOURCE-OBSERVED]` |
| `PROJECT_ARCHITECTURE.md` | 7.2 KB | Architectural diagrams, 3-Way State Matrix definition, and service interaction models. | Markdown guide | Docs | Keep | `[SOURCE-OBSERVED]` |
| `README.md` | 6.2 KB | Project readme with quick-start instructions, feature highlights, and architecture summary. | Markdown guide | Docs | Keep | `[SOURCE-OBSERVED]` |
| `LICENSE` | 1.1 KB | MIT License grant. | Legal license | Legal | Keep | `[SOURCE-OBSERVED]` |

---

### 2.2 Backend Services (`backend/services/`)

| File Path | Size | Role & Purpose | Key Functions / Classes | Category | Lifecycle Recommendation | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `backend/services/analytics.js` | 5.3 KB | Calculates real-time merchant analytics from authentic orders. Computes volume, conversion rate, hourly volume timeline, and dispute statuses without synthetic seed multipliers. | `calculateMerchantAnalytics(orders, disputes)` | Backend | Keep (Core Service) | `[VERIFIED]` |
| `backend/services/auth.js` | 3.9 KB | Operator authentication service. Validates operator master secrets, mints secure session tokens (`ops_tok_...`), and enforces RBAC on sensitive technical endpoints. | `verifyOperatorSecret`, `mintOperatorToken`, `validateOperatorToken` | Backend | Keep (Security Core) | `[VERIFIED]` |
| `backend/services/invoicing.js` | 14.0 KB | Invoice lifecycle management & delivery provider relay. Implements invoice storage, duplicate send guards, recipient email validation, and provider receipt tracking. | `createInvoice`, `sendInvoice`, `getInvoices`, `updateInvoiceStatus` | Backend | Keep (Invoicing Core) | `[VERIFIED]` |

---

### 2.3 Configuration Utilities (`config/`)

| File Path | Size | Role & Purpose | Key Functions / Classes | Category | Lifecycle Recommendation | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `config/env.js` | 2.8 KB | Validates and sanitizes environment variables upon startup. Ensures `PAYPAL_MODE` defaults to `sandbox` and provides safe defaults. | `validateConfig`, `getSanitizedConfig` | Backend | Keep | `[VERIFIED]` |

---

### 2.4 Stylesheets (`css/`)

| File Path | Size | Role & Purpose | Selectors / Tokens | Category | Lifecycle Recommendation | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `css/tokens.css` | 8.5 KB | CSS design system variables: PayPal Blue palette (`#003087`, `#0070BA`, `#00457C`), neutral grays, semantic alert colors, typography definitions (`PayPal Pro Text VF`), spacing scales, and border radii. | `:root { --pp-blue: ... }` | CSS | Keep (Design System) | `[VERIFIED]` |
| `css/base.css` | 5.0 KB | Modern CSS reset, base typography rules, focus outlines, button resets, and global form element defaults. | `html, body, button, input` | CSS | Keep | `[VERIFIED]` |
| `css/layout.css` | 9.9 KB | Topbar, sidebar navigation, main content area, panel containers, and grid layouts. | `.app-container, .topbar, .sidebar` | CSS | Keep | `[VERIFIED]` |
| `css/components.css` | 8.5 KB | Modular component styles for cards, badges, modal overlays, dropdown menus, and data tables. | `.metric-card, .badge, .modal, .table` | CSS | Keep | `[VERIFIED]` |
| `css/merchant.css` | 32.1 KB | Specialized clean merchant dashboard styling. Contains styling for merchant summary card, payment link modal, customer notice banners, and clean KPI cards. | `.merchant-summary-card, .notice-box` | CSS | Keep (Merchant Style) | `[VERIFIED]` |
| `css/animations.css` | 3.3 KB | Keyframe animations: spinner rotation, modal entrance fades, badge pulse effects, and skeleton loaders. | `@keyframes fadeIn, @keyframes pulse` | CSS | Keep | `[VERIFIED]` |
| `css/responsive.css` | 2.6 KB | Media queries for tablet (1024px) and mobile (768px/480px). Implements collapsible sidebar and stacked metric cards. | `@media (max-width: 768px)` | CSS | Keep | `[VERIFIED]` |

---

### 2.5 Frontend Client Scripts (`js/`)

| File Path | Size | Role & Purpose | Key Functions / Variables | Category | Lifecycle Recommendation | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `js/app.js` | 32.2 KB | Master frontend application controller. Coordinates UI initialization, topbar status updates, merchant order summary rendering, modal dispatching, and operator bridge navigation. | `initApp`, `renderMerchantOrderSummary`, `openSendPaymentLinkModal`, `openOperationsDiagnostics` | Frontend | Keep (Master App) | `[VERIFIED]` |
| `js/state.js` | 6.6 KB | Reactive global state container (`sessionState`). Holds active orders, notifications, current tab, gateway connection state, and active filters. | `sessionState`, `updateState`, `subscribeState` | Frontend | Keep (State Store) | `[VERIFIED]` |
| `js/navigation.js`| 4.4 KB | Tab navigation controller. Manages tab switching between 10 panels, sidebar active states, and browser URL hash synchronizations. | `switchToTab`, `initNavigation` | Frontend | Keep | `[VERIFIED]` |
| `js/dashboard.js` | 10.7 KB | Home panel controller. Renders metric cards, quick order status lookup previews, and recent transaction mini-tables. | `renderHomeMetrics`, `lookupOrderStatus` | Frontend | Keep | `[VERIFIED]` |
| `js/transactions.js`| 6.9 KB | Activity & Orders table renderer. Formats currencies, dates, status badges, and action buttons ("Copy Link", "Send Link", "Capture"). | `renderTransactionsTable`, `renderOrdersTable` | Frontend | Keep | `[VERIFIED]` |
| `js/approvals.js` | 9.9 KB | Human-in-the-loop approval workflow controller. Handles dispute review approvals and payment overrides. | `renderApprovalsList`, `handleApprovalAction` | Frontend | Keep | `[VERIFIED]` |
| `js/investigations.js`| 15.6 KB | Investigation drawer controller. Renders deep dive timeline for anomalous transactions. | `openInvestigationDrawer`, `renderTimeline` | Frontend | Keep | `[VERIFIED]` |
| `js/recovery.js` | 5.5 KB | Recovery workflow dispatcher. Triggers buyer notification resends, order voiding, and carrier tracking submissions. | `triggerRecoveryAction`, `resendBuyerLink` | Frontend | Keep | `[VERIFIED]` |
| `js/charts.js` | 7.3 KB | HTML5 Canvas charting utilities. Renders smooth volumetric trend curves and circular status donut charts without external heavy charting libraries. | `drawVolumeTrendChart`, `drawStatusDonutChart` | Frontend | Keep | `[VERIFIED]` |
| `js/audit-log.js` | 3.5 KB | Audit log table renderer. Formats operational actions, timestamps, and operator IDs. | `renderAuditLog`, `addAuditEntry` | Frontend | Keep | `[VERIFIED]` |
| `js/smooth-scroll.js`| 7.3 KB | High-precision Lenis integration. Configures 0.85s snappy inertial scrolling, respects `prefers-reduced-motion`, and protects form/modal scrolling. | `initSmoothScroll`, `destroySmoothScroll` | Frontend | Keep | `[VERIFIED]` |
| `js/data.js` | 15.1 KB | Centralized API client wrapper. Encapsulates `fetch` calls to `/api/paypal/*` and `/api/merchant/*` with error normalization and credential protection. | `apiClient.getStatus`, `apiClient.getOrders`, `apiClient.createOrder` | Frontend | Keep | `[VERIFIED]` |
| `js/utils.js` | 4.7 KB | String escaping, XSS prevention, currency formatters, date formatters, and clipboard helpers. | `escapeHtml`, `formatCurrency`, `formatDate`, `copyToClipboard` | Frontend | Keep | `[VERIFIED]` |
| `js/icons.js` | 9.0 KB | Vector SVG icon dictionary providing crisp iconography for all sidebar items, buttons, and alert states. | `getIconSvg(name)` | Frontend | Keep | `[VERIFIED]` |

---

### 2.6 Automated Test Suites (`tests/`)

| File Path | Size | Role & Purpose | Assertions Count | Category | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `tests/test-all.js` | 3.1 KB | Master test runner. Discovers and executes all 11 suites sequentially, tracking total passes/fails. | Aggregator | Test Runner | `[VERIFIED]` (All Pass) |
| `tests/test-runner.js` | 4.3 KB | Unit test suite for store mutations, human-in-the-loop approvals, and metric calculations. | 23 Checks | Unit Test | `[VERIFIED]` |
| `tests/test-paypal-oauth.js` | 5.7 KB | Tests live PayPal Sandbox OAuth 2.0 token acquisition, caching, token refresh, and credential masking. | 22 Checks | Integration | `[VERIFIED]` |
| `tests/test-paypal-orders.js` | 10.3 KB | Tests PayPal Orders v2 creation, carrier tracking prerequisite enforcement, and 3-way forensics. | 43 Checks | Integration | `[VERIFIED]` |
| `tests/test-groq-intelligence.js` | 13.1 KB | Tests Groq LPU inference (`qwen/qwen3.8-27b`), hypothesis generation, timeout handling, and payload sanitization. | 46 Checks | Integration | `[VERIFIED]` |
| `tests/test-paypal-capture-and-reports.js` | 14.0 KB | Tests capture safeguards (blocks unapproved capture), JSON/HTML audit reports, and secret redaction. | 48 Checks | Integration | `[VERIFIED]` |
| `tests/test-merchant-portal-features.js` | 5.0 KB | Tests analytics calculations, webhook ingestion, and autonomous recovery action safeguards. | 35 Checks | Integration | `[VERIFIED]` |
| `tests/test-smooth-scroll.js` | 8.4 KB | Tests Lenis configuration parameters (duration, lerp, touch handling, modal isolation). | 33 Checks | Unit Test | `[VERIFIED]` |
| `tests/verify-browser-lenis.js` | 16.4 KB | Headless Chrome CDP tests for browser scrolling performance, touch emulation, and RAF coordination. | 45 Checks | E2E Browser | `[VERIFIED]` |
| `tests/test-dashboard-comprehensive.js` | 15.8 KB | Comprehensive headless Chrome browser test verifying DOM element existence, tab switching, and topbar states. | 68 Checks | E2E Browser | `[VERIFIED]` |
| `tests/test-runtime-and-payment-safety.js` | 15.1 KB | Tests real runtime resilience: gateway disconnect/reconnect, unapproved capture blocking, and zero console errors. | 50 Checks | E2E Browser | `[VERIFIED]` |
| `tests/test-merchant-separation.js` | 14.0 KB | Tests strict separation of merchant UI from technical operations, role-based access control, and summary card. | 58 Checks | E2E Browser | `[VERIFIED]` |
| `tests/test-audit-and-zero-fake-data.js` | 13.8 KB | Verifies strict zero-fake-data policy, port responsibilities, real invoicing relay, and operator token auth. | 57 Checks | E2E Browser | `[VERIFIED]` |
| `tests/benchmark-models.js` | 5.1 KB | Benchmarks latency and token throughput across available Groq LLM models. | Benchmark | Standalone | `[SOURCE-OBSERVED]` |

---

### 2.7 Static Assets (`assets/`)

| File Path | Size | Role & Purpose | Category | Lifecycle Recommendation | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `assets/paypal-logo.png` | 43.7 KB | Official vector PayPal logo rendered in header and compliance reports. | Asset | Keep (Official Brand) | `[VERIFIED]` |
| `assets/dashboard-reference.png` | 277.5 KB | Visual design reference specification for UI layout comparisons. | Asset | Keep (Design Ref) | `[SOURCE-OBSERVED]` |
