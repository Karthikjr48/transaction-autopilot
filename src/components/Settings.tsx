import { useEffect, useState } from 'react'
import { Save, Building2, Mail, Globe, CreditCard, Bell, CheckCircle, AlertTriangle } from 'lucide-react'
import { Card, PageHeader, Button } from './ui'
import { apiRequest } from '../api'

interface MerchantSettings {
  business_name: string
  contact_email: string
  website: string
  currency: string
  timezone: string
  notifications_email: boolean
  notifications_webhook: boolean
  webhook_url: string
  auto_capture: boolean
  risk_threshold: string
}

const DEFAULT: MerchantSettings = {
  business_name: 'Merchant Store',
  contact_email: 'merchant@paypal-portal.local',
  website: '',
  currency: 'USD',
  timezone: 'UTC',
  notifications_email: true,
  notifications_webhook: false,
  webhook_url: '',
  auto_capture: false,
  risk_threshold: 'medium',
}

export function Settings() {
  const [settings, setSettings] = useState<MerchantSettings>(DEFAULT)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  const update = (key: keyof MerchantSettings, value: string | boolean) =>
    setSettings(s => ({ ...s, [key]: value }))

  useEffect(() => {
    ;(async () => {
      try {
        const data = await apiRequest<{ settings?: Partial<MerchantSettings> }>('/api/merchant/settings')
        if (data?.settings) {
          setSettings(s => ({ ...s, ...data.settings }))
        }
      } catch {
        // silently use defaults
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setResult(null)
    try {
      await apiRequest('/api/merchant/settings', {
        method: 'POST',
        body: JSON.stringify(settings),
      })
      setResult({ ok: true, message: 'Settings saved successfully.' })
    } catch (e: any) {
      setResult({ ok: false, message: e.message })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center py-32 text-ink-2">Loading settings…</div>

  return (
    <div className="anim-pop space-y-6">
      <PageHeader title="Settings" sub="Merchant account configuration" />

      {result && (
        <div className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm ${result.ok ? 'bg-ok-bg text-ok-fg' : 'bg-err-bg text-err-fg'}`}>
          {result.ok ? <CheckCircle className="size-5 shrink-0" /> : <AlertTriangle className="size-5 shrink-0" />}
          <span className="font-semibold">{result.message}</span>
        </div>
      )}

      <form onSubmit={save} className="space-y-6">
        {/* Business Info */}
        <Card className="p-6">
          <h2 className="mb-4 text-sm font-bold text-ink-2 uppercase tracking-wide flex items-center gap-2">
            <Building2 className="size-4" /> Business Information
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold">Business Name</label>
              <input
                value={settings.business_name}
                onChange={e => update('business_name', e.target.value)}
                className="h-11 w-full rounded-xl border border-field bg-canvas px-4 text-sm focus:border-link focus:outline-none focus:ring-4 focus:ring-link/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">Contact Email</label>
              <input
                type="email"
                value={settings.contact_email}
                onChange={e => update('contact_email', e.target.value)}
                className="h-11 w-full rounded-xl border border-field bg-canvas px-4 text-sm focus:border-link focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">Website</label>
              <input
                type="url"
                value={settings.website}
                onChange={e => update('website', e.target.value)}
                placeholder="https://your-store.com"
                className="h-11 w-full rounded-xl border border-field bg-canvas px-4 text-sm focus:border-link focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">Timezone</label>
              <select
                value={settings.timezone}
                onChange={e => update('timezone', e.target.value)}
                className="h-11 w-full rounded-xl border border-field bg-canvas px-4 text-sm focus:border-link focus:outline-none"
              >
                {['UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Asia/Kolkata', 'Asia/Tokyo'].map(tz => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* Payment Settings */}
        <Card className="p-6">
          <h2 className="mb-4 text-sm font-bold text-ink-2 uppercase tracking-wide flex items-center gap-2">
            <CreditCard className="size-4" /> Payment Settings
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold">Default Currency</label>
              <select
                value={settings.currency}
                onChange={e => update('currency', e.target.value)}
                className="h-11 w-full rounded-xl border border-field bg-canvas px-4 text-sm focus:border-link focus:outline-none"
              >
                {['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR', 'JPY'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">Risk Threshold</label>
              <select
                value={settings.risk_threshold}
                onChange={e => update('risk_threshold', e.target.value)}
                className="h-11 w-full rounded-xl border border-field bg-canvas px-4 text-sm focus:border-link focus:outline-none"
              >
                <option value="low">Low (strict)</option>
                <option value="medium">Medium (balanced)</option>
                <option value="high">High (permissive)</option>
              </select>
            </div>
          </div>
          <label className="mt-4 flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.auto_capture}
              onChange={e => update('auto_capture', e.target.checked)}
              className="h-4 w-4 rounded border-field accent-brand"
            />
            <span className="text-sm font-semibold">Auto-capture approved payments</span>
          </label>
        </Card>

        {/* Notifications */}
        <Card className="p-6">
          <h2 className="mb-4 text-sm font-bold text-ink-2 uppercase tracking-wide flex items-center gap-2">
            <Bell className="size-4" /> Notifications
          </h2>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notifications_email}
                onChange={e => update('notifications_email', e.target.checked)}
                className="h-4 w-4 rounded border-field accent-brand"
              />
              <div>
                <span className="text-sm font-semibold flex items-center gap-2"><Mail className="size-4" /> Email notifications</span>
                <span className="text-xs text-ink-2">Receive payment alerts via email</span>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notifications_webhook}
                onChange={e => update('notifications_webhook', e.target.checked)}
                className="h-4 w-4 rounded border-field accent-brand"
              />
              <div>
                <span className="text-sm font-semibold flex items-center gap-2"><Globe className="size-4" /> Webhook notifications</span>
                <span className="text-xs text-ink-2">Send events to your server</span>
              </div>
            </label>
            {settings.notifications_webhook && (
              <div className="ml-7">
                <label className="mb-1 block text-sm font-semibold">Webhook URL</label>
                <input
                  type="url"
                  value={settings.webhook_url}
                  onChange={e => update('webhook_url', e.target.value)}
                  placeholder="https://your-server.com/webhook"
                  className="h-11 w-full rounded-xl border border-field bg-canvas px-4 text-sm focus:border-link focus:outline-none"
                />
              </div>
            )}
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving} className="gap-2">
            <Save className="size-4" />
            {saving ? 'Saving…' : 'Save Settings'}
          </Button>
        </div>
      </form>
    </div>
  )
}
