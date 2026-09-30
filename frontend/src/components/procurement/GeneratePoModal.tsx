import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Coins,
  Copy,
  FileText,
  Info,
  Printer,
  RefreshCw,
} from 'lucide-react'
import { approveRecommendation } from '../../api/procurementApi'
import { getSuppliers } from '../../api/supplierApi'
import { useAuthStore } from '../../store/authStore'
import type { PurchaseRecommendationResponse, SupplierResponse } from '../../types'
import { Button, Modal } from '../common'

export interface GeneratePoModalProps {
  recommendation: PurchaseRecommendationResponse | null
  isOpen: boolean
  onClose: () => void
  onPoGenerated?: (rec: PurchaseRecommendationResponse, poRef: string) => void
}

const DEFAULT_SUPPLIERS = [
  { supplierId: 1, supplierName: 'Indian Oil Corporation Limited (IOCL)', gstNo: '36AAACI1681G1Z1', defaultPayment: 'Net 30 Days' },
  { supplierId: 2, supplierName: 'Mangalore Refinery & Petrochemicals Limited (MRPL)', gstNo: '29AAACM0280K1ZP', defaultPayment: 'Net 30 Days' },
  { supplierId: 3, supplierName: 'Reliance Industries Limited (RIL)', gstNo: '27AAACR5055K1ZX', defaultPayment: 'Immediate LC' },
  { supplierId: 4, supplierName: 'Colorplas Polyadditives LLP', gstNo: '36AAFFC2983Q1ZT', defaultPayment: 'Net 15 Days' },
  { supplierId: 5, supplierName: 'Sri Vasavi Pigments (P) Ltd', gstNo: '37AAACS8976P1ZV', defaultPayment: 'Net 30 Days' },
  { supplierId: 6, supplierName: 'Growel Processors Private Limited', gstNo: '36AACCG4567M1ZX', defaultPayment: 'Advance 50%' },
]

export function GeneratePoModal({
  recommendation,
  isOpen,
  onClose,
  onPoGenerated,
}: GeneratePoModalProps) {
  const [liveSuppliers, setLiveSuppliers] = useState<SupplierResponse[]>([])

  useEffect(() => {
    let isMounted = true
    if (isOpen) {
      getSuppliers(true)
        .then((data) => {
          if (isMounted && data.length > 0) setLiveSuppliers(data)
        })
        .catch(() => {})
    }
    return () => {
      isMounted = false
    }
  }, [isOpen])

  const supplierOptions = liveSuppliers.length > 0 ? liveSuppliers : DEFAULT_SUPPLIERS

  // Pre-match supplier from material code
  const initialSupplierId = useMemo(() => {
    if (!recommendation) return supplierOptions[0]?.supplierId || 1
    const code = recommendation.materialCode?.toUpperCase() || ''
    if (code.includes('IOCL')) return 1
    if (code.includes('MRPL')) return 2
    if (code.includes('RELIANCE') || code.includes('H030SG') || code.includes('JF19010')) return 3
    if (code.includes('COLORPLAS') || code.includes('SQ3099')) return 4
    if (code.includes('VASAVI') || code.includes('SQ3023')) return 5
    return supplierOptions[0]?.supplierId || 1
  }, [recommendation, supplierOptions])

  // Form states
  const [supplierId, setSupplierId] = useState<number>(initialSupplierId)
  const [orderQuantity, setOrderQuantity] = useState<string>(
    recommendation ? String(recommendation.recommendedQty || 5000) : '5000'
  )
  const [unitRate, setUnitRate] = useState<string>(
    recommendation && Number(recommendation.recommendedQty) > 0
      ? String((Number(recommendation.estimatedCost) / Number(recommendation.recommendedQty)).toFixed(2))
      : '108.50'
  )
  const [paymentTerms, setPaymentTerms] = useState<string>('Net 30 Days')
  const [shippingMethod, setShippingMethod] = useState<string>('Road Freight (Direct Tanker/Truck)')

  // UI states
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [generatedPoNumber, setGeneratedPoNumber] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Auth & RBAC
  const userRoles = useAuthStore((state) => state.roles)
  const canApprove = userRoles.some((r: string) =>
    ['SUPERVISOR', 'ADMIN', 'MANAGER'].includes(r.toUpperCase())
  )

  if (!isOpen || !recommendation) return null

  const selectedSupplier =
    supplierOptions.find((s) => s.supplierId === supplierId) ||
    supplierOptions[0] || {
      supplierId: 1,
      supplierName: 'Indian Oil Corporation Limited (IOCL)',
      gstNo: '36AAACI1681G1Z1',
    }
  const qty = parseFloat(orderQuantity) || 0
  const rate = parseFloat(unitRate) || 0
  const totalAmount = qty * rate

  // Calculate expected delivery date from lead time
  const leadDays = recommendation.leadTimeDays || 5
  const expectedDate = new Date()
  expectedDate.setDate(expectedDate.getDate() + leadDays)
  const formattedExpectedDate = expectedDate.toISOString().slice(0, 10)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!recommendation) return

    if (qty <= 0) {
      setErrorMessage('Order quantity must be greater than zero.')
      return
    }
    if (rate <= 0) {
      setErrorMessage('Unit rate must be greater than zero.')
      return
    }

    setSubmitting(true)
    setErrorMessage(null)

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const suppCode = (selectedSupplier.supplierName.match(/\(([A-Z0-9]+)\)/)?.[1] || selectedSupplier.supplierName.slice(0, 4)).toUpperCase()
    const poNum = `REQ-DRAFT-${dateStr}-${suppCode}-${Math.floor(100 + Math.random() * 900)}`

    try {
      // If user has rights and recommendation is not approved, approve it in backend
      if (canApprove && recommendation.status?.toLowerCase() !== 'approved') {
        await approveRecommendation(recommendation.recommendationId)
      }

      setGeneratedPoNumber(poNum)
      if (onPoGenerated) {
        onPoGenerated(recommendation, poNum)
      }
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } } }
      setErrorMessage(
        apiErr.response?.data?.message || 'Failed to approve recommendation.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  function handleCopyPo() {
    if (generatedPoNumber) {
      navigator.clipboard.writeText(generatedPoNumber)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  function handlePrint() {
    window.print()
  }

  function handleReset() {
    setGeneratedPoNumber(null)
    setErrorMessage(null)
    setCopied(false)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title={
        <div className="flex items-center gap-2">
          <FileText className="size-5 text-indigo-600" aria-hidden="true" />
          <span>Purchase Requisition Draft Voucher</span>
        </div>
      }
      description={`Generate a printable draft requisition document for ${recommendation.materialName} (${recommendation.materialCode}).`}
    >
      {generatedPoNumber ? (
        <div className="space-y-6 py-2">
          {/* Success Banner */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="size-7" aria-hidden="true" />
            </div>
            <h3 className="mt-2 text-base font-bold text-emerald-900">
              Requisition Draft Prepared
            </h3>
            <p className="text-xs text-emerald-700">
              Document Reference:{' '}
              <span className="font-mono font-bold text-emerald-950">{generatedPoNumber}</span>
            </p>
            <p className="mt-1 text-[11px] text-emerald-600">
              {canApprove && recommendation.status?.toLowerCase() !== 'approved'
                ? 'Backend recommendation status updated to Approved.'
                : 'Print or export this requisition voucher for commercial review.'}
            </p>
          </div>

          {/* Notice */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 flex items-center gap-2">
            <Info className="size-4 text-slate-400 shrink-0" aria-hidden="true" />
            <span>
              This is a printable requisition voucher preview. The ERP backend records the recommendation approval without creating an external PO entity.
            </span>
          </div>

          {/* Formal Requisition Draft Voucher Card */}
          <div className="rounded-xl border-2 border-slate-900 bg-white p-6 shadow-xs">
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Commercial Purchase Requisition Voucher (Draft Preview)
                </span>
                <h4 className="text-lg font-bold text-slate-900">Sri Vidya Polymers Pvt Ltd</h4>
                <p className="text-xs text-slate-500">Unit 1 Manufacturing Facility, Hyderabad, Telangana</p>
              </div>
              <div className="text-right">
                <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded">
                  {generatedPoNumber}
                </span>
                <p className="text-[11px] text-slate-400 mt-1">Date: {new Date().toISOString().slice(0, 10)}</p>
              </div>
            </div>

            {/* Vendor & Delivery Coordinates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 text-xs border-b border-slate-200">
              <div>
                <span className="text-slate-500 block font-semibold">Vendor / Supplier:</span>
                <p className="font-bold text-slate-900 text-sm">{selectedSupplier.supplierName}</p>
                <p className="text-slate-500 mt-0.5">Approved Polymer Supplier (ID: #{selectedSupplier.supplierId}{selectedSupplier.gstNo ? ` • GSTIN: ${selectedSupplier.gstNo}` : ''})</p>
              </div>
              <div>
                <span className="text-slate-500 block font-semibold">Ship-To Facility:</span>
                <p className="font-bold text-slate-900 text-sm">Unit 1 Raw Material Warehouse</p>
                <p className="text-slate-500 mt-0.5">
                  Expected Delivery: <span className="font-semibold text-slate-800">{formattedExpectedDate}</span> ({leadDays} days lead)
                </p>
              </div>
            </div>

            {/* Line Item Table */}
            <div className="py-4">
              <table className="w-full text-left text-xs border border-slate-200 rounded">
                <thead className="bg-slate-50 font-semibold uppercase text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Item & Code</th>
                    <th className="p-2.5 text-right">Quantity</th>
                    <th className="p-2.5 text-right">Unit Rate (₹/kg)</th>
                    <th className="p-2.5 text-right">Estimated Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="p-2.5">
                      <span className="font-bold text-slate-900 block">{recommendation.materialName}</span>
                      <span className="font-mono text-slate-500">{recommendation.materialCode}</span>
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                      {qty.toLocaleString()} KG
                    </td>
                    <td className="p-2.5 text-right font-mono text-slate-800">
                      ₹{rate.toFixed(2)}
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-indigo-900">
                      ₹{totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Terms & Authorization */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2 text-slate-600">
              <div>
                <p><span className="font-semibold text-slate-700">Payment Terms:</span> {paymentTerms}</p>
                <p><span className="font-semibold text-slate-700">Logistics:</span> {shippingMethod}</p>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-[11px] text-slate-400 block">Commercial Recommendation Review</span>
                <span className="font-semibold text-slate-800 underline mt-1 block">ERP Electronic Verification</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" size="sm" onClick={handleCopyPo}>
                <Copy className="size-3.5" aria-hidden="true" />
                {copied ? 'Copied!' : 'Copy Reference'}
              </Button>
              <Button variant="secondary" size="sm" onClick={handlePrint}>
                <Printer className="size-3.5" aria-hidden="true" />
                Print Voucher
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" size="sm" onClick={handleReset}>
                <RefreshCw className="size-3.5" aria-hidden="true" />
                Re-Draft
              </Button>
              <Button variant="primary" size="sm" onClick={onClose}>
                Done & Return
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {errorMessage && (
            <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs text-red-800">
              <AlertCircle className="size-4 shrink-0 text-red-600 mt-0.5" aria-hidden="true" />
              <div className="font-medium">{errorMessage}</div>
            </div>
          )}

          {/* Material & Recommendation Context */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Target Raw Material
                </span>
                <h4 className="font-bold text-slate-900 text-sm">{recommendation.materialName}</h4>
                <p className="font-mono text-xs text-slate-500">{recommendation.materialCode}</p>
              </div>
              <div className="text-right text-xs">
                <span className="text-slate-500">Suggested Order Qty:</span>
                <p className="font-mono font-bold text-indigo-700">
                  {Number(recommendation.recommendedQty).toLocaleString()} KG
                </p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
              <div>
                <span className="text-slate-500">Current Net Stock:</span>
                <p className="font-mono font-semibold text-slate-800">
                  {Number(recommendation.currentStock).toLocaleString()} KG
                </p>
              </div>
              <div>
                <span className="text-slate-500">Safety Buffer:</span>
                <p className="font-mono font-semibold text-slate-800">
                  {Number(recommendation.safetyStock).toLocaleString()} KG
                </p>
              </div>
              <div>
                <span className="text-slate-500">Vendor Lead Time:</span>
                <p className="font-semibold text-slate-800">{leadDays} Days</p>
              </div>
            </div>
          </div>

          {/* Supplier Selection */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1">
              <Building2 className="size-3.5 text-slate-400" aria-hidden="true" />
              Contracted Supplier <span className="text-red-500">*</span>
            </label>
            <select
              value={supplierId}
              onChange={(e) => {
                const id = Number(e.target.value)
                setSupplierId(id)
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            >
              {supplierOptions.map((s) => (
                <option key={s.supplierId} value={s.supplierId}>
                  {s.supplierName} {s.gstNo ? `(${s.gstNo})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Quantity & Unit Rate */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Order Quantity (KG) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={orderQuantity}
                  onChange={(e) => setOrderQuantity(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white pl-3 pr-14 py-2 text-sm text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
                <span className="absolute inset-y-0 right-3 flex items-center text-xs font-bold text-slate-400">
                  KG
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Agreed Unit Rate (₹/kg) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={unitRate}
                  onChange={(e) => setUnitRate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white pl-3 pr-14 py-2 text-sm text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
                <span className="absolute inset-y-0 right-3 flex items-center text-xs font-bold text-slate-400">
                  ₹/KG
                </span>
              </div>
            </div>
          </div>

          {/* Total Value & Terms */}
          <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="size-5 text-indigo-600 shrink-0" aria-hidden="true" />
              <div>
                <span className="text-xs text-slate-500 font-medium">Total Requisition Value</span>
                <p className="font-mono text-base font-bold text-indigo-950">
                  ₹{totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
            <div className="text-right text-xs">
              <span className="text-slate-500">Expected Arrival:</span>
              <p className="font-semibold text-slate-800">{formattedExpectedDate}</p>
            </div>
          </div>

          {/* Payment & Logistics */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Terms
              </label>
              <select
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              >
                <option value="Net 30 Days">Net 30 Days</option>
                <option value="Net 15 Days">Net 15 Days</option>
                <option value="Immediate LC">Letter of Credit (LC)</option>
                <option value="Advance 50%">Advance 50% / Balance on Delivery</option>
                <option value="100% Advance">100% Advance Against Proforma</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Logistics & Delivery Mode
              </label>
              <select
                value={shippingMethod}
                onChange={(e) => setShippingMethod(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              >
                <option value="Road Freight (Direct Tanker/Truck)">Road Freight (Direct Truck)</option>
                <option value="Containerized Logistics">Containerized Logistics</option>
                <option value="Ex-Works Supplier Warehouse">Ex-Works (Customer Pickup)</option>
              </select>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between border-t border-slate-200 pt-4">
            <Button variant="secondary" type="button" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={submitting || qty <= 0 || rate <= 0}
            >
              {submitting ? (
                <>
                  <RefreshCw className="size-4 animate-spin" aria-hidden="true" />
                  Preparing Draft...
                </>
              ) : (
                <>
                  <FileText className="size-4" aria-hidden="true" />
                  Generate Requisition Voucher
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
