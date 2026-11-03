import { useEffect, useState } from 'react'
import { Button } from './ui'

export interface Prefs {
  functional: boolean
  analytics: boolean
  marketing: boolean
}

const CATS: { key: keyof Prefs; title: string; body: string }[] = [
  { key: 'functional', title: 'Functional Cookies', body: 'Remember your choices, such as filters and display preferences.' },
  { key: 'analytics', title: 'Analytics Cookies', body: 'Help us understand how the dashboard is used so we can improve it.' },
  { key: 'marketing', title: 'Marketing Cookies', body: 'Used to show relevant information about our products and services.' },
]

export function CookieBanner({ onAccept, onReject, onManage }: { onAccept: () => void; onReject: () => void; onManage: () => void }) {
  return (
    <div role="region" aria-label="Cookie consent" className="anim-pop fixed inset-x-0 bottom-0 z-30 p-3 sm:p-4 md:left-20 lg:left-64">
      <div className="mx-auto flex max-w-4xl flex-col gap-4 rounded-2xl border border-line bg-white p-5 shadow-[0_8px_32px_rgba(0,26,61,.18)] md:flex-row md:items-center">
        <div className="flex-1">
          <h2 className="font-extrabold">Your privacy matters</h2>
          <p className="mt-1 text-sm text-ink-2">
            We use essential cookies to support the service. With your permission, we may also use optional cookies to improve functionality and understand usage.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 md:flex-col lg:flex-row">
          <Button onClick={onAccept} className="h-10 px-4">
            Accept All
          </Button>
          <Button variant="secondary" onClick={onReject} className="h-10 px-4">
            Reject Non-Essential
          </Button>
          <Button variant="ghost" onClick={onManage} className="h-10">
            Manage Preferences
          </Button>
        </div>
      </div>
    </div>
  )
}

export function CookieModal({ initial, onSave, onClose }: { initial: Prefs; onSave: (p: Prefs) => void; onClose: () => void }) {
  const [p, setP] = useState(initial)
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy-950/45 p-0 sm:items-center sm:p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="ck-title" className="anim-pop flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-2xl bg-white sm:rounded-2xl">
        <div className="border-b border-line p-6">
          <h2 id="ck-title" className="text-xl font-extrabold">
            Cookie preferences
          </h2>
          <p className="mt-1 text-sm text-ink-2">Choose which optional cookies you’re happy for us to use.</p>
        </div>
        <div className="no-scrollbar flex-1 divide-y divide-line overflow-y-auto px-6">
          <div className="flex items-start justify-between gap-4 py-4">
            <div>
              <h3 className="font-bold">Strictly Necessary</h3>
              <p className="text-sm text-ink-2">Required for sign-in, security and core features. These can’t be switched off.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold whitespace-nowrap text-slate-600">Always active</span>
          </div>
          {CATS.map((c) => (
            <div key={c.key} className="flex items-start justify-between gap-4 py-4">
              <div>
                <h3 id={`l-${c.key}`} className="font-bold">
                  {c.title}
                </h3>
                <p className="text-sm text-ink-2">{c.body}</p>
              </div>
              <button
                role="switch"
                aria-checked={p[c.key]}
                aria-labelledby={`l-${c.key}`}
                onClick={() => setP({ ...p, [c.key]: !p[c.key] })}
                className={`relative mt-1 h-7 w-12 shrink-0 rounded-full ${p[c.key] ? 'bg-brand' : 'bg-slate-300'}`}
              >
                <span className={`absolute top-0.5 left-0.5 size-6 rounded-full bg-white shadow transition-transform ${p[c.key] ? 'translate-x-5' : ''}`} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex flex-col-reverse gap-3 border-t border-line p-6 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onSave(p)}>Save Preferences</Button>
        </div>
      </div>
    </div>
  )
}
