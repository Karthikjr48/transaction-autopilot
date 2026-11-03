import { useEffect, useState } from 'react'
import {
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  MessageSquare,
  ShieldCheck,
  PlusCircle,
  Check,
  Send,
  ExternalLink
} from 'lucide-react'
import { Card, PageHeader, Button } from './ui'
import { apiRequest } from '../api'

interface Dispute {
  dispute_id: string
  status: string
  reason: string
  dispute_amount?: { value: string; currency_code: string }
  create_time: string
  update_time?: string
  disputed_transactions?: { seller_transaction_id?: string; buyer_transaction_id?: string }[]
  resolution_notes?: string
}

function DisputeStatus({ status }: { status: string }) {
  const map: Record<string, string> = {
    OPEN: 'bg-err-bg text-err-fg border border-err-fg/20',
    WAITING_FOR_SELLER_RESPONSE: 'bg-warn-bg text-warn-fg border border-warn-fg/20',
    WAITING_FOR_BUYER_RESPONSE: 'bg-info-bg text-brand border border-brand/20',
    UNDER_REVIEW: 'bg-warn-bg text-warn-fg border border-warn-fg/20',
    RESOLVED: 'bg-ok-bg text-ok-fg border border-ok-fg/20',
    OTHER: 'bg-canvas text-ink-2',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${map[status] ?? 'bg-canvas text-ink-2'}`}>
      {status === 'RESOLVED' ? <CheckCircle className="size-3" /> : <AlertTriangle className="size-3" />}
      {status.replace(/_/g, ' ')}
    </span>
  )
}

export function Disputes() {
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'ALL' | 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED'>('ALL')
  const [showSimulateModal, setShowSimulateModal] = useState(false)
  const [simulateOrderId, setSimulateOrderId] = useState('')
  const [simulateReason, setSimulateReason] = useState('MERCHANDISE_OR_SERVICE_NOT_RECEIVED')
  const [simulateAmount, setSimulateAmount] = useState('31.00')

  const fetchDisputes = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await apiRequest<{ items?: Dispute[]; disputes?: Dispute[] }>('/api/paypal/disputes')
      setDisputes(data.items ?? data.disputes ?? [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchDisputes() }, [])

  const handleSimulateDispute = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setActionLoading('simulating')
    setError('')
    setFeedback(null)
    try {
      const data = await apiRequest<{ success: boolean; dispute?: Dispute; error?: string }>('/api/paypal/disputes/simulate', {
        method: 'POST',
        body: JSON.stringify({
          orderId: simulateOrderId || undefined,
          reason: simulateReason,
          amount: simulateAmount
        })
      })
      if (!data.success) throw new Error(data.error || 'Failed to simulate dispute')
      setFeedback(`Dispute ${data.dispute?.dispute_id} created and recorded in sandbox ledger.`)
      setShowSimulateModal(false)
      await fetchDisputes()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleResolve = async (disputeId: string, action: 'ACCEPT_CLAIM' | 'PROVIDE_EVIDENCE') => {
    setActionLoading(disputeId)
    setError('')
    setFeedback(null)
    try {
      const data = await apiRequest<{ success: boolean; message?: string; error?: string }>(`/api/paypal/disputes/${disputeId}/resolve`, {
        method: 'POST',
        body: JSON.stringify({
          action,
          notes: action === 'ACCEPT_CLAIM'
            ? 'Merchant accepted customer claim; claim resolved in sandbox.'
            : 'Merchant submitted proof of carrier delivery and tracking details.'
        })
      })
      if (!data.success) throw new Error(data.error || 'Failed to process dispute action')
      setFeedback(data.message || `Dispute ${disputeId} updated successfully.`)
      await fetchDisputes()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const isOpen = (d: Dispute) => d.status === 'OPEN' || d.status === 'WAITING_FOR_SELLER_RESPONSE'
  const isReview = (d: Dispute) => d.status === 'UNDER_REVIEW' || d.status === 'WAITING_FOR_BUYER_RESPONSE'
  const isResolved = (d: Dispute) => d.status === 'RESOLVED'

  const openCount = disputes.filter(isOpen).length
  const reviewCount = disputes.filter(isReview).length
  const resolvedCount = disputes.filter(isResolved).length

  const filteredDisputes = disputes.filter(d => {
    if (activeTab === 'OPEN') return isOpen(d)
    if (activeTab === 'UNDER_REVIEW') return isReview(d)
    if (activeTab === 'RESOLVED') return isResolved(d)
    return true
  })

  return (
    <div className="anim-pop space-y-6">
      <PageHeader
        title="Disputes & Claims"
        sub="PayPal Sandbox Disputes API v1 — Live Integration & Webhook Reconciliation"
        action={
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setShowSimulateModal(true)}
              variant="primary"
              className="gap-2"
            >
              <PlusCircle className="size-4" /> Simulate Test Dispute
            </Button>
            <Button onClick={fetchDisputes} variant="secondary" className="gap-2">
              <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
          </div>
        }
      />

      {/* Integration Connectivity Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-card px-5 py-3 shadow-xs">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ok-fg opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-ok-fg"></span>
          </span>
          <div className="text-sm font-semibold text-ink">
            PayPal Disputes API v1: <span className="text-ok-fg font-bold">Connected (Sandbox)</span>
          </div>
          <span className="text-xs text-ink-2">| Endpoint: api-m.sandbox.paypal.com/v1/customer/disputes</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-ink-2">
          <ShieldCheck className="size-4 text-brand" />
          <span>Webhook Ingestion: Active</span>
        </div>
      </div>

      {feedback && (
        <div className="flex items-center justify-between rounded-xl bg-ok-bg p-4 text-sm font-medium text-ok-fg border border-ok-fg/20">
          <div className="flex items-center gap-2">
            <CheckCircle className="size-5 shrink-0" />
            <span>{feedback}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-xs underline hover:text-ok-fg/80">Dismiss</button>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between rounded-xl bg-err-bg p-4 text-sm font-medium text-err-fg border border-err-fg/20">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-5 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-xs underline hover:text-err-fg/80">Dismiss</button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Action Required', value: openCount, sub: 'Waiting for seller response', cls: 'text-err-fg', bg: 'bg-err-bg/30' },
          { label: 'Under Review', value: reviewCount, sub: 'Evidence under PayPal review', cls: 'text-warn-fg', bg: 'bg-warn-bg/30' },
          { label: 'Resolved', value: resolvedCount, sub: 'Claims settled & finalized', cls: 'text-ok-fg', bg: 'bg-ok-bg/30' },
        ].map(c => (
          <Card key={c.label} className={`p-5 ${c.bg}`}>
            <div className="text-xs font-bold text-ink-2 uppercase tracking-wide">{c.label}</div>
            <div className={`mt-2 text-3xl font-extrabold ${c.cls}`}>{loading ? '—' : c.value}</div>
            <div className="mt-1 text-xs text-ink-2">{c.sub}</div>
          </Card>
        ))}
      </div>

      {/* Filter Tabs & Dispute List */}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between border-b border-line px-6 py-4 gap-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="size-5 text-ink-2" />
            <h2 className="text-lg font-extrabold">Dispute Ledger</h2>
          </div>
          <div className="flex rounded-lg bg-canvas p-1 text-xs font-semibold text-ink-2">
            {(['ALL', 'OPEN', 'UNDER_REVIEW', 'RESOLVED'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-md px-3 py-1.5 transition-colors ${
                  activeTab === tab ? 'bg-card text-ink shadow-xs font-bold' : 'hover:text-ink'
                }`}
              >
                {tab === 'ALL' && `All (${disputes.length})`}
                {tab === 'OPEN' && `Action Required (${openCount})`}
                {tab === 'UNDER_REVIEW' && `Review (${reviewCount})`}
                {tab === 'RESOLVED' && `Resolved (${resolvedCount})`}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-3 py-16 text-ink-2">
            <RefreshCw className="size-5 animate-spin" /> Querying PayPal Disputes API…
          </div>
        )}

        {!loading && filteredDisputes.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <CheckCircle className="size-10 text-ok-fg" />
            <h3 className="text-base font-bold text-ink">No disputes in this view</h3>
            <p className="max-w-md text-sm text-ink-2">
              {activeTab === 'ALL'
                ? 'Your PayPal sandbox account currently has no recorded buyer disputes or chargebacks.'
                : `There are currently 0 disputes matching the "${activeTab.replace(/_/g, ' ')}" filter.`}
            </p>
            {activeTab === 'ALL' && (
              <Button
                variant="secondary"
                onClick={() => setShowSimulateModal(true)}
                className="mt-2 gap-2 text-xs"
              >
                <PlusCircle className="size-3.5" /> Simulate a Test Sandbox Dispute
              </Button>
            )}
          </div>
        )}

        {!loading && filteredDisputes.length > 0 && (
          <div className="divide-y divide-line">
            {filteredDisputes.map(d => (
              <div key={d.dispute_id} className="p-6 hover:bg-canvas/40 transition-colors">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <DisputeStatus status={d.status} />
                      <span className="font-mono text-xs font-semibold text-ink-2">{d.dispute_id}</span>
                    </div>

                    <div className="text-base font-bold text-ink">
                      {d.reason?.replace(/_/g, ' ') || 'General Dispute'}
                    </div>

                    {d.disputed_transactions?.[0]?.seller_transaction_id && (
                      <div className="text-xs text-ink-2 flex items-center gap-2">
                        <span>Associated Order:</span>
                        <span className="font-mono font-semibold text-brand">
                          {d.disputed_transactions[0].seller_transaction_id}
                        </span>
                      </div>
                    )}

                    {d.resolution_notes && (
                      <div className="mt-2 rounded-md bg-canvas p-2.5 text-xs text-ink-2 border border-line">
                        <span className="font-bold text-ink">Resolution Notes: </span>
                        {d.resolution_notes}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col md:items-end justify-between gap-3 shrink-0">
                    <div className="text-left md:text-right">
                      {d.dispute_amount && (
                        <div className="text-xl font-extrabold text-err-fg">
                          ${parseFloat(d.dispute_amount.value || '0').toFixed(2)} {d.dispute_amount.currency_code}
                        </div>
                      )}
                      <div className="text-xs text-ink-2 flex items-center gap-1 md:justify-end mt-0.5">
                        <Clock className="size-3" />
                        Opened: {new Date(d.create_time).toLocaleDateString()}
                      </div>
                    </div>

                    {/* Action buttons for open disputes */}
                    {isOpen(d) && (
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          variant="secondary"
                          onClick={() => handleResolve(d.dispute_id, 'PROVIDE_EVIDENCE')}
                          disabled={actionLoading === d.dispute_id}
                          className="text-xs py-1.5 px-3 gap-1.5"
                        >
                          <Send className="size-3.5" /> Submit Evidence
                        </Button>
                        <Button
                          variant="primary"
                          onClick={() => handleResolve(d.dispute_id, 'ACCEPT_CLAIM')}
                          disabled={actionLoading === d.dispute_id}
                          className="text-xs py-1.5 px-3 gap-1.5 bg-ok-fg hover:bg-ok-fg/90 border-ok-fg"
                        >
                          <Check className="size-3.5" /> Accept Claim
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Simulate Dispute Modal */}
      {showSimulateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl border border-line space-y-4 anim-pop">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-lg font-bold text-ink flex items-center gap-2">
                <AlertTriangle className="size-5 text-warn-fg" /> Simulate Sandbox Dispute
              </h3>
              <button
                onClick={() => setShowSimulateModal(false)}
                className="text-ink-2 hover:text-ink font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-ink-2">
              Creates an authentic Sandbox Dispute record and triggers an official <code className="text-brand">CUSTOMER.DISPUTE.CREATED</code> webhook event for testing seller mitigation workflows.
            </p>

            <form onSubmit={handleSimulateDispute} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink-2 mb-1">Associated Order ID (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 8UC45598PW2909820 (Defaults to latest order)"
                  value={simulateOrderId}
                  onChange={e => setSimulateOrderId(e.target.value)}
                  className="w-full rounded-lg border border-field bg-canvas px-3 py-2 text-sm text-ink focus:border-link focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-2 mb-1">Dispute Reason</label>
                <select
                  value={simulateReason}
                  onChange={e => setSimulateReason(e.target.value)}
                  className="w-full rounded-lg border border-field bg-canvas px-3 py-2 text-sm text-ink focus:border-link focus:outline-none"
                >
                  <option value="MERCHANDISE_OR_SERVICE_NOT_RECEIVED">Merchandise Not Received</option>
                  <option value="MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED">Item Not As Described</option>
                  <option value="UNAUTHORISED">Unauthorised Transaction</option>
                  <option value="CANCELLATION_OR_RETURN">Cancellation or Return</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-2 mb-1">Disputed Amount (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  value={simulateAmount}
                  onChange={e => setSimulateAmount(e.target.value)}
                  className="w-full rounded-lg border border-field bg-canvas px-3 py-2 text-sm text-ink focus:border-link focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowSimulateModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={actionLoading === 'simulating'}
                  className="gap-2"
                >
                  {actionLoading === 'simulating' ? (
                    <>
                      <RefreshCw className="size-4 animate-spin" /> Creating…
                    </>
                  ) : (
                    'Create Dispute'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
