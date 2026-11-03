import { type ButtonHTMLAttributes, type ReactNode, type CSSProperties } from 'react'
import { Check, Clock, X, Ban, Loader2 } from 'lucide-react'
import type { Status } from '../data'

type Variant = 'primary' | 'secondary' | 'ghost'

export function Button({
  variant = 'primary',
  loading,
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  const base =
    'inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-bold whitespace-nowrap active:translate-y-px disabled:translate-y-0 disabled:opacity-50'
  const v = {
    primary: 'bg-brand text-white hover:bg-brand-hover active:scale-[.98]',
    secondary: 'border-2 border-brand bg-white text-brand hover:bg-info-bg',
    ghost: 'text-link hover:bg-info-bg px-3',
  }[variant]
  return (
    <button className={`${base} ${v} ${className}`} disabled={loading || rest.disabled} {...rest}>
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  )
}

const S: Record<Status, { cls: string; Icon: typeof Check }> = {
  Completed: { cls: 'bg-ok-bg text-ok-fg', Icon: Check },
  Pending: { cls: 'bg-warn-bg text-warn-fg', Icon: Clock },
  Failed: { cls: 'bg-err-bg text-err-fg', Icon: X },
  Cancelled: { cls: 'bg-slate-100 text-slate-600', Icon: Ban },
}

export function StatusLabel({ status }: { status: Status }) {
  const { cls, Icon } = S[status]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-bold ${cls}`}>
      <Icon className="size-3" strokeWidth={3} aria-hidden />
      {status}
    </span>
  )
}

export function Card({ children, className = '', style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return <section style={style} className={`rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(0,26,61,.035)] ${className}`}>{children}</section>
}

export function PageHeader({ title, sub, action }: { title: string; sub: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[1.75rem] leading-[1.15] font-extrabold tracking-tight">{title}</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{sub}</p>
      </div>
      {action}
    </div>
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden />
}
