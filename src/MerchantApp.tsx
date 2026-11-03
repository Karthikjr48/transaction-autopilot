import { useEffect, useRef, useState } from 'react'
import { ChevronDown, LayoutGrid, Link2, LogOut, ReceiptText, Search, ShieldCheck } from 'lucide-react'
import paypalLogo from './assets/paypal-logo.png'
import { getMerchantSession, loginMerchant, logoutMerchant } from './api'
import type { Txn } from './data'
import { MerchantOverview } from './components/MerchantOverview'
import { Transactions } from './components/Transactions'
import { PaymentLinks } from './components/PaymentLinks'
import { Drawer } from './components/Drawer'
import { CookieBanner, CookieModal, type Prefs } from './components/Cookies'

type Page = 'overview' | 'transactions' | 'links'
type Consent = null | 'all' | 'rejected' | 'custom'

const NAV: { id: Page; label: string; Icon: typeof LayoutGrid }[] = [
  { id: 'overview', label: 'Overview', Icon: LayoutGrid },
  { id: 'transactions', label: 'Transactions', Icon: ReceiptText },
  { id: 'links', label: 'Payment Links', Icon: Link2 },
]

const NONE: Prefs = { functional: false, analytics: false, marketing: false }
const CONSENT_STORAGE_KEY = 'transaction_autopilot_cookie_preferences_v1'

function readConsent(): { consent: Consent; prefs: Prefs } {
  try {
    const parsed = JSON.parse(localStorage.getItem(CONSENT_STORAGE_KEY) || '')
    if (!['all', 'rejected', 'custom'].includes(parsed?.consent)) throw new Error('Invalid consent state')
    return {
      consent: parsed.consent,
      prefs: {
        functional: Boolean(parsed.prefs?.functional),
        analytics: Boolean(parsed.prefs?.analytics),
        marketing: Boolean(parsed.prefs?.marketing),
      },
    }
  } catch {
    localStorage.removeItem(CONSENT_STORAGE_KEY)
    return { consent: null, prefs: NONE }
  }
}

function persistConsent(consent: Exclude<Consent, null>, prefs: Prefs) {
  localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({ consent, prefs, updatedAt: new Date().toISOString() }))
}

export default function MerchantApp() {
  const [page, setPage] = useState<Page>('overview')
  const [txn, setTxn] = useState<Txn | null>(null)
  const [menu, setMenu] = useState(false)
  const [initialConsent] = useState(readConsent)
  const [consent, setConsent] = useState<Consent>(initialConsent.consent)
  const [prefs, setPrefs] = useState<Prefs>(initialConsent.prefs)
  const [modal, setModal] = useState(false)
  const [toast, setToast] = useState('')
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)
  const [sessionState, setSessionState] = useState<'checking' | 'authenticated' | 'unauthenticated' | 'error'>('checking')
  const [sessionEmail, setSessionEmail] = useState('')
  const [sessionError, setSessionError] = useState('')

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenu(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const checkSession = async () => {
    setSessionState('checking')
    setSessionError('')
    try {
      const session = await getMerchantSession()
      if (session.authenticated && session.role === 'merchant') {
        setSessionEmail(session.email || '')
        setSessionState('authenticated')
      } else {
        setSessionState('unauthenticated')
      }
    } catch (reason) {
      setSessionError(reason instanceof Error ? reason.message : 'Unable to verify your session.')
      setSessionState('error')
    }
  }

  useEffect(() => {
    void checkSession()
  }, [])

  const go = (destination: Page) => {
    setPage(destination)
    setMenu(false)
    window.scrollTo({ top: 0 })
  }

  const notify = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 2600)
  }

  const saveConsent = (nextConsent: Exclude<Consent, null>, nextPrefs: Prefs) => {
    persistConsent(nextConsent, nextPrefs)
    setConsent(nextConsent)
    setPrefs(nextPrefs)
  }

  if (sessionState === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
        <div role="status" className="text-center">
          <div className="mx-auto size-9 animate-spin rounded-full border-4 border-line border-t-brand" />
          <p className="mt-4 text-sm font-semibold text-ink-2">Verifying your session…</p>
        </div>
      </div>
    )
  }

  if (sessionState === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
        <div className="w-full max-w-md rounded-2xl border border-line bg-white p-7 text-center shadow-lg">
          <h1 className="text-xl font-extrabold">We couldn’t connect to your account.</h1>
          <p className="mt-2 text-sm text-ink-2">{sessionError}</p>
          <button onClick={() => void checkSession()} className="mt-6 h-11 rounded-full bg-brand px-6 text-sm font-bold text-white hover:bg-brand-hover">Try again</button>
        </div>
      </div>
    )
  }

  if (sessionState === 'unauthenticated') {
    return (
      <LoginScreen
        onAuthenticated={(email) => {
          setSessionEmail(email)
          setSessionState('authenticated')
        }}
      />
    )
  }

  return (
    <div className="min-h-screen md:pl-20 lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-20 flex-col bg-navy-900 text-white md:flex lg:w-64">
        <BrandLockup />
        <nav aria-label="Merchant navigation" className="flex flex-1 flex-col gap-1 px-3 py-5">
          {NAV.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => go(id)}
              aria-current={page === id ? 'page' : undefined}
              className={`relative flex h-11 items-center justify-center gap-3 rounded-lg text-sm font-semibold lg:justify-start lg:px-3 ${
                page === id
                  ? 'bg-navy-700 text-white before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-blue-200'
                  : 'text-white/70 hover:bg-white/8 hover:text-white'
              }`}
            >
              <Icon className="size-[18px] shrink-0" strokeWidth={1.9} aria-hidden />
              <span className="hidden lg:inline">{label}</span>
              <span className="sr-only lg:hidden">{label}</span>
            </button>
          ))}
        </nav>
        <div className="border-t border-white/10 p-3">
          <button
            onClick={() => setModal(true)}
            className="hidden h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-[13px] font-semibold text-white/55 hover:bg-white/8 hover:text-white lg:flex"
          >
            <ShieldCheck className="size-4" aria-hidden />
            Privacy preferences
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex h-18 items-center justify-between border-b border-line bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-2.5 lg:hidden">
          <img src={paypalLogo} alt="PayPal" className="block h-auto max-h-7 w-20 object-contain" />
          <span className="hidden truncate text-[13px] font-extrabold text-brand sm:inline">Transaction-Autopilot</span>
        </div>
        <form
          role="search"
          onSubmit={(event) => {
            event.preventDefault()
            setQuery(search)
            go('transactions')
          }}
          className="relative mx-3 hidden max-w-md flex-1 sm:block md:mx-0 md:mr-auto md:ml-4 lg:ml-0"
        >
          <label className="sr-only" htmlFor="global-search">Search transactions</label>
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-2" />
          <input
            id="global-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search transactions or customers"
            className="h-11 w-full rounded-full border border-field bg-canvas pr-4 pl-10 text-[15px] focus:border-link focus:bg-white focus:ring-4 focus:ring-link/20 focus:outline-none"
          />
        </form>
        <div className="relative ml-auto" ref={menuRef}>
          <button
            onClick={() => setMenu((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={menu}
            className="flex h-11 items-center gap-2 rounded-full border border-line bg-white pr-3 pl-1.5 hover:border-brand"
          >
            <span className="flex size-8 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">MS</span>
            <span className="hidden text-sm font-bold sm:inline">Merchant Store</span>
            <ChevronDown className={`size-4 text-ink-2 transition-transform ${menu ? 'rotate-180' : ''}`} />
          </button>
          {menu && (
            <div role="menu" className="anim-pop absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-line bg-white p-2 shadow-xl">
              <div className="px-3 py-2">
                <div className="text-sm font-bold">Merchant Store</div>
                <div className="text-xs text-ink-2">{sessionEmail || 'Merchant account'}</div>
              </div>
              <hr className="my-1 border-line" />
              <MenuItem Icon={ShieldCheck} onClick={() => (setMenu(false), setModal(true))}>
                Privacy preferences
              </MenuItem>
              <MenuItem
                Icon={LogOut}
                onClick={() => {
                  setMenu(false)
                  void logoutMerchant()
                    .then(() => setSessionState('unauthenticated'))
                    .catch((reason) => notify(reason instanceof Error ? reason.message : 'Sign out failed.'))
                }}
              >
                Sign out
              </MenuItem>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-[1280px] px-4 pt-6 pb-40 sm:px-6 sm:pt-8 md:pb-28 lg:px-8">
        {page === 'overview' && (
          <MerchantOverview
            onCreate={() => go('links')}
            onViewAll={() => go('transactions')}
            onSelect={(selected) => {
              setTxn(selected)
              setPage('transactions')
            }}
          />
        )}
        {page === 'transactions' && <Transactions key={query} initialQuery={query} onSelect={setTxn} selected={txn?.ref ?? null} />}
        {page === 'links' && <PaymentLinks onDashboard={() => go('overview')} onCancel={() => go('overview')} />}
        <footer className="mt-12 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-5 text-[13px] text-ink-2 lg:hidden">
          <span>Transaction-Autopilot</span>
          <button onClick={() => setModal(true)} className="font-semibold underline underline-offset-2">Privacy preferences</button>
        </footer>
      </main>

      <nav
        aria-label="Merchant navigation"
        className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-3 border-t border-line bg-white md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {NAV.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => go(id)}
            aria-current={page === id ? 'page' : undefined}
            className={`flex h-16 flex-col items-center justify-center gap-1 text-xs font-bold ${page === id ? 'text-brand' : 'text-ink-2'}`}
          >
            <Icon className="size-5" aria-hidden />
            {label}
          </button>
        ))}
      </nav>

      {txn && page === 'transactions' && <Drawer txn={txn} onClose={() => setTxn(null)} />}
      {consent === null && !modal && (
        <CookieBanner
          onAccept={() => {
            saveConsent('all', { functional: true, analytics: true, marketing: true })
            notify('Preferences saved: all cookies accepted.')
          }}
          onReject={() => {
            saveConsent('rejected', NONE)
            notify('Preferences saved: non-essential cookies rejected.')
          }}
          onManage={() => setModal(true)}
        />
      )}
      {modal && (
        <CookieModal
          initial={prefs}
          onClose={() => setModal(false)}
          onSave={(next) => {
            const nextConsent = next.functional && next.analytics && next.marketing ? 'all' : !next.functional && !next.analytics && !next.marketing ? 'rejected' : 'custom'
            saveConsent(nextConsent, next)
            setModal(false)
            notify('Your privacy preferences have been saved.')
          }}
        />
      )}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex justify-center px-4 md:bottom-8">
        {toast && <div className="anim-pop rounded-full bg-navy-900 px-5 py-3 text-sm font-semibold text-white shadow-lg">{toast}</div>}
      </div>
    </div>
  )
}

function LoginScreen({ onAuthenticated }: { onAuthenticated: (email: string) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (loading) return
    if (!email.trim() || !password) {
      setError('Enter your email address and password.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const session = await loginMerchant(email.trim(), password)
      if (!session.success || session.role !== 'merchant') throw new Error('The server did not establish a merchant session.')
      onAuthenticated(session.email || email.trim())
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Sign in failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-line bg-white p-6 shadow-lg sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-14 items-center justify-center rounded-lg border border-line bg-white px-2">
            <img src={paypalLogo} alt="PayPal" className="h-auto max-h-7 w-full object-contain" />
          </div>
          <div>
            <div className="text-sm font-extrabold">Transaction-Autopilot</div>
            <div className="text-xs text-ink-2">Merchant Dashboard</div>
          </div>
        </div>
        <h1 className="mt-8 text-2xl font-extrabold">Sign in to your account</h1>
        <p className="mt-2 text-sm text-ink-2">Use your merchant credentials to continue.</p>
        {error && <div role="alert" className="mt-5 rounded-xl bg-err-bg p-3 text-sm font-semibold text-err-fg">{error}</div>}
        <form onSubmit={submit} className="mt-6 space-y-5">
          <div>
            <label htmlFor="merchant-email" className="mb-2 block text-sm font-bold">Email address</label>
            <input id="merchant-email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} disabled={loading} className="h-12 w-full rounded-xl border border-field px-4 focus:border-link focus:ring-4 focus:ring-link/20 focus:outline-none" />
          </div>
          <div>
            <label htmlFor="merchant-password" className="mb-2 block text-sm font-bold">Password</label>
            <input id="merchant-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} disabled={loading} className="h-12 w-full rounded-xl border border-field px-4 focus:border-link focus:ring-4 focus:ring-link/20 focus:outline-none" />
          </div>
          <button type="submit" disabled={loading} className="h-12 w-full rounded-full bg-brand px-6 text-sm font-bold text-white hover:bg-brand-hover disabled:opacity-50">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}

function BrandLockup() {
  return (
    <div className="flex h-18 shrink-0 items-center border-b border-white/10 px-4 lg:px-6">
      <div className="flex h-10 w-12 shrink-0 items-center justify-center rounded-lg bg-white px-1.5 shadow-sm">
        <img src={paypalLogo} alt="PayPal" className="block h-auto max-h-7 w-full object-contain" />
      </div>
      <div className="ml-3 hidden min-w-0 flex-1 lg:block">
        <div className="text-[13px] leading-[1.15] font-extrabold tracking-[-0.01em] break-words">Transaction-Autopilot</div>
        <div className="mt-1 text-[10px] leading-none font-bold tracking-[.16em] text-white/55 uppercase">Merchant Dashboard</div>
      </div>
    </div>
  )
}

function MenuItem({ Icon, children, onClick }: { Icon: typeof LogOut; children: string; onClick: () => void }) {
  return (
    <button role="menuitem" onClick={onClick} className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold hover:bg-canvas focus-visible:bg-canvas">
      <Icon className="size-4 text-ink-2" aria-hidden />
      {children}
    </button>
  )
}
