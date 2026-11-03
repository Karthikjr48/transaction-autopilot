import { useEffect } from 'react'
import { X } from 'lucide-react'
import { money, type Txn } from '../data'
import { StatusLabel } from './ui'

export function Drawer({ txn, onClose }: { txn: Txn; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const currentEvent = {
    t: `${txn.date}${txn.time ? `, ${txn.time}` : ''}`,
    label: {
      Completed: 'Payment completed',
      Pending: 'Payment is pending',
      Failed: 'Payment failed',
      Cancelled: 'Payment cancelled',
    }[txn.status],
  }

  const fields: [string, string][] = [
    ['Customer', txn.customer],
    ['Email', txn.email],
    ['Date & time', `${txn.date}, ${txn.time}`],
    ['Order reference', txn.order],
  ]

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-navy-950/35" onClick={onClose} aria-hidden />
      <aside role="dialog" aria-modal="true" aria-label={`Transaction ${txn.ref}`} className="anim-slide relative flex h-full w-full max-w-[460px] flex-col overflow-y-auto bg-white shadow-2xl">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
          <div>
            <div className="text-xs font-semibold text-ink-2">Transaction</div>
            <div className="text-lg font-extrabold">{txn.ref}</div>
          </div>
          <button onClick={onClose} aria-label="Close" className="flex size-10 items-center justify-center rounded-full hover:bg-canvas">
            <X className="size-5" />
          </button>
        </header>
        <div className="space-y-7 p-5 sm:p-6">
          <div className="rounded-2xl border border-line bg-canvas/70 p-5">
            <div className="text-xs font-bold tracking-wide text-ink-2 uppercase">Payment amount</div>
            <div className="tnum mt-2 text-4xl font-extrabold tracking-tight">{money(txn.amount, txn.currency)}</div>
            <div className="mt-2 flex items-center gap-2 text-sm text-ink-2">
              {txn.currency} <StatusLabel status={txn.status} />
            </div>
          </div>
          <dl className="divide-y divide-line rounded-xl border border-line">
            {fields.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 px-4 py-3 text-sm">
                <dt className="text-ink-2">{k}</dt>
                <dd className="text-right font-semibold break-all">{v}</dd>
              </div>
            ))}
          </dl>
          <div>
            <h3 className="mb-1 text-sm font-extrabold">Activity</h3>
            <p className="mb-4 text-xs text-ink-2">Latest status reported by the payment provider.</p>
            <ol className="relative border-l border-line pl-5">
              <li className="relative">
                <span className="absolute top-1.5 -left-[25px] size-2.5 rounded-full border-2 border-white bg-brand ring-1 ring-brand" />
                <div className="text-sm font-semibold">{currentEvent.label}</div>
                <div className="text-xs text-ink-2">{currentEvent.t}</div>
              </li>
            </ol>
          </div>
        </div>
      </aside>
    </div>
  )
}
