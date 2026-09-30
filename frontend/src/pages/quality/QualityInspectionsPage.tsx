import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  FileCheck2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
  XCircle,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  createQualityInspection,
  getQcSpecifications,
  getQualityInspections,
} from '../../api'
import {
  Button,
  Card,
  EmptyState,
  LoadingSpinner,
  PageHeader,
  StatusBadge,
} from '../../components/common'
import type {
  QcSpecificationResponse,
  QualityInspectionItemRequest,
  QualityInspectionResponse,
} from '../../types'
import { usePermissions } from '../../hooks/usePermissions'

type DraftItem = QualityInspectionItemRequest & { key: number }

export function QualityInspectionsPage() {
  const navigate = useNavigate()
  const [inspections, setInspections] = useState<QualityInspectionResponse[]>([])
  const [specs, setSpecs] = useState<QcSpecificationResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [working, setWorking] = useState(false)

  // Form states
  const [inspectionType, setInspectionType] = useState('Incoming')
  const [materialBatchId, setMaterialBatchId] = useState('')
  const [productionRunId, setProductionRunId] = useState('')
  const [finishedBatchId, setFinishedBatchId] = useState('')
  const [remarks, setRemarks] = useState('')
  const [items, setItems] = useState<DraftItem[]>([
    { key: 1, parameterName: '', observedValue: 0 },
  ])

  // Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [stageFilter, setStageFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [list, specifications] = await Promise.all([
        getQualityInspections(),
        getQcSpecifications(),
      ])
      setInspections(list)
      setSpecs(specifications)
    } catch {
      setError('Unable to load quality inspections from backend.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void Promise.resolve().then(load)
  }, [])

  function applySpec(key: number, id: number) {
    const spec = specs.find((item) => item.qcSpecificationId === id)
    if (!spec) return
    setItems((current) =>
      current.map((item) =>
        item.key === key
          ? {
              ...item,
              qcSpecificationId: id,
              parameterName: spec.parameterName,
              minimumValue: spec.minimumValue,
              maximumValue: spec.maximumValue,
              targetValue: spec.targetValue,
              measurementUnit: spec.measurementUnit,
              specification: spec.specification,
              isCritical: spec.isCritical,
            }
          : item
      )
    )
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const refs = [materialBatchId, productionRunId, finishedBatchId].filter(Boolean)
    if (
      refs.length !== 1 ||
      items.some((item) => !item.parameterName.trim() || !Number.isFinite(item.observedValue))
    ) {
      setError(
        'Please specify exactly one reference (Material Batch ID, Production Run ID, or Finished Batch ID) and provide each parameter test with a valid observed number.'
      )
      return
    }

    setWorking(true)
    setError(null)
    try {
      await createQualityInspection({
        inspectionType,
        materialBatchId: materialBatchId ? Number(materialBatchId) : null,
        productionRunId: productionRunId ? Number(productionRunId) : null,
        finishedBatchId: finishedBatchId ? Number(finishedBatchId) : null,
        remarks: remarks || null,
        items: items.map((item) => ({
          qcSpecificationId: item.qcSpecificationId,
          parameterName: item.parameterName,
          minimumValue: item.minimumValue,
          maximumValue: item.maximumValue,
          observedValue: item.observedValue,
          targetValue: item.targetValue,
          measurementUnit: item.measurementUnit,
          specification: item.specification,
          isCritical: item.isCritical,
        })),
      })
      setShowForm(false)
      setMaterialBatchId('')
      setProductionRunId('')
      setFinishedBatchId('')
      setRemarks('')
      setItems([{ key: Date.now(), parameterName: '', observedValue: 0 }])
      await load()
    } catch {
      setError('The server could not record this quality inspection.')
    } finally {
      setWorking(false)
    }
  }

  // Filtered inspections
  const filteredInspections = useMemo(() => {
    return inspections.filter((ins) => {
      if (stageFilter !== 'ALL' && ins.inspectionType !== stageFilter) return false
      if (statusFilter !== 'ALL' && ins.status !== statusFilter) return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchId = String(ins.inspectionId).includes(q)
        const matchType = ins.inspectionType?.toLowerCase().includes(q)
        const matchRef = (
          ins.materialBatchNo ||
          ins.productionRunNumber ||
          ins.finishedBatchNo ||
          ''
        )
          .toLowerCase()
          .includes(q)
        return matchId || matchType || matchRef
      }

      return true
    })
  }, [inspections, stageFilter, statusFilter, searchQuery])

  // Metrics
  const metrics = useMemo(() => {
    const total = inspections.length
    const passed = inspections.filter((i) => i.status === 'Pass').length
    const failed = inspections.filter((i) => i.status === 'Fail').length
    const pending = inspections.filter((i) => i.status !== 'Pass' && i.status !== 'Fail').length

    return { total, passed, failed, pending }
  }, [inspections])

  function getStatusTone(status: string) {
    if (status === 'Pass') return 'success' as const
    if (status === 'Fail') return 'danger' as const
    return 'neutral' as const
  }

  const { canLogTest } = usePermissions('qualityCheck')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quality Control Inspections"
        description="Verify raw material acceptance, in-process production tolerances, and finished goods release standards."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
              Refresh
            </Button>
            {canLogTest && (
              <Button
                size="sm"
                variant={showForm ? 'secondary' : 'primary'}
                onClick={() => setShowForm((v) => !v)}
              >
                {showForm ? (
                  <>
                    <X className="size-3.5" aria-hidden="true" />
                    Cancel Recording
                  </>
                ) : (
                  <>
                    <Plus className="size-3.5" aria-hidden="true" />
                    Record QC Inspection
                  </>
                )}
              </Button>
            )}
          </div>
        }
      />

      {/* Industrial Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4 border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Total Checks</p>
            <FileCheck2 className="size-4 text-slate-500" aria-hidden="true" />
          </div>
          <p className="mt-2 font-mono text-2xl font-black text-slate-900 tabular-nums">{metrics.total}</p>
          <p className="mt-1 text-[11px] text-slate-500 font-medium">Recorded QC evaluations</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-emerald-600 border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Passed / Released</p>
            <CheckCircle2 className="size-4 text-emerald-600" aria-hidden="true" />
          </div>
          <p className="mt-2 font-mono text-2xl font-black text-emerald-950 tabular-nums">{metrics.passed}</p>
          <p className="mt-1 text-[11px] text-slate-500 font-medium">Met all tolerance limits</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-rose-600 border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Failed / Rejected</p>
            <XCircle className="size-4 text-rose-600" aria-hidden="true" />
          </div>
          <p className="mt-2 font-mono text-2xl font-black text-rose-950 tabular-nums">{metrics.failed}</p>
          <p className="mt-1 text-[11px] text-slate-500 font-medium">Out of specification</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-amber-600 border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600">In Review / Pending</p>
            <Clock className="size-4 text-amber-600" aria-hidden="true" />
          </div>
          <p className="mt-2 font-mono text-2xl font-black text-amber-950 tabular-nums">{metrics.pending}</p>
          <p className="mt-1 text-[11px] text-slate-500 font-medium">Awaiting final signoff</p>
        </Card>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 shadow-xs">
          <AlertCircle className="size-5 shrink-0 text-rose-600 mt-0.5" aria-hidden="true" />
          <div className="flex-1">
            <h4 className="font-bold text-rose-900">Quality Inspection Request Notice</h4>
            <p className="mt-0.5 font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* RECORD INSPECTION FORM CARD */}
      {showForm && (
        <Card className="p-6 border-2 border-indigo-200 bg-gradient-to-b from-indigo-50/20 to-white shadow-md">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <FileCheck2 className="size-5 text-indigo-600" aria-hidden="true" />
            <h2 className="text-base font-bold text-slate-900">Record Quality Control Inspection</h2>
          </div>

          <form onSubmit={submit} className="mt-5 space-y-5">
            {/* Stage & Reference Configuration */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                1. Stage & Batch Selection (Select Exactly One Reference)
              </h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Inspection Stage <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={inspectionType}
                    onChange={(e) => setInspectionType(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-hidden"
                  >
                    <option value="Incoming">Incoming (Raw Materials)</option>
                    <option value="InProcess">InProcess (WIP / Stages)</option>
                    <option value="Final">Final (Finished Goods)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Material Batch ID
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 101"
                    value={materialBatchId}
                    disabled={Boolean(productionRunId || finishedBatchId)}
                    onChange={(e) => setMaterialBatchId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-hidden disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Production Run ID
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 201"
                    value={productionRunId}
                    disabled={Boolean(materialBatchId || finishedBatchId)}
                    onChange={(e) => setProductionRunId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-hidden disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Finished Batch ID
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 301"
                    value={finishedBatchId}
                    disabled={Boolean(materialBatchId || productionRunId)}
                    onChange={(e) => setFinishedBatchId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-hidden disabled:bg-slate-100"
                  />
                </div>
              </div>

              <div className="mt-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Inspector Remarks & Laboratory Observations
                </label>
                <textarea
                  placeholder="Optional notes regarding visual appearance, color consistency, or lab conditions..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Test Parameters */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  2. Parameter Test Observations ({items.length} Test{items.length > 1 ? 's' : ''})
                </h3>
                <span className="text-[11px] text-slate-400 font-medium">
                  Select a predefined spec or enter custom parameters
                </span>
              </div>

              {items.map((item, index) => (
                <div
                  key={item.key}
                  className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 space-y-2"
                >
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[2rem_1fr_1fr_10rem_auto] items-center">
                    <span className="font-mono text-xs font-bold text-slate-400 text-center">
                      #{index + 1}
                    </span>

                    <select
                      value={item.qcSpecificationId || ''}
                      onChange={(e) => applySpec(item.key, Number(e.target.value))}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-xs focus:border-indigo-500 focus:outline-hidden"
                    >
                      <option value="">Choose standard spec parameter...</option>
                      {specs
                        .filter((spec) => spec.inspectionType === inspectionType)
                        .map((spec) => (
                          <option key={spec.qcSpecificationId} value={spec.qcSpecificationId}>
                            {spec.productCode} — {spec.parameterName}
                          </option>
                        ))}
                    </select>

                    <input
                      required
                      placeholder="Parameter Name (e.g. MFI, Tensile)"
                      value={item.parameterName}
                      onChange={(e) =>
                        setItems((current) =>
                          current.map((v) =>
                            v.key === item.key ? { ...v, parameterName: e.target.value } : v
                          )
                        )
                      }
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-hidden"
                    />

                    <div className="relative">
                      <input
                        required
                        type="number"
                        step="any"
                        placeholder="Observed Value"
                        value={item.observedValue || ''}
                        onChange={(e) =>
                          setItems((current) =>
                            current.map((v) =>
                              v.key === item.key
                                ? { ...v, observedValue: Number(e.target.value) }
                                : v
                            )
                          )
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-hidden"
                      />
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={() =>
                        setItems((current) =>
                          current.length > 1 ? current.filter((v) => v.key !== item.key) : current
                        )
                      }
                      className="text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  </div>

                  {/* Specification Limits Reference */}
                  {(item.measurementUnit || item.minimumValue != null || item.maximumValue != null) && (
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 pl-7 font-mono">
                      <span>Unit: <strong className="text-slate-700">{item.measurementUnit || '—'}</strong></span>
                      <span>
                        Acceptance Range:{' '}
                        <strong className="text-slate-700">
                          {item.minimumValue ?? '—'} to {item.maximumValue ?? '—'}
                        </strong>
                      </span>
                      {item.isCritical && (
                        <span className="text-rose-600 font-bold uppercase text-[10px]">
                          [Critical Parameter]
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Form Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={() =>
                  setItems((current) => [
                    ...current,
                    { key: Date.now(), parameterName: '', observedValue: 0 },
                  ])
                }
              >
                <Plus className="size-3.5" aria-hidden="true" />
                Add Test Line
              </Button>

              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" type="button" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" loading={working} disabled={working}>
                  <CheckCircle2 className="size-3.5" aria-hidden="true" />
                  Save Inspection Record
                </Button>
              </div>
            </div>
          </form>
        </Card>
      )}

      {/* Filter and Search Bar */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              type="text"
              placeholder="Search by inspection ID (#...), batch code, or run number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-9 pr-8 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 shadow-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Stage:</label>
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 shadow-xs focus:border-indigo-500 focus:outline-hidden"
              >
                <option value="ALL">All Stages</option>
                <option value="Incoming">Incoming (RM)</option>
                <option value="InProcess">InProcess (WIP)</option>
                <option value="Final">Final (FG)</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 shadow-xs focus:border-indigo-500 focus:outline-hidden"
              >
                <option value="ALL">All Results</option>
                <option value="Pass">Pass Only</option>
                <option value="Fail">Fail Only</option>
              </select>
            </div>

            {(searchQuery || stageFilter !== 'ALL' || statusFilter !== 'ALL') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('')
                  setStageFilter('ALL')
                  setStatusFilter('ALL')
                }}
                className="text-xs text-slate-500 hover:text-slate-800"
              >
                <X className="size-3.5" aria-hidden="true" />
                Reset
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* INSPECTIONS REGISTRY TABLE */}
      {loading ? (
        <Card className="py-20 text-center">
          <LoadingSpinner label="Loading quality inspection ledger..." size="lg" />
        </Card>
      ) : inspections.length === 0 ? (
        <Card className="py-14 text-center">
          <EmptyState
            icon={<FileCheck2 className="size-10 text-slate-400" />}
            title="No quality inspections recorded"
            description="Record a raw material or production run inspection to begin the quality control log."
            action={
              <Button size="sm" onClick={() => setShowForm(true)}>
                <Plus className="size-3.5" aria-hidden="true" />
                Record First Inspection
              </Button>
            }
          />
        </Card>
      ) : filteredInspections.length === 0 ? (
        <Card className="py-14 text-center">
          <EmptyState
            icon={<Search className="size-10 text-slate-400" />}
            title="No matching inspection records"
            description="No inspections matched your active search and status filter criteria."
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSearchQuery('')
                  setStageFilter('ALL')
                  setStatusFilter('ALL')
                }}
              >
                Reset Filters
              </Button>
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden p-0 border-slate-200 shadow-xs">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-100/90 text-xs font-bold uppercase tracking-wider text-slate-700">
                <tr>
                  <th scope="col" className="px-5 py-3.5">Inspection ID</th>
                  <th scope="col" className="px-5 py-3.5">Stage Type</th>
                  <th scope="col" className="px-5 py-3.5">Batch / Run Reference</th>
                  <th scope="col" className="px-5 py-3.5">Date & Time</th>
                  <th scope="col" className="px-5 py-3.5">QC Result</th>
                  <th scope="col" className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                {filteredInspections.map((inspection) => (
                  <tr key={inspection.inspectionId} className="hover:bg-slate-50/80 transition-colors">
                    {/* ID */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="flex size-7 items-center justify-center rounded-md bg-indigo-50 text-indigo-700 font-mono font-bold text-xs">
                          <FileCheck2 className="size-3.5 text-indigo-600 shrink-0" aria-hidden="true" />
                        </div>
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          #{inspection.inspectionId}
                        </span>
                      </div>
                    </td>

                    {/* Stage Type */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="font-semibold text-slate-800 bg-slate-100 px-2.5 py-1 rounded text-xs">
                        {inspection.inspectionType}
                      </span>
                    </td>

                    {/* Reference */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="font-mono font-bold text-slate-900 text-xs block">
                        {inspection.materialBatchNo ||
                          inspection.productionRunNumber ||
                          inspection.finishedBatchNo ||
                          '—'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {inspection.materialBatchId != null
                          ? `Material Batch #${inspection.materialBatchId}`
                          : inspection.productionRunId != null
                            ? `Run #${inspection.productionRunId}`
                            : inspection.finishedBatchId != null
                              ? `FG Batch #${inspection.finishedBatchId}`
                              : 'General inspection'}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-5 py-4 whitespace-nowrap font-mono text-slate-500 text-xs">
                      {inspection.inspectionDate
                        ? new Date(inspection.inspectionDate).toLocaleString()
                        : '—'}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <StatusBadge tone={getStatusTone(inspection.status)}>
                        {inspection.status}
                      </StatusBadge>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 whitespace-nowrap text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => navigate(`/quality/inspections/${inspection.inspectionId}`)}
                      >
                        <Eye className="size-3.5 text-indigo-600" aria-hidden="true" />
                        View Report
                      </Button>
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
