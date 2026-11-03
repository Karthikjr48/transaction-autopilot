import type { Status, Txn } from './data'

export class ApiError extends Error {
  status: number

  constructor(message: string, status = 0) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

let csrfToken = ''

function getCookieCsrf(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : null
}

async function readResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') || ''
  const payload = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : null

  if (!response.ok) {
    const message = payload?.error || payload?.message || `Request failed with HTTP ${response.status}.`
    throw new ApiError(message, response.status)
  }
  if (!payload) throw new ApiError('The server returned an invalid response.', response.status)
  return payload as T
}

export async function getCsrfToken(forceRefresh = false): Promise<string> {
  if (!forceRefresh && csrfToken) return csrfToken

  const cookieVal = !forceRefresh ? getCookieCsrf() : null
  if (cookieVal) {
    csrfToken = cookieVal
    return csrfToken
  }

  try {
    const response = await fetch('/api/csrf-token', { credentials: 'include' })
    const data = await readResponse<{ csrfToken: string }>(response)
    if (data?.csrfToken) {
      csrfToken = data.csrfToken
      return csrfToken
    }
  } catch (_) {}

  return csrfToken || getCookieCsrf() || ''
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method || 'GET').toUpperCase()
  const headers = new Headers(init.headers)
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')

  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const token = await getCsrfToken()
    if (token) headers.set('x-csrf-token', token)
  }

  let response = await fetch(path, {
    ...init,
    method,
    headers,
    credentials: 'include',
  })

  // Self-healing: if 403 due to missing or stale CSRF token, force-refresh token and retry once
  if (response.status === 403 && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    try {
      const errClone = await response.clone().json().catch(() => null)
      if (errClone?.error?.toLowerCase().includes('csrf')) {
        const freshToken = await getCsrfToken(true)
        if (freshToken) {
          headers.set('x-csrf-token', freshToken)
          response = await fetch(path, {
            ...init,
            method,
            headers,
            credentials: 'include',
          })
        }
      }
    } catch (_) {}
  }

  if (response.status === 401 || response.status === 403) csrfToken = ''
  return readResponse<T>(response)
}

export interface MerchantSession {
  authenticated: boolean
  role: string | null
  email?: string
  csrfToken?: string
  error?: string
}

export async function getMerchantSession() {
  const data = await apiRequest<MerchantSession & { success: boolean }>('/api/merchant/session')
  if (data.csrfToken) csrfToken = data.csrfToken
  return data
}

export async function loginMerchant(email: string, password: string) {
  const data = await apiRequest<MerchantSession & { success: boolean; token?: string }>('/api/merchant/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  if (data.csrfToken) csrfToken = data.csrfToken
  return data
}

export async function logoutMerchant() {
  const data = await apiRequest<{ success: boolean }>('/api/merchant/logout', { method: 'POST' })
  csrfToken = ''
  return data
}

export interface PaymentAnalytics {
  totalVolume: number
  totalCount: number
  successfulOrders: number
  pendingOrders: number
  failedCount: number
  hasData: boolean
}

export async function getPaymentAnalytics() {
  const data = await apiRequest<{ success: boolean; analytics: Record<string, unknown> }>('/api/paypal/analytics')
  const analytics = data.analytics || {}
  return {
    totalVolume: Number(analytics.totalVolume ?? 0),
    totalCount: Number(analytics.totalCount ?? analytics.totalOrders ?? 0),
    successfulOrders: Number(analytics.successfulOrders ?? analytics.capturedCount ?? 0),
    pendingOrders: Number(analytics.pendingOrders ?? analytics.attentionCount ?? 0),
    failedCount: Number(analytics.failedCount ?? analytics.criticalCount ?? 0),
    hasData: Boolean(analytics.hasData),
  } satisfies PaymentAnalytics
}

function normalizeStatus(value: unknown): Status {
  const status = String(value || '').toUpperCase()
  if (['COMPLETED', 'CAPTURED'].includes(status)) return 'Completed'
  if (['CANCELLED', 'CANCELED', 'VOIDED'].includes(status)) return 'Cancelled'
  if (['FAILED', 'DENIED', 'DECLINED', 'EXPIRED'].includes(status)) return 'Failed'
  return 'Pending'
}

function normalizeTransaction(item: Record<string, unknown>): Txn {
  const timestamp = String(item.timestamp || item.create_time || item.createdAt || '')
  const parsed = timestamp ? new Date(timestamp) : null
  const validDate = parsed && !Number.isNaN(parsed.getTime()) ? parsed : null
  const reference = String(item.id || item.paypalReference || '')
  return {
    ref: reference,
    customer: String(item.payerName || item.customerName || 'Customer details unavailable'),
    email: String(item.payerEmail || item.customerEmail || 'Not available'),
    amount: Number(item.amount || 0),
    currency: String(item.currency || 'USD'),
    date: validDate ? validDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Date unavailable',
    time: validDate ? validDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '',
    status: normalizeStatus(item.paypalStatus || item.status),
    order: String(item.paypalReference || item.orderId || reference),
    source: typeof item.source === 'string' ? item.source : undefined,
  }
}

export async function getTransactions() {
  const data = await apiRequest<{ success: boolean; transactions: Record<string, unknown>[] }>('/api/paypal/transactions')
  return (data.transactions || []).map(normalizeTransaction)
}

export interface CreatePaymentLinkInput {
  amount: string
  currency: string
  description: string
  recipientEmail?: string
}

export interface CreatedPaymentLink {
  orderId: string
  approvalUrl: string
  emailStatus?: string
}

export async function createPaymentLink(input: CreatePaymentLinkInput): Promise<CreatedPaymentLink> {
  const data = await apiRequest<Record<string, any>>('/api/paypal/orders', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  const order = data.order || data
  const links = Array.isArray(order.links) ? order.links : []
  const approvalUrl =
    order.approvalUrl ||
    order.checkoutUrl ||
    data.approvalUrl ||
    data.checkoutUrl ||
    links.find((link: Record<string, unknown>) => link.rel === 'approve')?.href

  if (!order.id || !approvalUrl) throw new ApiError('The payment provider did not return a usable approval link.')
  return {
    orderId: String(order.id),
    approvalUrl: String(approvalUrl),
    emailStatus: data.emailDelivery?.status || data.emailStatus,
  }
}
