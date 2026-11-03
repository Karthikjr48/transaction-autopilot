/**
 * PayPal Commerce — UI Server
 * Runs on Port 3000 and seamlessly communicates with the PayPal Sandbox Backend on Port 5000.
 * Hardened with strict file access controls, security headers, and safe asset isolation.
 */

import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

process.on('uncaughtException', (err) => {
  console.error('[UI Server Uncaught Exception]:', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('[UI Server Unhandled Rejection]:', reason);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const UI_PORT = parseInt(process.env.UI_PORT || '3000', 10);
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * Security: Browser Security Headers
 */
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com https://www.paypalobjects.com; connect-src 'self' http://localhost:5000 http://localhost:3000 http://127.0.0.1:5000 http://127.0.0.1:3000 https://api-m.sandbox.paypal.com https://api-m.paypal.com; img-src 'self' data: https:; frame-ancestors 'none';"
  );
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

/**
 * Security: Strict Blocklist to prevent file disclosure / directory traversal
 * Blocks direct access to backend code, .env, package.json, data/, logs, and internal configs.
 */
const SENSITIVE_PATTERNS = [
  /^\/\.env/i,
  /^\/server\.js/i,
  /^\/ui-server\.js/i,
  /^\/start-all\.js/i,
  /^\/package\.json/i,
  /^\/package-lock\.json/i,
  /^\/data(\/|$)/i,
  /^\/backend(\/|$)/i,
  /^\/config(\/|$)/i,
  /^\/tests(\/|$)/i,
  /^\/docs(\/|$)/i,
  /^\/node_modules\/(?!lenis\/dist\/)/i,
  /^\/node_modules$/i,
  /^\/\.git/i,
  /\.(bak|tmp|log|md|sh|ps1)$/i
];

app.use((req, res, next) => {
  const normalizedPath = path.normalize(req.path).replace(/\\/g, '/');
  for (const pattern of SENSITIVE_PATTERNS) {
    if (pattern.test(normalizedPath) || pattern.test(req.path)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: Direct access to internal system files is forbidden.'
      });
    }
  }
  next();
});

/**
 * Proxy middleware: forward /api requests to PayPal Sandbox backend on port 5000
 */
app.use('/api', async (req, res) => {
  try {
    const targetUrl = `${BACKEND_URL}/api${req.url}`;
    const headers = {
      'Accept': req.headers['accept'] || 'application/json',
      'Content-Type': req.headers['content-type'] || 'application/json'
    };

    if (req.headers['authorization']) {
      headers['authorization'] = req.headers['authorization'];
    }

    if (req.headers['cookie']) {
      headers['cookie'] = req.headers['cookie'];
    }

    // Forward role authorization, CSRF, and custom headers
    for (const [key, val] of Object.entries(req.headers)) {
      if (key.toLowerCase().startsWith('x-') || key.toLowerCase() === 'csrf-token') {
        headers[key] = val;
      }
    }

    const fetchOptions = {
      method: req.method,
      headers
    };

    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      fetchOptions.body = JSON.stringify(req.body || {});
    }

    const backendRes = await fetch(targetUrl, fetchOptions);
    const contentType = backendRes.headers.get('content-type') || 'application/json';
    res.status(backendRes.status);
    res.setHeader('Content-Type', contentType);

    const contentDisposition = backendRes.headers.get('content-disposition');
    if (contentDisposition) {
      res.setHeader('Content-Disposition', contentDisposition);
    }

    // Forward Set-Cookie and CSRF headers from backend
    const setCookies = backendRes.headers.getSetCookie
      ? backendRes.headers.getSetCookie()
      : [backendRes.headers.get('set-cookie')].filter(Boolean);
    if (setCookies && setCookies.length > 0) {
      res.setHeader('Set-Cookie', setCookies);
    }
    const csrfToken = backendRes.headers.get('x-csrf-token');
    if (csrfToken) {
      res.setHeader('x-csrf-token', csrfToken);
    }

    if (contentType.includes('text/html') || contentType.includes('text/plain')) {
      const text = await backendRes.text();
      res.send(text);
    } else {
      const data = await backendRes.json().catch(() => null);
      if (data) {
        res.json(data);
      } else {
        const raw = await backendRes.text().catch(() => '');
        res.send(raw);
      }
    }
  } catch (err) {
    res.status(502).json({
      success: false,
      error: `UI Proxy unable to reach PayPal Sandbox Backend on ${BACKEND_URL}: ${err.message}`
    });
  }
});

// Serve strictly permitted frontend static directories
app.use('/assets', express.static(path.join(__dirname, 'dist', 'assets')));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

// Serve modern React Single-Page Application for all frontend routes (/, /login, /developer, etc.)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(UI_PORT, () => {
  console.log('======================================================');
  console.log(`🎨 PayPal UI Client running on http://localhost:${UI_PORT}`);
  console.log(`🔒 Connected to PayPal Sandbox Backend on ${BACKEND_URL}`);
  console.log('======================================================\n');
});
