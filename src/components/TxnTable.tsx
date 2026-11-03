import { ChevronRight } from 'lucide-react'
import { money, type Txn } from '../data'
import { Skeleton, StatusLabel } from './ui'

export function TxnTable({
  rows,
  onSelect,
  selected,
}: {
  rows: Txn[]
  onSelect: (t: Txn) => void
  selected?: string | null
}) {
  return (
    <>
      <div className="hidden md:block">
        <table className="w-full table-fixed text-left text-sm">
          <thead className="bg-canvas/80">
            <tr className="border-b border-line text-[13px] font-bold tracking-wide text-ink-2 uppercase">
              <th className="w-[18%] px-6 py-3.5 font-bold">Transaction</th>
              <th className="w-[27%] px-3 py-3.5 font-bold">Customer</th>
              <th className="w-[16%] px-3 py-3.5 text-right font-bold">Amount</th>
              <th className="w-[18%] px-3 py-3.5 font-bold">Date</th>
              <th className="w-[16%] px-3 py-3.5 font-bold">Status</th>
              <th className="px-6 py-3 text-right font-bold">
                <span className="sr-only">Action</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr
                key={t.ref}
                onClick={() => onSelect(t)}
                aria-selected={selected === t.ref}
                className={`cursor-pointer border-b border-line/70 transition-colors last:border-0 hover:bg-canvas/80 ${selected === t.ref ? 'bg-info-bg/60' : ''}`}
              >
                <td className="px-6 py-[18px]">
                  <button
                    className="block max-w-full truncate text-[13px] font-semibold text-link hover:underline"
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelect(t)
                    }}
                  >
                    {t.ref}
                  </button>
                  <div className="truncate text-[13px] text-ink-2">{t.order}</div>
                </td>
                <td className="px-3 py-4">
                  <div className="truncate font-semibold">{t.customer}</div>
                  <div className="truncate text-[13px] text-ink-2">{t.email}</div>
                </td>
                <td className="tnum px-3 py-4 text-right font-bold">
                  {money(t.amount, t.currency)}
                  <div className="text-[13px] font-medium text-ink-2">{t.currency}</div>
                </td>
                <td className="px-3 py-4 whitespace-nowrap">
                  {t.date}
                  <div className="text-[13px] text-ink-2">{t.time}</div>
                </td>
                <td className="px-3 py-4">
                  <StatusLabel status={t.status} />
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    aria-label={`View ${t.ref}`}
                    className="inline-flex size-8 items-center justify-center rounded-full text-ink-2 hover:bg-white hover:text-brand"
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelect(t)
                    }}
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-line md:hidden">
        {rows.map((t) => (
          <li key={t.ref}>
            <button onClick={() => onSelect(t)} className="flex w-full flex-col gap-2 px-4 py-4 text-left hover:bg-canvas">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[13px] font-semibold text-link">{t.ref}</div>
                  <div className="text-[15px] font-bold">{t.customer}</div>
                </div>
                <div className="tnum text-right font-extrabold">{money(t.amount, t.currency)}</div>
              </div>
              <div className="flex items-center justify-between text-[13px] text-ink-2">
                <span>
                  {t.date} · {t.time}
                </span>
                <StatusLabel status={t.status} />
              </div>
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}

export function TxnSkeleton() {
  return (
    <div className="space-y-5 p-6" role="status" aria-label="Loading transactions">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-6">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
      ))}
    </div>
  )
}
