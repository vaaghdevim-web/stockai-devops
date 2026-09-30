import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Boxes,
  Layers,
  PackageCheck,
  PackagePlus,
  RefreshCw,
  ShoppingCart,
  Tag,
} from 'lucide-react'
import { getAvailableStock, getFifoBatches, getRawMaterialById } from '../../api/inventoryApi'
import type { MaterialBatchResponse, RawMaterialResponse } from '../../types'
import { Button, Drawer, ErrorState, LoadingSpinner, StatusBadge } from '../common'
import { usePermissions } from '../../hooks/usePermissions'

export interface MaterialDetailsDrawerProps {
  materialId: number | null
  isOpen: boolean
  onClose: () => void
  onReceiveIntake?: (materialId: number) => void
  onViewBatches?: (materialId: number) => void
}

export function MaterialDetailsDrawer(props: MaterialDetailsDrawerProps) {
  if (!props.isOpen) return null
  return <MaterialDetailsContent key={props.materialId ?? 'empty'} {...props} />
}

function MaterialDetailsContent({
  materialId,
  isOpen,
  onClose,
  onReceiveIntake,
  onViewBatches,
}: MaterialDetailsDrawerProps) {
  const navigate = useNavigate()
  const [material, setMaterial] = useState<RawMaterialResponse | null>(null)
  const [availableStock, setAvailableStock] = useState<number | null>(null)
  const [fifoBatches, setFifoBatches] = useState<MaterialBatchResponse[]>([])
  const [loading, setLoading] = useState(Boolean(materialId))
  const [error, setError] = useState<string | null>(null)
  const [reloadVersion, setReloadVersion] = useState(0)

  function loadDetails() {
    setLoading(true)
    setError(null)
    setReloadVersion((version) => version + 1)
  }

  useEffect(() => {
    if (!materialId) return
    let active = true
    const id = materialId
    async function fetchDetails() {
      try {
        const [mat, stock, batches] = await Promise.all([
          getRawMaterialById(id),
          getAvailableStock(id).catch(() => 0),
          getFifoBatches(id).catch(() => []),
        ])
        if (!active) return
        setMaterial(mat)
        setAvailableStock(stock)
        setFifoBatches(Array.isArray(batches) ? batches : [])
      } catch {
        if (active) setError('Unable to load technical specifications for this raw material.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void fetchDetails()
    return () => { active = false }
  }, [materialId, reloadVersion])

  // Stock status determination
  const stock = availableStock ?? 0
  const reorder = material ? Number(material.reorderLevel) : 0
  const safety = material ? Number(material.safetyStock) : 0

  let stockStatus: { tone: 'success' | 'warning' | 'danger'; label: string; description: string } = {
    tone: 'success',
    label: 'Healthy Stock Level',
    description: 'Inventory is comfortably above reorder and safety thresholds.',
  }

  if (stock <= safety) {
    stockStatus = {
      tone: 'danger',
      label: 'Critical: Safety Stock Breach',
      description: 'Stock has fallen below the safety reserve buffer. Immediate procurement required.',
    }
  } else if (stock <= reorder) {
    stockStatus = {
      tone: 'warning',
      label: 'Attention: Reorder Trigger Reached',
      description: 'Stock is below the reorder threshold. Replenishment PO should be triggered.',
    }
  }

  const { canReceive } = usePermissions('rawMaterials')
  const valuation = stock * (material ? Number(material.standardCost) : 0)

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title={
        <div className="flex items-center gap-2">
          <Boxes className="size-5 text-slate-700 shrink-0" aria-hidden="true" />
          <span className="truncate">{material?.materialName || 'Material Details'}</span>
        </div>
      }
      description={
        material ? (
          <div className="flex items-center gap-2 mt-1">
            <span className="font-mono text-xs font-semibold text-slate-700">{material.materialCode}</span>
            <span className="text-slate-300">•</span>
            <span>{material.categoryName || 'General Polymer'}</span>
            <span className="text-slate-300">•</span>
            <StatusBadge tone={material.active ? 'success' : 'neutral'}>
              {material.active ? 'Active' : 'Inactive'}
            </StatusBadge>
          </div>
        ) : undefined
      }
      footer={
        material && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                onClose()
                onViewBatches?.(material.materialId)
              }}
            >
              <Layers className="size-3.5" aria-hidden="true" />
              View FIFO Batches
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={onClose}>
                Close
              </Button>
              {canReceive && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    onClose()
                    onReceiveIntake?.(material.materialId)
                  }}
                >
                  <PackagePlus className="size-3.5" aria-hidden="true" />
                  Receive Intake
                </Button>
              )}
            </div>
          </div>
        )
      }
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <LoadingSpinner label="Loading technical specifications & genealogy..." size="lg" />
        </div>
      ) : error ? (
        <ErrorState
          title="Specification Load Error"
          description={error}
          onRetry={() => materialId && loadDetails()}
          retryLabel="Retry"
        />
      ) : material ? (
        <div className="space-y-6">
          {/* Section 1: Stock Status & Valuation Banner */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Current Available Stock
                </span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-mono text-3xl font-extrabold text-slate-900">
                    {stock.toLocaleString()}
                  </span>
                  <span className="text-sm font-semibold text-slate-600">
                    {material.defaultUomCode || 'KG'}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <StatusBadge tone={stockStatus.tone}>{stockStatus.label}</StatusBadge>
                <p className="mt-1.5 font-mono text-sm font-bold text-slate-900">
                  ₹{valuation.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-[11px] text-slate-500">Valuation on hand</p>
              </div>
            </div>

            <p className="mt-3 text-xs text-slate-600">{stockStatus.description}</p>

            {/* Threshold Visual Progress Bar */}
            <div className="mt-4 space-y-1.5">
              <div className="flex justify-between text-xs text-slate-600">
                <span>Safety: {safety.toLocaleString()} {material.defaultUomCode || 'KG'}</span>
                <span>Reorder Point: {reorder.toLocaleString()} {material.defaultUomCode || 'KG'}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className={`h-full transition-all ${
                    stockStatus.tone === 'danger'
                      ? 'bg-red-500'
                      : stockStatus.tone === 'warning'
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{
                    width: `${Math.min(100, Math.max(8, reorder > 0 ? (stock / (reorder * 1.5)) * 100 : 50))}%`,
                  }}
                />
              </div>
            </div>

            {/* Replenishment Procurement Shortcut */}
            {(stockStatus.tone === 'danger' || stockStatus.tone === 'warning') && (
              <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                <span className="font-medium">Inventory is below safety buffer. Trigger replenishment?</span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    onClose()
                    navigate(`/procurement/reorder-recommendations?search=${encodeURIComponent(material.materialCode)}`)
                  }}
                  className="bg-white text-amber-900 border-amber-300 hover:bg-amber-100 text-xs shrink-0"
                >
                  <ShoppingCart className="size-3.5" aria-hidden="true" />
                  View Reorder Recommendation
                </Button>
              </div>
            )}
          </div>

          {/* Section 2: Polymer Technical Specifications */}
          <div className="space-y-3">
            <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
              <Tag className="size-4 text-slate-500" aria-hidden="true" />
              Technical & Master Specifications
            </h3>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <span className="text-xs text-slate-500">Polymer Code</span>
                <p className="mt-1 font-mono text-sm font-bold text-slate-900">{material.materialCode}</p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <span className="text-xs text-slate-500">Polymer Category</span>
                <p className="mt-1 text-sm font-semibold text-slate-900">{material.categoryName || 'General'}</p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <span className="text-xs text-slate-500">Unit of Measure</span>
                <p className="mt-1 text-sm font-bold text-slate-900">{material.defaultUomCode || 'KG'}</p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <span className="text-xs text-slate-500">Standard Cost</span>
                <p className="mt-1 font-mono text-sm font-bold text-slate-900">
                  ₹{Number(material.standardCost).toFixed(2)} / {material.defaultUomCode || 'KG'}
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <span className="text-xs text-slate-500">Supplier Lead Time</span>
                <p className="mt-1 text-sm font-bold text-slate-900">{material.leadTimeDays} Days</p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <span className="text-xs text-slate-500">Compounding Status</span>
                <p className="mt-1 text-sm font-bold text-emerald-600">
                  {material.active ? 'Approved for Production' : 'Restricted / Inactive'}
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Batch Genealogy & FIFO Queue */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
                <PackageCheck className="size-4 text-slate-500" aria-hidden="true" />
                Batch Genealogy & Active FIFO Lots ({fifoBatches.length})
              </h3>
              <button
                type="button"
                onClick={() => materialId && loadDetails()}
                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
                title="Refresh batch genealogy"
              >
                <RefreshCw className="size-3" aria-hidden="true" />
                Refresh
              </button>
            </div>

            {fifoBatches.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/50 p-6 text-center">
                <Boxes className="mx-auto size-8 text-slate-400" aria-hidden="true" />
                <p className="mt-2 text-sm font-medium text-slate-700">No active batches in inventory</p>
                <p className="mt-1 text-xs text-slate-500">
                  No FIFO batches currently registered for this material.
                </p>
                {canReceive && (
                  <div className="mt-3">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        onClose()
                        onReceiveIntake?.(material.materialId)
                      }}
                    >
                      <PackagePlus className="size-3.5" aria-hidden="true" />
                      Record First Intake
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto overscroll-x-contain rounded-lg border border-slate-200">
                <table className="w-full min-w-[36rem] border-collapse text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 font-semibold uppercase tracking-wider text-slate-600">
                    <tr>
                      <th className="px-3.5 py-2.5">Batch Code</th>
                      <th className="px-3.5 py-2.5">Vendor Lot</th>
                      <th className="px-3.5 py-2.5 text-right">Available Weight</th>
                      <th className="px-3.5 py-2.5 text-center">Received Date</th>
                      <th className="px-3.5 py-2.5 text-center">FIFO Queue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {fifoBatches.map((b, idx) => {
                      const isFirst = idx === 0
                      return (
                        <tr key={b.batchId} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-3.5 py-2.5 font-mono font-bold text-slate-900">{b.batchNo}</td>
                          <td className="px-3.5 py-2.5 font-mono text-slate-600">{b.lotNumber || '—'}</td>
                          <td className="px-3.5 py-2.5 text-right font-mono font-bold text-slate-900">
                            {Number(b.availableWeightKg).toLocaleString()} KG
                          </td>
                          <td className="px-3.5 py-2.5 text-center text-slate-500">
                            {b.receivedAt ? new Date(b.receivedAt).toLocaleDateString() : '—'}
                          </td>
                          <td className="px-3.5 py-2.5 text-center">
                            <StatusBadge tone={isFirst ? 'success' : 'neutral'}>
                              {isFirst ? '1st to Consume' : `Position #${idx + 1}`}
                            </StatusBadge>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </Drawer>
  )
}
