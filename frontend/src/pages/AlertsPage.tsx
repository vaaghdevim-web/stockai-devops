import { AlertCircle, AlertTriangle, CircleAlert, Info, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { alertSources } from '../api/alertsApi'
import type { AlertSeverity, AlertSourceResult } from '../types/alerts'
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingSpinner,
  PageHeader,
  StatusBadge,
} from '../components/common'

const severities: AlertSeverity[] = ['critical', 'warning', 'info']

export function AlertsPage() {
  const [version, setVersion] = useState(0)
  const [results, setResults] = useState<
    Record<string, { version: number; result: AlertSourceResult }>
  >({})
  const [category, setCategory] = useState('All')
  const [severity, setSeverity] = useState('All')
  const [search, setSearch] = useState('')

  useEffect(() => {
    let active = true
    Object.entries(alertSources).forEach(([name, load]) => {
      void load().then((result) => {
        if (active) {
          setResults((previous) => ({ ...previous, [name]: { version, result } }))
        }
      })
    })
    return () => {
      active = false
    }
  }, [version])

  const current = Object.values(results).filter((entry) => entry.version === version)
  const loading = current.length < Object.keys(alertSources).length
  const alerts = current.flatMap(({ result }) => result.alerts ?? [])
  const incomplete = loading || current.some(({ result }) => result.errors.length > 0)
  const filtered = alerts
    .filter(
      (alert) =>
        (category === 'All' || category === alert.category) &&
        (severity === 'All' || severity === alert.severity) &&
        `${alert.title} ${alert.description} ${alert.reference} ${alert.status}`
          .toLowerCase()
          .includes(search.trim().toLowerCase())
    )
    .sort(
      (a, b) =>
        (Date.parse(b.timestamp || '') || 0) - (Date.parse(a.timestamp || '') || 0)
    )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operational Alerts & Events"
        description="System warnings, threshold breaches, and workflow status events across active factory modules."
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setVersion((value) => value + 1)}
            disabled={loading}
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            Refresh Alerts
          </Button>
        }
      />

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
        <p role="status">
          {incomplete
            ? 'Partial coverage: some sources are loading or unavailable. Counts include loaded records.'
            : 'All configured alert sources active and monitored.'}{' '}
          Telemetry covers recent operational events.
        </p>
      </div>

      {/* Severity KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {severities.map((level) => {
          const count = current.some(({ result }) => result.alerts !== null)
            ? alerts.filter((alert) => alert.severity === level).length
            : '—'
          return (
            <Card key={level}>
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
                <span>{level === 'info' ? 'Informational' : level === 'critical' ? 'Critical' : 'Warning'}</span>
                {level === 'critical' ? (
                  <CircleAlert className="size-4 text-red-600" aria-hidden="true" />
                ) : level === 'warning' ? (
                  <AlertTriangle className="size-4 text-amber-600" aria-hidden="true" />
                ) : (
                  <Info className="size-4 text-blue-600" aria-hidden="true" />
                )}
              </div>
              <p
                className={`mt-2 font-mono text-2xl font-bold ${
                  level === 'critical'
                    ? 'text-red-600'
                    : level === 'warning'
                    ? 'text-amber-600'
                    : 'text-blue-600'
                }`}
              >
                {count}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">Active across loaded sources</p>
            </Card>
          )
        })}
      </div>

      {/* Source Coverage Card */}
      <Card className="p-5">
        <h2 className="font-bold text-slate-900 text-sm mb-3">Module Alert Coverage</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Object.keys(alertSources).map((name) => {
            const result = results[name]?.version === version ? results[name].result : null
            return (
              <div
                key={name}
                className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 min-w-0 space-y-1.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900">{name}</h3>
                  {result && (
                    <StatusBadge tone={result.errors.length > 0 ? 'warning' : 'success'}>
                      {result.errors.length > 0 ? 'Partial' : 'Active'}
                    </StatusBadge>
                  )}
                </div>
                {!result ? (
                  <LoadingSpinner label={`Checking ${name.toLowerCase()}…`} size="sm" />
                ) : (
                  <>
                    {result.alerts !== null && (
                      <p className="text-slate-600">
                        {result.alerts.length} operational record{result.alerts.length === 1 ? '' : 's'}
                      </p>
                    )}
                    {result.errors.length > 0 && (
                      <ErrorState
                        title={`${name} Source Error`}
                        description={result.errors.join(' · ')}
                      />
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      </Card>

      {/* Filter and Search Bar */}
      <Card className="p-4">
        <div className="grid gap-4 sm:grid-cols-3 text-xs">
          <div>
            <label htmlFor="alert-category-select" className="font-semibold text-slate-700 block mb-1">
              Category
            </label>
            <select
              id="alert-category-select"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-xs focus:border-sky-600 focus:outline-none"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              {['All', ...Object.keys(alertSources)].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="alert-severity-select" className="font-semibold text-slate-700 block mb-1">
              Severity
            </label>
            <select
              id="alert-severity-select"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-xs focus:border-sky-600 focus:outline-none"
              value={severity}
              onChange={(event) => setSeverity(event.target.value)}
            >
              {['All', ...severities].map((value) => (
                <option key={value} value={value}>
                  {value === 'All' ? 'All Severities' : value.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="alert-search-input" className="font-semibold text-slate-700 block mb-1">
              Search Text
            </label>
            <input
              id="alert-search-input"
              type="text"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-xs focus:border-sky-600 focus:outline-none"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by reference, status, or description"
            />
          </div>
        </div>
      </Card>

      {/* Alerts Ledger */}
      <Card className="overflow-hidden p-0">
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Operational Event Records ({filtered.length})
            </h3>
            <p className="text-xs text-slate-500">
              Chronological ledger of system notifications, quality alerts, and workflow notices.
            </p>
          </div>
        </div>

        {filtered.length ? (
          <ul className="divide-y divide-slate-100 bg-white">
            {filtered.map((alert) => (
              <li key={alert.id} className="p-4 sm:p-5 hover:bg-slate-50/80 transition-colors">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {alert.severity === 'critical' ? (
                      <AlertCircle className="size-4 text-red-600 shrink-0" aria-hidden="true" />
                    ) : alert.severity === 'warning' ? (
                      <AlertTriangle className="size-4 text-amber-600 shrink-0" aria-hidden="true" />
                    ) : (
                      <Info className="size-4 text-blue-600 shrink-0" aria-hidden="true" />
                    )}
                    <h4 className="font-semibold text-slate-900 text-sm">{alert.title}</h4>
                  </div>
                  <StatusBadge
                    tone={
                      alert.severity === 'critical'
                        ? 'danger'
                        : alert.severity === 'warning'
                        ? 'warning'
                        : 'info'
                    }
                  >
                    {alert.severity}
                  </StatusBadge>
                </div>

                <p className="mt-1.5 text-xs text-slate-700 leading-relaxed">{alert.description}</p>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2 text-xs text-slate-500">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-700">{alert.category}</span>
                    <span>·</span>
                    <span className="font-mono">{alert.reference}</span>
                    <span>·</span>
                    <span>{alert.status}</span>
                    {alert.timestamp && (
                      <>
                        <span>·</span>
                        <span>{new Date(alert.timestamp).toLocaleString()}</span>
                      </>
                    )}
                  </div>

                  <Link
                    to={alert.route}
                    className="inline-flex items-center gap-1 font-semibold text-sky-700 hover:text-sky-900"
                  >
                    {(
                      {
                        Procurement: 'View Reorder Trigger',
                        Quality: 'View Inspection',
                        Production: 'View Production Run',
                        Transfers: 'View Stock Transfer',
                        Telemetry: 'View Telemetry Status',
                      } as Record<string, string>
                    )[alert.category] || 'View Record'}
                    &rarr;
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title={
              loading
                ? 'Alert sources are loading'
                : incomplete
                ? 'No matching records from available sources'
                : 'No active alerts'
            }
            description="Adjust your search filters or click refresh above."
          />
        )}
      </Card>
    </div>
  )
}
