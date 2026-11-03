import { useEffect, useState } from 'react'
import { Send, FileText, CheckCircle, AlertTriangle, Clock, RefreshCw, Mail } from 'lucide-react'
import { Card, PageHeader, Button } from './ui'
import { apiRequest } from '../api'

interface InvoiceItem {
  name?: string
  description?: string
  quantity: number
  unit_price: number
}

interface InvoiceRecord {
  id: string
  customerEmail: string
  customerName?: string
  amount: number
  currency: string
  status: string
  statusMessage?: string
  createdTime: string
  deliveryProvider?: string
}

interface InvoiceForm {
  customer_email: string
  customer_name: string
  items: { description: string; quantity: number; unit_price: number }[]
  currency: string
  notes: string
  due_date: string
}

const DEFAULT_FORM: InvoiceForm = {
  customer_email: '',
  customer_name: '',
  items: [{ description: '', quantity: 1, unit_price: 0 }],
  currency: 'USD',
  notes: '',
  due_date: '',
}

export function Invoices() {
  const [form, setForm] = useState<InvoiceForm>(DEFAULT_FORM)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string; id?: string } | null>(null)
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([])
  const [loadingList, setLoadingList] = useState(true)

  const fetchInvoices = async () => {
    setLoadingList(true)
    try {
      const data = await apiRequest<{ invoices?: InvoiceRecord[] }>('/api/invoices')
      setInvoices(data.invoices || [])
    } catch (_) {}
    finally {
      setLoadingList(false)
    }
  }

  useEffect(() => {
    fetchInvoices()
  }, [])

  const total = form.items.reduce((s, i) => s + i.quantity * i.unit_price, 0)

  const addItem = () =>
    setForm(f => ({ ...f, items: [...f.items, { description: '', quantity: 1, unit_price: 0 }] }))

  const updateItem = (idx: number, field: string, value: string | number) =>
    setForm(f => {
      const items = [...f.items]
      items[idx] = { ...items[idx], [field]: value }
      return { ...f, items }
    })

  const removeItem = (idx: number) =>
    setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)
    try {
      const data = await apiRequest<{ success: boolean; invoice_id?: string; error?: string }>('/api/invoices', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      if (!data.success) throw new Error(data.error || 'Failed to create invoice')
      setResult({ ok: true, message: `Invoice sent to ${form.customer_email}!`, id: data.invoice_id })
      setForm(DEFAULT_FORM)
      await fetchInvoices()
    } catch (e: any) {
      setResult({ ok: false, message: e.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="anim-pop space-y-6">
      <PageHeader
        title="Invoices"
        sub="Create and dispatch customer invoices via configured email service"
        action={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-ok-bg px-3 py-1.5 text-xs font-bold text-ok-fg">
            <CheckCircle className="size-3.5" /> Email Delivery Active
          </span>
        }
      />

      {result && (
        <div className={`flex items-start gap-3 rounded-2xl p-4 ${result.ok ? 'bg-ok-bg text-ok-fg' : 'bg-err-bg text-err-fg'}`}>
          {result.ok ? <CheckCircle className="size-5 mt-0.5 shrink-0" /> : <AlertTriangle className="size-5 mt-0.5 shrink-0" />}
          <div>
            <p className="font-bold">{result.ok ? 'Invoice Sent!' : 'Error'}</p>
            <p className="text-sm mt-0.5">{result.message}</p>
            {result.id && <p className="text-xs mt-1 font-mono opacity-70">Invoice ID: {result.id}</p>}
          </div>
        </div>
      )}

      <form onSubmit={submit} className="space-y-6">
        {/* Customer Info */}
        <Card className="p-6">
          <h2 className="mb-4 text-sm font-bold text-ink-2 uppercase tracking-wide flex items-center gap-2">
            <FileText className="size-4" /> Customer Details
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold">Customer Name</label>
              <input
                required
                value={form.customer_name}
                onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))}
                className="h-11 w-full rounded-xl border border-field bg-canvas px-4 text-sm focus:border-link focus:outline-none focus:ring-4 focus:ring-link/20"
                placeholder="John Smith"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">Customer Email</label>
              <input
                required
                type="email"
                value={form.customer_email}
                onChange={e => setForm(f => ({ ...f, customer_email: e.target.value }))}
                className="h-11 w-full rounded-xl border border-field bg-canvas px-4 text-sm focus:border-link focus:outline-none focus:ring-4 focus:ring-link/20"
                placeholder="customer@example.com"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">Currency</label>
              <select
                value={form.currency}
                onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                className="h-11 w-full rounded-xl border border-field bg-canvas px-4 text-sm focus:border-link focus:outline-none"
              >
                {['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">Due Date</label>
              <input
                type="date"
                value={form.due_date}
                onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                className="h-11 w-full rounded-xl border border-field bg-canvas px-4 text-sm focus:border-link focus:outline-none"
              />
            </div>
          </div>
        </Card>

        {/* Line Items */}
        <Card className="p-6">
          <h2 className="mb-4 text-sm font-bold text-ink-2 uppercase tracking-wide">Line Items</h2>
          <div className="space-y-3">
            {form.items.map((item, idx) => (
              <div key={idx} className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-semibold text-ink-2">Description</label>
                  <input
                    required
                    value={item.description}
                    onChange={e => updateItem(idx, 'description', e.target.value)}
                    className="h-10 w-full rounded-xl border border-field bg-canvas px-3 text-sm focus:border-link focus:outline-none"
                    placeholder="Service / Product"
                  />
                </div>
                <div className="w-20">
                  <label className="mb-1 block text-xs font-semibold text-ink-2">Qty</label>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={e => updateItem(idx, 'quantity', Number(e.target.value))}
                    className="h-10 w-full rounded-xl border border-field bg-canvas px-3 text-sm text-center focus:border-link focus:outline-none"
                  />
                </div>
                <div className="w-28">
                  <label className="mb-1 block text-xs font-semibold text-ink-2">Unit Price</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unit_price}
                    onChange={e => updateItem(idx, 'unit_price', Number(e.target.value))}
                    className="h-10 w-full rounded-xl border border-field bg-canvas px-3 text-sm focus:border-link focus:outline-none"
                  />
                </div>
                <div className="w-24 text-right text-sm font-bold pb-2.5">
                  {(item.quantity * item.unit_price).toFixed(2)}
                </div>
                {form.items.length > 1 && (
                  <button type="button" onClick={() => removeItem(idx)} className="pb-2 text-err-fg hover:opacity-70 text-xs font-bold">✕</button>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between">
            <Button type="button" variant="ghost" onClick={addItem} className="h-9 text-sm">+ Add Item</Button>
            <div className="text-right">
              <div className="text-xs text-ink-2">Total</div>
              <div className="text-2xl font-extrabold">{form.currency} {total.toFixed(2)}</div>
            </div>
          </div>
        </Card>

        {/* Notes */}
        <Card className="p-6">
          <h2 className="mb-3 text-sm font-bold text-ink-2 uppercase tracking-wide">Notes</h2>
          <textarea
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            rows={3}
            className="w-full rounded-xl border border-field bg-canvas px-4 py-3 text-sm focus:border-link focus:outline-none focus:ring-4 focus:ring-link/20 resize-none"
            placeholder="Payment terms, thank you note, etc."
          />
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => setForm(DEFAULT_FORM)}>Reset</Button>
          <Button type="submit" disabled={loading} className="gap-2">
            <Send className="size-4" />
            {loading ? 'Sending Invoice…' : 'Send Invoice'}
          </Button>
        </div>
      </form>

      {/* Dispatched Invoices History */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="text-base font-bold flex items-center gap-2">
            <Mail className="size-4 text-brand" /> Dispatched Invoices
          </h2>
          <Button variant="secondary" onClick={fetchInvoices} className="gap-1.5 text-xs py-1 px-3">
            <RefreshCw className={`size-3.5 ${loadingList ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>

        {loadingList && (
          <div className="flex items-center justify-center py-12 text-ink-2 gap-2 text-sm">
            <RefreshCw className="size-4 animate-spin" /> Loading invoices…
          </div>
        )}

        {!loadingList && invoices.length === 0 && (
          <div className="p-8 text-center text-sm text-ink-2">
            No invoices dispatched yet. Fill out the form above to generate and send your first invoice.
          </div>
        )}

        {!loadingList && invoices.length > 0 && (
          <div className="divide-y divide-line">
            {invoices.slice(0, 10).map((inv) => (
              <div key={inv.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-canvas/50 transition-colors">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-brand">{inv.id}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                      inv.status === 'PROVIDER_ACCEPTED' ? 'bg-ok-bg text-ok-fg' : 'bg-canvas text-ink-2'
                    }`}>
                      {inv.status}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-ink mt-0.5">
                    {inv.customerName || 'Customer'} — <span className="font-normal text-ink-2">{inv.customerEmail}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-base font-extrabold text-ink">
                    ${parseFloat(String(inv.amount || 0)).toFixed(2)} {inv.currency || 'USD'}
                  </div>
                  <div className="text-xs text-ink-2 flex items-center gap-1 sm:justify-end">
                    <Clock className="size-3" />
                    {new Date(inv.createdTime).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
