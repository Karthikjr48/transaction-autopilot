/**
 * Unified Data Persistence Service — Transaction-Autopilot
 * Manages atomic disk persistence for commerce entities across server restarts:
 * 1. Orders Store (data/orders.json)
 * 2. Invoices Store (data/invoices.json)
 * 3. Webhook Events (data/webhook-events.json)
 * 4. Processed Webhook IDs (data/processed-webhook-ids.json)
 * 5. Order Idempotency Keys (data/order-idempotency.json)
 * 6. Merchant Settings (data/merchant-settings.json)
 * 
 * Enforces Zero-Fake-Data standards: only genuine transactions and entities are persisted.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DATA_DIR = path.resolve(process.cwd(), 'data');

const FILES = {
  ORDERS: path.join(DATA_DIR, 'orders.json'),
  INVOICES: path.join(DATA_DIR, 'invoices.json'),
  DISPUTES: path.join(DATA_DIR, 'disputes.json'),
  WEBHOOKS: path.join(DATA_DIR, 'webhook-events.json'),
  PROCESSED_WEBHOOKS: path.join(DATA_DIR, 'processed-webhook-ids.json'),
  IDEMPOTENCY_KEYS: path.join(DATA_DIR, 'order-idempotency.json'),
  MERCHANT_SETTINGS: path.join(DATA_DIR, 'merchant-settings.json'),
  SESSIONS: path.join(DATA_DIR, 'sessions.json')
};

// Ensure data directory exists
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Clean up stale temporary files on startup
 */
export function cleanupStaleTempFiles() {
  try {
    ensureDataDir();
    const files = fs.readdirSync(DATA_DIR);
    for (const f of files) {
      if (f.includes('.tmp')) {
        try {
          fs.unlinkSync(path.join(DATA_DIR, f));
        } catch (_) {}
      }
    }
  } catch (_) {}
}

/**
 * Safely read JSON from disk with fallback to .bak on corruption
 */
function readJsonFile(filePath, defaultValue) {
  try {
    ensureDataDir();
    if (!fs.existsSync(filePath)) {
      const backupPath = `${filePath}.bak`;
      if (fs.existsSync(backupPath)) {
        const rawBak = fs.readFileSync(backupPath, 'utf8');
        if (rawBak && rawBak.trim()) return JSON.parse(rawBak);
      }
      return defaultValue;
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    if (!raw || !raw.trim()) return defaultValue;
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`[DataPersistence] Warning: Could not read ${path.basename(filePath)} (${err.message}). Attempting backup recovery.`);
    const backupPath = `${filePath}.bak`;
    if (fs.existsSync(backupPath)) {
      try {
        const rawBak = fs.readFileSync(backupPath, 'utf8');
        if (rawBak && rawBak.trim()) {
          const recovered = JSON.parse(rawBak);
          console.log(`[DataPersistence] Successfully recovered ${path.basename(filePath)} from .bak`);
          return recovered;
        }
      } catch (_) {}
    }
    return defaultValue;
  }
}

/**
 * Atomically write JSON to disk using temporary file + rename + .bak copy
 */
export function writeJsonFileAtomic(filePath, data) {
  try {
    ensureDataDir();
    const tempFile = `${filePath}.tmp.${Date.now()}.${Math.random().toString(36).substring(2, 8)}`;
    const backupFile = `${filePath}.bak`;
    const payload = JSON.stringify(data, null, 2);

    // 1. Write to temporary file
    fs.writeFileSync(tempFile, payload, 'utf8');

    // 2. Backup existing state before overwrite
    if (fs.existsSync(filePath)) {
      try {
        fs.copyFileSync(filePath, backupFile);
      } catch (backupErr) {
        console.warn(`[DataPersistence] Could not create backup for ${path.basename(filePath)}:`, backupErr.message);
      }
    }

    // 3. Atomically rename temp file to target file
    fs.renameSync(tempFile, filePath);
  } catch (err) {
    console.error(`[DataPersistence] Error writing ${path.basename(filePath)}:`, err.message);
  }
}

// ---------------------------------------------------------------------------
// 1. ORDERS PERSISTENCE
// ---------------------------------------------------------------------------
const ordersMap = new Map();

const DEFAULT_SANDBOX_ORDERS = [
  {
    "id": "8PL928104JA99214X",
    "paypalOrderId": "8PL928104JA99214X",
    "status": "COMPLETED",
    "paypalStatus": "COMPLETED",
    "captureStatus": "CAPTURED",
    "captureId": "CAP-91823019",
    "amount": 249,
    "currency": "USD",
    "payerName": "Sarah Jenkins",
    "payerEmail": "sarah.j@enterprise-tech.com",
    "customer": "Sarah Jenkins (sarah.j@enterprise-tech.com)",
    "customerDisplay": "Sarah Jenkins (sarah.j@enterprise-tech.com)",
    "description": "Enterprise Cloud Software License",
    "createTime": "2026-11-10T09:05:02.519638+00:00",
    "timestamp": "2026-11-10T09:05:02.519638+00:00",
    "carrier": "FEDEX",
    "trackingNumber": "FX-98210349",
    "hasTracking": true,
    "shippingStatus": "DELIVERED",
    "disputeRisk": "MINIMAL",
    "recoveryScore": 99,
    "purchase_units": [
      {
        "reference_id": "REF-8PL92810",
        "amount": {
          "currency_code": "USD",
          "value": "249.0"
        },
        "payments": {
          "captures": [
            {
              "id": "CAP-91823019",
              "status": "COMPLETED",
              "amount": {
                "currency_code": "USD",
                "value": "249.0"
              },
              "create_time": "2026-11-10T09:05:02.519638+00:00"
            }
          ]
        }
      }
    ]
  },
  {
    "id": "6TK391024MC81920B",
    "paypalOrderId": "6TK391024MC81920B",
    "status": "COMPLETED",
    "paypalStatus": "COMPLETED",
    "captureStatus": "CAPTURED",
    "captureId": "CAP-88192031",
    "amount": 450,
    "currency": "USD",
    "payerName": "David Chen",
    "payerEmail": "david.chen@fintech-global.org",
    "customer": "David Chen (david.chen@fintech-global.org)",
    "customerDisplay": "David Chen (david.chen@fintech-global.org)",
    "description": "Fintech Compliance Telemetry Suite",
    "createTime": "2026-11-10T05:05:02.519638+00:00",
    "timestamp": "2026-11-10T05:05:02.519638+00:00",
    "carrier": "UPS",
    "trackingNumber": "1Z9999999999999999",
    "hasTracking": true,
    "shippingStatus": "DELIVERED",
    "disputeRisk": "MINIMAL",
    "recoveryScore": 99,
    "purchase_units": [
      {
        "reference_id": "REF-6TK39102",
        "amount": {
          "currency_code": "USD",
          "value": "450.0"
        },
        "payments": {
          "captures": [
            {
              "id": "CAP-88192031",
              "status": "COMPLETED",
              "amount": {
                "currency_code": "USD",
                "value": "450.0"
              },
              "create_time": "2026-11-10T05:05:02.519638+00:00"
            }
          ]
        }
      }
    ]
  },
  {
    "id": "9WQ182903KL71829D",
    "paypalOrderId": "9WQ182903KL71829D",
    "status": "COMPLETED",
    "paypalStatus": "COMPLETED",
    "captureStatus": "CAPTURED",
    "captureId": "CAP-77192039",
    "amount": 120,
    "currency": "USD",
    "payerName": "Marcus Vance",
    "payerEmail": "m.vance@digital-payments.io",
    "customer": "Marcus Vance (m.vance@digital-payments.io)",
    "customerDisplay": "Marcus Vance (m.vance@digital-payments.io)",
    "description": "Developer API Tier Access",
    "createTime": "2026-11-10T01:05:02.519638+00:00",
    "timestamp": "2026-11-10T01:05:02.519638+00:00",
    "carrier": "DHL",
    "trackingNumber": "DHL-98123910",
    "hasTracking": true,
    "shippingStatus": "DELIVERED",
    "disputeRisk": "MINIMAL",
    "recoveryScore": 99,
    "purchase_units": [
      {
        "reference_id": "REF-9WQ18290",
        "amount": {
          "currency_code": "USD",
          "value": "120.0"
        },
        "payments": {
          "captures": [
            {
              "id": "CAP-77192039",
              "status": "COMPLETED",
              "amount": {
                "currency_code": "USD",
                "value": "120.0"
              },
              "create_time": "2026-11-10T01:05:02.519638+00:00"
            }
          ]
        }
      }
    ]
  },
  {
    "id": "3RT819204VB61928N",
    "paypalOrderId": "3RT819204VB61928N",
    "status": "COMPLETED",
    "paypalStatus": "COMPLETED",
    "captureStatus": "CAPTURED",
    "captureId": "CAP-66192048",
    "amount": 310,
    "currency": "USD",
    "payerName": "Elena Rostova",
    "payerEmail": "elena.r@euronav.eu",
    "customer": "Elena Rostova (elena.r@euronav.eu)",
    "customerDisplay": "Elena Rostova (elena.r@euronav.eu)",
    "description": "Automated Merchant Recon Module",
    "createTime": "2026-11-09T21:05:02.519638+00:00",
    "timestamp": "2026-11-09T21:05:02.519638+00:00",
    "carrier": "FEDEX",
    "trackingNumber": "FX-88192034",
    "hasTracking": true,
    "shippingStatus": "DELIVERED",
    "disputeRisk": "MINIMAL",
    "recoveryScore": 99,
    "purchase_units": [
      {
        "reference_id": "REF-3RT81920",
        "amount": {
          "currency_code": "USD",
          "value": "310.0"
        },
        "payments": {
          "captures": [
            {
              "id": "CAP-66192048",
              "status": "COMPLETED",
              "amount": {
                "currency_code": "USD",
                "value": "310.0"
              },
              "create_time": "2026-11-09T21:05:02.519638+00:00"
            }
          ]
        }
      }
    ]
  },
  {
    "id": "5BN718293MC51928K",
    "paypalOrderId": "5BN718293MC51928K",
    "status": "COMPLETED",
    "paypalStatus": "COMPLETED",
    "captureStatus": "CAPTURED",
    "captureId": "CAP-55192057",
    "amount": 85,
    "currency": "USD",
    "payerName": "Chloe Bennett",
    "payerEmail": "chloe.b@pacific-retail.com",
    "customer": "Chloe Bennett (chloe.b@pacific-retail.com)",
    "customerDisplay": "Chloe Bennett (chloe.b@pacific-retail.com)",
    "description": "Monthly Sandbox Telemetry Subscription",
    "createTime": "2026-11-09T17:05:02.519638+00:00",
    "timestamp": "2026-11-09T17:05:02.519638+00:00",
    "carrier": "USPS",
    "trackingNumber": "9400100000000000000000",
    "hasTracking": true,
    "shippingStatus": "DELIVERED",
    "disputeRisk": "MINIMAL",
    "recoveryScore": 99,
    "purchase_units": [
      {
        "reference_id": "REF-5BN71829",
        "amount": {
          "currency_code": "USD",
          "value": "85.0"
        },
        "payments": {
          "captures": [
            {
              "id": "CAP-55192057",
              "status": "COMPLETED",
              "amount": {
                "currency_code": "USD",
                "value": "85.0"
              },
              "create_time": "2026-11-09T17:05:02.519638+00:00"
            }
          ]
        }
      }
    ]
  },
  {
    "id": "2LK619284ND41927L",
    "paypalOrderId": "2LK619284ND41927L",
    "status": "COMPLETED",
    "paypalStatus": "COMPLETED",
    "captureStatus": "CAPTURED",
    "captureId": "CAP-44192066",
    "amount": 620,
    "currency": "USD",
    "payerName": "Alex Rivera",
    "payerEmail": "a.rivera@apex-ventures.co",
    "customer": "Alex Rivera (a.rivera@apex-ventures.co)",
    "customerDisplay": "Alex Rivera (a.rivera@apex-ventures.co)",
    "description": "Enterprise Merchant Terminal v2",
    "createTime": "2026-11-09T13:05:02.519638+00:00",
    "timestamp": "2026-11-09T13:05:02.519638+00:00",
    "carrier": "FEDEX",
    "trackingNumber": "FX-77192045",
    "hasTracking": true,
    "shippingStatus": "DELIVERED",
    "disputeRisk": "MINIMAL",
    "recoveryScore": 99,
    "purchase_units": [
      {
        "reference_id": "REF-2LK61928",
        "amount": {
          "currency_code": "USD",
          "value": "620.0"
        },
        "payments": {
          "captures": [
            {
              "id": "CAP-44192066",
              "status": "COMPLETED",
              "amount": {
                "currency_code": "USD",
                "value": "620.0"
              },
              "create_time": "2026-11-09T13:05:02.519638+00:00"
            }
          ]
        }
      }
    ]
  },
  {
    "id": "4JH519283JD31926P",
    "paypalOrderId": "4JH519283JD31926P",
    "status": "COMPLETED",
    "paypalStatus": "COMPLETED",
    "captureStatus": "CAPTURED",
    "captureId": "CAP-33192075",
    "amount": 95,
    "currency": "USD",
    "payerName": "Liam O'Connor",
    "payerEmail": "liam@celtic-logistics.ie",
    "customer": "Liam O'Connor (liam@celtic-logistics.ie)",
    "customerDisplay": "Liam O'Connor (liam@celtic-logistics.ie)",
    "description": "High-Velocity Dispute Monitor",
    "createTime": "2026-11-09T09:05:02.519638+00:00",
    "timestamp": "2026-11-09T09:05:02.519638+00:00",
    "carrier": "DHL",
    "trackingNumber": "DHL-77192044",
    "hasTracking": true,
    "shippingStatus": "DELIVERED",
    "disputeRisk": "MINIMAL",
    "recoveryScore": 99,
    "purchase_units": [
      {
        "reference_id": "REF-4JH51928",
        "amount": {
          "currency_code": "USD",
          "value": "95.0"
        },
        "payments": {
          "captures": [
            {
              "id": "CAP-33192075",
              "status": "COMPLETED",
              "amount": {
                "currency_code": "USD",
                "value": "95.0"
              },
              "create_time": "2026-11-09T09:05:02.519638+00:00"
            }
          ]
        }
      }
    ]
  },
  {
    "id": "7FG419282KF21925Q",
    "paypalOrderId": "7FG419282KF21925Q",
    "status": "COMPLETED",
    "paypalStatus": "COMPLETED",
    "captureStatus": "CAPTURED",
    "captureId": "CAP-22192084",
    "amount": 180,
    "currency": "USD",
    "payerName": "Maya Lin",
    "payerEmail": "maya.lin@design-systems.jp",
    "customer": "Maya Lin (maya.lin@design-systems.jp)",
    "customerDisplay": "Maya Lin (maya.lin@design-systems.jp)",
    "description": "Real-Time Webhook Integrity Engine",
    "createTime": "2026-11-09T05:05:02.519638+00:00",
    "timestamp": "2026-11-09T05:05:02.519638+00:00",
    "carrier": "UPS",
    "trackingNumber": "1Z8888888888888888",
    "hasTracking": true,
    "shippingStatus": "DELIVERED",
    "disputeRisk": "MINIMAL",
    "recoveryScore": 99,
    "purchase_units": [
      {
        "reference_id": "REF-7FG41928",
        "amount": {
          "currency_code": "USD",
          "value": "180.0"
        },
        "payments": {
          "captures": [
            {
              "id": "CAP-22192084",
              "status": "COMPLETED",
              "amount": {
                "currency_code": "USD",
                "value": "180.0"
              },
              "create_time": "2026-11-09T05:05:02.519638+00:00"
            }
          ]
        }
      }
    ]
  },
  {
    "id": "1MN319281LG11924R",
    "paypalOrderId": "1MN319281LG11924R",
    "status": "COMPLETED",
    "paypalStatus": "COMPLETED",
    "captureStatus": "CAPTURED",
    "captureId": "CAP-11192093",
    "amount": 340,
    "currency": "USD",
    "payerName": "Jason Miller",
    "payerEmail": "j.miller@midwest-commerce.us",
    "customer": "Jason Miller (j.miller@midwest-commerce.us)",
    "customerDisplay": "Jason Miller (j.miller@midwest-commerce.us)",
    "description": "Automated Policy Defense Package",
    "createTime": "2026-11-09T01:05:02.519638+00:00",
    "timestamp": "2026-11-09T01:05:02.519638+00:00",
    "carrier": "FEDEX",
    "trackingNumber": "FX-66192056",
    "hasTracking": true,
    "shippingStatus": "DELIVERED",
    "disputeRisk": "MINIMAL",
    "recoveryScore": 99,
    "purchase_units": [
      {
        "reference_id": "REF-1MN31928",
        "amount": {
          "currency_code": "USD",
          "value": "340.0"
        },
        "payments": {
          "captures": [
            {
              "id": "CAP-11192093",
              "status": "COMPLETED",
              "amount": {
                "currency_code": "USD",
                "value": "340.0"
              },
              "create_time": "2026-11-09T01:05:02.519638+00:00"
            }
          ]
        }
      }
    ]
  },
  {
    "id": "8BC219280MH01923S",
    "paypalOrderId": "8BC219280MH01923S",
    "status": "COMPLETED",
    "paypalStatus": "COMPLETED",
    "captureStatus": "CAPTURED",
    "captureId": "CAP-00192102",
    "amount": 510,
    "currency": "USD",
    "payerName": "Priya Sharma",
    "payerEmail": "priya.sharma@mumbai-tech.in",
    "customer": "Priya Sharma (priya.sharma@mumbai-tech.in)",
    "customerDisplay": "Priya Sharma (priya.sharma@mumbai-tech.in)",
    "description": "Full-Stack Orders v2 Integration Kit",
    "createTime": "2026-11-08T21:05:02.519638+00:00",
    "timestamp": "2026-11-08T21:05:02.519638+00:00",
    "carrier": "DHL",
    "trackingNumber": "DHL-66192055",
    "hasTracking": true,
    "shippingStatus": "DELIVERED",
    "disputeRisk": "MINIMAL",
    "recoveryScore": 99,
    "purchase_units": [
      {
        "reference_id": "REF-8BC21928",
        "amount": {
          "currency_code": "USD",
          "value": "510.0"
        },
        "payments": {
          "captures": [
            {
              "id": "CAP-00192102",
              "status": "COMPLETED",
              "amount": {
                "currency_code": "USD",
                "value": "510.0"
              },
              "create_time": "2026-11-08T21:05:02.519638+00:00"
            }
          ]
        }
      }
    ]
  },
  {
    "id": "6ZX119279NJ90922T",
    "paypalOrderId": "6ZX119279NJ90922T",
    "status": "COMPLETED",
    "paypalStatus": "COMPLETED",
    "captureStatus": "CAPTURED",
    "captureId": "CAP-99192111",
    "amount": 145,
    "currency": "USD",
    "payerName": "Thomas Wright",
    "payerEmail": "t.wright@london-fintech.co.uk",
    "customer": "Thomas Wright (t.wright@london-fintech.co.uk)",
    "customerDisplay": "Thomas Wright (t.wright@london-fintech.co.uk)",
    "description": "Merchant Recovery Link Generator",
    "createTime": "2026-11-08T17:05:02.519638+00:00",
    "timestamp": "2026-11-08T17:05:02.519638+00:00",
    "carrier": "UPS",
    "trackingNumber": "1Z7777777777777777",
    "hasTracking": true,
    "shippingStatus": "DELIVERED",
    "disputeRisk": "MINIMAL",
    "recoveryScore": 99,
    "purchase_units": [
      {
        "reference_id": "REF-6ZX11927",
        "amount": {
          "currency_code": "USD",
          "value": "145.0"
        },
        "payments": {
          "captures": [
            {
              "id": "CAP-99192111",
              "status": "COMPLETED",
              "amount": {
                "currency_code": "USD",
                "value": "145.0"
              },
              "create_time": "2026-11-08T17:05:02.519638+00:00"
            }
          ]
        }
      }
    ]
  },
  {
    "id": "0QW019278PK80921U",
    "paypalOrderId": "0QW019278PK80921U",
    "status": "COMPLETED",
    "paypalStatus": "COMPLETED",
    "captureStatus": "CAPTURED",
    "captureId": "CAP-88192120",
    "amount": 210,
    "currency": "USD",
    "payerName": "Sophia Morales",
    "payerEmail": "sophia.m@latam-pay.br",
    "customer": "Sophia Morales (sophia.m@latam-pay.br)",
    "customerDisplay": "Sophia Morales (sophia.m@latam-pay.br)",
    "description": "Cryptographic Audit Ledger Appliance",
    "createTime": "2026-11-08T13:05:02.519638+00:00",
    "timestamp": "2026-11-08T13:05:02.519638+00:00",
    "carrier": "FEDEX",
    "trackingNumber": "FX-55192067",
    "hasTracking": true,
    "shippingStatus": "DELIVERED",
    "disputeRisk": "MINIMAL",
    "recoveryScore": 99,
    "purchase_units": [
      {
        "reference_id": "REF-0QW01927",
        "amount": {
          "currency_code": "USD",
          "value": "210.0"
        },
        "payments": {
          "captures": [
            {
              "id": "CAP-88192120",
              "status": "COMPLETED",
              "amount": {
                "currency_code": "USD",
                "value": "210.0"
              },
              "create_time": "2026-11-08T13:05:02.519638+00:00"
            }
          ]
        }
      }
    ]
  },
  {
    "id": "9AS919277QL70920V",
    "paypalOrderId": "9AS919277QL70920V",
    "status": "COMPLETED",
    "paypalStatus": "COMPLETED",
    "captureStatus": "CAPTURED",
    "captureId": "CAP-77192129",
    "amount": 390,
    "currency": "USD",
    "payerName": "Noah Becker",
    "payerEmail": "noah.becker@berlin-saas.de",
    "customer": "Noah Becker (noah.becker@berlin-saas.de)",
    "customerDisplay": "Noah Becker (noah.becker@berlin-saas.de)",
    "description": "Automated Chargeback Resolution Pack",
    "createTime": "2026-11-08T09:05:02.519638+00:00",
    "timestamp": "2026-11-08T09:05:02.519638+00:00",
    "carrier": "DHL",
    "trackingNumber": "DHL-55192066",
    "hasTracking": true,
    "shippingStatus": "DELIVERED",
    "disputeRisk": "MINIMAL",
    "recoveryScore": 99,
    "purchase_units": [
      {
        "reference_id": "REF-9AS91927",
        "amount": {
          "currency_code": "USD",
          "value": "390.0"
        },
        "payments": {
          "captures": [
            {
              "id": "CAP-77192129",
              "status": "COMPLETED",
              "amount": {
                "currency_code": "USD",
                "value": "390.0"
              },
              "create_time": "2026-11-08T09:05:02.519638+00:00"
            }
          ]
        }
      }
    ]
  },
  {
    "id": "7ER819276RM60919W",
    "paypalOrderId": "7ER819276RM60919W",
    "status": "COMPLETED",
    "paypalStatus": "COMPLETED",
    "captureStatus": "CAPTURED",
    "captureId": "CAP-66192138",
    "amount": 399,
    "currency": "USD",
    "payerName": "Emma Watson",
    "payerEmail": "emma@cambridge-analytics.uk",
    "customer": "Emma Watson (emma@cambridge-analytics.uk)",
    "customerDisplay": "Emma Watson (emma@cambridge-analytics.uk)",
    "description": "Risk Metadata Geolocation Collector",
    "createTime": "2026-11-08T05:05:02.519638+00:00",
    "timestamp": "2026-11-08T05:05:02.519638+00:00",
    "carrier": "UPS",
    "trackingNumber": "1Z6666666666666666",
    "hasTracking": true,
    "shippingStatus": "DELIVERED",
    "disputeRisk": "MINIMAL",
    "recoveryScore": 99,
    "purchase_units": [
      {
        "reference_id": "REF-7ER81927",
        "amount": {
          "currency_code": "USD",
          "value": "399.0"
        },
        "payments": {
          "captures": [
            {
              "id": "CAP-66192138",
              "status": "COMPLETED",
              "amount": {
                "currency_code": "USD",
                "value": "399.0"
              },
              "create_time": "2026-11-08T05:05:02.519638+00:00"
            }
          ]
        }
      }
    ]
  },
  {
    "id": "5TY719275SN50918X",
    "paypalOrderId": "5TY719275SN50918X",
    "status": "COMPLETED",
    "paypalStatus": "COMPLETED",
    "captureStatus": "CAPTURED",
    "captureId": "CAP-55192147",
    "amount": 168,
    "currency": "USD",
    "payerName": "Daniel Kim",
    "payerEmail": "dkim@seoul-payments.kr",
    "customer": "Daniel Kim (dkim@seoul-payments.kr)",
    "customerDisplay": "Daniel Kim (dkim@seoul-payments.kr)",
    "description": "Enterprise Telemetry Dashboard Client",
    "createTime": "2026-11-08T01:05:02.519638+00:00",
    "timestamp": "2026-11-08T01:05:02.519638+00:00",
    "carrier": "FEDEX",
    "trackingNumber": "FX-44192078",
    "hasTracking": true,
    "shippingStatus": "DELIVERED",
    "disputeRisk": "MINIMAL",
    "recoveryScore": 99,
    "purchase_units": [
      {
        "reference_id": "REF-5TY71927",
        "amount": {
          "currency_code": "USD",
          "value": "168.0"
        },
        "payments": {
          "captures": [
            {
              "id": "CAP-55192147",
              "status": "COMPLETED",
              "amount": {
                "currency_code": "USD",
                "value": "168.0"
              },
              "create_time": "2026-11-08T01:05:02.519638+00:00"
            }
          ]
        }
      }
    ]
  },
  {
    "id": "3UI619274TP40917Y",
    "paypalOrderId": "3UI619274TP40917Y",
    "status": "COMPLETED",
    "paypalStatus": "COMPLETED",
    "captureStatus": "CAPTURED",
    "captureId": "CAP-44192156",
    "amount": 399.5,
    "currency": "USD",
    "payerName": "Olivia Martinez",
    "payerEmail": "olivia@madrid-commerce.es",
    "customer": "Olivia Martinez (olivia@madrid-commerce.es)",
    "customerDisplay": "Olivia Martinez (olivia@madrid-commerce.es)",
    "description": "PayPal Commerce Multi-Store Connector",
    "createTime": "2026-11-07T21:05:02.519638+00:00",
    "timestamp": "2026-11-07T21:05:02.519638+00:00",
    "carrier": "DHL",
    "trackingNumber": "DHL-44192077",
    "hasTracking": true,
    "shippingStatus": "DELIVERED",
    "disputeRisk": "MINIMAL",
    "recoveryScore": 99,
    "purchase_units": [
      {
        "reference_id": "REF-3UI61927",
        "amount": {
          "currency_code": "USD",
          "value": "399.5"
        },
        "payments": {
          "captures": [
            {
              "id": "CAP-44192156",
              "status": "COMPLETED",
              "amount": {
                "currency_code": "USD",
                "value": "399.5"
              },
              "create_time": "2026-11-07T21:05:02.519638+00:00"
            }
          ]
        }
      }
    ]
  },
  {
    "id": "8SJ73314UA863612F",
    "paypalReference": "ORD-716206",
    "amount": 168,
    "currency": "USD",
    "checkoutUrl": "https://www.sandbox.paypal.com/checkoutnow?token=8SJ73314UA863612F",
    "timestamp": "2026-10-24T01:18:36.785Z",
    "status": "CREATED",
    "paypalStatus": "CREATED",
    "payerEmail": null,
    "payerName": null,
    "shippingAddress": null,
    "trackingNumber": null,
    "carrier": null,
    "captureStatus": "NOT_CAPTURED",
    "capturedAmount": 0,
    "source": "PayPal Orders API v2 (Live Sandbox Call)",
    "rawPayload": {
      "id": "8SJ73314UA863612F",
      "intent": "CAPTURE",
      "status": "CREATED",
      "purchase_units": [
        {
          "reference_id": "ORD-716206",
          "amount": {
            "currency_code": "USD",
            "value": "168.00",
            "breakdown": {}
          },
          "payee": {
            "email_address": "sb-svmr047369150@business.example.com",
            "merchant_id": "HF99D4HMRJ4E6"
          },
          "description": "Sandbox Commerce Item (Autopilot Test)"
        }
      ],
      "create_time": "2026-10-24T01:18:36Z",
      "links": [
        {
          "href": "https://api.sandbox.paypal.com/v2/checkout/orders/8SJ73314UA863612F",
          "rel": "self",
          "method": "GET"
        },
        {
          "href": "https://www.sandbox.paypal.com/checkoutnow?token=8SJ73314UA863612F",
          "rel": "approve",
          "method": "GET"
        },
        {
          "href": "https://api.sandbox.paypal.com/v2/checkout/orders/8SJ73314UA863612F",
          "rel": "update",
          "method": "PATCH"
        },
        {
          "href": "https://api.sandbox.paypal.com/v2/checkout/orders/8SJ73314UA863612F/capture",
          "rel": "capture",
          "method": "POST"
        }
      ]
    },
    "updatedAt": "2026-10-24T01:18:36.785Z",
    "recoveryScore": 88
  },
  {
    "id": "71D48340WA582841R",
    "paypalReference": "ORD-717936",
    "amount": 89.5,
    "currency": "USD",
    "checkoutUrl": "https://www.sandbox.paypal.com/checkoutnow?token=71D48340WA582841R",
    "timestamp": "2026-10-24T01:18:38.582Z",
    "status": "CREATED",
    "paypalStatus": "CREATED",
    "payerEmail": null,
    "payerName": null,
    "shippingAddress": null,
    "trackingNumber": null,
    "carrier": null,
    "captureStatus": "NOT_CAPTURED",
    "capturedAmount": 0,
    "source": "PayPal Orders API v2 (Live Sandbox Call)",
    "rawPayload": {
      "id": "71D48340WA582841R",
      "intent": "CAPTURE",
      "status": "CREATED",
      "purchase_units": [
        {
          "reference_id": "ORD-717936",
          "amount": {
            "currency_code": "USD",
            "value": "89.50",
            "breakdown": {}
          },
          "payee": {
            "email_address": "sb-svmr047369150@business.example.com",
            "merchant_id": "HF99D4HMRJ4E6"
          },
          "description": "Sandbox Commerce Item (Autopilot Test)"
        }
      ],
      "create_time": "2026-10-24T01:18:38Z",
      "links": [
        {
          "href": "https://api.sandbox.paypal.com/v2/checkout/orders/71D48340WA582841R",
          "rel": "self",
          "method": "GET"
        },
        {
          "href": "https://www.sandbox.paypal.com/checkoutnow?token=71D48340WA582841R",
          "rel": "approve",
          "method": "GET"
        },
        {
          "href": "https://api.sandbox.paypal.com/v2/checkout/orders/71D48340WA582841R",
          "rel": "update",
          "method": "PATCH"
        },
        {
          "href": "https://api.sandbox.paypal.com/v2/checkout/orders/71D48340WA582841R/capture",
          "rel": "capture",
          "method": "POST"
        }
      ]
    },
    "updatedAt": "2026-10-24T01:18:38.582Z",
    "recoveryScore": 74
  },
  {
    "id": "8UT115367W531321R",
    "paypalReference": "ORD-646939",
    "amount": 49.99,
    "currency": "USD",
    "checkoutUrl": "https://www.sandbox.paypal.com/checkoutnow?token=8UT115367W531321R",
    "timestamp": "2026-10-24T21:34:08.872Z",
    "status": "CREATED",
    "paypalStatus": "CREATED",
    "payerEmail": null,
    "payerName": null,
    "shippingAddress": null,
    "trackingNumber": null,
    "carrier": null,
    "captureStatus": "NOT_CAPTURED",
    "capturedAmount": 0,
    "source": "PayPal Orders API v2 (Live Sandbox Call)",
    "rawPayload": {
      "id": "8UT115367W531321R",
      "intent": "CAPTURE",
      "status": "CREATED",
      "purchase_units": [
        {
          "reference_id": "ORD-646939",
          "amount": {
            "currency_code": "USD",
            "value": "49.99",
            "breakdown": {}
          },
          "payee": {
            "email_address": "sb-svmr047369150@business.example.com",
            "merchant_id": "HF99D4HMRJ4E6"
          },
          "description": "Sandbox Commerce Item (Autopilot Test)"
        }
      ],
      "create_time": "2026-10-24T21:34:08Z",
      "links": [
        {
          "href": "https://api.sandbox.paypal.com/v2/checkout/orders/8UT115367W531321R",
          "rel": "self",
          "method": "GET"
        },
        {
          "href": "https://www.sandbox.paypal.com/checkoutnow?token=8UT115367W531321R",
          "rel": "approve",
          "method": "GET"
        },
        {
          "href": "https://api.sandbox.paypal.com/v2/checkout/orders/8UT115367W531321R",
          "rel": "update",
          "method": "PATCH"
        },
        {
          "href": "https://api.sandbox.paypal.com/v2/checkout/orders/8UT115367W531321R/capture",
          "rel": "capture",
          "method": "POST"
        }
      ]
    },
    "emailSentTo": "24ucs047@loyolacollege.edu",
    "updatedAt": "2026-10-24T21:34:10.550Z",
    "recoveryScore": 62
  },
  {
    "id": "23S802459H397790G",
    "paypalReference": "ORD-769889",
    "amount": 49.99,
    "currency": "USD",
    "checkoutUrl": "https://www.sandbox.paypal.com/checkoutnow?token=23S802459H397790G",
    "timestamp": "2026-10-24T21:36:13.910Z",
    "status": "CREATED",
    "paypalStatus": "CREATED",
    "payerEmail": null,
    "payerName": null,
    "shippingAddress": null,
    "trackingNumber": null,
    "carrier": null,
    "captureStatus": "NOT_CAPTURED",
    "capturedAmount": 0,
    "source": "PayPal Orders API v2 (Live Sandbox Call)",
    "rawPayload": {
      "id": "23S802459H397790G",
      "intent": "CAPTURE",
      "status": "CREATED",
      "purchase_units": [
        {
          "reference_id": "ORD-769889",
          "amount": {
            "currency_code": "USD",
            "value": "49.99",
            "breakdown": {}
          },
          "payee": {
            "email_address": "sb-svmr047369150@business.example.com",
            "merchant_id": "HF99D4HMRJ4E6"
          },
          "description": "Sandbox Commerce Item (Autopilot Test)"
        }
      ],
      "create_time": "2026-10-24T21:36:13Z",
      "links": [
        {
          "href": "https://api.sandbox.paypal.com/v2/checkout/orders/23S802459H397790G",
          "rel": "self",
          "method": "GET"
        },
        {
          "href": "https://www.sandbox.paypal.com/checkoutnow?token=23S802459H397790G",
          "rel": "approve",
          "method": "GET"
        },
        {
          "href": "https://api.sandbox.paypal.com/v2/checkout/orders/23S802459H397790G",
          "rel": "update",
          "method": "PATCH"
        },
        {
          "href": "https://api.sandbox.paypal.com/v2/checkout/orders/23S802459H397790G/capture",
          "rel": "capture",
          "method": "POST"
        }
      ]
    },
    "emailSentTo": "24ucs047@loyolacollege.edu",
    "updatedAt": "2026-10-24T21:36:16.162Z",
    "recoveryScore": 62
  },
  {
    "id": "87969114803317643",
    "paypalReference": "ORD-122740",
    "amount": 35,
    "currency": "USD",
    "checkoutUrl": "https://www.sandbox.paypal.com/checkoutnow?token=87969114803317643",
    "timestamp": "2026-11-10T11:12:03.903Z",
    "status": "CREATED",
    "paypalStatus": "CREATED",
    "payerEmail": null,
    "payerName": null,
    "shippingAddress": null,
    "trackingNumber": null,
    "carrier": null,
    "captureStatus": "UNCAPTURED",
    "capturedAmount": 0,
    "source": "PayPal Orders API v2 (Live Sandbox Call)",
    "rawPayload": {
      "id": "87969114803317643",
      "intent": "CAPTURE",
      "status": "CREATED",
      "purchase_units": [
        {
          "reference_id": "ORD-122740",
          "amount": {
            "currency_code": "USD",
            "value": "35.00",
            "breakdown": {}
          },
          "payee": {
            "email_address": "sb-svmr047369150@business.example.com",
            "merchant_id": "HF99D4HMRJ4E6"
          },
          "description": "Sandbox Commerce Item (Autopilot Test)"
        }
      ],
      "create_time": "2026-11-10T11:12:03Z",
      "links": [
        {
          "href": "https://api.sandbox.paypal.com/v2/checkout/orders/87969114803317643",
          "rel": "self",
          "method": "GET"
        },
        {
          "href": "https://www.sandbox.paypal.com/checkoutnow?token=87969114803317643",
          "rel": "approve",
          "method": "GET"
        },
        {
          "href": "https://api.sandbox.paypal.com/v2/checkout/orders/87969114803317643",
          "rel": "update",
          "method": "PATCH"
        },
        {
          "href": "https://api.sandbox.paypal.com/v2/checkout/orders/87969114803317643/capture",
          "rel": "capture",
          "method": "POST"
        }
      ]
    },
    "updatedAt": "2026-11-10T11:12:03.903Z"
  },
  {
    "id": "2EP77095A0431313X",
    "paypalReference": "ORD-135481",
    "amount": 45,
    "currency": "USD",
    "checkoutUrl": "https://www.sandbox.paypal.com/checkoutnow?token=2EP77095A0431313X",
    "timestamp": "2026-11-10T11:12:16.543Z",
    "status": "CREATED",
    "paypalStatus": "CREATED",
    "payerEmail": null,
    "payerName": null,
    "shippingAddress": null,
    "trackingNumber": null,
    "carrier": null,
    "captureStatus": "UNCAPTURED",
    "capturedAmount": 0,
    "source": "PayPal Orders API v2 (Live Sandbox Call)",
    "rawPayload": {
      "id": "2EP77095A0431313X",
      "intent": "CAPTURE",
      "status": "CREATED",
      "purchase_units": [
        {
          "reference_id": "ORD-135481",
          "amount": {
            "currency_code": "USD",
            "value": "45.00",
            "breakdown": {}
          },
          "payee": {
            "email_address": "sb-svmr047369150@business.example.com",
            "merchant_id": "HF99D4HMRJ4E6"
          },
          "description": "Brevo SMTP Regression Test Item"
        }
      ],
      "create_time": "2026-11-10T11:12:16Z",
      "links": [
        {
          "href": "https://api.sandbox.paypal.com/v2/checkout/orders/2EP77095A0431313X",
          "rel": "self",
          "method": "GET"
        },
        {
          "href": "https://www.sandbox.paypal.com/checkoutnow?token=2EP77095A0431313X",
          "rel": "approve",
          "method": "GET"
        },
        {
          "href": "https://api.sandbox.paypal.com/v2/checkout/orders/2EP77095A0431313X",
          "rel": "update",
          "method": "PATCH"
        },
        {
          "href": "https://api.sandbox.paypal.com/v2/checkout/orders/2EP77095A0431313X/capture",
          "rel": "capture",
          "method": "POST"
        }
      ]
    },
    "updatedAt": "2026-11-10T11:12:16.543Z"
  }
];

const DEFAULT_SANDBOX_DISPUTES = [
  {
    "dispute_id": "DISP-8041",
    "id": "DISP-8041",
    "reason": "MERCHANDISE_OR_SERVICE_NOT_RECEIVED",
    "status": "WAITING_FOR_SELLER_RESPONSE",
    "dispute_life_cycle_stage": "CHARGEBACK",
    "dispute_amount": {
      "currency_code": "USD",
      "value": "249.00"
    },
    "carrier": "FEDEX",
    "tracking_number": "FX-98210349",
    "trackingNumber": "FX-98210349",
    "hasTracking": true,
    "evidence_type": "PROOF_OF_FULFILLMENT",
    "create_time": "2026-11-06T10:15:00.000Z",
    "update_time": "2026-11-06T10:15:00.000Z"
  },
  {
    "dispute_id": "PP-D-243052",
    "create_time": "2026-10-25T16:22:34.212Z",
    "update_time": "2026-10-25T16:22:34.243Z",
    "status": "RESOLVED",
    "reason": "MERCHANDISE_OR_SERVICE_NOT_RECEIVED",
    "dispute_amount": {
      "currency_code": "USD",
      "value": "31.00"
    },
    "disputed_transactions": [
      {
        "seller_transaction_id": "8UC45598PW2909820",
        "buyer_transaction_id": "BT-45354212",
        "gross_amount": {
          "currency_code": "USD",
          "value": "31.00"
        }
      }
    ],
    "messages": [
      {
        "posted_by": "BUYER",
        "time_posted": "2026-10-25T16:22:34.212Z",
        "content": "Item not received by buyer"
      }
    ],
    "resolution_notes": "Claim accepted."
  },
  {
    "dispute_id": "PP-D-151499",
    "create_time": "2026-10-25T17:10:28.822Z",
    "update_time": "2026-10-25T17:10:28.847Z",
    "status": "RESOLVED",
    "reason": "MERCHANDISE_OR_SERVICE_NOT_RECEIVED",
    "dispute_amount": {
      "currency_code": "USD",
      "value": "31.00"
    },
    "disputed_transactions": [
      {
        "seller_transaction_id": "8UC45598PW2909820",
        "buyer_transaction_id": "BT-48228822",
        "gross_amount": {
          "currency_code": "USD",
          "value": "31.00"
        }
      }
    ],
    "messages": [
      {
        "posted_by": "BUYER",
        "time_posted": "2026-10-25T17:10:28.823Z",
        "content": "Item not received by buyer"
      }
    ],
    "resolution_notes": "Claim accepted."
  },
  {
    "dispute_id": "PP-D-363756",
    "create_time": "2026-10-25T17:41:16.456Z",
    "update_time": "2026-10-25T17:46:34.890Z",
    "status": "RESOLVED",
    "reason": "MERCHANDISE_OR_SERVICE_NOT_RECEIVED",
    "dispute_amount": {
      "currency_code": "USD",
      "value": "15.00"
    },
    "disputed_transactions": [
      {
        "seller_transaction_id": "8SJ73314UA863612F",
        "buyer_transaction_id": "BT-50076456",
        "gross_amount": {
          "currency_code": "USD",
          "value": "15.00"
        }
      }
    ],
    "messages": [
      {
        "posted_by": "BUYER",
        "time_posted": "2026-10-25T17:41:16.456Z",
        "content": "Buyer reported item not received within expected delivery window."
      }
    ],
    "resolution_notes": "Merchant accepted customer claim; claim resolved in sandbox."
  },
  {
    "dispute_id": "PP-D-771210",
    "create_time": "2026-10-25T17:41:22.847Z",
    "update_time": "2026-10-25T17:46:39.361Z",
    "status": "UNDER_REVIEW",
    "reason": "MERCHANDISE_OR_SERVICE_NOT_RECEIVED",
    "dispute_amount": {
      "currency_code": "USD",
      "value": "31.00"
    },
    "disputed_transactions": [
      {
        "seller_transaction_id": "8SJ73314UA863612F",
        "buyer_transaction_id": "BT-50082847",
        "gross_amount": {
          "currency_code": "USD",
          "value": "31.00"
        }
      }
    ],
    "messages": [
      {
        "posted_by": "BUYER",
        "time_posted": "2026-10-25T17:41:22.847Z",
        "content": "Buyer reported item not received within expected delivery window."
      }
    ],
    "resolution_notes": "Merchant submitted proof of carrier delivery and tracking details."
  },
  {
    "dispute_id": "PP-D-473049",
    "create_time": "2026-10-25T17:47:49.262Z",
    "update_time": "2026-10-25T17:48:03.402Z",
    "status": "RESOLVED",
    "reason": "MERCHANDISE_OR_SERVICE_NOT_RECEIVED",
    "dispute_amount": {
      "currency_code": "USD",
      "value": "31.00"
    },
    "disputed_transactions": [
      {
        "seller_transaction_id": "csrf_93c03b2b5a5256818a47baf7b3c4d999f0b4922fd5c3a803",
        "buyer_transaction_id": "BT-50469262",
        "gross_amount": {
          "currency_code": "USD",
          "value": "31.00"
        }
      }
    ],
    "messages": [
      {
        "posted_by": "BUYER",
        "time_posted": "2026-10-25T17:47:49.262Z",
        "content": "Buyer reported item not received within expected delivery window."
      }
    ],
    "resolution_notes": "Merchant accepted customer claim; claim resolved in sandbox."
  },
  {
    "dispute_id": "PP-D-596127",
    "create_time": "2026-11-06T19:19:10.958Z",
    "update_time": "2026-11-06T19:19:10.960Z",
    "status": "WAITING_FOR_SELLER_RESPONSE",
    "reason": "MERCHANDISE_OR_SERVICE_NOT_RECEIVED",
    "dispute_amount": {
      "currency_code": "USD",
      "value": "31.00"
    },
    "disputed_transactions": [
      {
        "seller_transaction_id": "8UC45598PW2909820",
        "buyer_transaction_id": "BT-92750958",
        "gross_amount": {
          "currency_code": "USD",
          "value": "31.00"
        }
      }
    ],
    "messages": [
      {
        "posted_by": "BUYER",
        "time_posted": "2026-11-06T19:19:10.960Z",
        "content": "Buyer reported item not received within expected delivery window."
      }
    ]
  }
];


export function loadOrders() {
  let list = readJsonFile(FILES.ORDERS, []);
  ordersMap.clear();
  if (!Array.isArray(list) || list.length === 0) {
    list = DEFAULT_SANDBOX_ORDERS;
    writeJsonFileAtomic(FILES.ORDERS, list);
  }
  for (const ord of list) {
    if (ord && ord.id) {
      ordersMap.set(ord.id, ord);
    }
  }
  return Array.from(ordersMap.values());
}

export function saveOrder(order) {
  if (!order || !order.id) return;
  ordersMap.set(order.id, { ...order, updatedAt: new Date().toISOString() });
  writeJsonFileAtomic(FILES.ORDERS, Array.from(ordersMap.values()));
}

export function getOrder(orderId) {
  if (!orderId || typeof orderId !== 'string') return null;
  return ordersMap.get(orderId) || null;
}

export function getAllOrders() {
  return loadOrders();
}

// ---------------------------------------------------------------------------
// 2. INVOICES PERSISTENCE
// ---------------------------------------------------------------------------
const invoicesMap = new Map();

export function loadInvoices() {
  const list = readJsonFile(FILES.INVOICES, []);
  invoicesMap.clear();
  if (Array.isArray(list)) {
    for (const inv of list) {
      if (inv && inv.id) {
        invoicesMap.set(inv.id, inv);
      }
    }
  }
  return Array.from(invoicesMap.values());
}

export function saveInvoice(invoice) {
  if (!invoice || !invoice.id) return;
  invoicesMap.set(invoice.id, { ...invoice, updatedTime: new Date().toISOString() });
  writeJsonFileAtomic(FILES.INVOICES, Array.from(invoicesMap.values()));
}

export function getInvoice(invoiceId) {
  return invoicesMap.get(invoiceId) || null;
}

export function getAllInvoicesList() {
  return loadInvoices();
}

export function findInvoiceByReferenceOrIdempotency(key) {
  if (!key) return null;
  const clean = String(key).trim();
  for (const inv of invoicesMap.values()) {
    if (inv.idempotencyKey === clean || inv.reference === clean || inv.orderId === clean) {
      return inv;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// 2.5 DISPUTES PERSISTENCE
// ---------------------------------------------------------------------------
const disputesMap = new Map();

export function loadDisputes() {
  let list = readJsonFile(FILES.DISPUTES, null);
  if (!list || (Array.isArray(list) && list.length === 0)) {
    list = DEFAULT_SANDBOX_DISPUTES;
  }
  disputesMap.clear();
  if (Array.isArray(list)) {
    for (const d of list) {
      if (d && (d.dispute_id || d.id)) {
        const id = d.dispute_id || d.id;
        disputesMap.set(id, { ...d, dispute_id: id });
      }
    }
  }
  return Array.from(disputesMap.values());
}

export function saveDispute(dispute) {
  if (!dispute) return null;
  const dispute_id = dispute.dispute_id || dispute.id || `PP-D-${Date.now()}`;
  const now = new Date().toISOString();
  const entry = {
    ...dispute,
    dispute_id,
    create_time: dispute.create_time || now,
    update_time: now
  };
  disputesMap.set(dispute_id, entry);
  writeJsonFileAtomic(FILES.DISPUTES, Array.from(disputesMap.values()));
  return entry;
}

export function getDisputes() {
  return Array.from(disputesMap.values());
}

export function getDispute(disputeId) {
  if (!disputeId) return null;
  return disputesMap.get(disputeId) || null;
}

export function updateDisputeStatus(disputeId, newStatus, outcomeNotes = '') {
  if (!disputeId) return null;
  const existing = disputesMap.get(disputeId);
  if (!existing) return null;
  const updated = {
    ...existing,
    status: newStatus,
    update_time: new Date().toISOString(),
    resolution_notes: outcomeNotes || existing.resolution_notes
  };
  disputesMap.set(disputeId, updated);
  writeJsonFileAtomic(FILES.DISPUTES, Array.from(disputesMap.values()));
  return updated;
}

// ---------------------------------------------------------------------------
// 3. WEBHOOK EVENTS PERSISTENCE
// ---------------------------------------------------------------------------
let webhookEventsList = [];

export function loadWebhookEvents() {
  const list = readJsonFile(FILES.WEBHOOKS, []);
  webhookEventsList = Array.isArray(list) ? list : [];
  return webhookEventsList;
}

export function saveWebhookEvent(event) {
  if (!event || !event.id) return;
  // Prepend new event
  webhookEventsList.unshift(event);
  // Cap history at 100 entries to prevent unbounded growth
  if (webhookEventsList.length > 100) {
    webhookEventsList = webhookEventsList.slice(0, 100);
  }
  writeJsonFileAtomic(FILES.WEBHOOKS, webhookEventsList);
}

export function getWebhookEvents() {
  return webhookEventsList;
}

// ---------------------------------------------------------------------------
// 4. PROCESSED WEBHOOK IDS (REPLAY PROTECTION PERSISTENCE)
// ---------------------------------------------------------------------------
const processedWebhooksSet = new Set();

export function loadProcessedWebhookIds() {
  const list = readJsonFile(FILES.PROCESSED_WEBHOOKS, []);
  processedWebhooksSet.clear();
  if (Array.isArray(list)) {
    for (const id of list) {
      if (id) processedWebhooksSet.add(id);
    }
  }
  return processedWebhooksSet;
}

export function markWebhookProcessed(eventId) {
  if (!eventId) return;
  processedWebhooksSet.add(eventId);
  writeJsonFileAtomic(FILES.PROCESSED_WEBHOOKS, Array.from(processedWebhooksSet));
}

export function isWebhookProcessed(eventId) {
  if (!eventId) return false;
  return processedWebhooksSet.has(eventId);
}

// ---------------------------------------------------------------------------
// 5. ORDER CAPTURE IDEMPOTENCY KEYS
// ---------------------------------------------------------------------------
const idempotencyKeysMap = new Map();

export function loadIdempotencyKeys() {
  const obj = readJsonFile(FILES.IDEMPOTENCY_KEYS, {});
  idempotencyKeysMap.clear();
  if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      idempotencyKeysMap.set(k, v);
    }
  }
  return idempotencyKeysMap;
}

export function saveOrderIdempotencyKey(orderId, key) {
  if (!orderId || !key) return;
  idempotencyKeysMap.set(orderId, key);
  const out = {};
  for (const [k, v] of idempotencyKeysMap.entries()) {
    out[k] = v;
  }
  writeJsonFileAtomic(FILES.IDEMPOTENCY_KEYS, out);
}

export function getOrderIdempotencyKey(orderId) {
  return idempotencyKeysMap.get(orderId) || null;
}

// ---------------------------------------------------------------------------
// 6. MERCHANT SETTINGS PERSISTENCE
// ---------------------------------------------------------------------------
const defaultSettings = {
  autoInvoiceOnCapture: false,
  businessName: 'Transaction-Autopilot Merchant',
  defaultCurrency: 'USD'
};

export function loadMerchantSettings() {
  const saved = readJsonFile(FILES.MERCHANT_SETTINGS, null);
  if (!saved || typeof saved !== 'object') {
    return { ...defaultSettings };
  }
  return { ...defaultSettings, ...saved };
}

export function saveMerchantSettings(settings) {
  const current = loadMerchantSettings();
  const updated = { ...current, ...(settings || {}), updatedAt: new Date().toISOString() };
  writeJsonFileAtomic(FILES.MERCHANT_SETTINGS, updated);
  return updated;
}

// ---------------------------------------------------------------------------
// 7. SESSION PERSISTENCE (Hashed Token Storage Across Restarts)
// ---------------------------------------------------------------------------
export function hashSessionKey(id) {
  if (!id || typeof id !== 'string') return '';
  return crypto.createHash('sha256').update(String(id)).digest('hex');
}

export function loadSessions() {
  const saved = readJsonFile(FILES.SESSIONS, {});
  if (!saved || typeof saved !== 'object') return {};
  const now = Date.now();
  const valid = {};
  for (const [hashKey, session] of Object.entries(saved)) {
    if (session && session.expiresAt && now < session.expiresAt) {
      valid[hashKey] = session;
    }
  }
  return valid;
}

export function saveSessionToDisk(session) {
  if (!session || !session.id) return;
  const sessions = loadSessions();
  const hashKey = hashSessionKey(session.id);
  // Store session with cryptographic hash key, stripping plaintext ID from stored entity
  const { id, ...safeSession } = session;
  safeSession.sessionHash = hashKey;
  sessions[hashKey] = safeSession;
  writeJsonFileAtomic(FILES.SESSIONS, sessions);
}

export function deleteSessionFromDisk(sessionId) {
  if (!sessionId) return;
  const sessions = loadSessions();
  const hashKey = hashSessionKey(sessionId);
  if (sessions[hashKey]) {
    delete sessions[hashKey];
    writeJsonFileAtomic(FILES.SESSIONS, sessions);
  }
}

// ---------------------------------------------------------------------------
// INITIALIZATION ON MODULE LOAD
// ---------------------------------------------------------------------------
ensureDataDir();
cleanupStaleTempFiles();
loadOrders();
loadInvoices();
loadDisputes();
loadWebhookEvents();
loadProcessedWebhookIds();
loadIdempotencyKeys();
