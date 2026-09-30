import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  Boxes,
  CheckCircle2,
  Clock,
  Layers,
  Plus,
  RefreshCw,
  Search,
  Truck,
} from 'lucide-react'
import { listTransfers } from '../../api/transferApi'
import type { StockTransferResponse } from '../../types'
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingSpinner,
  PageHeader,
  StatusBadge,
} from '../../components/common'
import {
  CreateTransferModal,
  TransferDetailsDrawer,
} from '../../components/warehouse'
import { usePermissions } from '../../hooks/usePermissions'

type StatusFilter = 'ALL' | 'DRAFT' | 'COMPLETED'

export function StockTransfersPage() {
  const [transfers, setTransfers] = useState<StockTransferResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  // Modals & Drawers
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedTransferId, setSelectedTransferId] = useState<number | null>(null)

  const [version, setVersion] = useState(0)
  function fetchTransfers() {
    setLoading(true); setError(null); setVersion(value => value + 1)
  }
  useEffect(() => {
    let active = true
    listTransfers().then(data => { if (active) setTransfers(data) })
      .catch(() => { if (active) setError('Unable to load stock transfers from the server.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [version])

  // Filtered transfers
  const filteredTransfers = useMemo(() => {
    if (!Array.isArray(transfers)) return []
    return transfers.filter((t) => {
      // Status filter
      if (statusFilter === 'DRAFT' && t.status?.toLowerCase() !== 'draft') {
        return false
      }
      if (statusFilter === 'COMPLETED' && t.status?.toLowerCase() !== 'completed') {
        return false
      }

      // Search query
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      const matchesNum = t.transferNumber?.toLowerCase().includes(q)
      const matchesAwb = `AWB-${t.transferNumber}`.toLowerCase().includes(q)
      const matchesFrom = t.fromWarehouseName?.toLowerCase().includes(q)
      const matchesTo = t.toWarehouseName?.toLowerCase().includes(q)
      const matchesUser = t.createdByUserName?.toLowerCase().includes(q)
      const matchesItem = t.items?.some(
        (i) =>
          i.materialBatchNo?.toLowerCase().includes(q) ||
          i.finishedBatchNo?.toLowerCase().includes(q)
      )

      return matchesNum || matchesAwb || matchesFrom || matchesTo || matchesUser || matchesItem
    })
  }, [transfers, statusFilter, searchQuery])

  // Metric summaries
  const metrics = useMemo(() => {
    if (!Array.isArray(transfers)) {
      return { total: 0, completed: 0, drafts: 0, totalWeightKg: 0 }
    }
    const completed = transfers.filter((t) => t.status?.toLowerCase() === 'completed').length
    const drafts = transfers.filter((t) => t.status?.toLowerCase() === 'draft').length
    const totalWeightKg = transfers.reduce((acc, t) => {
      const itemsWeight = (t.items || []).reduce(
        (iAcc, item) => iAcc + (Number(item.quantity) || 0),
        0
      )
      return acc + itemsWeight
    }, 0)

    return {
      total: transfers.length,
      completed,
      drafts,
      totalWeightKg,
    }
  }, [transfers])

  function handleTransferSuccess(newTransfer: StockTransferResponse) {
    setTransfers((prev) => [newTransfer, ...prev])
  }

  function handleTransferCompleted(updated: StockTransferResponse) {
    setTransfers((prev) =>
      prev.map((t) => (t.transferId === updated.transferId ? updated : t))
    )
  }

  const { canCreate } = usePermissions('moveStock')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Move Stock"
        description="Monitor, initiate, and finalize raw material and finished product movements between plant warehouses."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchTransfers}
              disabled={loading}
            >
              <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
              Refresh
            </Button>
            {canCreate && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsCreateModalOpen(true)}
              >
                <Plus className="size-3.5" aria-hidden="true" />
                New Stock Transfer
              </Button>
            )}
          </div>
        }
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4 bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">Total Transfers</p>
            <Truck className="size-4 text-slate-500" aria-hidden="true" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">{loading ? '—' : metrics.total}</p>
          <p className="mt-1 text-xs text-slate-500">All registered transfer orders</p>
        </Card>

        <Card className="p-4 bg-amber-50/50 border border-amber-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-800 font-mono">Pending Drafts</p>
            <Clock className="size-4 text-amber-600" aria-hidden="true" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-950 font-mono tabular-nums">{loading ? '—' : metrics.drafts}</p>
          <p className="mt-1 text-xs text-amber-800">Awaiting supervisor completion</p>
        </Card>

        <Card className="p-4 bg-emerald-50/50 border border-emerald-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-800 font-mono">Completed</p>
            <CheckCircle2 className="size-4 text-emerald-600" aria-hidden="true" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-950 font-mono tabular-nums">{loading ? '—' : metrics.completed}</p>
          <p className="mt-1 text-xs text-emerald-800">Fully posted and stock balanced</p>
        </Card>

        <Card className="p-4 bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">Material Relocated</p>
            <Boxes className="size-4 text-slate-500" aria-hidden="true" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {loading ? '—' : `${metrics.totalWeightKg.toLocaleString()} kg`}
          </p>
          <p className="mt-1 text-xs text-slate-500">Total polymer mass moved</p>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-3 bg-white border border-slate-200 shadow-2xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 rounded-lg bg-slate-100 p-1 border border-slate-200">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({metrics.total})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('DRAFT')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                statusFilter === 'DRAFT'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Drafts ({metrics.drafts})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('COMPLETED')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                statusFilter === 'COMPLETED'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Completed ({metrics.completed})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="text"
              placeholder="Search by transfer # or facility..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-800 focus:outline-hidden focus:ring-1 focus:ring-slate-800 font-mono"
            />
          </div>
        </div>
      </Card>

      {/* Main Transfers Table */}
      {loading ? (
        <Card className="py-20">
          <LoadingSpinner label="Fetching stock transfer ledger..." />
        </Card>
      ) : error ? (
        <Card className="py-12">
          <ErrorState title="Error Loading Transfers" description={error} onRetry={fetchTransfers} />
        </Card>
      ) : filteredTransfers.length === 0 ? (
        <Card className="py-12">
          <EmptyState
            title="No Stock Transfers Found"
            description={
              searchQuery || statusFilter !== 'ALL'
                ? 'No transfer records matched your selected filters.'
                : 'No warehouse transfers have been recorded yet. Create a transfer to move materials between units.'
            }
            action={
              <Button size="sm" onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="size-3.5" aria-hidden="true" />
                Initiate First Transfer
              </Button>
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden bg-white border border-slate-200 shadow-2xs">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 font-mono">
                <tr>
                  <th scope="col" className="px-6 py-3.5">Document #</th>
                  <th scope="col" className="px-6 py-3.5">Route (From &rarr; To)</th>
                  <th scope="col" className="px-6 py-3.5">Transfer Date</th>
                  <th scope="col" className="px-6 py-3.5">Line Items</th>
                  <th scope="col" className="px-6 py-3.5 text-right">Total Qty</th>
                  <th scope="col" className="px-6 py-3.5">Status</th>
                  <th scope="col" className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredTransfers.map((transfer) => {
                  const isDraft = transfer.status?.toLowerCase() === 'draft'
                  const isCompleted = transfer.status?.toLowerCase() === 'completed'
                  const totalTransferQty = (transfer.items || []).reduce(
                    (acc, item) => acc + (Number(item.quantity) || 0),
                    0
                  )

                  return (
                    <tr
                      key={transfer.transferId}
                      onClick={() => setSelectedTransferId(transfer.transferId)}
                      className="cursor-pointer hover:bg-slate-50/75 transition-colors"
                    >
                      {/* Document # */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-slate-700">
                            <Truck className="size-4" aria-hidden="true" />
                          </div>
                          <div>
                            <span className="font-mono font-bold text-slate-900 block">
                              {transfer.transferNumber}
                            </span>
                            <span className="font-mono text-[10px] font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 inline-flex items-center gap-1 mt-0.5">
                              <span className="size-1.5 rounded-full bg-slate-800" />
                              AWB-{transfer.transferNumber}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Route */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="font-medium text-slate-800">
                            {transfer.fromWarehouseName || `WH #${transfer.fromWarehouseId}`}
                          </span>
                          <ArrowRight className="size-3 text-slate-400 shrink-0" aria-hidden="true" />
                          <span className="font-medium text-slate-900">
                            {transfer.toWarehouseName || `WH #${transfer.toWarehouseId}`}
                          </span>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600 font-mono">
                        {transfer.transferDate}
                      </td>

                      {/* Line Items */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs">
                        <div className="flex items-center gap-1 text-slate-700">
                          <Layers className="size-3.5 text-slate-400" aria-hidden="true" />
                          <span>{transfer.items?.length || 0} batch(es)</span>
                        </div>
                      </td>

                      {/* Total Qty */}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                        <span className="font-mono font-bold text-slate-900 tabular-nums">
                          {totalTransferQty.toLocaleString()}
                        </span>{' '}
                        <span className="text-[11px] text-slate-500 uppercase font-mono">
                          {transfer.items?.[0]?.uomCode || 'KGS'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge
                          tone={isCompleted ? 'success' : isDraft ? 'warning' : 'neutral'}
                        >
                          {isCompleted ? 'Delivered & Stowed' : isDraft ? 'In Transit (En Route)' : transfer.status}
                        </StatusBadge>
                      </td>

                      {/* Action */}
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedTransferId(transfer.transferId)
                          }}
                        >
                          <Truck className="size-3.5" aria-hidden="true" />
                          Track Goods
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Creation Modal */}
      <CreateTransferModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleTransferSuccess}
      />

      {/* Details & Completion Drawer */}
      <TransferDetailsDrawer
        transferId={selectedTransferId}
        isOpen={selectedTransferId !== null}
        onClose={() => setSelectedTransferId(null)}
        onTransferCompleted={handleTransferCompleted}
      />
    </div>
  )
}
