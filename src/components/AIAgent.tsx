import { useState, useRef, useEffect } from 'react'
import {
  Bot,
  Send,
  Loader,
  AlertCircle,
  Trash2,
  TrendingUp,
  RotateCcw,
  Mail,
  DollarSign,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Copy,
  Check
} from 'lucide-react'
import { Card, PageHeader, Button } from './ui'
import { apiRequest } from '../api'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const SUGGESTED = [
  'Why hasn’t my test payment email arrived in Outlook?',
  'Send $50.00 payment link to buyer@example.com',
  'What is the actual total order amount in my account?',
  'Are there any orders that need my attention?',
  'Summarize my PayPal sandbox account activity',
]

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^\)]+\))/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-extrabold text-slate-950">
          {part.slice(2, -2)}
        </strong>
      )
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={i}
          className="rounded-md bg-blue-50 border border-blue-200/90 px-1.5 py-0.5 font-mono text-xs text-brand font-bold"
        >
          {part.slice(1, -1)}
        </code>
      )
    }
    const linkMatch = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\)]+)\)$/)
    if (linkMatch) {
      return (
        <span key={i} className="inline-flex flex-wrap items-center gap-2 my-1.5">
          <a
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand text-white font-bold text-xs px-3.5 py-1.5 shadow-xs hover:bg-brand-hover transition-colors"
          >
            <span>{linkMatch[1]}</span>
            <ExternalLink className="size-3.5" />
          </a>
          <button
            type="button"
            onClick={() => {
              if (navigator.clipboard) {
                navigator.clipboard.writeText(linkMatch[2])
              }
            }}
            title="Copy checkout link"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs px-2.5 py-1.5 font-semibold cursor-pointer shadow-2xs transition-colors"
          >
            <Copy className="size-3 text-slate-500" />
            <span>Copy Link</span>
          </button>
        </span>
      )
    }
    return part
  })
}

interface TableBlock {
  type: 'table'
  rows: string[][]
}

interface LineBlock {
  type: 'line'
  text: string
}

type ContentBlock = TableBlock | LineBlock

function parseContentBlocks(content: string): ContentBlock[] {
  const lines = content.split('\n')
  const blocks: ContentBlock[] = []
  let tableBuffer: string[] = []

  const flushTable = () => {
    if (tableBuffer.length > 0) {
      const rows = tableBuffer
        .filter(l => !l.trim().match(/^\|(?:\s*:?-+:?\s*\|)+$/))
        .map(l =>
          l
            .trim()
            .replace(/^\|/, '')
            .replace(/\|$/, '')
            .split('|')
            .map(c => c.trim())
        )
      if (rows.length > 0) {
        blocks.push({ type: 'table', rows })
      }
      tableBuffer = []
    }
  }

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      tableBuffer.push(trimmed)
    } else {
      flushTable()
      blocks.push({ type: 'line', text: line })
    }
  }
  flushTable()
  return blocks
}

function FormattedMessage({ content }: { content: string }) {
  const blocks = parseContentBlocks(content)

  return (
    <div className="space-y-2 text-sm leading-relaxed text-slate-800">
      {blocks.map((block, bIdx) => {
        if (block.type === 'table') {
          const [headerRow, ...bodyRows] = block.rows
          return (
            <div
              key={bIdx}
              className="my-3 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs"
            >
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/90 text-slate-700 font-extrabold uppercase tracking-wider text-[11px]">
                    {headerRow.map((h, hi) => (
                      <th key={hi} className="px-3.5 py-2.5 whitespace-nowrap">
                        {renderInline(h)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bodyRows.map((r, ri) => (
                    <tr key={ri} className="hover:bg-blue-50/30 transition-colors">
                      {r.map((c, ci) => (
                        <td key={ci} className="px-3.5 py-2 text-slate-800 font-medium">
                          {renderInline(c)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }

        const trimmed = block.text.trim()
        if (!trimmed) return <div key={bIdx} className="h-1" />

        // Section Headers (###, ##, or emoji headers like 📊 Overall Store Metrics)
        const isHeader =
          trimmed.startsWith('### ') ||
          trimmed.startsWith('## ') ||
          trimmed.startsWith('# ') ||
          /^(?:[\*#\s]*)(📊|📦|📧|✉️|🛡️|🔍|💰|⚡|📋|📈|ℹ️|💡)/u.test(trimmed)

        if (isHeader) {
          const cleanTitle = trimmed
            .replace(/^#{1,3}\s+/, '')
            .replace(/^\*\*(.*)\*\*$/, '$1')

          return (
            <div
              key={bIdx}
              className="flex items-center gap-2 pt-3 pb-1.5 border-b border-slate-200 font-extrabold text-xs uppercase tracking-wider text-brand mt-2 mb-1"
            >
              <span>{renderInline(cleanTitle)}</span>
            </div>
          )
        }

        // Bullet rows (*, -, or •)
        if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
          const bulletText = trimmed.replace(/^[\*\-•]\s+/, '')
          return (
            <div key={bIdx} className="flex items-start gap-2.5 py-0.5 pl-1">
              <span className="size-1.5 rounded-full bg-brand mt-2 shrink-0" />
              <span className="flex-1 leading-relaxed text-slate-800">
                {renderInline(bulletText)}
              </span>
            </div>
          )
        }

        // Numbered list items (1. 2.)
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/)
        if (numMatch) {
          return (
            <div key={bIdx} className="flex items-start gap-2 py-0.5 pl-1">
              <span className="font-mono text-xs font-bold text-brand mt-0.5">
                {numMatch[1]}.
              </span>
              <span className="flex-1 leading-relaxed text-slate-800">
                {renderInline(numMatch[2])}
              </span>
            </div>
          )
        }

        // Standard paragraph
        return (
          <p key={bIdx} className="text-slate-800 leading-relaxed">
            {renderInline(block.text)}
          </p>
        )
      })}
    </div>
  )
}

export function AIAgent() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        "👋 Hello! I'm your Merchant AI Assistant. I have live access to your PayPal Sandbox orders, sales volume, and customer fulfillment.\n\nAsk me any question, or type **\"Send $50 payment link to customer@example.com\"** to automatically generate a real PayPal checkout link and email it to your customer.",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [lastQuery, setLastQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showQuickPayment, setShowQuickPayment] = useState(false)
  const [quickEmail, setQuickEmail] = useState('')
  const [quickAmount, setQuickAmount] = useState('')
  const [quickSending, setQuickSending] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async (text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg || loading) return
    setInput('')
    setLastQuery(msg)
    setError('')
    setMessages(m => [...m, { role: 'user', content: msg, timestamp: new Date() }])
    setLoading(true)
    try {
      const data = await apiRequest<{ analysis?: string; message?: string; result?: string }>(
        '/api/agent/analyze',
        {
          method: 'POST',
          body: JSON.stringify({ query: msg, context: 'merchant_dashboard' }),
        }
      )
      const reply =
        data.analysis ||
        data.message ||
        data.result ||
        (typeof data === 'string' ? data : JSON.stringify(data, null, 2))
      setMessages(m => [...m, { role: 'assistant', content: reply, timestamp: new Date() }])
    } catch (e: any) {
      setError(e.message)
      setMessages(m => [
        ...m,
        {
          role: 'assistant',
          content: `⚠️ Unable to complete request: ${e.message}. Please verify connection or try again.`,
          timestamp: new Date(),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleQuickPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickEmail.trim() || !quickAmount.trim()) return
    const amountNum = parseFloat(quickAmount)
    if (isNaN(amountNum) || amountNum <= 0) return

    setQuickSending(true)
    setShowQuickPayment(false)
    const prompt = `Send $${amountNum.toFixed(2)} USD payment link to ${quickEmail.trim()}`
    setQuickEmail('')
    setQuickAmount('')
    await send(prompt)
    setQuickSending(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="anim-pop flex flex-col gap-6 h-full">
      <PageHeader
        title="AI Payment Assistant"
        sub="Instant PayPal Sandbox order intelligence & automatic customer payment email dispatch"
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowQuickPayment(!showQuickPayment)}
              className="gap-2 text-xs font-bold border-brand/30 text-brand hover:bg-brand/5"
            >
              <Mail className="size-3.5 text-brand" />
              <span>Email Payment Link</span>
              {showQuickPayment ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
            </Button>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-bold text-emerald-800">
              <span className="size-2 rounded-full bg-emerald-600 animate-pulse" />
              Assistant Active
            </span>
            <Button
              variant="ghost"
              onClick={() =>
                setMessages([
                  {
                    role: 'assistant',
                    content: "👋 Hello! I'm your Merchant AI Assistant. How can I help you today?",
                    timestamp: new Date(),
                  },
                ])
              }
              className="h-9 gap-2 text-xs text-slate-600 hover:text-slate-900"
            >
              <Trash2 className="size-3.5" /> Clear
            </Button>
          </div>
        }
      />

      {/* Quick Customer Payment Dispatch Form */}
      {showQuickPayment && (
        <Card className="p-5 bg-gradient-to-r from-blue-50/60 to-slate-50 border border-blue-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-brand text-white">
                <Mail className="size-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Direct Customer Payment Email Dispatch
                </h4>
                <p className="text-xs text-slate-500">
                  Creates an authoritative PayPal Orders v2 record and automatically emails the checkout link
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowQuickPayment(false)}
              className="text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleQuickPaymentSubmit} className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[220px]">
              <input
                type="email"
                required
                value={quickEmail}
                onChange={e => setQuickEmail(e.target.value)}
                placeholder="Customer email (e.g. buyer@example.com)"
                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <div className="w-36 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">$</span>
              <input
                type="number"
                step="0.01"
                min="0.50"
                required
                value={quickAmount}
                onChange={e => setQuickAmount(e.target.value)}
                placeholder="Amount (USD)"
                className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-7 pr-3 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <Button
              type="submit"
              disabled={quickSending || !quickEmail || !quickAmount}
              className="h-10 gap-2 text-xs font-bold bg-brand hover:bg-brand-hover text-white shadow-xs"
            >
              <Send className="size-3.5" />
              {quickSending ? 'Sending Link…' : 'Generate & Email Customer'}
            </Button>
          </form>

          <div className="mt-3 pt-2.5 border-t border-blue-200/50 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
            <span>ℹ️ <strong>Sandbox Policy:</strong> Test emails are safely delivered to your registered Gmail (<code className="font-mono text-brand font-bold">loyolaignatiuskarthik@gmail.com</code>). Check Spam/Updates folder.</span>
            <span className="text-slate-500">Direct Outlook delivery requires Gmail SMTP or verified domain.</span>
          </div>
        </Card>
      )}

      {error && (
        <div className="flex items-center justify-between rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-rose-800 text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0 text-rose-600" />
            <span className="font-medium">{error}</span>
          </div>
          {lastQuery && (
            <button
              onClick={() => send(lastQuery)}
              className="flex items-center gap-1 text-xs font-bold underline hover:no-underline ml-4 cursor-pointer text-rose-900"
            >
              <RotateCcw className="size-3" /> Retry
            </button>
          )}
        </div>
      )}

      {/* Suggested prompts */}
      {messages.length <= 1 && (
        <Card className="p-5 bg-white border border-slate-200 shadow-sm">
          <h3 className="mb-3 text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
            <TrendingUp className="size-4 text-brand" /> Suggested Questions & Actions
          </h3>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED.map(s => (
              <button
                key={s}
                onClick={() => send(s)}
                className="rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-semibold text-slate-800 hover:border-brand hover:bg-brand/5 hover:text-brand transition-all cursor-pointer shadow-2xs"
              >
                {s}
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Chat messages */}
      <Card
        className="flex flex-col overflow-hidden bg-slate-50/70 border border-slate-200 shadow-sm"
        style={{ minHeight: '460px', maxHeight: '68vh' }}
      >
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div
                className={`flex size-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold shadow-xs ${
                  m.role === 'assistant'
                    ? 'bg-brand text-white'
                    : 'bg-navy-950 text-white'
                }`}
              >
                {m.role === 'assistant' ? <Bot className="size-4.5" /> : 'Me'}
              </div>
              <div
                className={`max-w-[85%] rounded-2xl p-4.5 text-sm leading-relaxed shadow-xs ${
                  m.role === 'assistant'
                    ? 'bg-white border border-slate-200/90 text-slate-900'
                    : 'bg-brand text-white shadow-sm'
                }`}
              >
                {m.role === 'assistant' ? (
                  <FormattedMessage content={m.content} />
                ) : (
                  <p className="whitespace-pre-wrap font-medium">{m.content}</p>
                )}
                <div
                  className={`mt-2 text-[11px] font-medium ${
                    m.role === 'assistant' ? 'text-slate-400' : 'text-white/80'
                  }`}
                >
                  {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-xs">
                <Bot className="size-4.5" />
              </div>
              <div className="rounded-2xl bg-white border border-slate-200 px-4 py-3 flex items-center gap-2.5 text-sm text-slate-600 shadow-xs">
                <Loader className="size-4 animate-spin text-brand" />
                <span className="font-medium">Synthesizing authoritative PayPal sandbox guidance…</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div className="border-t border-slate-200 p-4 flex gap-3 items-end bg-white">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            rows={1}
            placeholder="Type a question or 'Send $50 payment link to customer@example.com'… (Enter to send)"
            className="flex-1 resize-none rounded-xl border border-slate-300 bg-slate-50/80 px-4 py-3 text-sm text-slate-900 font-medium placeholder:text-slate-400 focus:border-brand focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand/10 disabled:opacity-50"
            style={{ maxHeight: '120px' }}
            onInput={e => {
              const t = e.currentTarget
              t.style.height = 'auto'
              t.style.height = Math.min(t.scrollHeight, 120) + 'px'
            }}
          />
          <Button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            className="h-11 w-11 rounded-xl p-0 shrink-0 bg-brand hover:bg-brand-hover text-white shadow-sm flex items-center justify-center"
          >
            <Send className="size-4" />
          </Button>
        </div>
      </Card>
    </div>
  )
}
