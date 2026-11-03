/**
 * Server-Side Authentication, Session Management & CSRF Protection Service
 * Enforces real server-side authentication for sensitive technical and merchant endpoints.
 * Provides cryptographically secure sessions, HttpOnly cookies, and strict CSRF validation.
 */

import crypto from 'crypto';
import { config } from '../../config/env.js';
import { loadSessions, saveSessionToDisk, deleteSessionFromDisk, hashSessionKey } from './dataPersistence.js';

// In-memory active session store: sessionId -> session object
const activeSessions = new Map();

// Hydrate persistent sessions on module load (zero session loss across restarts)
try {
  const persisted = loadSessions();
  for (const [hashKey, sess] of Object.entries(persisted)) {
    if (sess && sess.id) {
      activeSessions.set(sess.id, sess);
    }
  }
} catch (_) {}

// Session lifetime configuration
const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes idle timeout
const ABSOLUTE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours absolute lifetime

/**
 * Generate cryptographically secure token using CSPRNG
 */
export function generateSecureToken(prefix = '', byteLength = 32) {
  const rand = crypto.randomBytes(byteLength).toString('hex');
  return prefix ? `${prefix}_${rand}` : rand;
}

/**
 * Parse Cookie header from incoming request
 */
export function parseCookies(req) {
  const cookieHeader = req.headers?.cookie;
  if (!cookieHeader || typeof cookieHeader !== 'string') return {};
  const cookies = {};
  const pairs = cookieHeader.split(';');
  for (const pair of pairs) {
    const idx = pair.indexOf('=');
    if (idx !== -1) {
      const key = pair.slice(0, idx).trim();
      const val = pair.slice(idx + 1).trim();
      try {
        cookies[key] = decodeURIComponent(val);
      } catch (_) {
        cookies[key] = val;
      }
    }
  }
  return cookies;
}

/**
 * Create a new cryptographically secure session
 * By default unauthenticated callers receive an unauthenticated 'guest' session.
 * Merchant role is strictly granted ONLY upon successful merchant credentials verification.
 */
export function createSession({ role = 'guest', req = null, existingSessionId = null, authenticated = false } = {}) {
  const isOperator = role === 'operations' || role === 'operator';
  const isMerchant = role === 'merchant';
  const prefix = isOperator ? 'ops_sess' : (isMerchant ? 'merch_sess' : 'guest_sess');
  const sessionId = generateSecureToken(prefix, 32);
  const csrfToken = generateSecureToken('csrf', 24);
  const now = Date.now();

  const ipFamily = req?.socket?.remoteFamily || 'IPv4';
  const userAgent = req?.headers?.['user-agent'] || 'unknown';

  const assignedRole = isOperator ? 'operations' : (isMerchant ? 'merchant' : 'guest');
  const isAuth = Boolean(authenticated || isOperator || isMerchant);

  const session = {
    id: sessionId,
    role: assignedRole,
    authenticated: isAuth,
    csrfToken,
    createdAt: now,
    expiresAt: now + ABSOLUTE_TTL_MS,
    lastActiveAt: now,
    ipFamily,
    userAgent
  };

  // Invalidate previous session if rotating
  if (existingSessionId) {
    if (activeSessions.has(existingSessionId)) {
      activeSessions.delete(existingSessionId);
    }
    deleteSessionFromDisk(existingSessionId);
  }

  activeSessions.set(sessionId, session);
  saveSessionToDisk(session);
  return session;
}

/**
 * Retrieve session by ID with idle and absolute timeout verification
 */
export function getSession(sessionId) {
  if (!sessionId || typeof sessionId !== 'string') return null;
  let session = activeSessions.get(sessionId);

  // Hydrate from persistent storage if memory was cleared or server restarted
  if (!session) {
    try {
      const persisted = loadSessions();
      const hashKey = hashSessionKey(sessionId);
      if (persisted[hashKey]) {
        session = { ...persisted[hashKey], id: sessionId };
        activeSessions.set(sessionId, session);
      }
    } catch (_) {}
  }

  if (!session) return null;

  const now = Date.now();

  // Check absolute expiration
  if (now > session.expiresAt) {
    activeSessions.delete(sessionId);
    deleteSessionFromDisk(sessionId);
    return null;
  }

  // Check idle timeout
  if (now - session.lastActiveAt > IDLE_TIMEOUT_MS) {
    activeSessions.delete(sessionId);
    deleteSessionFromDisk(sessionId);
    return null;
  }

  session.lastActiveAt = now;
  saveSessionToDisk(session);
  return session;
}

/**
 * Invalidate a session explicitly (e.g. on logout or disconnect)
 */
export function destroySession(sessionId) {
  if (sessionId && activeSessions.has(sessionId)) {
    activeSessions.delete(sessionId);
    deleteSessionFromDisk(sessionId);
    return true;
  }
  return false;
}

/**
 * Set session and CSRF cookies on HTTP response
 */
export function setAuthCookies(res, session) {
  const isProd = process.env.NODE_ENV === 'production';
  const sessionCookieName = isProd ? '__Host-session_id' : 'session_id';
  const maxAgeSec = Math.floor(ABSOLUTE_TTL_MS / 1000);

  const baseFlags = `Path=/; SameSite=Lax; Max-Age=${maxAgeSec}${isProd ? '; Secure' : ''}`;

  const cookies = [
    `${sessionCookieName}=${encodeURIComponent(session.id)}; HttpOnly; ${baseFlags}`,
    `csrf_token=${encodeURIComponent(session.csrfToken)}; ${baseFlags}`
  ];

  res.setHeader('Set-Cookie', cookies);
  res.setHeader('x-csrf-token', session.csrfToken);
}

/**
 * Clear session and CSRF cookies on HTTP response
 */
export function clearAuthCookies(res) {
  const isProd = process.env.NODE_ENV === 'production';
  const sessionCookieName = isProd ? '__Host-session_id' : 'session_id';
  const baseFlags = `Path=/; SameSite=Lax; Max-Age=0${isProd ? '; Secure' : ''}`;

  res.setHeader('Set-Cookie', [
    `${sessionCookieName}=; HttpOnly; ${baseFlags}`,
    `csrf_token=; ${baseFlags}`
  ]);
}

/**
 * Legacy alias for backwards compatibility
 */
export function createOperatorSession(role = 'operations', req = null) {
  const session = createSession({ role: 'operations', req });
  return {
    token: session.id,
    role: session.role,
    expiresAt: new Date(session.expiresAt).toISOString(),
    csrfToken: session.csrfToken
  };
}

/**
 * Verify operator secret key and issue rotated operator session
 */
export function authenticateOperator(secretKey, req = null) {
  if (!secretKey || typeof secretKey !== 'string') {
    return { success: false, error: 'Operator secret key is required.' };
  }

  const expectedKey = config.operations.secretKey;
  if (!expectedKey) {
    return { success: false, error: 'Server operator key is not configured.' };
  }

  // Constant-time comparison
  const isValid = crypto.timingSafeEqual(
    Buffer.from(secretKey.padEnd(expectedKey.length)),
    Buffer.from(expectedKey.padEnd(secretKey.length))
  ) && secretKey.length === expectedKey.length;

  if (!isValid) {
    return { success: false, error: 'Invalid operator credentials.' };
  }

  // Check if caller already had an existing session to rotate
  const cookies = parseCookies(req || {});
  const isProd = process.env.NODE_ENV === 'production';
  const existingId = cookies[isProd ? '__Host-session_id' : 'session_id'] || cookies['session_id'];

  const session = createSession({ role: 'operations', req, existingSessionId: existingId });

  return {
    success: true,
    token: session.id,
    role: session.role,
    csrfToken: session.csrfToken,
    expiresAt: new Date(session.expiresAt).toISOString()
  };
}

/**
 * Authenticate merchant using email and password
 */
export function authenticateMerchant(email, password, req = null) {
  if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
    return { success: false, error: 'Email and password are required.' };
  }

  const cleanEmail = email.trim().toLowerCase();
  const configuredEmail = (config.merchant?.email || '').trim().toLowerCase();
  const configuredPass = config.merchant?.password || '';

  if (!configuredEmail || !configuredPass) {
    return { success: false, error: 'Merchant credentials are not configured on the server.' };
  }

  // Check email: accept configured email or recognized merchant demo domain aliases
  const acceptedEmails = [
    configuredEmail,
    'merchant@paypal-portal.local',
    'merchant@transaction-autopilot.com',
    'merchant@transaction-autopilot.onrender.com'
  ].filter(Boolean);
  const emailMatches = acceptedEmails.includes(cleanEmail);

  // Constant-time password check
  let passMatches = false;
  if (password.length === configuredPass.length) {
    passMatches = crypto.timingSafeEqual(
      Buffer.from(password),
      Buffer.from(configuredPass)
    );
  }

  if (!emailMatches || !passMatches) {
    return { success: false, error: 'Invalid email or password. Please verify your merchant credentials.' };
  }

  // Check if caller had an existing session to rotate
  const cookies = parseCookies(req || {});
  const isProd = process.env.NODE_ENV === 'production';
  const existingId = cookies[isProd ? '__Host-session_id' : 'session_id'] || cookies['session_id'];

  const session = createSession({ role: 'merchant', req, existingSessionId: existingId });
  session.email = cleanEmail;

  return {
    success: true,
    token: session.id,
    role: session.role,
    email: cleanEmail,
    csrfToken: session.csrfToken,
    expiresAt: new Date(session.expiresAt).toISOString()
  };
}

/**
 * Validate an operator token or direct operator key
 */
export function verifyOperatorToken(tokenOrKey) {
  if (!tokenOrKey || typeof tokenOrKey !== 'string') {
    return { valid: false, error: 'No token provided' };
  }

  const clean = tokenOrKey.replace(/^Bearer\s+/i, '').trim();

  // 1. Check active session tokens
  const session = getSession(clean);
  if (session && (session.role === 'operations' || session.role === 'operator')) {
    return { valid: true, role: 'operations', session };
  }

  // 2. Direct operator secret key check
  const expectedKey = config.operations.secretKey;
  if (expectedKey && clean === expectedKey) {
    return { valid: true, role: 'operations' };
  }

  return { valid: false, error: 'Invalid operator credentials.' };
}

/**
 * Authenticate incoming request across Authorization headers, custom headers, or session cookies
 */
export function authenticateRequest(req) {
  const cookies = parseCookies(req);
  const isProd = process.env.NODE_ENV === 'production';
  const sessionCookieName = isProd ? '__Host-session_id' : 'session_id';
  const sessionId = cookies[sessionCookieName] || cookies['session_id'];

  // 1. Direct Bearer token check
  const authHeader = req.headers?.['authorization'];
  if (authHeader) {
    const cleanToken = authHeader.replace(/^Bearer\s+/i, '').trim();
    const opCheck = verifyOperatorToken(cleanToken);
    if (opCheck.valid) {
      return { authenticated: true, role: opCheck.role, session: opCheck.session || null, authType: 'bearer' };
    }
    const sess = getSession(cleanToken);
    if (sess) {
      return { authenticated: true, role: sess.role, session: sess, authType: 'bearer' };
    }
  }

  // 2. Operator token / key headers
  const opHeader = req.headers?.['x-operator-token'] || req.headers?.['x-operator-key'];
  if (opHeader) {
    const opCheck = verifyOperatorToken(opHeader);
    if (opCheck.valid) {
      return { authenticated: true, role: opCheck.role, session: opCheck.session || null, authType: 'header' };
    }
  }

  // 3. Cookie session check
  if (sessionId) {
    const session = getSession(sessionId);
    if (session) {
      const isAuthRole = session.role === 'operations' || session.role === 'operator' || session.role === 'merchant';
      return {
        authenticated: Boolean(session.authenticated && isAuthRole),
        role: session.role,
        session,
        authType: 'cookie'
      };
    }
  }

  return { authenticated: false };
}

/**
 * Express middleware: Require real server-side Operator authentication
 * Never trusts client-supplied role headers alone.
 */
export function requireOperatorAuth(req, res, next) {
  const clientRole = (req.headers?.['x-client-role'] || '').toLowerCase();

  // Strict check: if explicitly claiming merchant role, always 403 Forbidden
  if (clientRole === 'merchant') {
    return res.status(403).json({
      success: false,
      error: 'Access denied: Merchant role is not authorized to access technical diagnostics.'
    });
  }

  const auth = authenticateRequest(req);
  if (!auth.authenticated) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Valid Operator session token or Operator Key required. Header "x-client-role" alone is not proof of identity.'
    });
  }

  if (auth.role !== 'operations' && auth.role !== 'operator') {
    return res.status(403).json({
      success: false,
      error: 'Forbidden: Operator credentials required for this endpoint.'
    });
  }

  req.auth = auth;
  req.operator = {
    role: auth.role,
    authenticated: true
  };
  next();
}

/**
 * Express middleware: Require either Merchant or Operator authentication
 */
export function requireMerchantOrOperatorAuth(req, res, next) {
  const auth = authenticateRequest(req);
  if (!auth.authenticated || (auth.role !== 'merchant' && auth.role !== 'operations' && auth.role !== 'operator')) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Valid Merchant or Operator session required.'
    });
  }

  req.auth = auth;
  next();
}

/**
 * Express middleware: Anti-CSRF Protection for state-mutating requests
 * Validates double-submit cookie or synchronizer token for cookie/session requests.
 * Exempts safe idempotent read requests, PayPal webhooks, and direct Bearer API clients.
 */
export function validateCsrf(req, res, next) {
  // 1. Safe idempotent methods are exempt
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // 2. Webhooks use cryptographic transmission signatures, exempt from CSRF
  if (req.path.startsWith('/api/webhooks') || req.path.startsWith('/api/paypal/webhooks')) {
    return next();
  }

  // 3. API clients using direct Bearer token or operator key bypass CSRF
  if (req.headers?.['authorization'] || req.headers?.['x-operator-key'] || req.headers?.['x-operator-token']) {
    return next();
  }

  const cookies = parseCookies(req);
  const isProd = process.env.NODE_ENV === 'production';
  const sessionCookieName = isProd ? '__Host-session_id' : 'session_id';
  const sessionId = cookies[sessionCookieName] || cookies['session_id'];
  const cookieCsrf = cookies['csrf_token'];

  // If request has cookie session or CSRF cookie, validate anti-CSRF token
  if (sessionId || cookieCsrf) {
    const clientCsrf = req.headers?.['x-csrf-token'] || req.headers?.['csrf-token'];
    if (!clientCsrf) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Missing CSRF token. Required header: x-csrf-token'
      });
    }

    const session = sessionId ? getSession(sessionId) : null;
    const expectedCsrf = session ? session.csrfToken : cookieCsrf;

    if (!expectedCsrf || clientCsrf !== expectedCsrf) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Invalid CSRF token.'
      });
    }
  }

  next();
}

export default {
  generateSecureToken,
  parseCookies,
  createSession,
  getSession,
  destroySession,
  setAuthCookies,
  clearAuthCookies,
  createOperatorSession,
  authenticateOperator,
  authenticateMerchant,
  verifyOperatorToken,
  authenticateRequest,
  requireOperatorAuth,
  requireMerchantOrOperatorAuth,
  validateCsrf
};
