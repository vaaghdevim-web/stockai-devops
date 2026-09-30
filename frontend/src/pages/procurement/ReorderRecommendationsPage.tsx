import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Coins,
  FileText,
  Filter,
  Play,
  RefreshCw,
  Search,
  ShieldAlert,
  ShoppingCart,
  Sparkles,
  X,
} from 'lucide-react'
import {
  approveRecommendation,
  getRecommendations,
  triggerReorderCheck,
} from '../../api/procurementApi'
import { usePermissions } from '../../hooks/usePermissions'
import type {
  PurchaseRecommendationResponse,
  ReorderCheckSummaryResponse,
} from '../../types'
import {
  Button,
  Card,
  EmptyState,
  LoadingSpinner,
  PageHeader,
} from '../../components/common'
import { GeneratePoModal } from '../../components/procurement'

export function ReorderRecommendationsPage() {
  const [searchParams] = useSearchParams()
  const initialSearch = searchParams.get('search') || ''

  const [recommendations, setRecommendations] = useState<PurchaseRecommendationResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Trigger states
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<ReorderCheckSummaryResponse | null>(null)
  const [approvingId, setApprovingId] = useState<number | null>(null)
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null)
  const [selectedRecForPo, setSelectedRecForPo] = useState<PurchaseRecommendationResponse | null>(null)

  // Auth & RBAC via centralized matrix
  const { isFull: canApprove } = usePermissions('needToBuy')

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState(initialSearch)

  const [reloadVersion, setReloadVersion] = useState(0)

  function fetchRecommendationsList() {
    setLoading(true)
    setError(null)
    setReloadVersion((version) => version + 1)
  }

  useEffect(() => {
    let active = true
    async function loadRecommendations() {
      try {
        const data = await getRecommendations()
        if (active) setRecommendations(Array.isArray(data) ? data : [])
      } catch {
        if (active) setError('Unable to load purchase recommendations from the server.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void loadRecommendations()
    return () => {
      active = false
    }
  }, [reloadVersion])

  // Trigger algorithmic stock analysis
  async function handleRunStockAnalysis() {
    setIsAnalyzing(true)
    setError(null)
    setActionSuccessMessage(null)
    try {
      const summary = await triggerReorderCheck()
      setAnalysisResult(summary)
      // Refresh list to include newly created recommendations
      const data = await getRecommendations()
      setRecommendations(Array.isArray(data) ? data : [])
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } }; message?: string }
      setError(
        errorObj.response?.data?.message ||
          errorObj.message ||
          'Failed to execute automated stock reorder analysis.'
      )
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Single-click approval action
  async function handleApprove(id: number) {
    setApprovingId(id)
    setError(null)
    setActionSuccessMessage(null)
    try {
      const updated = await approveRecommendation(id)
      setRecommendations((prev) =>
        prev.map((rec) => (rec.recommendationId === id ? updated : rec))
      )
      setActionSuccessMessage(
        `Recommendation #${id} for ${updated.materialName} approved successfully.`
      )
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } }; message?: string }
      setError(
        errorObj.response?.data?.message ||
          errorObj.message ||
          `Failed to approve recommendation #${id}.`
      )
    } finally {
      setApprovingId(null)
    }
  }

  // Metric computations
  const metrics = useMemo(() => {
    const total = recommendations.length
    const critical = recommendations.filter(
      (r) => r.priority?.toLowerCase() === 'critical' || r.priority?.toLowerCase() === 'high'
    ).length
    const totalEstCost = recommendations.reduce(
      (sum, r) => sum + (Number(r.estimatedCost) || 0),
      0
    )
    const pending = recommendations.filter(
      (r) => r.status?.toLowerCase() !== 'approved' && r.status?.toLowerCase() !== 'rejected'
    ).length

    return { total, critical, totalEstCost, pending }
  }, [recommendations])

  // Filtered recommendations
  const filteredRecommendations = useMemo(() => {
    return recommendations.filter((r) => {
      // Status filter
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'PENDING') {
          if (r.status?.toLowerCase() === 'approved' || r.status?.toLowerCase() === 'rejected') {
            return false
          }
        } else if (r.status?.toLowerCase() !== statusFilter.toLowerCase()) {
          return false
        }
      }

      // Priority filter
      if (priorityFilter !== 'ALL') {
        if (r.priority?.toLowerCase() !== priorityFilter.toLowerCase()) {
          return false
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const code = r.materialCode?.toLowerCase() || ''
        const name = r.materialName?.toLowerCase() || ''
        const reason = r.reason?.toLowerCase() || ''
        if (!code.includes(q) && !name.includes(q) && !reason.includes(q)) {
          return false
        }
      }

      return true
    })
  }, [recommendations, statusFilter, priorityFilter, searchQuery])

  function getPriorityBadge(priority?: string) {
    const p = priority?.toLowerCase()
    if (p === 'critical') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
          <AlertCircle className="size-3" aria-hidden="true" />
          Critical
        </span>
      )
    }
    if (p === 'high') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
          <AlertTriangle className="size-3" aria-hidden="true" />
          High
        </span>
      )
    }
    if (p === 'medium') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
          Medium
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
        Low
      </span>
    )
  }

  function getStatusBadge(status?: string) {
    const s = status?.toLowerCase()
    if (s === 'approved') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
          <CheckCircle2 className="size-3.5 text-emerald-600" aria-hidden="true" />
          Approved
        </span>
      )
    }
    if (s === 'rejected') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
          <X className="size-3.5 text-red-600" aria-hidden="true" />
          Rejected
        </span>
      )
    }
    if (s === 'inreview') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
          <Clock className="size-3.5 text-amber-600" aria-hidden="true" />
          In Review
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
        <Sparkles className="size-3.5 text-blue-600" aria-hidden="true" />
        New Trigger
      </span>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Procurement Reorder Recommendations"
        description="Automated raw material replenishment calculations, safety stock triggers, and purchase requisitions."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchRecommendationsList}
              disabled={loading || isAnalyzing}
            >
              <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleRunStockAnalysis}
              loading={isAnalyzing}
            >
              <Play className="size-3.5" aria-hidden="true" />
              Run Stock Analysis
            </Button>
          </div>
        }
      />

      {/* Stock Analysis Result Banner */}
      {analysisResult && (
        <div className="relative rounded-xl border border-emerald-200 bg-emerald-50/90 p-5 shadow-xs transition-all">
          <button
            type="button"
            onClick={() => setAnalysisResult(null)}
            className="absolute right-3.5 top-3.5 rounded-lg p-1 text-emerald-600 hover:bg-emerald-100"
            aria-label="Dismiss analysis summary"
          >
            <X className="size-4" aria-hidden="true" />
          </button>

          <div className="flex items-center gap-2 pr-10 text-emerald-900 font-bold">
            <Sparkles className="size-5 text-emerald-600 shrink-0" aria-hidden="true" />
            <span>Factory Stock Reorder Analysis Complete</span>
          </div>

          <p className="mt-1 text-xs text-emerald-700">
            Analyzed at {new Date(analysisResult.scanTimestamp).toLocaleTimeString()} across raw material warehouse inventory.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border border-emerald-200/80 bg-white p-3">
              <span className="text-xs text-slate-500">Materials Evaluated</span>
              <p className="mt-1 font-mono text-xl font-bold text-slate-900">
                {analysisResult.totalMaterialsEvaluated}
              </p>
            </div>
            <div className="rounded-lg border border-emerald-200/80 bg-white p-3">
              <span className="text-xs text-slate-500">Below Reorder Level</span>
              <p className="mt-1 font-mono text-xl font-bold text-amber-600">
                {analysisResult.lowStockCount}
              </p>
            </div>
            <div className="rounded-lg border border-emerald-200/80 bg-white p-3">
              <span className="text-xs text-slate-500">Critical Stock Breaches</span>
              <p className="mt-1 font-mono text-xl font-bold text-red-600">
                {analysisResult.criticalStockCount}
              </p>
            </div>
            <div className="rounded-lg border border-emerald-200/80 bg-white p-3">
              <span className="text-xs text-slate-500">New Reorder Items</span>
              <p className="mt-1 font-mono text-xl font-bold text-emerald-600">
                {analysisResult.newRecommendationsCreated}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action Notifications */}
      {actionSuccessMessage && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <div className="flex flex-wrap items-center gap-2">
            <CheckCircle2 className="size-4 text-emerald-600 shrink-0" aria-hidden="true" />
            <span>{actionSuccessMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccessMessage(null)}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-900"
          >
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          <div className="flex flex-wrap items-center gap-2">
            <AlertCircle className="size-4 text-red-600 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-xs font-semibold text-red-700 hover:text-red-900"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Highlight Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <div className="flex items-center gap-2 text-slate-500">
            <ShoppingCart className="size-4" aria-hidden="true" />
            <p className="text-xs font-semibold uppercase tracking-wider">Total Triggers</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{loading ? '—' : metrics.total}</p>
          <p className="mt-0.5 text-xs text-slate-500">Calculated purchase recommendations</p>
        </Card>

        <Card>
          <div className="flex items-center gap-2 text-slate-500">
            <ShieldAlert className="size-4 text-red-500" aria-hidden="true" />
            <p className="text-xs font-semibold uppercase tracking-wider">Critical Alerts</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-red-600">{loading ? '—' : metrics.critical}</p>
          <p className="mt-0.5 text-xs text-slate-500">Below safety buffer stock</p>
        </Card>

        <Card>
          <div className="flex items-center gap-2 text-slate-500">
            <Clock className="size-4 text-amber-500" aria-hidden="true" />
            <p className="text-xs font-semibold uppercase tracking-wider">Pending Approvals</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-600">{loading ? '—' : metrics.pending}</p>
          <p className="mt-0.5 text-xs text-slate-500">Awaiting supervisor sign-off</p>
        </Card>

        <Card>
          <div className="flex items-center gap-2 text-slate-500">
            <Coins className="size-4 text-emerald-500" aria-hidden="true" />
            <p className="text-xs font-semibold uppercase tracking-wider">Estimated Capital</p>
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-slate-900">
            {loading ? '—' : `₹${metrics.totalEstCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">Projected procurement commitment</p>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-1 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-xs">
          <Search className="size-4 text-slate-400 shrink-0" aria-hidden="true" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search recommendations by material code, name, or trigger reason..."
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
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 shadow-xs">
            <Filter className="size-3.5 text-slate-400" aria-hidden="true" />
            <label htmlFor="procurement-status-filter" className="text-xs font-medium text-slate-600">
              Status:
            </label>
            <select
              id="procurement-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs font-medium text-slate-700 outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending (New / In Review)</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 shadow-xs">
            <label htmlFor="procurement-priority-filter" className="text-xs font-medium text-slate-600">
              Priority:
            </label>
            <select
              id="procurement-priority-filter"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-transparent text-xs font-medium text-slate-700 outline-none"
            >
              <option value="ALL">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table / State Display */}
      {loading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner label="Fetching procurement recommendations..." size="lg" />
        </div>
      ) : filteredRecommendations.length === 0 ? (
        <EmptyState
          icon={<ShoppingCart className="size-10 text-slate-400" />}
          title={
            recommendations.length === 0
              ? 'No recommendations generated yet'
              : 'No matching recommendations found'
          }
          description={
            recommendations.length === 0
              ? 'Click "Run Stock Analysis" above to evaluate raw material inventory levels against safety buffers and generate purchase triggers.'
              : 'Try adjusting your search terms or filter selections.'
          }
          action={
            recommendations.length === 0 ? (
              <Button
                variant="primary"
                size="sm"
                onClick={handleRunStockAnalysis}
                loading={isAnalyzing}
              >
                <Play className="size-3.5" aria-hidden="true" />
                Run Stock Analysis
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSearchQuery('')
                  setStatusFilter('ALL')
                  setPriorityFilter('ALL')
                }}
              >
                Reset Filters
              </Button>
            )
          }
        />
      ) : (
        <Card className="overflow-hidden" contentClassName="p-0 sm:p-0">
          <div
            className="max-w-full overflow-x-auto overscroll-x-contain"
            tabIndex={0}
            role="region"
            aria-label="Reorder Recommendations Table"
          >
            <table className="w-full min-w-[52rem] border-collapse text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="px-5 py-3">Raw Material</th>
                  <th className="px-5 py-3 text-center">Priority</th>
                  <th className="px-5 py-3 text-right">Current vs Safety</th>
                  <th className="px-5 py-3 text-right">Suggested Qty</th>
                  <th className="px-5 py-3 text-right">Est. Amount</th>
                  <th className="px-5 py-3 text-center">Lead Time</th>
                  <th className="px-5 py-3">Trigger Reason</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredRecommendations.map((r) => {
                  const isApproved = r.status?.toLowerCase() === 'approved'
                  const isUnderSafety = Number(r.currentStock) <= Number(r.safetyStock)

                  return (
                    <tr key={r.recommendationId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="min-w-0">
                          <p className="font-mono text-xs font-bold text-slate-900">{r.materialCode}</p>
                          <p className="text-xs text-slate-600 truncate max-w-xs">{r.materialName}</p>
                          {r.plantName && (
                            <span className="text-[11px] text-slate-400">{r.plantName}</span>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-3.5 text-center">
                        {getPriorityBadge(r.priority)}
                      </td>

                      <td className="px-5 py-3.5 text-right font-mono text-xs">
                        <span className={`font-bold ${isUnderSafety ? 'text-red-600' : 'text-slate-900'}`}>
                          {Number(r.currentStock).toLocaleString()} KG
                        </span>
                        <div className="text-[11px] text-slate-400">
                          Safety: {Number(r.safetyStock).toLocaleString()} KG
                        </div>
                      </td>

                      <td className="px-5 py-3.5 text-right font-mono text-xs font-bold text-slate-900">
                        {Number(r.recommendedQty).toLocaleString()} KG
                      </td>

                      <td className="px-5 py-3.5 text-right font-mono text-xs font-bold text-slate-900">
                        ₹{Number(r.estimatedCost).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </td>

                      <td className="px-5 py-3.5 text-center text-xs text-slate-600 font-mono">
                        {r.leadTimeDays ? `${r.leadTimeDays}d` : '—'}
                      </td>

                      <td className="px-5 py-3.5 text-xs text-slate-600 max-w-xs">
                        <p className="line-clamp-2" title={r.reason || undefined}>
                          {r.reason || 'Inventory below threshold'}
                        </p>
                      </td>

                      <td className="px-5 py-3.5 text-center">
                        {getStatusBadge(r.status)}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setSelectedRecForPo(r)}
                            className="text-xs"
                            title="Generate printable requisition draft voucher"
                          >
                            <FileText className="size-3.5" aria-hidden="true" />
                            Requisition Voucher
                          </Button>
                          {isApproved ? (
                            <div className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                              <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" aria-hidden="true" />
                              <span>Approved</span>
                            </div>
                          ) : (
                            <Button
                              variant="primary"
                              size="sm"
                              loading={approvingId === r.recommendationId}
                              disabled={approvingId !== null || !canApprove}
                              onClick={() => handleApprove(r.recommendationId)}
                              className="text-xs"
                              title={
                                canApprove
                                  ? `Approve procurement for ${r.materialName}`
                                  : 'Supervisor role required to approve'
                              }
                            >
                              <CheckCircle2 className="size-3.5" aria-hidden="true" />
                              Approve
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Generate PO Modal */}
      <GeneratePoModal
        key={selectedRecForPo?.recommendationId ?? 'closed'}
        recommendation={selectedRecForPo}
        isOpen={selectedRecForPo !== null}
        onClose={() => setSelectedRecForPo(null)}
        onPoGenerated={(rec, poNum) => {
          fetchRecommendationsList()
          setActionSuccessMessage(`Requisition voucher draft ${poNum} prepared for ${rec.materialName}.`)
        }}
      />
    </div>
  )
}
