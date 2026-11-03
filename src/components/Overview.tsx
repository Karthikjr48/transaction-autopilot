import { useEffect, useState } from 'react'
import { AlertCircle, Link2, TrendingUp, CheckCircle, Clock, XCircle, RefreshCw } from 'lucide-react'
import { Button, Card, PageHeader, Skeleton } from './ui'
import { apiRequest } from '../api'

interface Analytics {
  total_volume: number
  currency: string
  successful_count: number
  pending_count: number
  failed_count: number
  total_orders: number
  success_rate: number
  recent_orders?: any[]
}

type View = 'live' | 'loading' | 'error'

export function Overview({
  onCreate,
  onViewAll,
  onSelect,
}: {
  onCreate: () => void
  onViewAll: () => void
  onSelect: (t: any) => void
}) {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [view, setView] = useState<View>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  const fetchAnalytics = async () => {
    setView('loading')
    setErrorMsg('')
    try {
      const data = await apiRequest<any>('/api/paypal/analytics')
      const a = data.analytics || data

      let recent = a.recent_orders || a.recentOrders || []
      try {
        const ordData = await apiRequest<{ orders?: any[] }>('/api/merchant/orders')
        if (ordData.orders && ordData.orders.length > 0) {
          recent = ordData.orders
        }
      } catch (_) {}

      const totalVol = Number(a.totalVolume ?? a.total_volume ?? 0)
      const totOrders = Number(a.totalOrders ?? a.total_orders ?? a.totalCount ?? 0)
      const successCount = Number(a.successfulOrders ?? a.successful_count ?? a.capturedCount ?? 0)
      const pendCount = Number(a.pendingOrders ?? a.pending_count ?? a.attentionCount ?? 0)
      const failCount = Number(a.failedCount ?? a.failed_count ?? 0)

      setAnalytics({
        total_volume: totalVol,
        currency: a.currency || 'USD',
        successful_count: successCount,
        pending_count: pendCount,
        failed_count: failCount,
        total_orders: totOrders,
        success_rate: totOrders > 0 ? (successCount / totOrders) * 100 : 0,
        recent_orders: recent,
      })
      setView('live')
    } catch (e: any) {
      setErrorMsg(e.message)
      setView('error')
    }
  }

  useEffect(() => { fetchAnalytics() }, [])

  const fmt = (val: number, cur = 'USD') =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: cur }).format(val)

  const metrics = analytics
    ? [
        {
          label: 'Total Volume',
          value: fmt(analytics.total_volume, analytics.currency || 'USD'),
          sub: `${analytics.total_orders} total orders`,
          dot: null,
          icon: <TrendingUp className="size-5 text-brand" />,
        },
        {
          label: 'Successful Payments',
          value: String(analytics.successful_count ?? 0),
          sub: `${analytics.success_rate?.toFixed(1) ?? 0}% success rate`,
          dot: 'bg-ok-fg',
          icon: <CheckCircle className="size-5 text-ok-fg" />,
        },
        {
          label: 'Pending Payments',
          value: String(analytics.pending_count ?? 0),
          sub: 'Awaiting action',
          dot: 'bg-warn-fg',
          icon: <Clock className="size-5 text-warn-fg" />,
        },
        {
          label: 'Failed Payments',
          value: String(analytics.failed_count ?? 0),
          sub: 'This period',
          dot: 'bg-err-fg',
          icon: <XCircle className="size-5 text-err-fg" />,
        },
      ]
    : []

  const greet = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="anim-pop">
      <PageHeader
        title={greet()}
        sub={view === 'live' ? 'Live data from PayPal Sandbox — real transactions.' : 'Loading your payment overview…'}
        action={
          <div className="flex items-center gap-2">
            {view === 'live' && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-ok-bg px-3 py-1.5 text-xs font-bold text-ok-fg">
                <span className="size-2 rounded-full bg-ok-fg" /> Live
              </span>
            )}
            <Button onClick={onCreate}>
              <Link2 className="size-4" /> Create Payment Link
            </Button>
          </div>
        }
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 min-[560px]:grid-cols-2 min-[1100px]:grid-cols-4">
        {(view === 'loading' ? Array(4).fill(null) : metrics).map((m, i) => (
          <Card key={i} className="p-5">
            {view === 'loading' ? (
              <>
                <Skeleton className="h-4 w-32 mb-3" />
                <Skeleton className="h-9 w-24 mt-1" />
                <Skeleton className="h-3 w-20 mt-4" />
              </>
            ) : view === 'error' ? (
              <>
                <div className="text-sm font-semibold text-ink-2">{['Total Volume', 'Successful', 'Pending', 'Failed'][i]}</div>
                <div className="mt-3 text-2xl font-extrabold text-ink-2">—</div>
                <div className="mt-3 border-t border-line pt-3 text-xs text-err-fg">Data unavailable</div>
              </>
            ) : (
              m && (
                <>
                  <div className="flex items-center gap-2 text-sm font-semibold text-ink-2">
                    {m.dot && <span className={`size-2 rounded-full ${m.dot}`} aria-hidden />}
                    {m.label}
                  </div>
                  <div className="mt-3 h-9 flex items-center">
                    <div className="tnum text-[1.75rem] leading-9 font-extrabold tracking-tight">{m.value}</div>
                  </div>
                  <div className="mt-3 border-t border-line pt-3 text-[13px] text-ink-2">{m.sub}</div>
                </>
              )
            )}
          </Card>
        ))}
      </div>

      {view === 'error' && (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-err-fg/20 bg-err-bg px-6 py-10 text-center">
          <AlertCircle className="size-8 text-err-fg" />
          <p className="font-bold text-err-fg">Couldn't load analytics</p>
          <p className="text-sm text-ink-2">{errorMsg}</p>
          <Button variant="secondary" onClick={fetchAnalytics} className="gap-2">
            <RefreshCw className="size-4" /> Try again
          </Button>
        </div>
      )}

      {view === 'live' && analytics && (
        <Card className="mt-6 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5">
            <h2 className="text-lg font-extrabold">PayPal Sandbox Activity</h2>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={fetchAnalytics} className="h-9 gap-2">
                <RefreshCw className="size-4" /> Refresh
              </Button>
              <Button variant="ghost" onClick={onViewAll} className="h-9">
                View all orders →
              </Button>
            </div>
          </div>

          {analytics.recent_orders && analytics.recent_orders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line bg-canvas text-xs font-bold text-ink-2 uppercase tracking-wide">
                    <th className="px-6 py-3 text-left">Order ID</th>
                    <th className="px-4 py-3 text-left">Amount</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                    {analytics.recent_orders.slice(0, 8).map((o: any, i: number) => {
                      const rawAmt = Number(o.amount ?? o.purchase_units?.[0]?.amount?.value ?? 0)
                      const amt = isNaN(rawAmt) ? (o.amount ?? '0.00') : rawAmt.toFixed(2)
                      const cur = o.currency ?? o.purchase_units?.[0]?.amount?.currency_code ?? 'USD'
                      const dt = o.date ?? o.timestamp ?? o.create_time
                      return (
                        <tr key={i} className="hover:bg-canvas/60 transition-colors">
                          <td className="px-6 py-4 font-mono text-xs text-ink-2">{o.id?.slice(0, 14)}…</td>
                          <td className="px-4 py-4 font-bold">{amt} {cur}</td>
                          <td className="px-4 py-4">
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                              o.status === 'COMPLETED' ? 'bg-ok-bg text-ok-fg' :
                              o.status === 'CREATED' ? 'bg-info-bg text-brand' :
                              'bg-warn-bg text-warn-fg'
                            }`}>{o.status}</span>
                          </td>
                          <td className="px-4 py-4 text-xs text-ink-2">
                            {dt ? new Date(dt).toLocaleDateString() : '—'}
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
              <span className="flex size-14 items-center justify-center rounded-2xl bg-info-bg text-brand">
                <Link2 className="size-6" />
              </span>
              <p className="mt-3 text-lg font-extrabold">No transactions yet in sandbox.</p>
              <p className="text-sm text-ink-2">Create a payment link to start processing test payments.</p>
              <Button onClick={onCreate} className="mt-4">Create Payment Link</Button>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
