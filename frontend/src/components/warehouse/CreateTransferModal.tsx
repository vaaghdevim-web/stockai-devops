import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  Boxes,
  CheckCircle2,
  Factory,
  Layers,
  RefreshCw,
  Send,
  Warehouse,
} from 'lucide-react'
import { getFifoBatches, getRawMaterials } from '../../api/inventoryApi'
import { createTransfer } from '../../api/transferApi'
import type {
  MaterialBatchResponse,
  RawMaterialResponse,
  StockTransferRequest,
  StockTransferResponse,
} from '../../types'
import { Button, Modal } from '../common'

export interface CreateTransferModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (transfer: StockTransferResponse) => void
}

import { MASTER_WAREHOUSES, MASTER_BINS } from './warehouseConstants'

export function CreateTransferModal(props: CreateTransferModalProps) {
  return props.isOpen ? <CreateTransferForm {...props} /> : null
}

function CreateTransferForm({
  isOpen,
  onClose,
  onSuccess,
}: CreateTransferModalProps) {
  // Master data
  const [materials, setMaterials] = useState<RawMaterialResponse[]>([])
  const [loadingMaterials, setLoadingMaterials] = useState(true)
  const [batches, setBatches] = useState<MaterialBatchResponse[]>([])
  const [loadingBatches, setLoadingBatches] = useState(false)

  // Form state
  const [fromWarehouseId, setFromWarehouseId] = useState<number>(1)
  const [toWarehouseId, setToWarehouseId] = useState<number>(2)
  const [selectedMaterialId, setSelectedMaterialId] = useState<number | ''>('')
  const [selectedBatchId, setSelectedBatchId] = useState<number | ''>('')
  const [fromBinId, setFromBinId] = useState<number>(1)
  const [toBinId, setToBinId] = useState<number>(2)
  const [quantity, setQuantity] = useState<string>('')
  const [autoComplete, setAutoComplete] = useState<boolean>(false)

  // Submission state
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successTransfer, setSuccessTransfer] = useState<StockTransferResponse | null>(null)

  useEffect(() => {
    let active = true
    getRawMaterials().then(data => {
      if (!active) return
      const list = data.filter(item => item.active)
      setMaterials(list)
      setSelectedMaterialId(list[0]?.materialId ?? '')
      setLoadingBatches(Boolean(list.length))
    }).catch(() => { if (active) setErrorMessage('Failed to load raw materials catalog from server.') })
      .finally(() => { if (active) setLoadingMaterials(false) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!selectedMaterialId) return
    let active = true
    getFifoBatches(Number(selectedMaterialId)).then(data => {
      if (!active) return
      setBatches(data)
      setSelectedBatchId(data[0]?.batchId ?? '')
    }).catch(() => { if (active) setErrorMessage('Failed to load material batches.') })
      .finally(() => { if (active) setLoadingBatches(false) })
    return () => { active = false }
  }, [selectedMaterialId])

  // Get active batch stock details
  const activeBatch = useMemo(() => {
    if (!selectedBatchId) return null
    return batches.find((b) => b.batchId === Number(selectedBatchId)) || null
  }, [batches, selectedBatchId])

  // Available bins for source & destination
  const sourceBins = useMemo(() => {
    return MASTER_BINS.filter((b) => b.warehouseId === fromWarehouseId)
  }, [fromWarehouseId])

  // Validation
  const validationError = useMemo(() => {
    if (fromWarehouseId === toWarehouseId) {
      return 'Source warehouse and destination warehouse cannot be the same.'
    }
    if (!selectedMaterialId) {
      return 'Please select a raw material to transfer.'
    }
    if (!selectedBatchId) {
      return 'Please select an available inventory batch.'
    }
    if (!fromBinId) {
      return 'Source bin is required.'
    }
    if (!toBinId) {
      return 'Destination bin is required.'
    }
    const numQty = parseFloat(quantity)
    if (!quantity || isNaN(numQty) || numQty <= 0) {
      return 'Please enter a valid transfer quantity greater than 0.'
    }
    if (activeBatch && typeof activeBatch.availableWeightKg === 'number' && numQty > activeBatch.availableWeightKg) {
      return `Transfer quantity (${numQty.toLocaleString()} kg) exceeds batch available stock (${activeBatch.availableWeightKg.toLocaleString()} kg).`
    }
    return null
  }, [fromWarehouseId, toWarehouseId, selectedMaterialId, selectedBatchId, fromBinId, toBinId, quantity, activeBatch])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (validationError) {
      setErrorMessage(validationError)
      return
    }

    setSubmitting(true)
    setErrorMessage(null)

    const payload: StockTransferRequest = {
      fromWarehouseId,
      toWarehouseId,
      transferDate: new Date().toISOString().slice(0, 10),
      autoComplete,
      items: [
        {
          materialBatchId: Number(selectedBatchId),
          fromBinId,
          toBinId,
          quantity: parseFloat(quantity),
          uomCode: 'KGS',
        },
      ],
    }

    try {
      const response = await createTransfer(payload)
      setSuccessTransfer(response)
      if (onSuccess) {
        onSuccess(response)
      }
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } } }
      const msg = apiErr.response?.data?.message || 'Failed to create stock transfer. Please check connection and stock availability.'
      setErrorMessage(msg)
    } finally {
      setSubmitting(false)
    }
  }

  function handleReset() {
    setSuccessTransfer(null)
    setErrorMessage(null)
    setQuantity('')
    setAutoComplete(false)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title={
        <div className="flex items-center gap-2">
          <Warehouse className="size-5 text-indigo-600" aria-hidden="true" />
          <span>New Inter-Warehouse Stock Transfer</span>
        </div>
      }
      description="Transfer raw materials or finished goods between plant storage units and staging bins."
    >
      {successTransfer ? (
        <div className="space-y-6 py-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="size-8" aria-hidden="true" />
            </div>
            <h3 className="mt-3 text-lg font-bold text-emerald-900">
              Stock Transfer Created Successfully
            </h3>
            <p className="mt-1 text-sm text-emerald-700">
              Transfer Document Number: <span className="font-mono font-bold text-emerald-950">{successTransfer.transferNumber}</span>
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-white px-3 py-1 text-xs font-semibold text-emerald-800">
              Status: <span className="uppercase">{successTransfer.status}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs sm:grid-cols-2">
            <div>
              <span className="text-slate-500">Source Warehouse:</span>
              <p className="font-semibold text-slate-800">{successTransfer.fromWarehouseName || `Warehouse #${successTransfer.fromWarehouseId}`}</p>
            </div>
            <div>
              <span className="text-slate-500">Destination Warehouse:</span>
              <p className="font-semibold text-slate-800">{successTransfer.toWarehouseName || `Warehouse #${successTransfer.toWarehouseId}`}</p>
            </div>
            <div>
              <span className="text-slate-500">Transfer Date:</span>
              <p className="font-semibold text-slate-800">{successTransfer.transferDate}</p>
            </div>
            <div>
              <span className="text-slate-500">Items Count:</span>
              <p className="font-semibold text-slate-800">{successTransfer.items?.length || 0} line item(s)</p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={handleReset}>
              <RefreshCw className="size-4" aria-hidden="true" />
              Transfer Another Batch
            </Button>
            <Button variant="primary" onClick={onClose}>
              Done & View Transfers
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {errorMessage && (
            <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              <AlertCircle className="size-5 shrink-0 text-rose-600 mt-0.5" aria-hidden="true" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {/* Warehouse Route Card */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
              <Factory className="size-4 text-slate-500" aria-hidden="true" />
              Transfer Route Configuration
            </h4>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* From Warehouse */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Source Warehouse <span className="text-rose-500">*</span>
                </label>
                <select
                  value={fromWarehouseId}
                  onChange={(e) => { const id = Number(e.target.value); setFromWarehouseId(id); setFromBinId(MASTER_BINS.find(bin => bin.warehouseId === id)?.id ?? 0) }}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                >
                  {MASTER_WAREHOUSES.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.type})
                    </option>
                  ))}
                </select>
              </div>

              {/* To Warehouse */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Destination Warehouse <span className="text-rose-500">*</span>
                </label>
                <select
                  value={toWarehouseId}
                  onChange={(e) => setToWarehouseId(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                >
                  {MASTER_WAREHOUSES.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.type})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {fromWarehouseId === toWarehouseId && (
              <p className="mt-2 text-xs font-medium text-rose-600 flex items-center gap-1">
                <AlertCircle className="size-3.5" aria-hidden="true" />
                Source and destination warehouses cannot be the same.
              </p>
            )}
          </div>

          {/* Material & Batch Selection */}
          <div className="space-y-4">
            <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
              <Boxes className="size-4 text-slate-500" aria-hidden="true" />
              Item & Inventory Batch
            </h4>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Material selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Raw Material <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedMaterialId}
                  onChange={(e) => { setSelectedMaterialId(e.target.value ? Number(e.target.value) : ''); setBatches([]); setSelectedBatchId(''); setLoadingBatches(Boolean(e.target.value)); setErrorMessage(null) }}
                  disabled={loadingMaterials}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100"
                >
                  {loadingMaterials ? (
                    <option>Loading materials...</option>
                  ) : materials.length === 0 ? (
                    <option>No active raw materials found</option>
                  ) : (
                    materials.map((m) => (
                      <option key={m.materialId} value={m.materialId}>
                        {m.materialCode} — {m.materialName}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Batch selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Available Batch (FIFO Queue) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value ? Number(e.target.value) : '')}
                  disabled={loadingBatches || batches.length === 0}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100"
                >
                  {loadingBatches ? (
                    <option>Loading available batches...</option>
                  ) : batches.length === 0 ? (
                    <option value="">No batches available in inventory</option>
                  ) : (
                    batches.map((b) => (
                      <option key={b.batchId} value={b.batchId}>
                        {b.batchNo} — Stock: {b.availableWeightKg.toLocaleString()} kg
                      </option>
                    ))
                  )}
                </select>
                {activeBatch && (
                  <p className="mt-1 text-xs text-indigo-700 flex items-center gap-1 font-medium">
                    <Layers className="size-3.5" aria-hidden="true" />
                    Available in FIFO queue: <span className="font-bold">{activeBatch.availableWeightKg.toLocaleString()} kg</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Location Bins Selection */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* From Bin */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Source Bin <span className="text-rose-500">*</span>
              </label>
              <select
                value={fromBinId}
                onChange={(e) => setFromBinId(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              >
                {sourceBins.map((bin) => (
                  <option key={bin.id} value={bin.id}>
                    {bin.code} ({bin.label})
                  </option>
                ))}
              </select>
            </div>

            {/* To Bin */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Destination Bin <span className="text-rose-500">*</span>
              </label>
              <select
                value={toBinId}
                onChange={(e) => setToBinId(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              >
                {MASTER_BINS.map((bin) => (
                  <option key={bin.id} value={bin.id}>
                    {bin.code} ({bin.label})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quantity & Auto-complete */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 items-start">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Transfer Quantity (KGS) <span className="text-rose-500">*</span>
                </label>
                {activeBatch && typeof activeBatch.availableWeightKg === 'number' && activeBatch.availableWeightKg > 0 && (
                  <button
                    type="button"
                    onClick={() => setQuantity(String(activeBatch.availableWeightKg))}
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                  >
                    Transfer Max ({activeBatch.availableWeightKg.toLocaleString()} kg)
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="e.g. 500"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className={`w-full rounded-lg border bg-white pl-3 pr-14 py-2 text-sm text-slate-900 shadow-xs focus:outline-hidden focus:ring-1 ${
                    activeBatch && parseFloat(quantity) > activeBatch.availableWeightKg
                      ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500'
                      : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-500'
                  }`}
                />
                <span className="absolute inset-y-0 right-3 flex items-center text-xs font-bold text-slate-400">
                  KGS
                </span>
              </div>

              {activeBatch && parseFloat(quantity) > activeBatch.availableWeightKg && (
                <p className="mt-1 text-xs font-medium text-rose-600 flex items-center gap-1">
                  <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
                  Exceeds batch available stock ({activeBatch.availableWeightKg.toLocaleString()} kg)
                </p>
              )}

              <div className="mt-1.5 flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400 font-medium">Presets:</span>
                {[50, 200, 500, 1000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setQuantity(String(preset))}
                    className="rounded bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-600 transition-colors cursor-pointer"
                  >
                    {preset}kg
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoComplete}
                  onChange={(e) => setAutoComplete(e.target.checked)}
                  className="size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs font-medium text-slate-800">
                  Auto-complete transfer immediately
                </span>
              </label>
              <p className="mt-1 text-[11px] text-slate-500 pl-6.5">
                Debits source bin and credits destination immediately without a secondary draft review step.
              </p>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-between border-t border-slate-200 pt-4">
            <Button variant="secondary" type="button" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={submitting || !!validationError || !selectedBatchId}
            >
              {submitting ? (
                <>
                  <RefreshCw className="size-4 animate-spin" aria-hidden="true" />
                  Creating Transfer...
                </>
              ) : (
                <>
                  <Send className="size-4" aria-hidden="true" />
                  {autoComplete ? 'Execute Direct Transfer' : 'Create Transfer Draft'}
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
