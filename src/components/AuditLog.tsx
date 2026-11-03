import { useEffect, useState } from 'react'
import { RefreshCw, Shield, Filter, Clock } from 'lucide-react'
import { Card, PageHeader, Button } from './ui'
import { apiRequest } from '../api'

interface LogEntry {
  id: string
  timestamp: string
  actor: string
  action: string
  resource: string
  result: string
  details?: string
  ip?: string
}

function ResultBadge({ result }: { result: string }) {
  if (result === 'SUCCESS' || result === 'success')
    return <span className="rounded-full bg-ok-bg px-2 py-0.5 text-xs font-bold text-ok-fg">SUCCESS</span>
  if (result === 'FAILED' || result === 'failure' || result === 'error')
    return <span className="rounded-full bg-err-bg px-2 py-0.5 text-xs font-bold text-err-fg">FAILED</span>
  return <span className="rounded-full bg-warn-bg px-2 py-0.5 text-xs font-bold text-warn-fg">{result.toUpperCase()}</span>
}

export function AuditLog() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('')

  const fetchLogs = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await apiRequest<{ logs?: LogEntry[] }>('/api/audit/logs')
      setLogs(data.logs ?? (Array.isArray(data) ? data : []))
    } catch (e: any) {
      // If audit endpoint doesn't exist, show empty state
      setLogs([])
      setError('')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchLogs() }, [])

  const filtered = logs.filter(l =>
    !filter ||
    l.action?.toLowerCase().includes(filter.toLowerCase()) ||
    l.actor?.toLowerCase().includes(filter.toLowerCase()) ||
    l.resource?.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className="anim-pop space-y-6">
      <PageHeader
        title="Audit Log"
        sub="Security and operational event trail"
        action={
          <Button onClick={fetchLogs} variant="secondary" className="gap-2">
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Events', value: logs.length, cls: 'text-brand' },
          { label: 'Successful', value: logs.filter(l => l.result === 'SUCCESS' || l.result === 'success').length, cls: 'text-ok-fg' },
          { label: 'Failed', value: logs.filter(l => l.result === 'FAILED' || l.result === 'failure').length, cls: 'text-err-fg' },
        ].map(c => (
          <Card key={c.label} className="p-5">
            <div className="text-xs font-bold text-ink-2 uppercase tracking-wide">{c.label}</div>
            <div className={`mt-2 text-3xl font-extrabold ${c.cls}`}>{loading ? '—' : c.value}</div>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-line gap-4">
          <h2 className="text-lg font-extrabold flex items-center gap-2">
            <Shield className="size-5 text-ink-2" /> Security Events
          </h2>
          <div className="relative">
            <Filter className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-2" />
            <input
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Filter events…"
              className="h-9 rounded-full border border-field bg-canvas pl-9 pr-4 text-sm focus:border-link focus:outline-none focus:ring-2 focus:ring-link/20"
            />
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-3 py-16 text-ink-2">
            <RefreshCw className="size-5 animate-spin" /> Loading audit logs…
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Shield className="size-10 text-ink-2" />
            <p className="font-bold">No audit events recorded yet</p>
            <p className="text-sm text-ink-2">System actions, logins, and API calls will appear here as they occur.</p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-canvas text-xs font-bold text-ink-2 uppercase tracking-wide">
                  <th className="px-6 py-3 text-left">Time</th>
                  <th className="px-4 py-3 text-left">Actor</th>
                  <th className="px-4 py-3 text-left">Action</th>
                  <th className="px-4 py-3 text-left">Resource</th>
                  <th className="px-4 py-3 text-left">Result</th>
                  <th className="px-4 py-3 text-left">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((log, i) => (
                  <tr key={log.id ?? i} className="hover:bg-canvas/60 transition-colors">
                    <td className="px-6 py-3 text-xs text-ink-2 flex items-center gap-1">
                      <Clock className="size-3" />
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-semibold text-xs">{log.actor}</td>
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs font-semibold">{log.action}</div>
                      {log.details && <div className="text-xs text-ink-2 line-clamp-1 max-w-sm">{log.details}</div>}
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-2">{log.resource}</td>
                    <td className="px-4 py-3"><ResultBadge result={log.result} /></td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-2">{log.ip ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
