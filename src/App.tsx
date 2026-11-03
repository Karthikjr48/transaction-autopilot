import { useEffect, useRef, useState } from 'react'
import {
  LayoutGrid, ReceiptText, Link2, FileText, Bot, ShieldAlert,
  ClipboardList, Settings2, ChevronDown, CircleHelp, LogOut, LogIn,
  Search, ShieldCheck, UserRound, ShoppingCart, Terminal, X,
} from 'lucide-react'
import paypalLogo from './assets/paypal-logo.png'
import { Overview } from './components/Overview'
import { Transactions } from './components/Transactions'
import { PaymentLinks } from './components/PaymentLinks'
import { Drawer } from './components/Drawer'
import { CookieBanner, CookieModal, type Prefs } from './components/Cookies'
import { Orders } from './components/Orders'
import { Invoices } from './components/Invoices'
import { AIAgent } from './components/AIAgent'
import { Disputes } from './components/Disputes'
import { AuditLog } from './components/AuditLog'
import { Settings } from './components/Settings'
import { DeveloperConsole } from './components/DeveloperConsole'
import { Login } from './components/Login'
import { getMerchantSession, logoutMerchant } from './api'

type Page = 'overview' | 'transactions' | 'links' | 'orders' | 'invoices' | 'ai' | 'disputes' | 'audit' | 'settings'
type Consent = null | 'all' | 'rejected' | 'custom'

const NAV: { id: Page; label: string; Icon: typeof LayoutGrid; group?: string }[] = [
  { id: 'overview', label: 'Overview', Icon: LayoutGrid, group: 'main' },
  { id: 'transactions', label: 'Transactions', Icon: ReceiptText, group: 'main' },
  { id: 'orders', label: 'Orders', Icon: ShoppingCart, group: 'main' },
  { id: 'links', label: 'Payment Links', Icon: Link2, group: 'main' },
  { id: 'invoices', label: 'Invoices', Icon: FileText, group: 'tools' },
  { id: 'disputes', label: 'Disputes', Icon: ShieldAlert, group: 'tools' },
  { id: 'ai', label: 'AI Agent', Icon: Bot, group: 'tools' },
  { id: 'audit', label: 'Audit Log', Icon: ClipboardList, group: 'system' },
  { id: 'settings', label: 'Settings', Icon: Settings2, group: 'system' },
]

const NONE: Prefs = { functional: false, analytics: false, marketing: false }

export default function App() {
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname)
  const [page, setPage] = useState<Page>('overview')
  const [txn, setTxn] = useState<any>(null)
  const [menu, setMenu] = useState(false)
  const [consent, setConsent] = useState<Consent>(null)
  const [prefs, setPrefs] = useState<Prefs>(NONE)
  const [modal, setModal] = useState(false)
  const [toast, setToast] = useState('')
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [session, setSession] = useState<{ authenticated: boolean; email?: string } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Listen to browser navigation (back/forward)
  useEffect(() => {
    const handlePopState = () => setCurrentPath(window.location.pathname)
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Check merchant session status on mount
  useEffect(() => {
    let mounted = true
    getMerchantSession()
      .then((s) => {
        if (mounted) setSession(s)
      })
      .catch(() => {
        if (mounted) setSession({ authenticated: false })
      })
    return () => { mounted = false }
  }, [])

  // Outside click closes profile menu
  useEffect(() => {
    const h = (e: MouseEvent) =>
      menuRef.current && !menuRef.current.contains(e.target as Node) && setMenu(false)
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // ESC closes sidebar on mobile
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && setSidebarOpen(false)
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [])

  const navigate = (path: string) => {
    window.history.pushState({}, '', path)
    setCurrentPath(path)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const go = (p: Page) => {
    if (currentPath !== '/') {
      window.history.pushState({}, '', '/')
      setCurrentPath('/')
    }
    setPage(p)
    setMenu(false)
    setSidebarOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const say = (m: string) => {
    setToast(m)
    setTimeout(() => setToast(''), 2800)
  }

  const handleLogout = async () => {
    setMenu(false)
    try {
      await logoutMerchant()
      setSession({ authenticated: false })
      say('Signed out successfully.')
    } catch {
      say('Signed out.')
    }
  }

  // Standalone Route 1: Optional Separate Login Page
  if (currentPath === '/login') {
    return (
      <Login
        onSuccess={async () => {
          try {
            const s = await getMerchantSession()
            setSession(s)
          } catch (_) {}
          navigate('/')
          say('Signed in successfully.')
        }}
        onNavigateHome={() => navigate('/')}
      />
    )
  }

  // Standalone Route 2: Separate Protected Developer / Operations Console
  if (currentPath === '/developer' || currentPath === '/operations') {
    return <DeveloperConsole onBack={() => navigate('/')} />
  }

  // Main Route: Public Merchant Dashboard (Directly accessible at / without forced login)
  const renderPage = () => {
    switch (page) {
      case 'overview':
        return (
          <Overview
            onCreate={() => go('links')}
            onViewAll={() => go('orders')}
            onSelect={(t) => { setTxn(t); setPage('transactions') }}
          />
        )
      case 'transactions':
        return <Transactions key={query} initialQuery={query} onSelect={setTxn} selected={txn?.ref ?? null} />
      case 'links':
        return <PaymentLinks onDashboard={() => go('overview')} onCancel={() => go('overview')} />
      case 'orders':
        return <Orders />
      case 'invoices':
        return <Invoices />
      case 'ai':
        return <AIAgent />
      case 'disputes':
        return <Disputes />
      case 'audit':
        return <AuditLog />
      case 'settings':
        return <Settings />
    }
  }

  // Group nav items
  const groups = [
    { key: 'main', label: null },
    { key: 'tools', label: 'Tools' },
    { key: 'system', label: 'System' },
  ]

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <>
      {/* Brand & Logo Header */}
      <div className="shrink-0 border-b border-white/10 p-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center justify-center rounded-xl bg-white py-2 px-3 shadow-sm">
            <img src={paypalLogo} alt="PayPal" className="h-7 w-auto" />
          </div>
          {isMobile && (
            <button
              onClick={() => setSidebarOpen(false)}
              className="flex size-9 items-center justify-center rounded-xl text-white/70 hover:bg-white/10 hover:text-white transition-colors"
              aria-label="Close menu"
            >
              <X className="size-5" />
            </button>
          )}
        </div>
        <div className={`mt-2.5 px-1 ${isMobile ? 'block' : 'hidden lg:block'}`}>
          <div className="text-[13px] leading-tight font-extrabold tracking-wide text-white">PayPal Commerce</div>
          <div className="mt-0.5 text-[11px] font-semibold tracking-[.18em] text-white/60 uppercase">Merchant Portal</div>
        </div>
      </div>

      {/* Nav groups with slim navy scrollbar */}
      <nav aria-label="Primary" className="sidebar-scroll flex-1 overflow-y-auto px-3 py-2.5 space-y-3">
        {groups.map(g => {
          const items = NAV.filter(n => n.group === g.key)
          return (
            <div key={g.key}>
              {g.label && (
                <div className={`mb-1 px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-white/40 ${isMobile ? 'block' : 'hidden lg:block'}`}>
                  {g.label}
                </div>
              )}
              <div className="flex flex-col gap-1">
                {items.map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    onClick={() => {
                      go(id)
                      if (isMobile) setSidebarOpen(false)
                    }}
                    aria-current={page === id ? 'page' : undefined}
                    className={`flex h-11 items-center gap-3.5 rounded-xl text-sm font-semibold transition-all ${
                      isMobile
                        ? 'justify-start px-3.5'
                        : 'justify-center lg:justify-start lg:px-3.5'
                    } ${
                      page === id
                        ? 'bg-white/15 text-white shadow-[inset_3px_0_0_#60a5fa]'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon className="size-[19px] shrink-0" aria-hidden />
                    <span className={isMobile ? 'inline text-sm font-medium' : 'hidden lg:inline'}>{label}</span>
                    <span className={isMobile ? 'hidden' : 'sr-only lg:hidden'}>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )
        })}

        {/* Developer Console in Mobile Drawer */}
        {isMobile && (
          <div className="pt-2 border-t border-white/10">
            <div className="mb-1 px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-white/40">
              Operations
            </div>
            <button
              onClick={() => {
                setSidebarOpen(false)
                navigate('/developer')
              }}
              className="flex h-11 w-full items-center gap-3.5 rounded-xl px-3.5 text-sm font-semibold text-emerald-300 hover:bg-white/10 transition-all"
            >
              <Terminal className="size-[19px] shrink-0 text-emerald-400" />
              <span>Developer Console</span>
            </button>
          </div>
        )}
      </nav>

      {/* Clean Merchant Footer (Pinned, never overlaps nav) */}
      <div className="shrink-0 border-t border-white/10 p-3 bg-navy-900 z-10">
        <button
          onClick={() => {
            if (isMobile) setSidebarOpen(false)
            setModal(true)
          }}
          className={`${isMobile ? 'flex' : 'hidden lg:flex'} h-9 w-full items-center gap-2 rounded-xl px-3.5 text-left text-[12px] font-semibold text-white/60 hover:bg-white/8 hover:text-white transition-colors`}
        >
          <ShieldCheck className="size-4 shrink-0 text-emerald-400" /> Cookie Preferences
        </button>
      </div>
    </>
  )

  // Mobile bottom nav items (first 5)
  const mobileNav = NAV.slice(0, 5)

  return (
    <div className="min-h-screen md:pl-[72px] lg:pl-[240px] bg-canvas text-ink">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-[72px] flex-col bg-navy-900 text-white md:flex lg:w-[240px] z-30 overflow-hidden">
        <SidebarContent isMobile={false} />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity" onClick={() => setSidebarOpen(false)} />
          <aside className="relative flex h-full w-[280px] max-w-[85vw] flex-col bg-navy-900 text-white shadow-2xl overflow-hidden anim-pop">
            <SidebarContent isMobile={true} />
          </aside>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-line bg-white/95 px-4 backdrop-blur sm:px-8">
        {/* Mobile: logo + hamburger */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="mr-1 flex h-10 w-10 items-center justify-center rounded-xl hover:bg-canvas"
            aria-label="Open menu"
          >
            <svg viewBox="0 0 24 24" className="size-5 stroke-ink" strokeWidth={2} fill="none">
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
            </svg>
          </button>
          <img src={paypalLogo} alt="PayPal" className="h-7 w-auto" />
          <span className="text-[13px] font-extrabold text-brand">Commerce</span>
        </div>

        {/* Global Search */}
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault()
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
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transactions or orders…"
            className="h-11 w-full rounded-full border border-field bg-canvas pr-4 pl-10 text-[15px] focus:border-link focus:bg-white focus:ring-4 focus:ring-link/20 focus:outline-none transition-all"
          />
        </form>

        {/* Support & Help */}
        <button
          onClick={() => say('Merchant Support: 24/7 Sandbox API Documentation & Help')}
          className="mr-2 ml-auto flex h-11 items-center gap-2 sm:ml-0 rounded-full px-3 text-sm font-semibold text-ink-2 hover:bg-canvas hover:text-ink transition-colors"
        >
          <CircleHelp className="size-[18px]" aria-hidden />
          <span className="hidden xl:inline">Help</span>
        </button>

        {/* Developer / Operations Console Shortcut */}
        <button
          onClick={() => navigate('/developer')}
          title="Open Developer & Operations Console"
          className="mr-2 flex h-10 items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:border-slate-300 hover:text-slate-900 transition-colors shadow-2xs"
        >
          <Terminal className="size-3.5 text-brand" />
          <span className="hidden sm:inline">Developer Console</span>
        </button>

        {/* Profile / Account Menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenu((m) => !m)}
            aria-haspopup="menu"
            aria-expanded={menu}
            className="flex h-11 items-center gap-2 rounded-full border border-line bg-white pr-3 pl-1.5 hover:border-brand transition-colors"
          >
            <span className="flex size-8 items-center justify-center rounded-full bg-brand text-xs font-bold text-white shadow-sm">
              {session?.authenticated ? 'MS' : 'PA'}
            </span>
            <span className="hidden text-sm font-bold sm:inline">
              {session?.authenticated ? 'Merchant Store' : 'Public Access'}
            </span>
            <ChevronDown className={`size-4 text-ink-2 transition-transform duration-200 ${menu ? 'rotate-180' : ''}`} />
          </button>

          {menu && (
            <div role="menu" className="anim-pop absolute right-0 mt-2 w-64 rounded-2xl border border-line bg-white p-2 shadow-xl z-50">
              <div className="px-3 py-2">
                <div className="text-sm font-bold">
                  {session?.authenticated ? 'Merchant Store' : 'Public Dashboard'}
                </div>
                <div className="text-xs text-ink-2 truncate">
                  {session?.authenticated && session.email
                    ? session.email
                    : 'merchant@transaction-autopilot.local'}
                </div>
                <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-ok-bg px-2.5 py-0.5 text-[10px] font-bold text-ok-fg">
                  <span className="size-1.5 rounded-full bg-ok-fg" /> PayPal Sandbox
                </div>
              </div>

              <hr className="my-1 border-line" />

              <MenuItem Icon={UserRound} onClick={() => { setMenu(false); go('settings') }}>
                Account Settings
              </MenuItem>
              <MenuItem Icon={ShieldCheck} onClick={() => { setMenu(false); setModal(true) }}>
                Privacy Preferences
              </MenuItem>
              <MenuItem Icon={Terminal} onClick={() => { setMenu(false); navigate('/developer') }}>
                Developer Console
              </MenuItem>

              <hr className="my-1 border-line" />

              {session?.authenticated ? (
                <MenuItem Icon={LogOut} onClick={handleLogout}>
                  Sign Out
                </MenuItem>
              ) : (
                <MenuItem Icon={LogIn} onClick={() => { setMenu(false); navigate('/login') }}>
                  Sign In
                </MenuItem>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-[1200px] px-4 pt-6 pb-40 sm:px-8 sm:pt-8 md:pb-28">
        {renderPage()}
        <footer className="mt-12 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-5 text-[13px] text-ink-2 lg:hidden">
          <span>PayPal Commerce Portal</span>
          <button onClick={() => setModal(true)} className="font-semibold underline underline-offset-2">
            Cookie Preferences
          </button>
        </footer>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-20 grid border-t border-line bg-white md:hidden shadow-lg"
        style={{ gridTemplateColumns: `repeat(${mobileNav.length}, 1fr)`, paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {mobileNav.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => go(id)}
            aria-current={page === id ? 'page' : undefined}
            className={`flex h-16 flex-col items-center justify-center gap-1 text-xs font-bold transition-colors ${page === id ? 'text-brand' : 'text-ink-2'}`}
          >
            <Icon className="size-5" aria-hidden />
            <span className="text-[10px]">{label}</span>
          </button>
        ))}
      </nav>

      {/* Transaction Details Drawer */}
      {txn && page === 'transactions' && <Drawer txn={txn} onClose={() => setTxn(null)} />}

      {/* Cookie Banner & Preferences Modal */}
      {consent === null && !modal && (
        <CookieBanner
          onAccept={() => {
            setConsent('all')
            setPrefs({ functional: true, analytics: true, marketing: true })
            say('All cookies accepted.')
          }}
          onReject={() => {
            setConsent('rejected')
            setPrefs(NONE)
            say('Non-essential cookies rejected.')
          }}
          onManage={() => setModal(true)}
        />
      )}

      {modal && (
        <CookieModal
          initial={prefs}
          onClose={() => setModal(false)}
          onSave={(p) => {
            setPrefs(p)
            setConsent(
              p.functional && p.analytics && p.marketing ? 'all' :
              !p.functional && !p.analytics && !p.marketing ? 'rejected' : 'custom'
            )
            setModal(false)
            say('Cookie preferences saved.')
          }}
        />
      )}

      {/* Notification Toast */}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex justify-center px-4 md:bottom-8">
        {toast && (
          <div className="anim-pop rounded-full bg-navy-900 px-5 py-3 text-sm font-semibold text-white shadow-xl">
            {toast}
          </div>
        )}
      </div>
    </div>
  )
}

function MenuItem({ Icon, children, onClick }: { Icon: typeof LogOut; children: string; onClick: () => void }) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold hover:bg-canvas focus-visible:bg-canvas transition-colors text-ink"
    >
      <Icon className="size-4 text-ink-2" aria-hidden />
      {children}
    </button>
  )
}
