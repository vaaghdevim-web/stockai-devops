import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Filter,
  Layers,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  X,
} from 'lucide-react'
import { getQcSpecifications } from '../../api/qcApi'
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingSpinner,
  PageHeader,
  StatusBadge,
} from '../../components/common'
import type { QcSpecificationResponse } from '../../types'

function getInspectionTypeTone(type: string): 'info' | 'warning' | 'success' | 'neutral' {
  switch (type) {
    case 'Incoming':
      return 'info'
    case 'InProcess':
      return 'warning'
    case 'Final':
      return 'success'
    default:
      return 'neutral'
  }
}

export function QcSpecificationsPage() {
  const [specs, setSpecs] = useState<QcSpecificationResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [inspectionTypeFilter, setInspectionTypeFilter] = useState('ALL')
  const [criticalityFilter, setCriticalityFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  const fetchSpecs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getQcSpecifications()
      setSpecs(Array.isArray(data) ? data : [])
    } catch {
      setError('Unable to load QC specifications from the server.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void Promise.resolve().then(fetchSpecs)
  }, [fetchSpecs])

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = specs.length
    const critical = specs.filter((s) => s.isCritical).length
    const incoming = specs.filter((s) => s.inspectionType === 'Incoming').length
    const inProcessOrFinal = specs.filter(
      (s) => s.inspectionType === 'InProcess' || s.inspectionType === 'Final'
    ).length
    return { total, critical, incoming, inProcessOrFinal }
  }, [specs])

  const filteredSpecs = useMemo(() => {
    return specs.filter((s) => {
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !q ||
        s.parameterName?.toLowerCase().includes(q) ||
        s.productCode?.toLowerCase().includes(q) ||
        s.productName?.toLowerCase().includes(q) ||
        (s.specification && s.specification.toLowerCase().includes(q)) ||
        (s.measurementUnit && s.measurementUnit.toLowerCase().includes(q))

      const matchesType =
        inspectionTypeFilter === 'ALL' || s.inspectionType === inspectionTypeFilter

      const matchesCriticality =
        criticalityFilter === 'ALL' ||
        (criticalityFilter === 'CRITICAL' && Boolean(s.isCritical)) ||
        (criticalityFilter === 'STANDARD' && !s.isCritical)

      return matchesSearch && matchesType && matchesCriticality
    })
  }, [specs, searchQuery, inspectionTypeFilter, criticalityFilter])

  return (
    <div className="space-y-6">
      <PageHeader
        title="QC Specifications & Standards"
        description="Standardized quality control tolerance limits, parameter thresholds, and acceptance criteria."
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void fetchSpecs()}
            disabled={loading}
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            Refresh
          </Button>
        }
      />

      {error && (
        <ErrorState
          title="QC Specifications Error"
          description={error}
          onRetry={() => void fetchSpecs()}
          retryLabel="Try Again"
        />
      )}

      {/* Industrial Summary Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <div className="flex items-center gap-2 text-slate-500">
            <Sliders className="size-4" aria-hidden="true" />
            <p className="text-xs font-semibold uppercase tracking-wider">Total Parameters</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{loading ? '—' : metrics.total}</p>
          <p className="mt-0.5 text-xs text-slate-500">Active QC specifications</p>
        </Card>

        <Card>
          <div className="flex items-center gap-2 text-slate-500">
            <ShieldAlert className="size-4 text-red-500" aria-hidden="true" />
            <p className="text-xs font-semibold uppercase tracking-wider">Critical Criteria</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-red-600">{loading ? '—' : metrics.critical}</p>
          <p className="mt-0.5 text-xs text-slate-500">Mandatory pass gates</p>
        </Card>

        <Card>
          <div className="flex items-center gap-2 text-slate-500">
            <Layers className="size-4 text-blue-500" aria-hidden="true" />
            <p className="text-xs font-semibold uppercase tracking-wider">Incoming Raw Specs</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-blue-600">{loading ? '—' : metrics.incoming}</p>
          <p className="mt-0.5 text-xs text-slate-500">Polymer & additive checks</p>
        </Card>

        <Card>
          <div className="flex items-center gap-2 text-slate-500">
            <ShieldCheck className="size-4 text-emerald-500" aria-hidden="true" />
            <p className="text-xs font-semibold uppercase tracking-wider">Process & FG Specs</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-600">
            {loading ? '—' : metrics.inProcessOrFinal}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">Extrusion & compounding</p>
        </Card>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-1 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-xs">
          <Search className="size-4 text-slate-400 shrink-0" aria-hidden="true" />
          <input
            type="text"
            placeholder="Search specifications by parameter, product code, name, or unit..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-xs font-medium text-slate-400 hover:text-slate-600"
              aria-label="Clear search"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Stage Filter */}
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 shadow-xs">
            <Filter className="size-3.5 text-slate-400" aria-hidden="true" />
            <label htmlFor="qc-inspection-type-filter" className="text-xs font-medium text-slate-600">
              Stage:
            </label>
            <select
              id="qc-inspection-type-filter"
              value={inspectionTypeFilter}
              onChange={(e) => setInspectionTypeFilter(e.target.value)}
              className="bg-transparent text-xs font-medium text-slate-700 outline-none"
            >
              <option value="ALL">All Stages</option>
              <option value="Incoming">Incoming (Raw Materials)</option>
              <option value="InProcess">InProcess (Manufacturing)</option>
              <option value="Final">Final (Finished Goods)</option>
            </select>
          </div>

          {/* Criticality Filter */}
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 shadow-xs">
            <label htmlFor="qc-criticality-filter" className="text-xs font-medium text-slate-600">
              Priority:
            </label>
            <select
              id="qc-criticality-filter"
              value={criticalityFilter}
              onChange={(e) => setCriticalityFilter(e.target.value)}
              className="bg-transparent text-xs font-medium text-slate-700 outline-none"
            >
              <option value="ALL">All Priorities</option>
              <option value="CRITICAL">Critical Only</option>
              <option value="STANDARD">Standard Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Specifications Table */}
      {loading ? (
        <div className="py-20 text-center">
          <LoadingSpinner label="Loading quality specifications registry..." size="lg" />
        </div>
      ) : specs.length === 0 ? (
        <EmptyState
          icon={<Sliders className="size-10 text-slate-400" />}
          title="No QC specifications defined"
          description="The quality control master registry returned no specification profiles."
        />
      ) : filteredSpecs.length === 0 ? (
        <EmptyState
          icon={<Search className="size-10 text-slate-400" />}
          title="No matching specifications"
          description="No specifications matched your filter criteria. Try resetting search parameters."
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSearchQuery('')
                setInspectionTypeFilter('ALL')
                setCriticalityFilter('ALL')
              }}
            >
              Reset Filters
            </Button>
          }
        />
      ) : (
        <Card className="overflow-hidden" contentClassName="p-0 sm:p-0">
          <div
            className="max-w-full overflow-x-auto overscroll-x-contain"
            tabIndex={0}
            role="region"
            aria-label="QC Specifications Table"
          >
            <table className="w-full min-w-[48rem] border-collapse text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="px-5 py-3">Product / Material</th>
                  <th className="px-5 py-3">Parameter Name</th>
                  <th className="px-5 py-3 text-center">Stage</th>
                  <th className="px-5 py-3 text-center">Acceptance Limits</th>
                  <th className="px-5 py-3 text-right">Target Value</th>
                  <th className="px-5 py-3 text-center">Unit</th>
                  <th className="px-5 py-3 text-center">Criticality</th>
                  <th className="px-5 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredSpecs.map((spec) => (
                  <tr key={spec.qcSpecificationId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-mono text-xs font-bold text-slate-900">
                        {spec.productCode}
                      </div>
                      <div className="text-xs text-slate-600 truncate max-w-xs">{spec.productName}</div>
                    </td>

                    <td className="px-5 py-3.5 font-medium text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <Sliders className="size-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                        <span className="font-semibold text-slate-900">{spec.parameterName}</span>
                      </div>
                      {spec.specification && (
                        <div className="mt-0.5 text-xs text-slate-500 italic">
                          {spec.specification}
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-center">
                      <StatusBadge tone={getInspectionTypeTone(spec.inspectionType)}>
                        {spec.inspectionType}
                      </StatusBadge>
                    </td>

                    <td className="px-5 py-3.5 text-center font-mono text-xs">
                      {spec.minimumValue != null || spec.maximumValue != null ? (
                        <span className="rounded bg-slate-100 px-2.5 py-1 font-semibold text-slate-800">
                          {spec.minimumValue != null ? spec.minimumValue : '—'}
                          {' to '}
                          {spec.maximumValue != null ? spec.maximumValue : '—'}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-right font-mono text-xs font-bold text-slate-900">
                      {spec.targetValue != null ? spec.targetValue : '—'}
                    </td>

                    <td className="px-5 py-3.5 text-center font-mono text-xs text-slate-600">
                      {spec.measurementUnit || '—'}
                    </td>

                    <td className="px-5 py-3.5 text-center">
                      {spec.isCritical ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                          <AlertCircle className="size-3" aria-hidden="true" />
                          Critical
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                          Standard
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      {spec.isActive ?? true ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-medium">
                          <CheckCircle2 className="size-3.5" aria-hidden="true" />
                          Active
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">Inactive</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
