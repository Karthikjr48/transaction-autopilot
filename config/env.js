/**
 * Configuration & Environment Validation — Transaction-Autopilot
 * Validates environment variables, credentials, and service settings.
 * Enforces strict zero-leak policies for secrets.
 */

import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootEnvPath = path.resolve(__dirname, '..', '.env');
dotenv.config({ path: rootEnvPath });

// Secure resolution of Operator Key without static fallback
function resolveOperatorKey() {
  const envKey = process.env.OPERATOR_SECRET_KEY || process.env.OPERATIONS_SECRET_KEY;
  if (envKey && envKey.trim()) {
    return envKey.trim();
  }
  const generatedKey = crypto.randomBytes(32).toString('hex');
  console.warn('[SECURITY NOTICE] OPERATOR_SECRET_KEY not set in environment. Generated secure key for this deployment instance.');
  return generatedKey;
}

// Secure resolution of Merchant credentials with Sandbox Demo fallback
function resolveMerchantCredentials() {
  const email = (process.env.MERCHANT_EMAIL || '').trim();
  const password = (process.env.MERCHANT_PASSWORD || '').trim();

  // If explicit custom environment credentials are provided, use them
  if (email && password) {
    return { email, password };
  }

  // Consistent PayPal Sandbox Demo credentials for Hackathon Evaluation & Local Dev
  return {
    email: email || 'merchant@paypal-portal.local',
    password: password || 'MerchantSecure2026!'
  };
}

export const config = {
  // Network Ports & URLs
  port: parseInt(process.env.PORT || '5000', 10),
  uiPort: parseInt(process.env.UI_PORT || '3000', 10),
  backendUrl: process.env.BACKEND_URL || 'http://localhost:5000',
  uiClientUrl: process.env.UI_CLIENT_URL || 'http://localhost:3000',

  // PayPal Sandbox Configuration
  paypal: {
    mode: (process.env.PAYPAL_MODE || 'sandbox').toLowerCase(),
    clientId: process.env.PAYPAL_CLIENT_ID || '',
    clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
    webhookId: process.env.PAYPAL_WEBHOOK_ID || '2P622358EL0011106',
    baseUrl: (process.env.PAYPAL_MODE || 'sandbox').toLowerCase() === 'live'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com',
    webBaseUrl: (process.env.PAYPAL_MODE || 'sandbox').toLowerCase() === 'live'
      ? 'https://www.paypal.com'
      : 'https://www.sandbox.paypal.com'
  },

  // Groq AI Configuration
  groq: {
    apiKey: process.env.GROQ_API_KEY || '',
    model: process.env.GROQ_MODEL || 'qwen/qwen3.8-27b'
  },

  // Operations Console & Backend Authorization Secret
  operations: {
    secretKey: resolveOperatorKey(),
    tokenExpiryHours: 24
  },

  // Merchant Account Configuration
  merchant: resolveMerchantCredentials(),

  // Email & Invoice Delivery Provider Configuration
  email: {
    provider: (process.env.EMAIL_PROVIDER || 'gmail').toLowerCase(), // 'gmail', 'resend', 'brevo', 'smtp', 'none'
    resendApiKey: process.env.RESEND_API_KEY || '',
    smtpHost: process.env.SMTP_HOST || (process.env.EMAIL_PROVIDER === 'gmail' ? 'smtp.gmail.com' : process.env.EMAIL_PROVIDER === 'brevo' ? 'smtp-relay.brevo.com' : 'smtp.resend.com'),
    smtpPort: parseInt(process.env.SMTP_PORT || (process.env.EMAIL_PROVIDER === 'gmail' ? '465' : '465'), 10),
    smtpSecure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465' || process.env.EMAIL_PROVIDER === 'gmail',
    smtpUser: process.env.SMTP_USER || process.env.GMAIL_USER || 'loyolaignatiuskarthik@gmail.com',
    smtpPass: process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || process.env.RESEND_API_KEY || '',
    fromAddress: process.env.EMAIL_FROM || (process.env.EMAIL_PROVIDER === 'gmail' ? 'loyolaignatiuskarthik@gmail.com' : 'onboarding@resend.dev'),
    testRecipient: process.env.TEST_RECIPIENT_EMAIL || 'loyolaignatiuskarthik@gmail.com'
  }
};

/**
 * Validate core configuration without leaking secrets
 */
export function validateEnvironment() {
  const issues = [];

  if (!config.paypal.clientId) {
    issues.push('PAYPAL_CLIENT_ID is missing');
  }
  if (!config.paypal.clientSecret) {
    issues.push('PAYPAL_CLIENT_SECRET is missing');
  }
  if (!config.groq.apiKey) {
    issues.push('GROQ_API_KEY is missing');
  }

  // Validate Resend if provider is resend
  if (config.email.provider === 'resend') {
    if (!config.email.resendApiKey) {
      issues.push('RESEND_API_KEY is missing for Resend email provider');
    }
  }

  // Validate Brevo SMTP if provider is brevo
  if (config.email.provider === 'brevo') {
    if (!config.email.smtpUser) {
      issues.push('SMTP_USER is missing for Brevo SMTP');
    }
    if (!config.email.smtpPass) {
      issues.push('SMTP_PASS is missing for Brevo SMTP');
    }
    if (!config.email.fromAddress) {
      issues.push('EMAIL_FROM is missing for Brevo SMTP');
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    summary: {
      port: config.port,
      uiPort: config.uiPort,
      paypalMode: config.paypal.mode,
      paypalBaseUrl: config.paypal.baseUrl,
      groqModel: config.groq.model,
      emailProvider: config.email.provider,
      hasPayPalClientSecret: Boolean(config.paypal.clientSecret),
      hasGroqApiKey: Boolean(config.groq.apiKey)
    }
  };
}

export default config;
