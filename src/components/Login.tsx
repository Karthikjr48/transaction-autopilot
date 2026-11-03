import React, { useState } from 'react'
import { ArrowLeft, Lock, Mail, AlertCircle, Eye, EyeOff, ShieldCheck, Loader2 } from 'lucide-react'
import paypalLogo from '../assets/paypal-logo.png'
import { loginMerchant } from '../api'

interface LoginProps {
  onSuccess: () => void
  onNavigateHome: () => void
}

export function Login({ onSuccess, onNavigateHome }: LoginProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})

  const validate = () => {
    const errs: { email?: string; password?: string } = {}
    if (!email.trim()) {
      errs.email = 'Email address is required.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = 'Please enter a valid email address.'
    }

    if (!password) {
      errs.password = 'Password is required.'
    } else if (password.length < 6) {
      errs.password = 'Password must be at least 6 characters.'
    }

    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!validate()) return

    setLoading(true)
    try {
      const result = await loginMerchant(email.trim(), password)
      if (result.success) {
        onSuccess()
      } else {
        setError(result.error || 'Authentication failed. Please verify your merchant credentials.')
      }
    } catch (err: any) {
      setError(err.message || 'Unable to connect to the authentication service. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Top return link */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4 mb-4">
        <button
          type="button"
          onClick={onNavigateHome}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg px-2 py-1"
        >
          <ArrowLeft className="size-4" />
          Back to Merchant Dashboard
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl sm:px-10 border border-slate-200">
          {/* Logo & Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center p-3 rounded-xl bg-slate-50 border border-slate-100 shadow-sm mb-4">
              <img src={paypalLogo} alt="PayPal" className="h-8 w-auto" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Merchant Portal Sign In
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Access your transaction controls, orders, and payment tools
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div
              role="alert"
              aria-live="polite"
              className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3 text-sm text-red-800"
            >
              <AlertCircle className="size-5 shrink-0 text-red-600 mt-0.5" />
              <div>
                <span className="font-semibold block">Authentication Error</span>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Quick Demo Credentials for Hackathon Evaluators */}
          <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 flex items-center justify-between text-xs">
            <div>
              <span className="font-bold text-blue-900 block mb-0.5">Sandbox Merchant Credentials</span>
              <span className="font-mono text-blue-700">merchant@paypal-portal.local &bull; MerchantSecure2026!</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setEmail('merchant@paypal-portal.local')
                setPassword('MerchantSecure2026!')
                setError(null)
                setFieldErrors({})
              }}
              className="px-3 py-1.5 font-bold bg-white text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-600 hover:text-white hover:border-transparent transition-all shadow-xs cursor-pointer"
            >
              Fill Demo
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Merchant Email
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <Mail className="size-4 text-slate-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: undefined }))
                  }}
                  placeholder="merchant@paypal-portal.local"
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                  className={`block w-full rounded-xl border py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 ${
                    fieldErrors.email
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                      : 'border-slate-300 focus:border-blue-600 focus:ring-blue-100'
                  }`}
                />
              </div>
              {fieldErrors.email && (
                <p id="email-error" className="mt-1.5 text-xs text-red-600 font-medium">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
                  Password
                </label>
              </div>
              <div className="relative rounded-xl shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <Lock className="size-4 text-slate-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: undefined }))
                  }}
                  placeholder="••••••••••••"
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                  className={`block w-full rounded-xl border py-2.5 pl-10 pr-10 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 ${
                    fieldErrors.password
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                      : 'border-slate-300 focus:border-blue-600 focus:ring-blue-100'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p id="password-error" className="mt-1.5 text-xs text-red-600 font-medium">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            {/* Remember & Options */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs font-medium text-slate-600">Keep me signed in</span>
              </label>
              <button
                type="button"
                onClick={onNavigateHome}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                Explore Public Dashboard
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 px-4 text-sm font-bold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Verifying credentials…</span>
                </>
              ) : (
                <span>Sign In to Merchant Portal</span>
              )}
            </button>
          </form>

          {/* Security Assurance footer */}
          <div className="mt-8 border-t border-slate-100 pt-5 flex items-center justify-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="size-4 text-emerald-600" />
            <span>Protected with server-side sessions & CSRF tokens</span>
          </div>
        </div>

        {/* Bottom copyright notice */}
        <p className="mt-6 text-center text-xs text-slate-400">
          Transaction-Autopilot &bull; PayPal Commerce Integration
        </p>
      </div>
    </div>
  )
}
