import { useEffect, useState } from 'react'
import {
  AlertCircle,
  Boxes,
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  Printer,
  RefreshCw,
  ShieldAlert,
  Truck,
  User,
} from 'lucide-react'
import { completeTransfer, getTransferById } from '../../api/transferApi'
import { useAuthStore } from '../../store/authStore'
import type { StockTransferResponse } from '../../types'
import { Button, Drawer, ErrorState, LoadingSpinner, StatusBadge } from '../common'
import { ConsignmentTracker } from './ConsignmentTracker'
import { printConsignmentNoteDocument } from '../../utils/palletPrintUtil'

export interface TransferDetailsDrawerProps {
  transferId: number | null
  isOpen: boolean
  onClose: () => void
  onTransferCompleted?: (transfer: StockTransferResponse) => void
}

export function TransferDetailsDrawer(props: TransferDetailsDrawerProps) {
  return props.isOpen && props.transferId ? <TransferDetailsContent key={props.transferId} {...props} /> : null
}

function TransferDetailsContent({
  transferId,
  isOpen,
  onClose,
  onTransferCompleted,
}: TransferDetailsDrawerProps) {
  const [transfer, setTransfer] = useState<StockTransferResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'TRACKING' | 'ITEMS'>('TRACKING')

  // Completion action states
  const [completing, setCompleting] = useState(false)
  const [completionError, setCompletionError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)

  // Auth & RBAC - PRESERVED STRICTLY
  const userRoles = useAuthStore((state) => state.roles)
  const canCompleteTransfer = userRoles.some((r: string) =>
    ['SUPERVISOR', 'ADMIN', 'MANAGER'].includes(r.toUpperCase())
  )

  const [version, setVersion] = useState(0)
  function loadDetails() {
    setLoading(true); setError(null); setCompletionError(null); setShowConfirm(false)
    setVersion(value => value + 1)
  }
  useEffect(() => {
    if (!transferId) return
    let active = true
    getTransferById(transferId).then(data => { if (active) setTransfer(data) })
      .catch(() => { if (active) setError('Unable to load stock transfer details.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [transferId, version])

  async function handleExecuteComplete() {
    if (!transferId) return

    setCompleting(true)
    setCompletionError(null)
    try {
      const updated = await completeTransfer(transferId)
      setTransfer(updated)
      setShowConfirm(false)
      if (onTransferCompleted) {
        onTransferCompleted(updated)
      }
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } } }
      const msg =
        apiErr.response?.data?.message ||
        'Failed to complete transfer. Verify sufficient inventory exists in the source bin.'
      setCompletionError(msg)
    } finally {
      setCompleting(false)
    }
  }

  if (!isOpen) return null

  const isDraft = transfer?.status?.toLowerCase() === 'draft'
  const isCompleted = transfer?.status?.toLowerCase() === 'completed'

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title={
        <div className="flex items-center gap-2">
          <Truck className="size-5 text-slate-700" aria-hidden="true" />
          <span className="font-bold">
            {transfer ? transfer.transferNumber : 'Stock Transfer Details'}
          </span>
        </div>
      }
      description={
        transfer ? (
          <span>
            Transfer initiated on <span className="font-medium text-slate-700 font-mono">{transfer.transferDate}</span>
          </span>
        ) : undefined
      }
      footer={
        transfer && (
          <div className="flex flex-wrap items-center justify-between gap-3 w-full">
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={onClose} className="text-xs">
                Close Details
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const totalKg =
                    transfer.items?.reduce(
                      (acc: number, curr: { quantity: number | string }) =>
                        acc + Number(curr.quantity || 0),
                      0
                    ) || 0
                  printConsignmentNoteDocument({
                    companyName: 'SRI VIDHA POLYMERS',
                    transferNumber: transfer.transferNumber,
                    awbNumber: `AWB-${transfer.transferNumber}`,
                    fromWarehouseName:
                      transfer.fromWarehouseName || `Warehouse #${transfer.fromWarehouseId}`,
                    toWarehouseName:
                      transfer.toWarehouseName || `Warehouse #${transfer.toWarehouseId}`,
                    transferDate: transfer.transferDate,
                    totalQuantity: totalKg,
                    status: isCompleted
                      ? 'Consignment Delivered & Stowed'
                      : 'In Transit — Inter-Facility Movement Active',
                    items:
                      transfer.items?.map((it) => ({
                        batchNo:
                          it.materialBatchNo ||
                          it.finishedBatchNo ||
                          `Batch #${it.materialBatchId || it.finishedBatchId}`,
                        materialName: it.materialBatchId ? 'Polymer Compound' : 'Finished Sacks',
                        fromBinCode: it.fromBinCode,
                        toBinCode: it.toBinCode,
                        quantity: Number(it.quantity || 0),
                        uom: it.uomCode || 'KGS',
                      })) || [],
                  })
                }}
                className="flex items-center gap-1.5 text-xs text-slate-700 hover:text-slate-900"
              >
                <Printer className="size-3.5" aria-hidden="true" />
                Print Consignment Note (AWB)
              </Button>
            </div>

            {isDraft && (
              <div className="flex items-center gap-3">
                {showConfirm ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-700">
                      Debit source & credit destination now?
                    </span>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowConfirm(false)}
                      disabled={completing}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleExecuteComplete}
                      disabled={completing}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      {completing ? (
                        <>
                          <RefreshCw className="size-3.5 animate-spin" aria-hidden="true" />
                          Completing...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="size-3.5" aria-hidden="true" />
                          Confirm Complete
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="primary"
                    onClick={() => setShowConfirm(true)}
                    disabled={!canCompleteTransfer || completing}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <CheckCircle2 className="size-4" aria-hidden="true" />
                    Complete Transfer
                  </Button>
                )}
              </div>
            )}

            {isCompleted && (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="size-3.5 text-emerald-600" aria-hidden="true" />
                Transfer Completed & Balanced
              </div>
            )}
          </div>
        )
      }
    >
      {loading ? (
        <div className="py-20">
          <LoadingSpinner label="Loading transfer manifest and route..." />
        </div>
      ) : error ? (
        <div className="py-12">
          <ErrorState
            title="Failed to Load Transfer"
            description={error}
            onRetry={() => {
              if (transferId) loadDetails()
            }}
          />
        </div>
      ) : transfer ? (
        <div className="space-y-6">
          {/* Completion Error Alert */}
          {completionError && (
            <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              <AlertCircle className="size-5 shrink-0 text-rose-600 mt-0.5" aria-hidden="true" />
              <div>
                <p className="font-semibold">Completion Request Failed</p>
                <p className="text-xs text-rose-700 mt-0.5">{completionError}</p>
              </div>
            </div>
          )}

          {/* Role restriction notice for Operators */}
          {isDraft && !canCompleteTransfer && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-800">
              <ShieldAlert className="size-4 shrink-0 text-amber-600 mt-0.5" aria-hidden="true" />
              <div>
                <span className="font-bold">Supervisor Authorization Required:</span>
                <p className="mt-0.5 text-amber-700">
                  Your current account role does not have authorization to finalize stock movements. A user with Supervisor, Manager, or Admin role must execute this transfer.
                </p>
              </div>
            </div>
          )}

          {/* Header Summary Card */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <span className="text-xs text-slate-500 font-mono">Document Identifier</span>
                <p className="font-mono text-base font-bold text-slate-900">{transfer.transferNumber}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Status:</span>
                <StatusBadge
                  tone={isCompleted ? 'success' : isDraft ? 'warning' : 'neutral'}
                >
                  {isCompleted ? 'Delivered & Stowed' : isDraft ? 'Draft (In Transit)' : transfer.status}
                </StatusBadge>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
              <div>
                <span className="text-slate-500 flex items-center gap-1 font-mono text-[11px]">
                  <Calendar className="size-3.5 text-slate-400" aria-hidden="true" />
                  Transfer Date
                </span>
                <p className="mt-0.5 font-semibold text-slate-900 font-mono">{transfer.transferDate}</p>
              </div>
              <div>
                <span className="text-slate-500 flex items-center gap-1 font-mono text-[11px]">
                  <User className="size-3.5 text-slate-400" aria-hidden="true" />
                  Initiated By
                </span>
                <p className="mt-0.5 font-semibold text-slate-900">
                  {transfer.createdByUserName || 'System / Operator'}
                </p>
              </div>
              <div>
                <span className="text-slate-500 flex items-center gap-1 font-mono text-[11px]">
                  <Clock className="size-3.5 text-slate-400" aria-hidden="true" />
                  Created At
                </span>
                <p className="mt-0.5 font-semibold text-slate-900 font-mono">
                  {transfer.createdAt ? new Date(transfer.createdAt).toLocaleString() : '—'}
                </p>
              </div>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex border-b border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('TRACKING')}
              className={`py-2 px-4 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                activeTab === 'TRACKING'
                  ? 'border-slate-900 text-slate-900 bg-white font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Inter-Facility Consignment Tracking
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ITEMS')}
              className={`py-2 px-4 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                activeTab === 'ITEMS'
                  ? 'border-slate-900 text-slate-900 bg-white font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Transfer Line Items ({transfer.items?.length || 0})
            </button>
          </div>

          {/* Real-time Consignment Tracker */}
          {activeTab === 'TRACKING' && (
            <ConsignmentTracker transfer={transfer} />
          )}

          {/* Line Items Table */}
          {activeTab === 'ITEMS' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 font-mono">
                  <Boxes className="size-4 text-slate-500" aria-hidden="true" />
                  Transfer Line Items ({transfer.items?.length || 0})
                </h4>
                <span className="text-xs font-semibold text-slate-500 font-mono">
                  Total Weight:{' '}
                  <span className="text-slate-900 font-bold tabular-nums">
                    {transfer.items
                      ?.reduce((acc: number, curr: { quantity: number | string }) => acc + Number(curr.quantity || 0), 0)
                      .toLocaleString()}{' '}
                    KGS
                  </span>
                </span>
              </div>

              <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 font-mono">
                    <tr>
                      <th scope="col" className="px-4 py-2.5">#</th>
                      <th scope="col" className="px-4 py-2.5">Batch / Material</th>
                      <th scope="col" className="px-4 py-2.5">Source &rarr; Target Bin</th>
                      <th scope="col" className="px-4 py-2.5 text-right">Quantity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {transfer.items && transfer.items.length > 0 ? (
                      transfer.items.map((item, idx) => (
                        <tr key={item.stiId || idx} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 text-xs font-mono text-slate-400">{idx + 1}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <Layers className="size-4 text-slate-600 shrink-0" aria-hidden="true" />
                              <span className="font-mono font-semibold text-slate-900">
                                {item.materialBatchNo || item.finishedBatchNo || `Batch #${item.materialBatchId || item.finishedBatchId}`}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-500 block pl-5.5">
                              {item.materialBatchId ? 'Raw Material Batch' : 'Finished Goods Batch'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs font-mono">
                            <span className="font-semibold text-slate-800">{item.fromBinCode || `Bin #${item.fromBinId}`}</span>
                            <span className="mx-1 text-slate-400">&rarr;</span>
                            <span className="font-semibold text-slate-900">{item.toBinCode || `Bin #${item.toBinId}`}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="font-mono font-bold text-slate-900 tabular-nums">
                              {Number(item.quantity).toLocaleString()}
                            </span>{' '}
                            <span className="text-xs text-slate-500 uppercase font-mono">{item.uomCode || 'KGS'}</span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-xs text-slate-500">
                          No line items recorded for this transfer.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </Drawer>
  )
}
