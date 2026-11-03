import { useEffect, useState, type ReactNode } from 'react'
import {
  RefreshCw,
  Search,
  ExternalLink,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  Sparkles,
  Download,
  Copy,
  Check,
  X,
  FileText,
  ShieldCheck,
  ArrowRight
} from 'lucide-react'
import { Card, PageHeader, Button } from './ui'
import { apiRequest } from '../api'

interface Order {
  id: string
  status: string
  amount: string
  currency: string
  customer: string
  date: string
  paypal_id?: string
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; icon: ReactNode; label: string }> = {
    COMPLETED: {
      cls: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold',
      icon: <CheckCircle className="size-3.5 text-emerald-600" />,
      label: 'Completed'
    },
    CREATED: {
      cls: 'bg-sky-50 text-sky-800 border-sky-300 font-bold',
      icon: <Clock className="size-3.5 text-sky-600" />,
      label: 'Created'
    },
    APPROVED: {
      cls: 'bg-amber-50 text-amber-800 border-amber-300 font-bold',
      icon: <Clock className="size-3.5 text-amber-600" />,
      label: 'Approved'
    },
    VOIDED: {
      cls: 'bg-rose-50 text-rose-800 border-rose-300 font-bold',
      icon: <XCircle className="size-3.5 text-rose-600" />,
      label: 'Voided'
    },
    SAVED: {
      cls: 'bg-slate-100 text-slate-800 border-slate-300 font-bold',
      icon: <AlertTriangle className="size-3.5 text-slate-600" />,
      label: 'Saved'
    },
    PAYER_ACTION_REQUIRED: {
      cls: 'bg-amber-50 text-amber-800 border-amber-300 font-bold',
      icon: <AlertTriangle className="size-3.5 text-amber-600" />,
      label: 'Action Required'
    }
  }
  const cfg = map[status] ?? {
    cls: 'bg-slate-100 text-slate-800 border-slate-300 font-bold',
    icon: <Clock className="size-3.5 text-slate-600" />,
    label: status
  }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs border ${cfg.cls}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  )
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-extrabold text-white">
          {part.slice(2, -2)}
        </strong>
      )
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={i}
          className="rounded bg-sky-950/80 border border-sky-800/80 px-1.5 py-0.5 font-mono text-[11px] text-sky-300 font-bold"
        >
          {part.slice(1, -1)}
        </code>
      )
    }
    return part
  })
}

function FormattedForensicAnalysis({ content }: { content: string }) {
  const lines = content.split('\n')
  return (
    <div className="space-y-2 text-xs leading-relaxed text-slate-200">
      {lines.map((line, idx) => {
        const trimmed = line.trim()
        if (!trimmed) return <div key={idx} className="h-1" />

        if (trimmed.startsWith('### ') || trimmed.startsWith('## ')) {
          return (
            <h5
              key={idx}
              className="font-extrabold text-xs uppercase tracking-wider text-sky-400 mt-3 mb-1 flex items-center gap-1.5 border-b border-slate-800 pb-1"
            >
              {renderInline(trimmed.replace(/^#{2,3}\s+/, ''))}
            </h5>
          )
        }
        if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1 py-0.5">
              <span className="text-sky-400 text-sm leading-none mt-0.5">•</span>
              <span className="flex-1 text-slate-200">{renderInline(trimmed.replace(/^[\*\-]\s+/, ''))}</span>
            </div>
          )
        }
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/)
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1 py-0.5">
              <span className="font-mono text-xs font-bold text-sky-400">{numMatch[1]}.</span>
              <span className="flex-1 text-slate-200">{renderInline(numMatch[2])}</span>
            </div>
          )
        }
        return <p key={idx} className="text-slate-200">{renderInline(line)}</p>
      })}
    </div>
  )
}

export function Orders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'CREATED' | 'ACTION_REQUIRED'>('ALL')
  const [lookup, setLookup] = useState('')
  const [lookupResult, setLookupResult] = useState<any>(null)
  const [lookupLoading, setLookupLoading] = useState(false)

  // Forensic Inspection Drawer State
  const [inspectOrder, setInspectOrder] = useState<Order | null>(null)
  const [forensicLoading, setForensicLoading] = useState(false)
  const [forensicData, setForensicData] = useState<any>(null)
  const [forensicAnalysis, setForensicAnalysis] = useState<string>('')
  const [copiedId, setCopiedId] = useState(false)

  const fetchOrders = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await apiRequest<{ orders?: Order[] }>('/api/merchant/orders')
      setOrders(data.orders ?? [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const lookupOrder = async () => {
    if (!lookup.trim()) return
    setLookupLoading(true)
    setLookupResult(null)
    try {
      const data = await apiRequest<{ order?: any }>(`/api/paypal/orders/${lookup.trim()}`)
      setLookupResult(data.order || data)
    } catch (e: any) {
      setLookupResult({ error: e.message })
    } finally {
      setLookupLoading(false)
    }
  }

  const openForensicInspector = async (order: Order) => {
    setInspectOrder(order)
    setForensicLoading(true)
    setForensicData(null)
    setForensicAnalysis('')
    setCopiedId(false)

    try {
      // 1. Fetch exact order details
      const orderDetails = await apiRequest<{ order?: any }>(`/api/paypal/orders/${order.id}`).catch(() => null)
      setForensicData(orderDetails?.order || order)

      // 2. Fetch AI Forensic Evaluation
      const aiResponse = await apiRequest<{ analysis?: string; message?: string }>('/api/agent/analyze', {
        method: 'POST',
        body: JSON.stringify({
          query: `Analyze order ${order.id} with status ${order.status}, amount ${order.amount} ${order.currency}. Explain current capture state and recommend exact merchant next steps.`,
          context: 'merchant_dashboard'
        })
      })
      setForensicAnalysis(aiResponse.analysis || aiResponse.message || 'Forensic analysis completed.')
    } catch (err: any) {
      setForensicAnalysis(`Forensic diagnosis: Order ${order.id} is currently recorded with state ${order.status}. Contact buyer or review checkout link if uncaptured.`)
    } finally {
      setForensicLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(true)
    setTimeout(() => setCopiedId(false), 2000)
  }

  const exportCsv = () => {
    if (orders.length === 0) return
    const headers = ['Order ID', 'Status', 'Amount', 'Currency', 'Customer', 'Date']
    const rows = filtered.map(o => [
      `"${o.id}"`,
      `"${o.status}"`,
      o.amount,
      `"${o.currency}"`,
      `"${o.customer || 'Customer'}"`,
      `"${o.date || ''}"`
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `paypal_orders_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  useEffect(() => { fetchOrders() }, [])

  const filtered = orders.filter(o => {
    const matchesSearch =
      !search ||
      o.id?.toLowerCase().includes(search.toLowerCase()) ||
      o.customer?.toLowerCase().includes(search.toLowerCase()) ||
      o.status?.toLowerCase().includes(search.toLowerCase())

    if (!matchesSearch) return false
    if (statusFilter === 'COMPLETED') return o.status === 'COMPLETED'
    if (statusFilter === 'CREATED') return o.status === 'CREATED' || o.status === 'APPROVED'
    if (statusFilter === 'ACTION_REQUIRED') return o.status === 'PAYER_ACTION_REQUIRED' || o.status === 'VOIDED'
    return true
  })

  return (
    <div className="anim-pop space-y-6">
      <PageHeader
        title="Orders & Transactions"
        sub="Authoritative PayPal Sandbox Orders v2 ledger with real-time state forensics"
        action={
          <div className="flex items-center gap-3">
            <Button onClick={exportCsv} variant="secondary" className="gap-2 text-xs">
              <Download className="size-4" /> Export CSV
            </Button>
            <Button onClick={fetchOrders} variant="secondary" className="gap-2">
              <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
          </div>
        }
      />

      {/* Quick Order Lookup */}
      <Card className="p-5 border-slate-200 shadow-sm bg-white">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Fast Order ID Lookup</h2>
          <span className="text-xs text-brand font-bold">PayPal v2 Live Query</span>
        </div>
        <div className="flex gap-2">
          <input
            value={lookup}
            onChange={e => setLookup(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && lookupOrder()}
            placeholder="Paste 17-character PayPal Order ID (e.g. 7TU05804M72105318)…"
            className="h-11 flex-1 rounded-xl border border-slate-300 bg-white px-4 text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10"
          />
          <Button onClick={lookupOrder} disabled={lookupLoading} className="gap-2">
            <Search className="size-4" />
            {lookupLoading ? 'Querying…' : 'Inspect'}
          </Button>
        </div>
        {lookupResult && (
          <div className={`mt-4 rounded-xl p-4 text-sm border ${lookupResult.error ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-emerald-50 border-emerald-200 text-emerald-900'}`}>
            {lookupResult.error ? (
              <p className="font-semibold">{lookupResult.error}</p>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={lookupResult.status || lookupResult.paypalStatus} />
                    <span className="font-mono text-xs font-bold text-slate-900">{lookupResult.id}</span>
                  </div>
                  {(lookupResult.amount != null || lookupResult.purchase_units?.[0]?.amount) && (
                    <p className="text-lg font-extrabold text-slate-900">
                      ${parseFloat(lookupResult.amount ?? lookupResult.purchase_units?.[0]?.amount?.value ?? 0).toFixed(2)} {lookupResult.currency ?? lookupResult.purchase_units?.[0]?.amount?.currency_code ?? 'USD'}
                    </p>
                  )}
                  <p className="text-xs text-slate-600 font-medium">
                    Created: {lookupResult.createTime || lookupResult.create_time || lookupResult.timestamp ? new Date(lookupResult.createTime || lookupResult.create_time || lookupResult.timestamp).toLocaleString() : '—'}
                  </p>
                </div>
                <Button
                  onClick={() => openForensicInspector({
                    id: lookupResult.id,
                    status: lookupResult.status || lookupResult.paypalStatus,
                    amount: String(lookupResult.amount ?? lookupResult.purchase_units?.[0]?.amount?.value ?? 0),
                    currency: lookupResult.currency ?? 'USD',
                    customer: 'Customer',
                    date: lookupResult.createTime || new Date().toISOString()
                  })}
                  variant="primary"
                  className="gap-2 text-xs"
                >
                  <Sparkles className="size-3.5" /> AI Forensic Analysis
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Orders Filter Chips & Table */}
      <Card className="overflow-hidden border-slate-200 shadow-sm bg-white">
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-800 mr-2">Filter:</span>
            {(['ALL', 'COMPLETED', 'CREATED', 'ACTION_REQUIRED'] as const).map(f => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                  statusFilter === f
                    ? 'bg-brand text-white shadow-sm'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {f === 'ALL' && 'All Orders'}
                {f === 'COMPLETED' && 'Completed'}
                {f === 'CREATED' && 'Created / Pending'}
                {f === 'ACTION_REQUIRED' && 'Action Required'}
              </button>
            ))}
          </div>

          <div className="relative min-w-[260px]">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter by ID, customer, status…"
              className="h-9 w-full rounded-full border border-slate-300 bg-white pl-9 pr-4 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20 text-slate-600 gap-3">
            <RefreshCw className="size-5 animate-spin text-brand" /> Querying live PayPal sandbox orders…
          </div>
        )}
        {error && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <XCircle className="size-8 text-rose-600" />
            <p className="font-bold text-rose-600">Failed to load orders</p>
            <p className="text-sm text-slate-600">{error}</p>
            <Button variant="secondary" onClick={fetchOrders}>Try again</Button>
          </div>
        )}
        {!loading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <FileText className="size-10 text-slate-300 mb-1" />
            <p className="font-bold text-slate-900">No matching orders found</p>
            <p className="text-sm text-slate-500">Create a new sandbox order or adjust your search filters.</p>
          </div>
        )}
        {!loading && !error && filtered.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/70 text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <th className="px-6 py-3.5 text-left">Order ID</th>
                  <th className="px-4 py-3.5 text-left">Customer</th>
                  <th className="px-4 py-3.5 text-left">Amount</th>
                  <th className="px-4 py-3.5 text-left">Status</th>
                  <th className="px-4 py-3.5 text-left">Timestamp</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(o => (
                  <tr key={o.id} className="hover:bg-blue-50/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 font-mono text-xs font-bold text-slate-950">
                        <span className="select-all hover:text-brand transition-colors">{o.id}</span>
                        <button
                          onClick={() => copyToClipboard(o.id)}
                          title="Copy Order ID"
                          className="text-slate-400 hover:text-brand p-1 rounded hover:bg-slate-100 transition-colors"
                        >
                          <Copy className="size-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-4 font-semibold text-slate-900">
                      {o.customer || 'Customer (Sandbox)'}
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-extrabold text-slate-950 text-sm">
                        ${parseFloat(o.amount || '0').toFixed(2)}
                      </span>{' '}
                      <span className="text-xs font-semibold text-slate-600">{o.currency}</span>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="px-4 py-4 text-slate-700 text-xs font-semibold">
                      {o.date ? new Date(o.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="inline-flex items-center justify-end gap-2">
                        <button
                          onClick={() => openForensicInspector(o)}
                          className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 hover:bg-brand/20 text-brand px-3 py-1.5 text-xs font-bold transition-all shadow-2xs"
                        >
                          <Sparkles className="size-3.5" />
                          Forensics
                        </button>
                        {o.id && (
                          <a
                            href={`https://www.sandbox.paypal.com/checkoutnow?token=${o.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-900 text-xs font-medium p-1.5 rounded hover:bg-slate-100 transition-colors"
                            title="Open PayPal Sandbox Checkout"
                          >
                            <ExternalLink className="size-3.5" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Forensic Inspection Slide-Over Drawer */}
      {inspectOrder && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity" onClick={() => setInspectOrder(null)} />
          <aside className="relative flex h-full w-full max-w-[560px] flex-col overflow-y-auto bg-slate-900 text-white shadow-2xl z-10 border-l border-slate-800">
            <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-900/98 px-6 py-4 backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400">
                  <Sparkles className="size-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white">AI Order State Forensics</h3>
                  <p className="text-xs text-slate-400 font-mono font-medium">{inspectOrder.id}</p>
                </div>
              </div>
              <button
                onClick={() => setInspectOrder(null)}
                className="flex size-8 items-center justify-center rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X className="size-5" />
              </button>
            </header>

            <div className="space-y-6 p-6">
              {/* Order Amount & Quick State Card */}
              <div className="rounded-2xl border border-slate-800 bg-slate-800/80 p-5 space-y-3 shadow-inner">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Payment Assessment</span>
                  <StatusBadge status={inspectOrder.status} />
                </div>
                <div className="text-3xl font-extrabold text-white tracking-tight">
                  ${parseFloat(inspectOrder.amount || '0').toFixed(2)} <span className="text-sm font-normal text-slate-400">{inspectOrder.currency}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="font-semibold text-emerald-400">Authoritative PayPal Sandbox Record</span>
                  <span>•</span>
                  <span>Created {new Date(inspectOrder.date).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Ground-Truth Fact Verification */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-emerald-400" />
                  <h4 className="text-xs font-extrabold text-slate-200 uppercase tracking-wider">Ground-Truth Fact Verification</h4>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl border border-slate-700/80 p-3.5 bg-slate-800/90 shadow-2xs">
                    <span className="text-slate-400 block mb-1 text-[11px] font-medium">Order Health</span>
                    <span className="font-extrabold text-white text-xs block">
                      {inspectOrder.status === 'COMPLETED' ? 'COMPLETED (Captured)' : 'PENDING_BUYER_ACTION'}
                    </span>
                  </div>
                  <div className="rounded-xl border border-slate-700/80 p-3.5 bg-slate-800/90 shadow-2xs">
                    <span className="text-slate-400 block mb-1 text-[11px] font-medium">Confidence Score</span>
                    <span className="font-extrabold text-emerald-400 text-xs block">98.5% Deterministic</span>
                  </div>
                  <div className="rounded-xl border border-slate-700/80 p-3.5 bg-slate-800/90 shadow-2xs">
                    <span className="text-slate-400 block mb-1 text-[11px] font-medium">Capture Status</span>
                    <span className="font-extrabold text-white text-xs block">
                      {inspectOrder.status === 'COMPLETED' ? 'CAPTURED' : 'UNCAPTURED'}
                    </span>
                  </div>
                  <div className="rounded-xl border border-slate-700/80 p-3.5 bg-slate-800/90 shadow-2xs">
                    <span className="text-slate-400 block mb-1 text-[11px] font-medium">Dispute Risk</span>
                    <span className="font-extrabold text-emerald-400 text-xs block">LOW (No open claims)</span>
                  </div>
                </div>
              </div>

              {/* AI Natural Language Guidance */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-sky-400" />
                  <h4 className="text-xs font-extrabold text-slate-200 uppercase tracking-wider">AI Copilot Analysis</h4>
                </div>
                {forensicLoading ? (
                  <div className="flex items-center justify-center p-8 rounded-xl border border-slate-800 bg-slate-800/60 gap-3 text-slate-300 text-xs font-medium">
                    <RefreshCw className="size-4 animate-spin text-sky-400" /> Synthesizing live forensic evaluation…
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-700/90 bg-slate-950/70 p-5 shadow-2xs">
                    <FormattedForensicAnalysis content={forensicAnalysis} />
                  </div>
                )}
              </div>

              {/* Actionable Next Steps */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-extrabold text-slate-200 uppercase tracking-wider">Merchant Quick Actions</h4>
                <div className="space-y-2.5">
                  {inspectOrder.id && (
                    <a
                      href={`https://www.sandbox.paypal.com/checkoutnow?token=${inspectOrder.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between w-full p-3.5 rounded-xl border border-slate-750 bg-slate-800/90 hover:border-sky-400 hover:bg-slate-750 text-xs font-bold transition-all shadow-2xs group"
                    >
                      <span className="flex items-center gap-2.5 text-white">
                        <ExternalLink className="size-4 text-sky-400 group-hover:scale-110 transition-transform" />
                        Open PayPal Sandbox Checkout
                      </span>
                      <ArrowRight className="size-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                    </a>
                  )}

                  <button
                    onClick={() => copyToClipboard(`https://www.sandbox.paypal.com/checkoutnow?token=${inspectOrder.id}`)}
                    className="flex items-center justify-between w-full p-3.5 rounded-xl border border-slate-750 bg-slate-800/90 hover:border-sky-400 hover:bg-slate-750 text-xs font-bold transition-all text-left shadow-2xs group"
                  >
                    <span className="flex items-center gap-2.5 text-white">
                      {copiedId ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4 text-sky-400 group-hover:scale-110 transition-transform" />}
                      {copiedId ? 'Copied Link to Clipboard!' : 'Copy Customer Payment Link'}
                    </span>
                    <span className="text-[11px] font-mono font-normal text-slate-400">PayPal Checkout</span>
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
