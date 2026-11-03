import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, ChevronDown, FileX, Search, X } from 'lucide-react'
import { getTransactions } from '../api'
import type { Status, Txn } from '../data'
import { Button, Card, PageHeader } from './ui'
import { TxnSkeleton, TxnTable } from './TxnTable'

const STATUSES: Array<'All' | Status> = ['All', 'Completed', 'Pending', 'Failed', 'Cancelled']
const RANGES = ['All dates', 'Last 7 days', 'Last 30 days']
const SORTS = ['Newest first', 'Oldest first', 'Amount: high to low', 'Amount: low to high']
const PAGE_SIZE = 10
const field =
  'h-11 rounded-xl border border-field bg-white px-3 text-[15px] font-medium hover:border-slate-400 focus:border-link focus:ring-4 focus:ring-link/20 focus:outline-none'

export function Transactions({
  onSelect,
  selected,
  initialQuery = '',
}: {
  onSelect: (transaction: Txn) => void
  selected: string | null
  initialQuery?: string
}) {
  const [transactions, setTransactions] = useState<Txn[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState(initialQuery)
  const [status, setStatus] = useState<'All' | Status>('All')
  const [range, setRange] = useState(RANGES[0])
  const [sort, setSort] = useState(SORTS[0])
  const [page, setPage] = useState(1)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setTransactions(await getTransactions())
    } catch (reason) {
      setTransactions([])
      setError(reason instanceof Error ? reason.message : 'Unable to retrieve transactions.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => setPage(1), [query, status, range, sort])

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase()
    const now = Date.now()
    const maxAge = range === 'Last 7 days' ? 7 : range === 'Last 30 days' ? 30 : null
    const rows = transactions.filter((transaction) => {
      if (status !== 'All' && transaction.status !== status) return false
      if (maxAge) {
        const timestamp = Date.parse(`${transaction.date} ${transaction.time}`)
        if (!Number.isFinite(timestamp) || now - timestamp > maxAge * 86_400_000) return false
      }
      return !search || [transaction.ref, transaction.customer, transaction.email, transaction.order]
        .some((value) => value.toLowerCase().includes(search))
    })

    return rows.sort((a, b) => {
      if (sort === 'Amount: high to low') return b.amount - a.amount
      if (sort === 'Amount: low to high') return a.amount - b.amount
      const aTime = Date.parse(`${a.date} ${a.time}`)
      const bTime = Date.parse(`${b.date} ${b.time}`)
      return sort === 'Oldest first' ? aTime - bTime : bTime - aTime
    })
  }, [transactions, query, status, range, sort])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const filtersActive = query || status !== 'All' || range !== RANGES[0] || sort !== SORTS[0]

  return (
    <div className="anim-pop">
      <PageHeader title="Transactions" sub="Search and review verified payment activity." />
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <label className="relative min-w-[220px] flex-1">
            <span className="sr-only">Search transactions</span>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-2" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by reference, customer or order" className={`${field} w-full pl-9`} />
          </label>
          <Select label="Status" value={status} onChange={(value) => setStatus(value as typeof status)} options={STATUSES} />
          <Select label="Date range" value={range} onChange={setRange} options={RANGES} />
          <Select label="Sort order" value={sort} onChange={setSort} options={SORTS} />
          {filtersActive && (
            <Button
              variant="ghost"
              onClick={() => {
                setQuery('')
                setStatus('All')
                setRange(RANGES[0])
                setSort(SORTS[0])
              }}
            >
              <X className="size-4" /> Clear
            </Button>
          )}
        </div>

        {loading ? (
          <TxnSkeleton />
        ) : error ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <AlertCircle className="size-8 text-err-fg" aria-hidden />
            <p className="font-extrabold">We couldn’t retrieve your transactions.</p>
            <p className="max-w-lg text-sm text-ink-2">{error}</p>
            <Button variant="secondary" onClick={() => void load()}>Try again</Button>
          </div>
        ) : transactions.length === 0 ? (
          <Empty title="Your payment activity will appear here." body="Create a payment link to begin accepting payments." />
        ) : rows.length === 0 ? (
          <Empty title="No matching transactions" body="Try a different search term or clear your filters." />
        ) : (
          <>
            <TxnTable rows={rows} onSelect={onSelect} selected={selected} />
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3 text-sm text-ink-2 sm:px-6">
              <span aria-live="polite">Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
              <div className="flex items-center gap-2">
                <Button variant="secondary" className="h-9 px-4" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>Previous</Button>
                <span className="px-1 text-xs font-semibold">Page {page} of {totalPages}</span>
                <Button variant="secondary" className="h-9 px-4" disabled={page === totalPages} onClick={() => setPage((current) => current + 1)}>Next</Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <label className="relative">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className={`${field} min-w-[150px] appearance-none pr-9`}>
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-2" />
    </label>
  )
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
      <FileX className="size-8 text-ink-2" aria-hidden />
      <p className="font-extrabold">{title}</p>
      <p className="text-sm text-ink-2">{body}</p>
    </div>
  )
}
