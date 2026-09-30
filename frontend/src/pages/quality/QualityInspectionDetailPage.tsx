import { useCallback, useEffect, useState } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  FileCheck2,
  Layers,
  Package,
  Sliders,
  User,
  XCircle,
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { getQualityInspection } from '../../api'
import {
  Button,
  Card,
  ErrorState,
  LoadingSpinner,
  PageHeader,
  StatusBadge,
} from '../../components/common'
import type { QualityInspectionResponse } from '../../types'

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

function getStatusBadge(status?: string) {
  const s = status?.toLowerCase()
  if (s === 'pass') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
        <CheckCircle2 className="size-4 text-emerald-600 shrink-0" aria-hidden="true" />
        PASSED
      </span>
    )
  }
  if (s === 'fail') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-red-300 bg-red-50 px-3 py-1 text-xs font-bold text-red-800">
        <XCircle className="size-4 text-red-600 shrink-0" aria-hidden="true" />
        FAILED
      </span>
    )
  }
  if (s === 'pending' || s === 'inreview') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
        <Clock className="size-4 text-amber-600 shrink-0" aria-hidden="true" />
        IN REVIEW
      </span>
    )
  }
  return <StatusBadge tone="neutral">{status || 'Unknown'}</StatusBadge>
}

export function QualityInspectionDetailPage() {
  const { inspectionId: idParam } = useParams()
  const navigate = useNavigate()
  const id = Number(idParam)
  const [data, setData] = useState<QualityInspectionResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!Number.isInteger(id) || id < 1) return
    setLoading(true)
    setError(null)
    try {
      setData(await getQualityInspection(id))
    } catch {
      setError('Unable to load this quality inspection details from the server.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void Promise.resolve().then(load)
  }, [load])

  if (!Number.isInteger(id) || id < 1) {
    return (
      <ErrorState
        title="Invalid inspection ID"
        description="The requested inspection ID must be a positive integer."
        onRetry={() => navigate('/quality/inspections')}
        retryLabel="Back to Inspections Ledger"
      />
    )
  }

  const passedTestsCount = data?.items.filter(
    (i) => i.result?.toLowerCase() === 'pass' || i.result?.toLowerCase() === 'passed'
  ).length || 0
  const failedTestsCount = data?.items.filter(
    (i) => i.result?.toLowerCase() === 'fail' || i.result?.toLowerCase() === 'failed'
  ).length || 0
  const totalTestsCount = data?.items.length || 0

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-2xl font-bold text-slate-900">
              QC Inspection #{id}
            </span>
            {data && getStatusBadge(data.status)}
            {data && (
              <StatusBadge tone={getInspectionTypeTone(data.inspectionType)}>
                {data.inspectionType} Stage
              </StatusBadge>
            )}
          </div>
        }
        description="Comprehensive testing audit record, parameter tolerances, and laboratory inspection results."
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/quality/inspections')}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to Inspections
          </Button>
        }
      />

      {loading ? (
        <div className="py-20 text-center">
          <LoadingSpinner label="Loading quality inspection details..." size="lg" />
        </div>
      ) : error ? (
        <ErrorState
          title="Inspection Record Unavailable"
          description={error}
          onRetry={load}
          retryLabel="Try Again"
        />
      ) : (
        data && (
          <div className="space-y-6">
            {/* Header / Summary KPI Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Card>
                <div className="flex items-center gap-2 text-slate-500">
                  <Layers className="size-4" aria-hidden="true" />
                  <p className="text-xs font-semibold uppercase tracking-wider">Inspection Stage</p>
                </div>
                <p className="mt-2 text-xl font-bold text-slate-900">{data.inspectionType}</p>
                <p className="mt-0.5 text-xs text-slate-500">Quality gate control</p>
              </Card>

              <Card>
                <div className="flex items-center gap-2 text-slate-500">
                  <Package className="size-4" aria-hidden="true" />
                  <p className="text-xs font-semibold uppercase tracking-wider">Target Reference</p>
                </div>
                <div className="mt-2 font-mono text-sm font-bold text-slate-900 truncate">
                  {data.materialBatchNo ? (
                    <span title={`Raw Material Batch: ${data.materialBatchNo}`}>
                      Batch: {data.materialBatchNo}
                    </span>
                  ) : data.productionRunNumber ? (
                    <span title={`Production Run: ${data.productionRunNumber}`}>
                      Run: {data.productionRunNumber}
                    </span>
                  ) : data.finishedBatchNo ? (
                    <span title={`Finished Goods Batch: ${data.finishedBatchNo}`}>
                      FG: {data.finishedBatchNo}
                    </span>
                  ) : (
                    <span className="text-slate-400">No entity reference</span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {data.materialBatchId
                    ? 'Raw Material Batch'
                    : data.productionRunId
                    ? 'Manufacturing Run'
                    : data.finishedBatchId
                    ? 'Finished Goods Batch'
                    : 'Unassigned'}
                </p>
              </Card>

              <Card>
                <div className="flex items-center gap-2 text-slate-500">
                  <FileCheck2 className="size-4" aria-hidden="true" />
                  <p className="text-xs font-semibold uppercase tracking-wider">Tests Evaluated</p>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-mono text-xl font-bold text-slate-900">
                    {totalTestsCount}
                  </span>
                  <span className="text-xs font-semibold text-emerald-700">
                    ({passedTestsCount} Passed
                  </span>
                  {failedTestsCount > 0 && (
                    <span className="text-xs font-semibold text-red-700">
                      / {failedTestsCount} Failed
                    </span>
                  )}
                  <span className="text-xs font-semibold text-emerald-700">)</span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">Parameters verified</p>
              </Card>

              <Card>
                <div className="flex items-center gap-2 text-slate-500">
                  <Calendar className="size-4" aria-hidden="true" />
                  <p className="text-xs font-semibold uppercase tracking-wider">Audit Timestamp</p>
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {data.inspectionDate
                    ? new Date(data.inspectionDate).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'Date N/A'}
                </p>
                <p className="mt-0.5 text-xs text-slate-500 flex items-center gap-1">
                  <User className="size-3 text-slate-400" aria-hidden="true" />
                  {data.inspectedByUserName || 'Automated / Unspecified'}
                </p>
              </Card>
            </div>

            {/* Inspection Context Card */}
            <Card className="p-5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3">
                Inspection Summary & Audit Notes
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Inspection ID:</span>
                    <span className="font-mono font-bold text-slate-900">#{data.inspectionId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Inspection Type:</span>
                    <span className="font-semibold text-slate-800">{data.inspectionType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Recorded By:</span>
                    <span className="font-medium text-slate-800">
                      {data.inspectedByUserName || 'System / QC Staff'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Inspection Date:</span>
                    <span className="font-mono text-slate-800">
                      {data.inspectionDate ? new Date(data.inspectionDate).toLocaleString() : '—'}
                    </span>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 flex flex-col justify-between">
                  <div>
                    <span className="text-slate-500 block font-semibold mb-1">
                      Inspector Remarks & Laboratory Observations:
                    </span>
                    <p className="text-slate-800 italic bg-white border border-slate-200 rounded p-2.5 min-h-[4rem]">
                      {data.remarks || 'No additional remarks or observations recorded.'}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Quality Status:</span>
                    <span className="font-bold uppercase text-slate-800">{data.status}</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Parameter Test Results Table */}
            <Card className="overflow-hidden p-0">
              <div className="border-b border-slate-200 bg-slate-50 px-5 py-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Observed Parameter Test Results ({data.items.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Detailed comparison of laboratory test values against acceptance thresholds.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-100/75 text-xs font-semibold uppercase tracking-wider text-slate-600">
                    <tr>
                      <th className="px-5 py-3">Parameter</th>
                      <th className="px-5 py-3 text-right">Observed Value</th>
                      <th className="px-5 py-3 text-center">Acceptance Limits</th>
                      <th className="px-5 py-3 text-right">Target</th>
                      <th className="px-5 py-3 text-center">Criticality</th>
                      <th className="px-5 py-3 text-center">Specification Note</th>
                      <th className="px-5 py-3 text-right">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {data.items.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-8 text-center text-xs text-slate-500">
                          No parameter test lines recorded for this inspection.
                        </td>
                      </tr>
                    ) : (
                      data.items.map((item) => {
                        const isPass =
                          item.result?.toLowerCase() === 'pass' ||
                          item.result?.toLowerCase() === 'passed'
                        const isFail =
                          item.result?.toLowerCase() === 'fail' ||
                          item.result?.toLowerCase() === 'failed'

                        return (
                          <tr
                            key={item.qiId}
                            className={`hover:bg-slate-50/80 transition-colors ${
                              isFail ? 'bg-red-50/20' : ''
                            }`}
                          >
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2">
                                <Sliders className="size-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                                <span className="font-semibold text-slate-900">
                                  {item.parameterName}
                                </span>
                              </div>
                            </td>

                            <td className="px-5 py-3.5 text-right font-mono text-xs font-bold text-slate-900">
                              <span
                                className={`rounded px-2 py-0.5 ${
                                  isFail
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-slate-100 text-slate-900'
                                }`}
                              >
                                {item.observedValue}{' '}
                                <span className="text-[11px] font-normal text-slate-500">
                                  {item.measurementUnit || ''}
                                </span>
                              </span>
                            </td>

                            <td className="px-5 py-3.5 text-center font-mono text-xs">
                              {item.minimumValue != null || item.maximumValue != null ? (
                                <span className="rounded bg-slate-100 px-2 py-1 font-medium text-slate-800">
                                  {item.minimumValue != null ? item.minimumValue : '—'}
                                  {' to '}
                                  {item.maximumValue != null ? item.maximumValue : '—'}
                                  {item.measurementUnit ? ` ${item.measurementUnit}` : ''}
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>

                            <td className="px-5 py-3.5 text-right font-mono text-xs text-slate-700">
                              {item.targetValue != null
                                ? `${item.targetValue} ${item.measurementUnit || ''}`
                                : '—'}
                            </td>

                            <td className="px-5 py-3.5 text-center">
                              {item.isCritical ? (
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

                            <td className="px-5 py-3.5 text-center text-xs text-slate-500 italic max-w-xs truncate">
                              {item.specification || '—'}
                            </td>

                            <td className="px-5 py-3.5 text-right">
                              {isPass ? (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded">
                                  <CheckCircle2 className="size-3.5 text-emerald-600" aria-hidden="true" />
                                  PASS
                                </span>
                              ) : isFail ? (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded">
                                  <XCircle className="size-3.5 text-red-600" aria-hidden="true" />
                                  FAIL
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded">
                                  <AlertTriangle className="size-3.5 text-amber-600" aria-hidden="true" />
                                  {item.result || 'Pending'}
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )
      )}
    </div>
  )
}
