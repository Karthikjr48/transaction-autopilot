import { useState } from 'react'
import { AlertCircle, Check, Copy, Link2 } from 'lucide-react'
import { createPaymentLink } from '../api'
import { Button, Card, PageHeader } from './ui'

type Step = 'form' | 'submitting' | 'error' | 'done'

const input =
  'h-12 w-full rounded-xl border bg-white px-4 text-[15px] font-medium text-ink placeholder:text-slate-500 hover:border-slate-400 focus:border-link focus:ring-4 focus:ring-link/20 focus:outline-none'
const SYM: Record<string, string> = { USD: '$', EUR: '€', GBP: '£' }

export function PaymentLinks({ onDashboard, onCancel }: { onDashboard: () => void; onCancel: () => void }) {
  const [step, setStep] = useState<Step>('form')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [desc, setDesc] = useState('')
  const [email, setEmail] = useState('')
  const [touched, setTouched] = useState(false)
  const [copied, setCopied] = useState(false)
  const [createdLink, setCreatedLink] = useState('')
  const [orderId, setOrderId] = useState('')
  const [emailStatus, setEmailStatus] = useState('')
  const [requestError, setRequestError] = useState('')

  const n = Number(amount)
  const amountErr = !amount.trim() ? 'Enter an amount.' : !/^\d+(\.\d{1,2})?$/.test(amount.trim()) || n <= 0 ? 'Enter a valid amount, e.g. 49.99.' : ''
  const descErr = !desc.trim() ? 'Add a short description so your customer knows what they’re paying for.' : ''
  const emailErr = email && !/^\S+@\S+\.\S+$/.test(email) ? 'Enter a valid email address.' : ''
  const show = touched
  const valid = !amountErr && !descErr && !emailErr
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (!valid) return
    if (step === 'submitting') return
    setStep('submitting')
    setRequestError('')
    try {
      const result = await createPaymentLink({
        amount: n.toFixed(2),
        currency,
        description: desc.trim(),
        recipientEmail: email.trim() || undefined,
      })
      setCreatedLink(result.approvalUrl)
      setOrderId(result.orderId)
      setEmailStatus(result.emailStatus || '')
      setStep('done')
    } catch (reason) {
      setRequestError(reason instanceof Error ? reason.message : 'The payment link could not be created.')
      setStep('error')
    }
  }

  const reset = () => {
    setAmount('')
    setDesc('')
    setEmail('')
    setTouched(false)
    setCopied(false)
    setCreatedLink('')
    setOrderId('')
    setEmailStatus('')
    setRequestError('')
    setStep('form')
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(createdLink)
    } catch {
      /* clipboard unavailable in some previews */
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (step === 'done')
    return (
      <div className="anim-pop mx-auto max-w-xl pt-4">
        <Card className="p-7 text-center sm:p-10">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-info-bg text-brand">
            <Check className="size-7" strokeWidth={2.5} aria-hidden />
          </span>
          <h1 className="mt-5 text-2xl font-extrabold">Payment link created</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink-2">
            Your link is ready to share. No payment has been received yet — it will appear in Transactions once your customer completes checkout.
          </p>
          <p className="mt-4 text-xs font-semibold text-ink-2">Order reference: {orderId}</p>
          <div className="mt-6 flex items-center gap-2 rounded-xl border border-line bg-canvas p-2 pl-4 text-left">
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">{createdLink}</span>
            <Button onClick={copy} className="h-10 shrink-0 px-4">
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? 'Copied' : 'Copy Link'}
            </Button>
          </div>
          <p className="mt-2 text-[13px] text-ink-2" aria-live="polite">
            {copied ? 'Link copied to clipboard.' : 'The link opens the payment provider’s approval flow.'}
          </p>
          {email.trim() && emailStatus && (
            <p className="mt-2 text-xs text-ink-2">Email delivery: {emailStatus}</p>
          )}
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button variant="secondary" onClick={reset}>
              Create Another Link
            </Button>
            <Button variant="ghost" onClick={onDashboard}>
              Back to dashboard
            </Button>
          </div>
        </Card>
      </div>
    )

  const submitting = step === 'submitting'

  return (
    <div className="anim-pop mx-auto max-w-xl">
      <PageHeader title="Create Payment Link" sub="Create a payment link to share with your customer." />
      <form onSubmit={submit} noValidate>
        <Card className="space-y-6 p-5 sm:p-8">
          {step === 'error' && (
            <div role="alert" className="flex gap-3 rounded-xl bg-err-bg p-4 text-sm text-err-fg">
              <AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden />
              <div>
                <p className="font-bold">We couldn’t create your link.</p>
                <p>{requestError || 'Nothing was created. You can safely try again — your details are kept below.'}</p>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="amount" className="mb-2 block text-sm font-bold">
              Amount
            </label>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-xl font-bold text-ink-2">{SYM[currency]}</span>
                <input
                  id="amount"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  disabled={submitting}
                  aria-invalid={show && !!amountErr}
                  aria-describedby="amount-msg"
                  className={`${input} tnum h-16 pl-10 text-3xl font-extrabold ${show && amountErr ? 'border-err' : 'border-field'}`}
                />
              </div>
              <label className="sr-only" htmlFor="currency">
                Currency
              </label>
              <select
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                disabled={submitting}
                className={`${input} h-16 w-28 border-field font-bold`}
              >
                {Object.keys(SYM).map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <Msg id="amount-msg" error={show ? amountErr : ''} />
          </div>

          <div>
            <label htmlFor="desc" className="mb-2 block text-sm font-bold">
              Payment description
            </label>
            <input
              id="desc"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="e.g. Website design — deposit"
              disabled={submitting}
              aria-describedby="desc-msg"
              className={`${input} ${show && descErr ? 'border-err' : 'border-field'}`}
            />
            <Msg id="desc-msg" error={show ? descErr : ''} />
          </div>

          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-bold">
              Customer email <span className="font-medium text-ink-2">(optional)</span>
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="customer@example.com"
              disabled={submitting}
              aria-describedby="email-msg"
              className={`${input} ${show && emailErr ? 'border-err' : 'border-field'}`}
            />
            <Msg id="email-msg" error={show ? emailErr : ''} help="Used only to pre-fill checkout for your customer." />
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-line pt-6 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {submitting ? (
                'Creating link…'
              ) : (
                <>
                  <Link2 className="size-4" /> Create Payment Link
                </>
              )}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  )
}

function Msg({ id, error, help }: { id: string; error: string; help?: string }) {
  if (error)
    return (
      <p id={id} className="mt-2 flex items-center gap-1.5 text-[13px] font-semibold text-err">
        <AlertCircle className="size-4" aria-hidden /> {error}
      </p>
    )
  return (
    <p id={id} className="mt-2 text-xs text-ink-2">
      {help}
    </p>
  )
}
