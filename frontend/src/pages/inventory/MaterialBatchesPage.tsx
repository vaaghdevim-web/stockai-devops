import { useEffect, useEffectEvent, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AlertCircle, Calendar, CheckCircle2, Clock, Layers, PackagePlus, RefreshCw } from 'lucide-react'
import { getAvailableStock, getFifoBatches, getRawMaterials } from '../../api/inventoryApi'
import type { MaterialBatchResponse, RawMaterialResponse } from '../../types'
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingSpinner,
  PageHeader,
  StatusBadge,
} from '../../components/common'
import { MaterialReceivingModal } from '../../components/inventory'
import { usePermissions } from '../../hooks/usePermissions'

export function MaterialBatchesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const materialIdParam = searchParams.get('materialId')
  const selectedMaterialId = materialIdParam ? Number(materialIdParam) : null

  const [materials, setMaterials] = useState<RawMaterialResponse[]>([])
  const [loadingMaterials, setLoadingMaterials] = useState(true)
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false)
  const [materialsError, setMaterialsError] = useState<string | null>(null)
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [batchResult, setBatchResult] = useState<{
    materialId: number
    version: number
    batches: MaterialBatchResponse[]
    availableStock: number | null
    error: string | null
  } | null>(null)

  // Read the latest URL when the catalog arrives without refetching on selection.
  const selectDefaultMaterial = useEffectEvent((list: RawMaterialResponse[]) => {
    if (!selectedMaterialId && list.length > 0) {
      setSearchParams({ materialId: String(list[0].materialId) })
    }
  })

  useEffect(() => {
    let active = true
    async function loadMaterials() {
      try {
        const data = await getRawMaterials()
        if (!active) return
        const validList = Array.isArray(data) ? data : []
        setMaterials(validList)
        selectDefaultMaterial(validList)
      } catch {
        if (active) setMaterialsError('Unable to load raw materials list.')
      } finally {
        if (active) setLoadingMaterials(false)
      }
    }
    void loadMaterials()
    return () => { active = false }
  }, [])

  // Loading follows the request identity, so selection needs no state-sync effect.
  const currentResult = batchResult?.materialId === selectedMaterialId
    && batchResult.version === refreshVersion ? batchResult : null
  const loadingBatches = Boolean(selectedMaterialId) && !currentResult
  const batches = currentResult?.batches ?? []
  const availableStock = currentResult?.availableStock ?? null
  const error = currentResult?.error ?? materialsError

  useEffect(() => {
    if (!selectedMaterialId) return
    let active = true
    const materialId = selectedMaterialId
    async function loadBatches() {
      try {
        const [batchList, stock] = await Promise.all([
          getFifoBatches(materialId),
          getAvailableStock(materialId).catch(() => null),
        ])
        if (active) setBatchResult({
          materialId,
          version: refreshVersion,
          batches: Array.isArray(batchList) ? batchList : [],
          availableStock: stock,
          error: null,
        })
      } catch {
        if (active) setBatchResult({
          materialId,
          version: refreshVersion,
          batches: [],
          availableStock: null,
          error: 'Unable to load batches for the selected material.',
        })
      }
    }
    void loadBatches()
    return () => { active = false }
  }, [selectedMaterialId, refreshVersion])

  function fetchBatchData() {
    setRefreshVersion((version) => version + 1)
  }

  function handleMaterialChange(newId: number) {
    setSearchParams({ materialId: String(newId) })
  }

  const currentMaterial = materials.find((m) => m.materialId === selectedMaterialId)

  const { isFull } = usePermissions('materialBatches')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Material Batches & FIFO Queue"
        description="First-In, First-Out queue tracking, supplier lot numbers, and available batch weights."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => selectedMaterialId && fetchBatchData()}
              disabled={loadingBatches || !selectedMaterialId}
            >
              <RefreshCw className={`size-3.5 ${loadingBatches ? 'animate-spin' : ''}`} aria-hidden="true" />
              Refresh
            </Button>
            {isFull && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsReceiveModalOpen(true)}
              >
                <PackagePlus className="size-3.5" aria-hidden="true" />
                Receive New Batch
              </Button>
            )}
          </div>
        }
      />

      {/* Material Selector Bar */}
      <Card>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 flex-1 flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:gap-3">
            <label htmlFor="material-select" className="text-xs font-semibold uppercase tracking-wider text-slate-500 shrink-0">
              Select Material:
            </label>
            {loadingMaterials ? (
              <LoadingSpinner label="Loading catalog..." size="sm" />
            ) : (
              <select
                id="material-select"
                value={selectedMaterialId || ''}
                onChange={(e) => handleMaterialChange(Number(e.target.value))}
                className="w-full max-w-md rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 outline-none focus:border-accent-700 focus:ring-1 focus:ring-accent-700"
              >
                {materials.map((m) => (
                  <option key={m.materialId} value={m.materialId}>
                    {m.materialCode} — {m.materialName} ({m.categoryName || 'Raw'})
                  </option>
                ))}
              </select>
            )}
          </div>

          {currentMaterial && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600">
              <span>
                Reorder Level:{' '}
                <strong className="text-slate-900 font-mono">
                  {Number(currentMaterial.reorderLevel).toLocaleString()} {currentMaterial.defaultUomCode || 'KG'}
                </strong>
              </span>
              <span>
                Safety Stock:{' '}
                <strong className="text-slate-900 font-mono">
                  {Number(currentMaterial.safetyStock).toLocaleString()} {currentMaterial.defaultUomCode || 'KG'}
                </strong>
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Available Net Stock</p>
            <Layers className="size-4 text-slate-400" aria-hidden="true" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {availableStock !== null ? `${Number(availableStock).toLocaleString()} KG` : '—'}
          </p>
          <p className="mt-1 text-xs text-slate-500">Unreserved on-hand balance in bins</p>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">FIFO Batches In Queue</p>
            <Clock className="size-4 text-accent-700" aria-hidden="true" />
          </div>
          <p className="mt-2 text-2xl font-bold text-accent-700">
            {loadingBatches ? '—' : batches.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">Available for production allocation</p>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">FIFO Oldest Batch</p>
            <CheckCircle2 className="size-4 text-emerald-500" aria-hidden="true" />
          </div>
          <p className="mt-2 text-lg font-mono font-bold text-slate-900 truncate">
            {loadingBatches ? '—' : batches[0]?.batchNo || 'None'}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {batches[0]?.receivedAt
              ? `Received ${new Date(batches[0].receivedAt).toLocaleDateString()}`
              : 'No active queue'}
          </p>
        </Card>
      </div>

      {/* Main Table / State */}
      {loadingBatches ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner label="Fetching FIFO batches queue..." size="lg" />
        </div>
      ) : error ? (
        <ErrorState
          title="Error Loading Batches"
          description={error}
          onRetry={() => selectedMaterialId && fetchBatchData()}
          retryLabel="Try again"
        />
      ) : batches.length === 0 ? (
        <EmptyState
          icon={<AlertCircle className="size-10 text-amber-500" />}
          title="No Available Batches"
          description={`There are currently no active batches in stock for ${
            currentMaterial?.materialName || 'the selected material'
          }. Receive new material to replenish stock.`}
          action={
            <Button variant="secondary" size="sm" disabled>
              <PackagePlus className="size-3.5" aria-hidden="true" />
              Material Intake (Day 2)
            </Button>
          }
        />
      ) : (
        <Card className="overflow-hidden" contentClassName="p-0 sm:p-0">
          <div className="max-w-full overflow-x-auto overscroll-x-contain" tabIndex={0} role="region" aria-label="Scrollable data table">
            <table className="w-full min-w-[48rem] border-collapse text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="px-5 py-3 text-center">FIFO Queue</th>
                  <th className="px-5 py-3">Batch Number</th>
                  <th className="px-5 py-3">Supplier Lot</th>
                  <th className="px-5 py-3 text-right">Available Weight</th>
                  <th className="px-5 py-3">Intake Timestamp</th>
                  <th className="px-5 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {batches.map((b, index) => {
                  const isOldest = index === 0
                  return (
                    <tr
                      key={b.batchId}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isOldest ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      <td className="px-5 py-3.5 text-center">
                        {isOldest ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                            ★ Pick First (#1)
                          </span>
                        ) : (
                          <span className="font-mono text-xs text-slate-500 font-semibold">
                            #{index + 1}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs font-bold text-slate-900">
                        {b.batchNo}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-600">
                        {b.lotNumber || '—'}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono font-semibold text-slate-900">
                        {Number(b.availableWeightKg).toLocaleString()} KG
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 text-xs">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="size-3.5 text-slate-400" aria-hidden="true" />
                          <span>
                            {b.receivedAt ? new Date(b.receivedAt).toLocaleString() : '—'}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <StatusBadge tone={isOldest ? 'success' : 'neutral'}>
                          {isOldest ? 'Active FIFO' : 'Queued'}
                        </StatusBadge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Material Receiving Intake Modal */}
      <MaterialReceivingModal
        isOpen={isReceiveModalOpen}
        onClose={() => setIsReceiveModalOpen(false)}
        initialMaterialId={selectedMaterialId}
        onSuccess={() => {
          if (selectedMaterialId) {
            fetchBatchData()
          }
        }}
      />
    </div>
  )
}

