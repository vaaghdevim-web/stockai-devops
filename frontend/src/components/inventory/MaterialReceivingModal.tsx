import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Coins,
  Hash,
  Package,
  RefreshCw,
  Scale,
  ShieldAlert,
  Warehouse,
} from 'lucide-react'
import { getRawMaterials, receiveRawMaterial } from '../../api/inventoryApi'
import type {
  QualityStatus,
  RawMaterialReceiptRequest,
  RawMaterialReceiptResponse,
  RawMaterialResponse,
} from '../../types'
import { Button, Modal } from '../common'

export interface MaterialReceivingModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (response: RawMaterialReceiptResponse) => void
  initialMaterialId?: number | null
}

const WAREHOUSE_BINS = [
  { id: 1, code: 'BIN-U1-01', location: 'Unit 1 Raw Material — Rack 01 / Shelf 01' },
  { id: 2, code: 'BIN-U1-02', location: 'Unit 1 Raw Material — Rack 01 / Shelf 01' },
]

const SUPPLIERS = [
  { id: 1, name: 'Indian Oil Corporation Limited (IOCL)' },
  { id: 2, name: 'Mangalore Refinery & Petrochemicals Limited (MRPL)' },
  { id: 3, name: 'Reliance Industries Limited (RIL)' },
  { id: 4, name: 'Colorplas Polyadditives LLP' },
  { id: 5, name: 'Sri Vasavi Pigments (P) Ltd' },
  { id: 6, name: 'Growel Processors Private Limited' },
]

function generateBatchCode(): string {
  const now = new Date()
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '')
  const timePart = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`
  const rand = Math.floor(100 + Math.random() * 900)
  return `BATCH-${datePart}-${timePart}${rand}`
}

export function MaterialReceivingModal(props: MaterialReceivingModalProps) {
  if (!props.isOpen) return null
  return <MaterialReceivingForm key={props.initialMaterialId ?? 'default'} {...props} />
}

function MaterialReceivingForm({
  isOpen,
  onClose,
  onSuccess,
  initialMaterialId,
}: MaterialReceivingModalProps) {
  const [materials, setMaterials] = useState<RawMaterialResponse[]>([])
  const [loadingMaterials, setLoadingMaterials] = useState(true)

  // Form states
  const [materialId, setMaterialId] = useState<number | ''>('')
  const [supplierId, setSupplierId] = useState<number | ''>('')
  const [binId, setBinId] = useState<number>(1)
  const [batchNo, setBatchNo] = useState<string>(generateBatchCode)
  const [lotNumber, setLotNumber] = useState<string>('')
  const [quantityKg, setQuantityKg] = useState<string>('')
  const [unitCost, setUnitCost] = useState<string>('')
  const [qualityStatus, setQualityStatus] = useState<QualityStatus>('Quarantine')
  const [expiryDate, setExpiryDate] = useState<string>('')

  // UI state
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successReceipt, setSuccessReceipt] = useState<RawMaterialReceiptResponse | null>(null)

  // Fetch materials whenever modal opens
  useEffect(() => {
    let active = true

    async function loadCatalog() {
      try {
        const data = await getRawMaterials()
        if (!active) return
        const activeList = Array.isArray(data) ? data.filter((m) => m.active) : []
        setMaterials(activeList)

        // Pre-select initial material or first active
        const targetId = initialMaterialId || (activeList.length > 0 ? activeList[0].materialId : '')
        setMaterialId(targetId)

        if (targetId) {
          const selected = activeList.find((m) => m.materialId === Number(targetId))
          if (selected) {
            setUnitCost(String(selected.standardCost))
          }
        }
      } catch {
        if (active) setErrorMessage('Failed to load active raw materials catalog.')
      } finally {
        if (active) setLoadingMaterials(false)
      }
    }

    void loadCatalog()
    return () => { active = false }
  }, [initialMaterialId])

  // Handle material selection change
  function handleMaterialSelect(newId: number) {
    setMaterialId(newId)
    const selected = materials.find((m) => m.materialId === newId)
    if (selected) {
      setUnitCost(String(selected.standardCost))
    }
  }

  const selectedMaterial = useMemo(
    () => materials.find((m) => m.materialId === Number(materialId)),
    [materials, materialId]
  )

  // Real-time valuation calculation
  const totalValuation = useMemo(() => {
    const qty = parseFloat(quantityKg) || 0
    const cost = parseFloat(unitCost) || 0
    return qty * cost
  }, [quantityKg, unitCost])

  // Form submission handler
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMessage(null)

    if (!materialId) {
      setErrorMessage('Please select a valid raw material.')
      return
    }

    const qty = parseFloat(quantityKg)
    if (isNaN(qty) || qty <= 0) {
      setErrorMessage('Please enter a valid received weight greater than 0 kg.')
      return
    }

    const cost = parseFloat(unitCost)
    if (isNaN(cost) || cost < 0) {
      setErrorMessage('Please enter a valid positive unit cost.')
      return
    }

    if (!batchNo.trim()) {
      setErrorMessage('Internal batch number is required.')
      return
    }

    const payload: RawMaterialReceiptRequest = {
      materialId: Number(materialId),
      binId,
      batchNo: batchNo.trim(),
      lotNumber: lotNumber.trim() || undefined,
      quantityKg: qty,
      unitCost: cost,
      qualityStatus,
      expiryDate: expiryDate ? expiryDate : undefined,
      supplierId: supplierId ? Number(supplierId) : undefined,
    }

    setSubmitting(true)
    try {
      const response = await receiveRawMaterial(payload)
      setSuccessReceipt(response)
      onSuccess?.(response)
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } }; message?: string }
      const serverMsg =
        errorObj.response?.data?.message ||
        errorObj.message ||
        'Failed to record material receipt. Please verify details.'
      setErrorMessage(serverMsg)
    } finally {
      setSubmitting(false)
    }
  }

  function handleResetForAnother() {
    setSuccessReceipt(null)
    setBatchNo(generateBatchCode())
    setLotNumber('')
    setQuantityKg('')
    setQualityStatus('Quarantine')
    setErrorMessage(null)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Warehouse className="size-5 text-slate-700" aria-hidden="true" />
          <span>Material Receiving Intake</span>
        </div>
      }
      description="Record incoming vendor shipment truck: weighbridge net weight, storage bin allocation, and quality state."
      size="lg"
    >
      {successReceipt ? (
        /* Success Confirmation View */
        <div className="space-y-5 py-2">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 p-5 text-center">
            <CheckCircle2 className="mx-auto size-12 text-emerald-600" aria-hidden="true" />
            <h3 className="mt-3 text-lg font-bold text-emerald-900">Shipment Received Successfully</h3>
            <p className="mt-1 text-sm text-emerald-700">
              New batch has been recorded into the warehouse inventory ledger.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3 text-left sm:grid-cols-4">
              <div className="rounded-md border border-emerald-200/60 bg-white p-3">
                <span className="text-xs text-slate-500">Batch Code</span>
                <p className="font-mono text-sm font-bold text-slate-900">{successReceipt.batchNo}</p>
              </div>
              <div className="rounded-md border border-emerald-200/60 bg-white p-3">
                <span className="text-xs text-slate-500">Net Weight</span>
                <p className="font-mono text-sm font-bold text-slate-900">
                  {Number(successReceipt.quantityKg).toLocaleString()} KG
                </p>
              </div>
              <div className="rounded-md border border-emerald-200/60 bg-white p-3">
                <span className="text-xs text-slate-500">Quality State</span>
                <p className="text-sm font-bold text-amber-700">{successReceipt.qualityStatus}</p>
              </div>
              <div className="rounded-md border border-emerald-200/60 bg-white p-3">
                <span className="text-xs text-slate-500">Transaction ID</span>
                <p className="font-mono text-sm font-bold text-slate-900">#{successReceipt.transactionId}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="secondary" size="md" onClick={handleResetForAnother}>
              Receive Another Intake
            </Button>
            <Button variant="primary" size="md" onClick={onClose}>
              Done / Close
            </Button>
          </div>
        </div>
      ) : (
        /* Intake Form */
        <form onSubmit={handleSubmit} className="space-y-5">
          {errorMessage && (
            <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-800">
              <AlertCircle className="size-4 shrink-0 mt-0.5 text-red-600" aria-hidden="true" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Section 1: Raw Material Catalog Selection */}
          <div className="space-y-1.5">
            <label htmlFor="materialId" className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Raw Material <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                id="materialId"
                value={materialId}
                onChange={(e) => handleMaterialSelect(Number(e.target.value))}
                disabled={loadingMaterials || submitting}
                required
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-xs focus:border-accent-700 focus:outline-none focus:ring-1 focus:ring-accent-700"
              >
                {loadingMaterials ? (
                  <option value="">Loading material catalog...</option>
                ) : (
                  materials.map((m) => (
                    <option key={m.materialId} value={m.materialId}>
                      {m.materialCode} — {m.materialName} ({m.categoryName || 'General'})
                    </option>
                  ))
                )}
              </select>
            </div>
            {selectedMaterial && (
              <p className="text-xs text-slate-500">
                UOM: <span className="font-medium text-slate-700">{selectedMaterial.defaultUomCode || 'KG'}</span> | Catalog Std Cost: <span className="font-medium text-slate-700">₹{Number(selectedMaterial.standardCost).toFixed(2)}/kg</span>
              </p>
            )}
          </div>

          {/* Section 2: Weight & Pricing */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="quantityKg" className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Intake Weight (KG) <span className="text-red-500">*</span>
                </label>
                {parseFloat(quantityKg) > 0 && (
                  <span className="text-[11px] font-medium text-slate-500">
                    ≈ {Math.round(parseFloat(quantityKg) / 25).toLocaleString()} bags (25kg)
                  </span>
                )}
              </div>
              <div className="relative mt-1.5 rounded-lg shadow-xs">
                <input
                  type="number"
                  id="quantityKg"
                  step="0.01"
                  min="0.01"
                  placeholder="e.g. 5000"
                  value={quantityKg}
                  onChange={(e) => setQuantityKg(e.target.value)}
                  disabled={submitting}
                  required
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 pl-9 text-sm text-slate-900 focus:border-accent-700 focus:outline-none focus:ring-1 focus:ring-accent-700"
                />
                <Scale className="pointer-events-none absolute left-3 top-3 size-4 text-slate-400" aria-hidden="true" />
              </div>

              {/* Quick Weight Presets */}
              <div className="mt-1.5 flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400 font-medium">Quick Presets:</span>
                {[1000, 2500, 5000, 10000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setQuantityKg(String(preset))}
                    className="rounded bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-700 transition-colors cursor-pointer"
                  >
                    {(preset / 1000).toFixed(preset % 1000 === 0 ? 0 : 1)} MT
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="unitCost" className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Unit Cost (₹ / KG) <span className="text-red-500">*</span>
              </label>
              <div className="relative mt-1.5 rounded-lg shadow-xs">
                <input
                  type="number"
                  id="unitCost"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                  disabled={submitting}
                  required
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 pl-9 text-sm text-slate-900 focus:border-accent-700 focus:outline-none focus:ring-1 focus:ring-accent-700"
                />
                <Coins className="pointer-events-none absolute left-3 top-3 size-4 text-slate-400" aria-hidden="true" />
              </div>
            </div>
          </div>

          {/* Total Valuation Summary Banner */}
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <div>
              <span className="text-xs font-medium text-slate-500">Estimated Total Intake Valuation</span>
              <p className="text-xs text-slate-400">Weight × Unit Cost</p>
            </div>
            <div className="text-right font-mono text-lg font-bold text-slate-900">
              ₹{totalValuation.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          {/* Section 3: Batch Identification & Lot Number */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="batchNo" className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Internal Batch Code <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setBatchNo(generateBatchCode())}
                  className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition-colors"
                  title="Generate new unique batch code"
                >
                  <RefreshCw className="size-3" aria-hidden="true" />
                  Regenerate
                </button>
              </div>
              <div className="relative mt-1.5">
                <input
                  type="text"
                  id="batchNo"
                  value={batchNo}
                  onChange={(e) => setBatchNo(e.target.value)}
                  placeholder="BATCH-YYYYMMDD-XXXX"
                  disabled={submitting}
                  required
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 pl-9 font-mono text-xs font-semibold text-slate-900 focus:border-accent-700 focus:outline-none focus:ring-1 focus:ring-accent-700"
                />
                <Hash className="pointer-events-none absolute left-3 top-3 size-4 text-slate-400" aria-hidden="true" />
              </div>
            </div>

            <div>
              <label htmlFor="lotNumber" className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Vendor Lot / Challan No
              </label>
              <div className="relative mt-1.5">
                <input
                  type="text"
                  id="lotNumber"
                  value={lotNumber}
                  onChange={(e) => setLotNumber(e.target.value)}
                  placeholder="e.g. LOT-IOCL-99821"
                  disabled={submitting}
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 pl-9 text-xs text-slate-900 focus:border-accent-700 focus:outline-none focus:ring-1 focus:ring-accent-700"
                />
                <Package className="pointer-events-none absolute left-3 top-3 size-4 text-slate-400" aria-hidden="true" />
              </div>
            </div>
          </div>

          {/* Section 4: Storage Bin Assignment */}
          <div className="space-y-1.5">
            <label htmlFor="binId" className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Storage Bin Assignment <span className="text-red-500">*</span>
            </label>
            <select
              id="binId"
              value={binId}
              onChange={(e) => setBinId(Number(e.target.value))}
              disabled={submitting}
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-xs focus:border-accent-700 focus:outline-none focus:ring-1 focus:ring-accent-700"
            >
              {WAREHOUSE_BINS.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code} — {b.location}
                </option>
              ))}
            </select>
          </div>

          {/* Section 5: Quality Status Selection */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <ShieldAlert className="size-4 text-slate-600" aria-hidden="true" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                Quality Status on Intake
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setQualityStatus('Quarantine')}
                className={`flex flex-col items-center justify-center rounded-lg border p-3 text-center transition-all ${
                  qualityStatus === 'Quarantine'
                    ? 'border-amber-500 bg-amber-50 font-bold text-amber-900 shadow-xs ring-1 ring-amber-500'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <span className="text-xs uppercase tracking-wide">Quarantine</span>
                <span className="mt-0.5 text-[11px] text-amber-700/80 font-normal">Pending QC Inspection</span>
              </button>

              <button
                type="button"
                onClick={() => setQualityStatus('Available')}
                className={`flex flex-col items-center justify-center rounded-lg border p-3 text-center transition-all ${
                  qualityStatus === 'Available'
                    ? 'border-emerald-500 bg-emerald-50 font-bold text-emerald-900 shadow-xs ring-1 ring-emerald-500'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <span className="text-xs uppercase tracking-wide">Available</span>
                <span className="mt-0.5 text-[11px] text-emerald-700/80 font-normal">Pre-approved Lot</span>
              </button>

              <button
                type="button"
                onClick={() => setQualityStatus('Hold')}
                className={`flex flex-col items-center justify-center rounded-lg border p-3 text-center transition-all ${
                  qualityStatus === 'Hold'
                    ? 'border-blue-500 bg-blue-50 font-bold text-blue-900 shadow-xs ring-1 ring-blue-500'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <span className="text-xs uppercase tracking-wide">Hold</span>
                <span className="mt-0.5 text-[11px] text-blue-700/80 font-normal">Awaiting Documentation</span>
              </button>
            </div>
          </div>

          {/* Section 6: Supplier & Expiry (Optional) */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="supplierId" className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Supplier / Vendor (Optional)
              </label>
              <div className="relative mt-1.5">
                <select
                  id="supplierId"
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value ? Number(e.target.value) : '')}
                  disabled={submitting}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 shadow-xs focus:border-accent-700 focus:outline-none focus:ring-1 focus:ring-accent-700"
                >
                  <option value="">Select verified supplier...</option>
                  {SUPPLIERS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <Building2 className="pointer-events-none absolute right-3 top-3 size-4 text-slate-400" aria-hidden="true" />
              </div>
            </div>

            <div>
              <label htmlFor="expiryDate" className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Lot Expiry Date (Optional)
              </label>
              <div className="relative mt-1.5">
                <input
                  type="date"
                  id="expiryDate"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  disabled={submitting}
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 shadow-xs focus:border-accent-700 focus:outline-none focus:ring-1 focus:ring-accent-700"
                />
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
            <Button variant="secondary" size="md" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" size="md" type="submit" loading={submitting}>
              Confirm Material Intake
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}

