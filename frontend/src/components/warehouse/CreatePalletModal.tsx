import { useMemo, useState } from 'react'
import {
  AlertCircle,
  Barcode,
  Boxes,
  CheckCircle2,
  Copy,
  Layers,
  Printer,
  RefreshCw,
} from 'lucide-react'
import { createPallet } from '../../api/palletApi'
import type { CreatePalletRequest, PalletResponse } from '../../types'
import { Button, Modal } from '../common'
import { printPalletDocument } from '../../utils/palletPrintUtil'
import { PalletBarcodeCard } from './PalletBarcodeCard'

export interface CreatePalletModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (pallet: PalletResponse) => void
}

// Finished batch catalog from master seed
const FINISHED_BATCHES = [
  {
    id: 1,
    batchNo: 'FB-2026-BAG-01',
    productName: '50KG PP Fertilizer Bag',
    productCode: 'FP-BAG-50KG-01',
    uom: 'BAGS',
  },
]

const FG_WAREHOUSES = [
  { id: 3, name: 'Unit 3 Finished Goods Warehouse', type: 'FG' },
  { id: 2, name: 'Unit 2 Extrusion & Weaving WIP Warehouse', type: 'Both' },
]

const FG_BINS = [
  { id: 5, warehouseId: 3, code: 'BIN-U3-01', label: 'Unit 3 — Rack 03 / Shelf 01' },
  { id: 6, warehouseId: 3, code: 'BIN-U3-02', label: 'Unit 3 — Rack 03 / Shelf 01' },
  { id: 7, warehouseId: 3, code: 'BIN-U3-03', label: 'Unit 3 — Rack 03 / Shelf 02' },
]

export function CreatePalletModal({
  isOpen,
  onClose,
  onSuccess,
}: CreatePalletModalProps) {
  // Form state
  const [finishedBatchId, setFinishedBatchId] = useState<number>(1)
  const [warehouseId, setWarehouseId] = useState<number>(3)
  const [binId, setBinId] = useState<number>(5)
  const [quantity, setQuantity] = useState<string>('500')

  // UI state
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [createdPallet, setCreatedPallet] = useState<PalletResponse | null>(null)
  const [copied, setCopied] = useState(false)

  // Validation
  const validationError = useMemo(() => {
    if (!finishedBatchId) return 'Please select a finished product batch.'
    if (!warehouseId) return 'Target warehouse is required.'
    const numQty = parseFloat(quantity)
    if (!quantity || isNaN(numQty) || numQty <= 0) {
      return 'Please enter a valid pallet packaging quantity (e.g. 500 bags).'
    }
    return null
  }, [finishedBatchId, warehouseId, quantity])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (validationError) {
      setErrorMessage(validationError)
      return
    }

    setSubmitting(true)
    setErrorMessage(null)

    const payload: CreatePalletRequest = {
      finishedBatchId,
      warehouseId,
      binId: binId || null,
      quantity: parseFloat(quantity),
    }

    try {
      const response = await createPallet(payload)
      setCreatedPallet(response)
      if (onSuccess) {
        onSuccess(response)
      }
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } } }
      const msg =
        apiErr.response?.data?.message ||
        'Failed to generate pallet record. Please check backend connection.'
      setErrorMessage(msg)
    } finally {
      setSubmitting(false)
    }
  }

  function handleReset() {
    setCreatedPallet(null)
    setErrorMessage(null)
    setQuantity('500')
    setCopied(false)
  }

  function handleCopyBarcode() {
    if (createdPallet?.barcode) {
      navigator.clipboard.writeText(createdPallet.barcode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  function handlePrintLabel() {
    if (!createdPallet) return
    printPalletDocument({
      companyName: 'Sri Vidha Polymers',
      unitNumber: warehouseId === 1 ? 'Unit 1' : 'Unit 3',
      barcode: createdPallet.barcode,
      palletCode: createdPallet.palletCode,
      palletId: createdPallet.palletId,
      quantity: createdPallet.quantity,
      uom: 'BAGS',
      binCode: 'BIN-U3-01',
      warehouseName: warehouseId === 1 ? 'Unit 1 Raw Material Warehouse' : 'Unit 3 Finished Goods Warehouse',
      storageCoordinates: 'Rack 03 / Shelf 01 (Bay B-02)',
      batchNo: selectedBatch?.batchNo || 'FB-2026-BAG-01',
      productName: selectedBatch?.productName || '50KG PP Fertilizer Bag',
      productCode: selectedBatch?.productCode || 'FP-BAG-50KG-01',
      qaStatus: 'Not recorded',
    })
  }

  const selectedBatch = FINISHED_BATCHES.find((b) => b.id === finishedBatchId)

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={
        <div className="flex items-center gap-2">
          <Boxes className="size-5 text-indigo-600" aria-hidden="true" />
          <span>Build Finished Goods Pallet</span>
        </div>
      }
      description="Pack finished product units onto a standardized pallet, assign a warehouse bin, and generate a Code-128 barcode."
    >
      {createdPallet ? (
        <div className="space-y-6 py-2">
          {/* Success Banner */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="size-7" aria-hidden="true" />
            </div>
            <h3 className="mt-2 text-base font-bold text-emerald-900">
              Pallet Generated & Barcoded
            </h3>
            <p className="text-xs text-emerald-700">
              Pallet has been assigned status <span className="font-bold uppercase">OPEN</span> in finished goods inventory.
            </p>
          </div>

          {/* Printable Barcode Label Card with Cutting Line & Additional Info */}
          <PalletBarcodeCard
            pallet={createdPallet}
            companyName="Sri Vidha Polymers"
            unitNumber={warehouseId === 1 ? 'Unit 1' : 'Unit 3'}
            binCode="BIN-U3-01"
            warehouseName={warehouseId === 1 ? 'Unit 1 Raw Material Warehouse' : 'Unit 3 Finished Goods Warehouse'}
            batchNo={selectedBatch?.batchNo || 'FB-2026-BAG-01'}
            productName={selectedBatch?.productName || '50KG PP Fertilizer Bag'}
            productCode={selectedBatch?.productCode || 'FP-BAG-50KG-01'}
            storageCoordinates="Rack 03 / Shelf 01 (Bay B-02)"
            showAdditionalInfo={true}
          />

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={handleCopyBarcode}>
                <Copy className="size-3.5" aria-hidden="true" />
                {copied ? 'Copied!' : 'Copy Barcode'}
              </Button>
              <Button variant="secondary" size="sm" onClick={handlePrintLabel}>
                <Printer className="size-3.5" aria-hidden="true" />
                Print Label
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={handleReset}>
                <RefreshCw className="size-3.5" aria-hidden="true" />
                Build Another
              </Button>
              <Button variant="primary" size="sm" onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {errorMessage && (
            <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800">
              <AlertCircle className="size-4 shrink-0 text-rose-600 mt-0.5" aria-hidden="true" />
              <div className="font-medium">{errorMessage}</div>
            </div>
          )}

          {/* Finished Goods Batch Selection */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              <Layers className="size-4 text-slate-500" aria-hidden="true" />
              Finished Product Batch <span className="text-rose-500">*</span>
            </label>
            <select
              value={finishedBatchId}
              onChange={(e) => setFinishedBatchId(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            >
              {FINISHED_BATCHES.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.batchNo} — {b.productName} ({b.productCode})
                </option>
              ))}
            </select>
          </div>

          {/* Warehouse and Bin Selection */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Finished Goods Warehouse <span className="text-rose-500">*</span>
              </label>
              <select
                value={warehouseId}
                onChange={(e) => setWarehouseId(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              >
                {FG_WAREHOUSES.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Storage Staging Bin
              </label>
              <select
                value={binId}
                onChange={(e) => setBinId(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              >
                {FG_BINS.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code} ({b.label})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Packaging Quantity (Bags per Pallet) <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Packaging Quantity (Bags per Pallet) <span className="text-rose-500">*</span>
              </label>
              {parseFloat(quantity) > 0 && (
                <span className="text-[11px] font-mono font-medium text-indigo-700">
                  Gross: {(parseFloat(quantity) * 50).toLocaleString()} kg ({(parseFloat(quantity) * 50 / 1000).toFixed(1)} MT)
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type="number"
                min="1"
                step="1"
                placeholder="e.g. 500"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white pl-3 pr-16 py-2 text-sm text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              />
              <span className="absolute inset-y-0 right-3 flex items-center text-xs font-bold text-slate-400">
                BAGS
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              Standard industrial PP bag pallet configuration: 500 or 1,000 units per wooden pallet.
            </p>

            <div className="mt-1.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400 font-medium">Standard:</span>
                {[250, 500, 1000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setQuantity(String(preset))}
                    className="rounded bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-600 transition-colors cursor-pointer"
                  >
                    {preset} Bags
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400">50kg standard PP woven bags</p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between border-t border-slate-200 pt-4">
            <Button variant="secondary" type="button" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={submitting || !!validationError}
            >
              {submitting ? (
                <>
                  <RefreshCw className="size-4 animate-spin" aria-hidden="true" />
                  Generating Pallet & Barcode...
                </>
              ) : (
                <>
                  <Barcode className="size-4" aria-hidden="true" />
                  Generate Pallet Record
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
