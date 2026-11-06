export type Status = 'Completed' | 'Pending' | 'Failed' | 'Cancelled'

export interface Txn {
  ref: string
  customer: string
  email: string
  amount: number
  currency: string
  date: string
  time: string
  status: Status
  order: string
  source?: string
}

// Strict Zero-Fake-Data: transactions are strictly populated from authoritative live API calls.
export const TXNS: Txn[] = []

const sym: Record<string, string> = { USD: '$', EUR: '€', GBP: '£' }

export const money = (n: number, c: string) =>
  `${sym[c] ?? ''}${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export const sumBy = (s: Status) =>
  TXNS.filter((t) => t.status === s && t.currency === 'USD').reduce((a, t) => a + t.amount, 0)
