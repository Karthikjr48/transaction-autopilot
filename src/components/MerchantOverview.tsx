import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, CircleCheckBig, Clock3, Link2, ReceiptText, TriangleAlert } from 'lucide-react'
import { getPaymentAnalytics, getTransactions, type PaymentAnalytics } from '../api'
import { money, type Txn } from '../data'
import { Button, Card, PageHeader, Skeleton } from './ui'
import { TxnSkeleton, TxnTable } from './TxnTable'

type View = 'loading' | 'ready' | 'empty' | 'error'

export function MerchantOverview({
  onCreate,
  onViewAll,
  onSelect,
}: {
  onCreate: () => void
  onViewAll: () => void
  onSelect: (transaction: Txn) => void
}) {
  const [view, setView] = useState<View>('loading')
  const [analytics, setAnalytics] = useState<PaymentAnalytics | null>(null)
  const [recent, setRecent] = useState<Txn[]>([])
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setView('loading')
    setError('')
    try {
      const summary = await getPaymentAnalytics()
      setAnalytics(summary)
      if (!summary.hasData) {
        setRecent([])
        setView('empty')
        return
      }

      try {
        const transactions = await getTransactions()
        setRecent(transactions.slice(0, 5))
      } catch {
        setRecent([])
      }
      setView('ready')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load the payment overview.')
      setView('error')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const metrics = [
    {
      label: 'Total Payments',
      value: analytics ? money(analytics.totalVolume, 'USD') : '',
      Icon: ReceiptText,
      tone: 'bg-info-bg text-brand',
      supporting: analytics ? `${analytics.totalCount} verified transactions` : '',
    },
    {
      label: 'Successful Payments',
      value: analytics ? String(analytics.successfulOrders) : '',
      Icon: CircleCheckBig,
      tone: 'bg-ok-bg text-ok-fg',
      supporting: 'Authoritatively completed',
    },
    {
      label: 'Pending Payments',
      value: analytics ? String(analytics.pendingOrders) : '',
      Icon: Clock3,
      tone: 'bg-warn-bg text-warn-fg',
      supporting: 'Awaiting customer or provider action',
    },
    {
      label: 'Failed Payments',
      value: analytics ? String(analytics.failedCount) : '',
      Icon: TriangleAlert,
      tone: 'bg-err-bg text-err-fg',
      supporting: 'Provider-confirmed failures',
    },
  ]

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="anim-pop">
      <PageHeader
        title={greeting}
        sub="Here’s your verified payment overview."
        action={<Button onClick={onCreate}><Link2 className="size-4" /> Create Payment Link</Button>}
      />

      <div className="grid grid-cols-1 gap-4 min-[560px]:grid-cols-2 min-[1100px]:grid-cols-4">
        {metrics.map(({ label, value, Icon, tone, supporting }) => (
          <Card key={label} className="min-h-44 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="pt-1 text-sm leading-tight font-semibold text-ink-2">{label}</div>
              <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${tone}`}>
                <Icon className="size-[18px]" strokeWidth={1.9} aria-hidden />
              </span>
            </div>
            <div className="mt-5 h-9">
              {view === 'loading'
                ? <Skeleton className="mt-1 h-7 w-28" />
                : view === 'error'
                  ? <div className="text-2xl font-extrabold text-ink-2">—</div>
                  : <div className="tnum text-[1.75rem] leading-9 font-extrabold tracking-tight">{value || '0'}</div>}
            </div>
            <div className="mt-4 border-t border-line pt-3 text-[13px] leading-relaxed text-ink-2">
              {view === 'error' ? 'Data unavailable' : supporting}
            </div>
          </Card>
        ))}
      </div>

      {view === 'error' ? (
        <Card className="mt-6 flex flex-col items-center gap-3 px-6 py-14 text-center">
          <AlertCircle className="size-8 text-err-fg" aria-hidden />
          <p className="font-bold">We couldn’t load your payment overview.</p>
          <p className="max-w-lg text-sm text-ink-2">{error}</p>
          <Button variant="secondary" onClick={() => void load()}>Try again</Button>
        </Card>
      ) : (
        <Card className="mt-6 overflow-hidden">
          <div className="flex items-center justify-between gap-4 px-5 py-5 sm:px-6">
            <div>
              <h2 className="text-lg font-extrabold">Recent Transactions</h2>
              <p className="mt-1 text-xs text-ink-2">Verified payment-provider activity</p>
            </div>
            {view === 'ready' && <Button variant="ghost" onClick={onViewAll} className="h-9">View all</Button>}
          </div>
          {view === 'loading' && <TxnSkeleton />}
          {view === 'ready' && recent.length > 0 && <TxnTable rows={recent} onSelect={onSelect} />}
          {view === 'ready' && recent.length === 0 && (
            <div className="border-t border-line px-6 py-10 text-center text-sm text-ink-2">
              Summary data is available, but transaction details could not be retrieved. Use Transactions to retry.
            </div>
          )}
          {view === 'empty' && (
            <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
              <span className="flex size-14 items-center justify-center rounded-2xl bg-info-bg text-brand"><Link2 className="size-6" aria-hidden /></span>
              <p className="mt-3 text-lg font-extrabold">Your payment activity will appear here.</p>
              <p className="text-sm text-ink-2">Create your first payment link to get started.</p>
              <Button onClick={onCreate} className="mt-4">Create Payment Link</Button>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
