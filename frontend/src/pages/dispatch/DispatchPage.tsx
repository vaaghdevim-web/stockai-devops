import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  AlertCircle,
  Boxes,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Plus,
  RefreshCw,
  Search,
  Truck,
  X,
  XCircle,
  Ban,
  Calendar,
  User,
  Phone,
  Eye,
} from 'lucide-react'
import {
  cancelDispatch,
  createDispatch,
  downloadDispatchDocument,
  getDispatchById,
  getDispatchDocuments,
  getDrivers,
  getFinishedGoodsMetrics,
  getPalletByIdentifier,
  getProductionRuns,
  getQualityInspections,
  getVehicles,
  listDispatches,
  markAsDelivered,
  markAsDispatched,
} from '../../api'
import {
  Button,
  Card,
  Drawer,
  EmptyState,
  ErrorState,
  LoadingSpinner,
  Modal,
  PageHeader,
  StatusBadge,
} from '../../components/common'
import { VehicleRosterView, DriverRosterView } from '../../components/dispatch'
import { usePermissions } from '../../hooks/usePermissions'
import { getApiError } from '../../utils/apiError'
import type {
  CreateDispatchRequest,
  DispatchItemRequest,
  DispatchResponse,
  DriverResponse,
  FinishedGoodsMetricsResponse,
  PalletResponse,
  ProductionRunResponse,
  QualityInspectionResponse,
  StoredDocumentResponse,
  VehicleResponse,
} from '../../types'

function toneForDispatchStatus(
  status: string,
): 'success' | 'info' | 'warning' | 'danger' | 'neutral' {
  switch (status?.toUpperCase()) {
    case 'DELIVERED':
      return 'success'
    case 'DISPATCHED':
      return 'info'
    case 'PREPARED':
      return 'warning'
    case 'CANCELLED':
      return 'danger'
    default:
      return 'neutral'
  }
}

function toneForPalletStatus(
  status: string,
): 'success' | 'info' | 'warning' | 'danger' | 'neutral' {
  switch (status?.toUpperCase()) {
    case 'DISPATCHED':
    case 'CLOSED':
      return 'success'
    case 'ALLOCATED':
    case 'STORED':
      return 'info'
    case 'OPEN':
      return 'warning'
    case 'CANCELLED':
      return 'danger'
    default:
      return 'neutral'
  }
}

interface NewDispatchItemForm {
  finishedBatchId: string
  quantity: string
  allocationId: string
}

export function DispatchPage() {
  const { isFull, canCreate, checkAccess } = usePermissions('dispatch')

  const hasProductionAccess = checkAccess('productionWork')
  const hasQualityAccess = checkAccess('qualityCheck')
  const hasDocumentsAccess = checkAccess('documents')
  const hasPalletAccess = checkAccess('pallets')

  // Navigation Sub-tab State
  const [activeDispatchTab, setActiveDispatchTab] = useState<'DISPATCHES' | 'DRIVERS' | 'VEHICLES'>('DISPATCHES')

  // Dispatches List State
  const [dispatches, setDispatches] = useState<DispatchResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Master Data
  const [vehicles, setVehicles] = useState<VehicleResponse[]>([])
  const [drivers, setDrivers] = useState<DriverResponse[]>([])

  // Drawer / Details State
  const [selectedDispatchId, setSelectedDispatchId] = useState<number | null>(null)
  const [selectedDispatch, setSelectedDispatch] = useState<DispatchResponse | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)

  // Create Dispatch Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [formOrderId, setFormOrderId] = useState('')
  const [formVehicleId, setFormVehicleId] = useState('')
  const [formDriverId, setFormDriverId] = useState('')
  const [formCarrier, setFormCarrier] = useState('')
  const [formShippingMethod, setFormShippingMethod] = useState('Road Freight')
  const [formTrackingNumber, setFormTrackingNumber] = useState('')
  const [formDispatchDate, setFormDispatchDate] = useState(
    new Date().toISOString().split('T')[0],
  )
  const [formExpectedDeliveryDate, setFormExpectedDeliveryDate] = useState('')
  const [formAutoDispatch, setFormAutoDispatch] = useState(false)
  const [formItems, setFormItems] = useState<NewDispatchItemForm[]>([
    { finishedBatchId: '', quantity: '', allocationId: '' },
  ])

  // Action Confirmation Dialog State
  const [confirmAction, setConfirmAction] = useState<{
    type: 'dispatch' | 'deliver' | 'cancel'
    dispatch: DispatchResponse
  } | null>(null)
  const [actionProcessing, setActionProcessing] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null)

  // Secondary Factory Tools State
  const [runs, setRuns] = useState<ProductionRunResponse[]>([])
  const [documents, setDocuments] = useState<StoredDocumentResponse[]>([])
  const [inspections, setInspections] = useState<QualityInspectionResponse[]>([])

  // Pallet Lookup State
  const [palletQuery, setPalletQuery] = useState('')
  const [searchedPallet, setSearchedPallet] = useState<PalletResponse | null>(null)
  const [palletLoading, setPalletLoading] = useState(false)
  const [palletError, setPalletError] = useState<string | null>(null)

  // Selected Production Run Metrics State
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null)
  const [runMetrics, setRunMetrics] = useState<FinishedGoodsMetricsResponse | null>(null)
  const [metricsLoading, setMetricsLoading] = useState(false)
  const [metricsError, setMetricsError] = useState<string | null>(null)

  const dataRequest = useRef(0)
  const metricsRequest = useRef(0)

  // Fetch all primary dispatch data & supporting master datasets (permission-aware)
  const loadData = useCallback(async () => {
    const request = ++dataRequest.current
    setLoading(true)
    setError(null)
    setActionError(null)

    const [dispatchesRes, vehiclesRes, driversRes, runsRes, docsRes, qcRes] =
      await Promise.allSettled([
        listDispatches(),
        getVehicles().catch(() => [] as VehicleResponse[]),
        getDrivers().catch(() => [] as DriverResponse[]),
        hasProductionAccess
          ? getProductionRuns().catch(() => [] as ProductionRunResponse[])
          : Promise.resolve([] as ProductionRunResponse[]),
        hasDocumentsAccess
          ? getDispatchDocuments().catch(() => [] as StoredDocumentResponse[])
          : Promise.resolve([] as StoredDocumentResponse[]),
        hasQualityAccess
          ? getQualityInspections().catch(() => [] as QualityInspectionResponse[])
          : Promise.resolve([] as QualityInspectionResponse[]),
      ])

    if (request !== dataRequest.current) return

    if (dispatchesRes.status === 'fulfilled') {
      setDispatches(dispatchesRes.value)
    } else {
      const msg = getApiError(dispatchesRes.reason, 'Failed to load dispatch records.').message
      setError(msg)
    }

    setVehicles(vehiclesRes.status === 'fulfilled' ? vehiclesRes.value : [])
    setDrivers(driversRes.status === 'fulfilled' ? driversRes.value : [])
    setRuns(runsRes.status === 'fulfilled' ? runsRes.value : [])
    setDocuments(docsRes.status === 'fulfilled' ? docsRes.value : [])
    setInspections(qcRes.status === 'fulfilled' ? qcRes.value : [])

    setLoading(false)
  }, [hasProductionAccess, hasDocumentsAccess, hasQualityAccess])

  const invalidateRequests = useCallback(() => {
    dataRequest.current++
    metricsRequest.current++
  }, [])

  useEffect(() => {
    let active = true
    void Promise.resolve().then(() => {
      if (active) void loadData()
    })
    return () => {
      active = false
      invalidateRequests()
    }
  }, [loadData, invalidateRequests])

  // Open Drawer and load fresh details from backend
  const handleOpenDetails = async (dispatchId: number) => {
    setSelectedDispatchId(dispatchId)
    setDetailLoading(true)
    setDetailError(null)
    try {
      const data = await getDispatchById(dispatchId)
      setSelectedDispatch(data)
    } catch (err) {
      setDetailError(getApiError(err, 'Failed to load dispatch details.').message)
    } finally {
      setDetailLoading(false)
    }
  }

  const handleCloseDrawer = () => {
    setSelectedDispatchId(null)
    setSelectedDispatch(null)
    setDetailError(null)
  }

  // Execute Dispatch Lifecycle Action
  const handleExecuteAction = async () => {
    if (!confirmAction) return
    const { type, dispatch } = confirmAction
    setActionProcessing(true)
    setActionError(null)
    setActionSuccessMessage(null)

    try {
      let updated: DispatchResponse
      if (type === 'dispatch') {
        updated = await markAsDispatched(dispatch.dispatchId)
        setActionSuccessMessage(
          `Shipment ${updated.dispatchNumber} successfully marked as Dispatched. Finished goods inventory deducted.`,
        )
      } else if (type === 'deliver') {
        updated = await markAsDelivered(dispatch.dispatchId)
        setActionSuccessMessage(
          `Shipment ${updated.dispatchNumber} marked as Delivered. Proof-of-delivery recorded.`,
        )
      } else {
        updated = await cancelDispatch(dispatch.dispatchId)
        setActionSuccessMessage(`Shipment ${updated.dispatchNumber} has been cancelled.`)
      }

      // Update local state list and drawer
      setDispatches((prev) =>
        prev.map((d) => (d.dispatchId === updated.dispatchId ? updated : d)),
      )
      if (selectedDispatch?.dispatchId === updated.dispatchId) {
        setSelectedDispatch(updated)
      }
      setConfirmAction(null)
    } catch (err) {
      setActionError(getApiError(err, `Failed to execute ${type} action.`).message)
    } finally {
      setActionProcessing(false)
    }
  }

  // Create Dispatch Form Management
  const handleResetCreateForm = () => {
    setFormOrderId('')
    setFormVehicleId('')
    setFormDriverId('')
    setFormCarrier('')
    setFormShippingMethod('Road Freight')
    setFormTrackingNumber('')
    setFormDispatchDate(new Date().toISOString().split('T')[0])
    setFormExpectedDeliveryDate('')
    setFormAutoDispatch(false)
    setFormItems([{ finishedBatchId: '', quantity: '', allocationId: '' }])
    setCreateError(null)
  }

  const handleAddItemRow = () => {
    setFormItems((prev) => [...prev, { finishedBatchId: '', quantity: '', allocationId: '' }])
  }

  const handleRemoveItemRow = (index: number) => {
    if (formItems.length <= 1) return
    setFormItems((prev) => prev.filter((_, i) => i !== index))
  }

  const handleItemChange = (
    index: number,
    field: keyof NewDispatchItemForm,
    value: string,
  ) => {
    setFormItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    )
  }

  const handleCreateSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setCreateError(null)

    const orderIdNum = Number(formOrderId)
    if (!orderIdNum || isNaN(orderIdNum) || orderIdNum <= 0) {
      setCreateError('Valid Customer Order ID is required.')
      return
    }

    const parsedItems: DispatchItemRequest[] = []
    for (let i = 0; i < formItems.length; i++) {
      const item = formItems[i]
      const batchId = Number(item.finishedBatchId)
      const qty = Number(item.quantity)
      const allocId = item.allocationId.trim() ? Number(item.allocationId) : undefined

      if (!batchId || isNaN(batchId) || batchId <= 0) {
        setCreateError(`Item row ${i + 1}: Valid Finished Batch ID is required.`)
        return
      }
      if (!qty || isNaN(qty) || qty <= 0) {
        setCreateError(`Item row ${i + 1}: Positive quantity is required.`)
        return
      }

      parsedItems.push({
        finishedBatchId: batchId,
        quantity: qty,
        allocationId: allocId,
      })
    }

    if (parsedItems.length === 0) {
      setCreateError('At least one dispatch item is required.')
      return
    }

    const payload: CreateDispatchRequest = {
      orderId: orderIdNum,
      vehicleId: formVehicleId ? Number(formVehicleId) : undefined,
      driverId: formDriverId ? Number(formDriverId) : undefined,
      carrier: formCarrier.trim() || undefined,
      shippingMethod: formShippingMethod.trim() || undefined,
      trackingNumber: formTrackingNumber.trim() || undefined,
      dispatchDate: formDispatchDate || undefined,
      expectedDeliveryDate: formExpectedDeliveryDate || undefined,
      items: parsedItems,
      autoDispatch: formAutoDispatch,
    }

    setCreateSubmitting(true)
    try {
      const created = await createDispatch(payload)
      setDispatches((prev) => [created, ...prev])
      setCreateModalOpen(false)
      handleResetCreateForm()
      setActionSuccessMessage(
        `Dispatch shipment ${created.dispatchNumber} created successfully${
          created.status === 'Dispatched' ? ' and marked as Dispatched' : ''
        }.`,
      )
    } catch (err) {
      setCreateError(getApiError(err, 'Failed to create dispatch shipment.').message)
    } finally {
      setCreateSubmitting(false)
    }
  }

  // Pallet Lookup Handler
  const handlePalletLookup = async (e: FormEvent) => {
    e.preventDefault()
    if (!palletQuery.trim()) return
    setPalletLoading(true)
    setPalletError(null)
    setSearchedPallet(null)
    try {
      const result = await getPalletByIdentifier(palletQuery.trim())
      setSearchedPallet(result)
    } catch {
      setPalletError(`Pallet '${palletQuery}' not found in warehouse records.`)
    } finally {
      setPalletLoading(false)
    }
  }

  // Finished Goods Metrics Handler
  const handleLoadMetrics = async (productionId: number) => {
    const request = ++metricsRequest.current
    setMetricsError(null)
    setRunMetrics(null)
    setSelectedRunId(productionId)
    setMetricsLoading(true)
    try {
      const data = await getFinishedGoodsMetrics(productionId)
      if (request === metricsRequest.current) setRunMetrics(data)
    } catch (err) {
      if (request === metricsRequest.current) {
        setMetricsError(getApiError(err, 'Unable to load finished-goods metrics.').message)
      }
    } finally {
      if (request === metricsRequest.current) setMetricsLoading(false)
    }
  }

  // Document Download Handler
  const handleDownloadDoc = async (doc: StoredDocumentResponse) => {
    try {
      const blob = await downloadDispatchDocument(doc.documentId)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = doc.fileName || `document_${doc.documentId}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      alert('Failed to download shipping document.')
    }
  }

  // Filtered Dispatches List
  const filteredDispatches = useMemo(() => {
    return dispatches.filter((d) => {
      const matchesStatus =
        statusFilter === 'ALL' || d.status?.toUpperCase() === statusFilter.toUpperCase()

      if (!matchesStatus) return false
      if (!searchQuery.trim()) return true

      const query = searchQuery.toLowerCase()
      return (
        d.dispatchNumber?.toLowerCase().includes(query) ||
        d.orderNumber?.toLowerCase().includes(query) ||
        d.customerName?.toLowerCase().includes(query) ||
        d.vehicleNumber?.toLowerCase().includes(query) ||
        d.driverName?.toLowerCase().includes(query) ||
        d.carrier?.toLowerCase().includes(query) ||
        d.trackingNumber?.toLowerCase().includes(query) ||
        d.items?.some(
          (item) =>
            item.productName?.toLowerCase().includes(query) ||
            item.productCode?.toLowerCase().includes(query) ||
            item.finishedBatchNo?.toLowerCase().includes(query),
        )
      )
    })
  }, [dispatches, statusFilter, searchQuery])

  // Summary Metrics calculated from live dispatches
  const dispatchMetrics = useMemo(() => {
    const total = dispatches.length
    const prepared = dispatches.filter((d) => d.status?.toUpperCase() === 'PREPARED').length
    const inTransit = dispatches.filter((d) => d.status?.toUpperCase() === 'DISPATCHED').length
    const delivered = dispatches.filter((d) => d.status?.toUpperCase() === 'DELIVERED').length
    const cancelled = dispatches.filter((d) => d.status?.toUpperCase() === 'CANCELLED').length
    return { total, prepared, inTransit, delivered, cancelled }
  }, [dispatches])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dispatch & Outbound Logistics"
        description="Manage customer outbound shipments, vehicle carrier staging, inventory deductions, and delivery tracking."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={loadData}
              disabled={loading}
              className="min-h-11 min-w-11"
            >
              <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
              Refresh
            </Button>
            {canCreate && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  handleResetCreateForm()
                  setCreateModalOpen(true)
                }}
                className="min-h-11 min-w-11"
              >
                <Plus className="size-3.5" aria-hidden="true" />
                Create Dispatch
              </Button>
            )}
          </div>
        }
      />

      {/* Sub-navigation Tabs */}
      <div className="flex border-b border-slate-200">
        <nav className="-mb-px flex space-x-6" aria-label="Dispatch Sections">
          <button
            type="button"
            onClick={() => setActiveDispatchTab('DISPATCHES')}
            className={`flex items-center gap-2 border-b-2 py-3 px-1 text-sm font-semibold transition-colors min-h-11 ${
              activeDispatchTab === 'DISPATCHES'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
            }`}
          >
            <Truck className="size-4" />
            Outbound Dispatches
          </button>
          <button
            type="button"
            onClick={() => setActiveDispatchTab('DRIVERS')}
            className={`flex items-center gap-2 border-b-2 py-3 px-1 text-sm font-semibold transition-colors min-h-11 ${
              activeDispatchTab === 'DRIVERS'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
            }`}
          >
            <User className="size-4" />
            Driver Management
          </button>
          <button
            type="button"
            onClick={() => setActiveDispatchTab('VEHICLES')}
            className={`flex items-center gap-2 border-b-2 py-3 px-1 text-sm font-semibold transition-colors min-h-11 ${
              activeDispatchTab === 'VEHICLES'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
            }`}
          >
            <Truck className="size-4" />
            Fleet & Vehicles
          </button>
        </nav>
      </div>

      {activeDispatchTab === 'DRIVERS' && (
        <DriverRosterView isFullAccess={isFull} />
      )}

      {activeDispatchTab === 'VEHICLES' && (
        <VehicleRosterView isFullAccess={isFull} />
      )}

      {activeDispatchTab === 'DISPATCHES' && (
        <>
      {/* Success Banner */}
      {actionSuccessMessage && (
        <div
          className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
          role="status"
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="size-5 shrink-0 text-emerald-600" aria-hidden="true" />
            <span>{actionSuccessMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccessMessage(null)}
            className="rounded p-1 text-emerald-600 hover:bg-emerald-100"
            aria-label="Dismiss success message"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Action Error Banner */}
      {actionError && (
        <div
          className="flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
          role="alert"
        >
          <div className="flex items-center gap-2.5">
            <AlertCircle className="size-5 shrink-0 text-rose-600" aria-hidden="true" />
            <span>{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="rounded p-1 text-rose-600 hover:bg-rose-100"
            aria-label="Dismiss error message"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Main Core Error Banner */}
      {error && (
        <ErrorState
          title="Dispatch Request Failed"
          description={error}
          onRetry={loadData}
          retryLabel="Retry"
        />
      )}

      {/* Industrial Dispatch KPI Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <div className="flex items-center gap-2 text-slate-500">
            <Truck className="size-4 text-slate-600" aria-hidden="true" />
            <p className="text-xs font-semibold uppercase tracking-wider">Total Shipments</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {loading ? '—' : dispatchMetrics.total}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">All recorded outbound dispatches</p>
        </Card>

        <Card>
          <div className="flex items-center gap-2 text-amber-600">
            <Clock className="size-4" aria-hidden="true" />
            <p className="text-xs font-semibold uppercase tracking-wider">Prepared / Staging</p>
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-amber-600">
            {loading ? '—' : dispatchMetrics.prepared}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">Awaiting carrier dispatch</p>
        </Card>

        <Card>
          <div className="flex items-center gap-2 text-sky-600">
            <Truck className="size-4" aria-hidden="true" />
            <p className="text-xs font-semibold uppercase tracking-wider">In-Transit / Dispatched</p>
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-sky-600">
            {loading ? '—' : dispatchMetrics.inTransit}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">En route to customer facilities</p>
        </Card>

        <Card>
          <div className="flex items-center gap-2 text-emerald-600">
            <CheckCircle2 className="size-4" aria-hidden="true" />
            <p className="text-xs font-semibold uppercase tracking-wider">Delivered</p>
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-emerald-600">
            {loading ? '—' : dispatchMetrics.delivered}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">Fulfilled & proof-of-delivery verified</p>
        </Card>
      </div>

      {/* Main Dispatch Ledger Card */}
      <Card className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <h2 className="font-bold text-slate-900 text-base">Outbound Dispatch Ledger</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Live backend shipments, freight carriers, vehicle registrations, and item manifests.
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-1.5 rounded-lg bg-slate-100 p-1 text-xs">
            {['ALL', 'Prepared', 'Dispatched', 'Delivered', 'Cancelled'].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`min-h-8 rounded-md px-3 py-1 font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-white font-bold text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {status === 'ALL' ? 'All Dispatches' : status}
              </button>
            ))}
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Dispatch #, Order #, Customer, Vehicle, Driver, Carrier, or Product..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full min-h-11 rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm placeholder-slate-400 focus:border-slate-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Table / Empty State / Loading */}
        {loading ? (
          <div className="py-16 text-center">
            <LoadingSpinner label="Loading dispatch records from backend..." size="lg" />
          </div>
        ) : filteredDispatches.length === 0 ? (
          <EmptyState
            icon={<Truck className="size-10 text-slate-400" />}
            title="No dispatches found"
            description={
              searchQuery || statusFilter !== 'ALL'
                ? 'No dispatch records match your current filter criteria.'
                : 'No outbound shipments have been created yet. Click "+ Create Dispatch" to start a new outbound shipment.'
            }
          />
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <div
              className="max-w-full overflow-x-auto overscroll-x-contain"
              tabIndex={0}
              role="region"
              aria-label="Dispatch Outbound Ledger Table"
            >
              <table className="w-full min-w-[56rem] border-collapse text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Dispatch #</th>
                    <th className="px-4 py-3">Order & Customer</th>
                    <th className="px-4 py-3">Vehicle & Driver</th>
                    <th className="px-4 py-3">Carrier / Tracking</th>
                    <th className="px-4 py-3 text-right">Items / Qty</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredDispatches.map((d) => {
                    const totalQty = d.items?.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0) || 0
                    const primaryUom = d.items?.[0]?.uom || 'units'
                    const isPrepared = d.status?.toUpperCase() === 'PREPARED'
                    const isDispatched = d.status?.toUpperCase() === 'DISPATCHED'
                    const isDelivered = d.status?.toUpperCase() === 'DELIVERED'
                    const isCancelled = d.status?.toUpperCase() === 'CANCELLED'

                    return (
                      <tr
                        key={d.dispatchId}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="px-4 py-3.5">
                          <button
                            type="button"
                            onClick={() => handleOpenDetails(d.dispatchId)}
                            className="font-mono text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
                          >
                            {d.dispatchNumber}
                          </button>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {d.dispatchDate || (d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '—')}
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-slate-900 text-xs">
                            {d.customerName || 'Customer N/A'}
                          </div>
                          <div className="text-[11px] font-mono text-slate-500">
                            {d.orderNumber ? `Order: ${d.orderNumber}` : d.orderId ? `Order ID #${d.orderId}` : 'No Order Ref'}
                          </div>
                        </td>

                        <td className="px-4 py-3.5 text-xs">
                          {d.vehicleNumber ? (
                            <div className="font-mono font-medium text-slate-800">
                              {d.vehicleNumber}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">No vehicle</span>
                          )}
                          <div className="text-[11px] text-slate-500">
                            {d.driverName ? d.driverName : 'Unassigned driver'}
                          </div>
                        </td>

                        <td className="px-4 py-3.5 text-xs">
                          <div className="font-medium text-slate-800">
                            {d.carrier || d.shippingMethod || 'Direct Freight'}
                          </div>
                          {d.trackingNumber && (
                            <div className="text-[11px] font-mono text-slate-500">
                              TRK: {d.trackingNumber}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-right font-mono text-xs">
                          <div className="font-bold text-slate-900">
                            {totalQty.toLocaleString()} {primaryUom}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {d.items?.length || 0} line item{d.items?.length === 1 ? '' : 's'}
                          </div>
                        </td>

                        <td className="px-4 py-3.5 text-center">
                          <StatusBadge tone={toneForDispatchStatus(d.status)}>
                            {d.status}
                          </StatusBadge>
                        </td>

                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleOpenDetails(d.dispatchId)}
                              title="View Dispatch Details"
                              className="min-h-9 px-2.5 text-xs"
                            >
                              <Eye className="size-3.5" aria-hidden="true" />
                              Details
                            </Button>

                            {isFull && isPrepared && (
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => setConfirmAction({ type: 'dispatch', dispatch: d })}
                                title="Confirm and mark shipment as Dispatched"
                                className="min-h-9 px-2.5 text-xs bg-sky-600 hover:bg-sky-700"
                              >
                                <Truck className="size-3.5" aria-hidden="true" />
                                Dispatch
                              </Button>
                            )}

                            {isFull && isDispatched && (
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => setConfirmAction({ type: 'deliver', dispatch: d })}
                                title="Mark shipment as Delivered"
                                className="min-h-9 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700"
                              >
                                <CheckCircle2 className="size-3.5" aria-hidden="true" />
                                Delivered
                              </Button>
                            )}

                            {isFull && !isDelivered && !isCancelled && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setConfirmAction({ type: 'cancel', dispatch: d })}
                                title="Cancel this shipment"
                                className="min-h-9 px-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                              >
                                <Ban className="size-3.5" aria-hidden="true" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>

      {/* Grid Section: Supporting Warehouse & Logistics Tools */}
      <div className={`grid gap-6 ${hasPalletAccess ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
        {/* Card 1: Pallet Shipment Verification (Permission-Aware) */}
        {hasPalletAccess && (
          <Card className="p-5">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <Boxes className="size-5 text-blue-600" aria-hidden="true" />
              <h2>Pallet Shipment & Barcode Verification</h2>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Lookup a pallet barcode or identifier to verify warehouse staging and outbound readiness.
            </p>

            <form onSubmit={handlePalletLookup} className="mt-4 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Enter pallet ID or barcode (e.g. PAL-2026-001)"
                  value={palletQuery}
                  onChange={(e) => setPalletQuery(e.target.value)}
                  className="w-full min-h-11 rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm placeholder-slate-400 focus:border-slate-500 focus:outline-none"
                />
              </div>
              <Button
                type="submit"
                loading={palletLoading}
                disabled={!palletQuery.trim()}
                className="min-h-11"
              >
                Verify
              </Button>
            </form>

            {palletError && (
              <div
                className="mt-3 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-800"
                role="alert"
              >
                <AlertCircle className="size-4 shrink-0 text-red-600" aria-hidden="true" />
                <span>{palletError}</span>
              </div>
            )}

            {searchedPallet && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-mono text-sm font-bold text-slate-900">
                      {searchedPallet.palletCode}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Barcode: <span className="font-mono text-slate-700">{searchedPallet.barcode || '—'}</span> · Warehouse ID: #{searchedPallet.warehouseId}
                    </p>
                  </div>
                  <StatusBadge tone={toneForPalletStatus(searchedPallet.status)}>
                    {searchedPallet.status}
                  </StatusBadge>
                </div>

                <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white text-xs p-3 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Pallet Record ID:</span>
                    <span className="font-mono font-bold text-slate-900">#{searchedPallet.palletId}</span>
                  </div>
                  <div className="flex justify-between pt-1.5">
                    <span className="text-slate-500">Finished Batch Ref:</span>
                    <span className="font-mono font-medium text-slate-800">
                      {searchedPallet.finishedBatchId ? `#${searchedPallet.finishedBatchId}` : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1.5">
                    <span className="text-slate-500">Allocated Quantity:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {searchedPallet.quantity != null ? `${searchedPallet.quantity} units` : '—'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Card 2: Fleet & Transporter Telemetry */}
        <Card className="p-5">
          <div className="flex items-center gap-2 font-bold text-slate-900">
            <Truck className="size-5 text-indigo-600" aria-hidden="true" />
            <h2>Fleet & Driver Roster</h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Active logistics vehicles and certified drivers registered in master fleet records.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Registered Vehicles
              </div>
              <div className="mt-2 text-xl font-bold font-mono text-slate-900">
                {vehicles.length}
              </div>
              <p className="mt-0.5 text-[11px] text-slate-500">
                {vehicles.filter((v) => v.isActive).length} active in fleet
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Authorized Drivers
              </div>
              <div className="mt-2 text-xl font-bold font-mono text-slate-900">
                {drivers.length}
              </div>
              <p className="mt-0.5 text-[11px] text-slate-500">
                {drivers.filter((d) => d.isActive).length} active licenses
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Fleet Overview
            </h3>
            <div className="max-h-36 overflow-y-auto space-y-1.5 text-xs">
              {vehicles.map((v) => (
                <div
                  key={v.vehicleId}
                  className="flex items-center justify-between rounded border border-slate-200 bg-white px-3 py-1.5"
                >
                  <span className="font-mono font-bold text-slate-800">{v.vehicleNumber}</span>
                  <span className="text-slate-500">
                    {v.vehicleType || 'Truck'} · {v.capacity ? `${v.capacity} ${v.capacityUomCode || 'KG'}` : 'Standard'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Finished Goods Outbound Production Log (Permission-Aware) */}
      {hasProductionAccess && (
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h2 className="font-bold text-slate-900">Finished Goods Manufacturing Log</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Manufacturing outputs, bag counts, and quality release clearance for outbound shipping.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center">
              <LoadingSpinner label="Loading finished goods production records..." size="sm" />
            </div>
          ) : runs.length === 0 ? (
            <EmptyState
              icon={<Boxes className="size-10 text-slate-400" />}
              title="No finished goods records"
              description="No production runs are currently logged in the manufacturing system."
            />
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <div
                className="max-w-full overflow-x-auto overscroll-x-contain"
                tabIndex={0}
                role="region"
                aria-label="Finished Goods Log Table"
              >
                <table className="w-full min-w-[48rem] border-collapse text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-600">
                    <tr>
                      <th className="px-5 py-3">Production Run</th>
                      <th className="px-5 py-3">Manufacturing Plant</th>
                      <th className="px-5 py-3 text-right">Bags Produced</th>
                      <th className="px-5 py-3 text-right">Output Weight</th>
                      <th className="px-5 py-3 text-center">QC Clearance</th>
                      <th className="px-5 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {runs.map((run) => {
                      const runQc = inspections.find((q) => q.productionRunId === run.productionId)
                      const isPassed = runQc?.status?.toLowerCase() === 'pass'
                      const isFailed = runQc?.status?.toLowerCase() === 'fail'
                      const isSelected = selectedRunId === run.productionId

                      return (
                        <tr
                          key={run.productionId}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isSelected ? 'bg-slate-50' : ''
                          }`}
                        >
                          <td className="px-5 py-3.5">
                            <div className="font-mono text-xs font-bold text-slate-900">
                              {run.productionNumber}
                            </div>
                            <div className="text-xs text-slate-500">Run ID #{run.productionId}</div>
                          </td>

                          <td className="px-5 py-3.5 text-xs font-medium text-slate-700">
                            {run.plantName || '—'}
                          </td>

                          <td className="px-5 py-3.5 text-right font-mono text-xs font-bold text-slate-900">
                            {run.bagsProduced != null ? `${run.bagsProduced.toLocaleString()} bags` : '—'}
                          </td>

                          <td className="px-5 py-3.5 text-right font-mono text-xs text-slate-800">
                            {run.outputWeightKg != null ? `${run.outputWeightKg.toLocaleString()} kg` : '—'}
                          </td>

                          <td className="px-5 py-3.5 text-center">
                            {!hasQualityAccess ? (
                              <span className="text-xs text-slate-400">QC N/A</span>
                            ) : isPassed ? (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                                <CheckCircle2 className="size-3" aria-hidden="true" />
                                Passed
                              </span>
                            ) : isFailed ? (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                                <XCircle className="size-3" aria-hidden="true" />
                                Failed
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                                <Clock className="size-3" aria-hidden="true" />
                                Pending
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-3.5 text-right">
                            <Button
                              size="sm"
                              variant={isSelected ? 'primary' : 'secondary'}
                              onClick={() => handleLoadMetrics(run.productionId)}
                              className="text-xs min-h-9"
                            >
                              FG Metrics
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Selected Run Metrics Panel */}
          {selectedRunId && (
            <div className="mt-5 rounded-xl border border-slate-300 bg-slate-50 p-4 transition-all">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <Boxes className="size-4 text-slate-700" aria-hidden="true" />
                  <h3 className="font-bold text-slate-900 text-sm">
                    Finished Goods Production Metrics — Run #{selectedRunId}
                  </h3>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setSelectedRunId(null)}>
                  <X className="size-3.5" aria-hidden="true" />
                  Close
                </Button>
              </div>

              {metricsLoading ? (
                <div className="py-8 text-center">
                  <LoadingSpinner label="Loading finished goods yield & scrap metrics..." size="sm" />
                </div>
              ) : metricsError ? (
                <div className="mt-3">
                  <ErrorState
                    title="Metrics Unavailable"
                    description={metricsError}
                    onRetry={() => {
                      if (selectedRunId != null) void handleLoadMetrics(selectedRunId)
                    }}
                  />
                </div>
              ) : runMetrics ? (
                <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <dt className="text-xs text-slate-500 font-medium">Bags Produced</dt>
                    <dd className="mt-1 font-mono text-xl font-bold text-slate-900">
                      {runMetrics.bagsProduced ?? '—'}
                    </dd>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <dt className="text-xs text-slate-500 font-medium">Avg Bag Weight</dt>
                    <dd className="mt-1 font-mono text-xl font-bold text-slate-900">
                      {runMetrics.averageBagWeightG != null ? `${runMetrics.averageBagWeightG} g` : '—'}
                    </dd>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <dt className="text-xs text-slate-500 font-medium">Manufacturing Yield</dt>
                    <dd className="mt-1 font-mono text-xl font-bold text-emerald-600">
                      {runMetrics.yieldPercentage != null ? `${runMetrics.yieldPercentage}%` : '—'}
                    </dd>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <dt className="text-xs text-slate-500 font-medium">Scrap / Trim Rate</dt>
                    <dd className="mt-1 font-mono text-xl font-bold text-amber-600">
                      {runMetrics.scrapPercentage != null ? `${runMetrics.scrapPercentage}%` : '—'}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="mt-3 text-xs text-slate-500 italic">
                  No detailed finished-goods metrics calculated for this manufacturing run.
                </p>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Shipping Documents Section (Permission-Aware) */}
      {hasDocumentsAccess && (
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h2 className="font-bold text-slate-900">Dispatch Documents & Shipping Labels</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Pallet barcode labels, material delivery challans, and shipping documentation in object storage.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center">
              <LoadingSpinner label="Loading stored shipping documents..." />
            </div>
          ) : documents.length === 0 ? (
            <EmptyState
              icon={<FileText className="size-10 text-slate-400" />}
              title="No shipping documents"
              description="No pallet labels or outbound dispatch documents have been generated yet."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {documents.map((doc) => (
                <div
                  key={doc.documentId}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-xs text-xs hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                      <FileText className="size-5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900" title={doc.fileName}>
                        {doc.fileName}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {doc.category || 'General'} ·{' '}
                        {doc.uploadedAt
                          ? new Date(doc.uploadedAt).toLocaleDateString()
                          : 'Date N/A'}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleDownloadDoc(doc)}
                    title={`Download ${doc.fileName}`}
                    className="min-h-9 min-w-9"
                  >
                    <Download className="size-3.5" aria-hidden="true" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
      </>
      )}

      {/* Create Dispatch Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => {
          if (!createSubmitting) setCreateModalOpen(false)
        }}
        title="Create Outbound Dispatch Shipment"
        description="Stage and register a customer order shipment with designated vehicle, driver, and finished goods batch items."
        size="xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-5">
          {createError && (
            <div
              className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800"
              role="alert"
            >
              <AlertCircle className="size-4 shrink-0 text-rose-600" />
              <span>{createError}</span>
            </div>
          )}

          {/* Section 1: Order & Logistics Info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="form-order-id" className="block text-xs font-semibold text-slate-700 mb-1">
                Customer Order ID <span className="text-rose-500">*</span>
              </label>
              <input
                id="form-order-id"
                type="number"
                min="1"
                required
                placeholder="e.g. 1"
                value={formOrderId}
                onChange={(e) => setFormOrderId(e.target.value)}
                className="w-full min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none font-mono"
              />
              <p className="mt-1 text-[11px] text-slate-500">Backend Customer Order record reference ID.</p>
            </div>

            <div>
              <label htmlFor="form-carrier" className="block text-xs font-semibold text-slate-700 mb-1">
                Transporter / Carrier
              </label>
              <input
                id="form-carrier"
                type="text"
                placeholder="e.g. DTDC Logistics / Internal Fleet"
                value={formCarrier}
                onChange={(e) => setFormCarrier(e.target.value)}
                className="w-full min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="form-vehicle" className="block text-xs font-semibold text-slate-700 mb-1">
                Transport Vehicle
              </label>
              <select
                id="form-vehicle"
                value={formVehicleId}
                onChange={(e) => setFormVehicleId(e.target.value)}
                className="w-full min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none bg-white"
              >
                <option value="">-- Select Fleet Vehicle (Optional) --</option>
                {vehicles.map((v) => (
                  <option key={v.vehicleId} value={v.vehicleId}>
                    {v.vehicleNumber} ({v.vehicleType || 'Truck'}{' '}
                    {v.capacity ? `- ${v.capacity} ${v.capacityUomCode || 'KG'}` : ''})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="form-driver" className="block text-xs font-semibold text-slate-700 mb-1">
                Assigned Driver
              </label>
              <select
                id="form-driver"
                value={formDriverId}
                onChange={(e) => setFormDriverId(e.target.value)}
                className="w-full min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none bg-white"
              >
                <option value="">-- Select Driver (Optional) --</option>
                {drivers.map((d) => (
                  <option key={d.driverId} value={d.driverId}>
                    {d.driverName} {d.phone ? `(${d.phone})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="form-shipping-method" className="block text-xs font-semibold text-slate-700 mb-1">
                Shipping Method
              </label>
              <input
                id="form-shipping-method"
                type="text"
                placeholder="e.g. Road Freight / Express Lorry"
                value={formShippingMethod}
                onChange={(e) => setFormShippingMethod(e.target.value)}
                className="w-full min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="form-tracking-no" className="block text-xs font-semibold text-slate-700 mb-1">
                Tracking Number
              </label>
              <input
                id="form-tracking-no"
                type="text"
                placeholder="e.g. TRK-2026-8902"
                value={formTrackingNumber}
                onChange={(e) => setFormTrackingNumber(e.target.value)}
                className="w-full min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none font-mono"
              />
            </div>

            <div>
              <label htmlFor="form-dispatch-date" className="block text-xs font-semibold text-slate-700 mb-1">
                Dispatch Date
              </label>
              <input
                id="form-dispatch-date"
                type="date"
                value={formDispatchDate}
                onChange={(e) => setFormDispatchDate(e.target.value)}
                className="w-full min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="form-expected-delivery" className="block text-xs font-semibold text-slate-700 mb-1">
                Expected Delivery Date
              </label>
              <input
                id="form-expected-delivery"
                type="date"
                value={formExpectedDeliveryDate}
                onChange={(e) => setFormExpectedDeliveryDate(e.target.value)}
                className="w-full min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Section 2: Line Items */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Dispatch Items Manifest <span className="text-rose-500">*</span>
              </h3>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={handleAddItemRow}
                className="text-xs min-h-9"
              >
                <Plus className="size-3.5" />
                Add Item
              </Button>
            </div>

            <div className="space-y-2">
              {formItems.map((item, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-12 gap-2 items-center rounded-lg border border-slate-200 bg-white p-3"
                >
                  <div className="col-span-12 sm:col-span-4">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Finished Batch ID <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      placeholder="e.g. 1"
                      value={item.finishedBatchId}
                      onChange={(e) => handleItemChange(idx, 'finishedBatchId', e.target.value)}
                      className="w-full min-h-10 rounded border border-slate-300 px-2.5 py-1.5 text-xs font-mono focus:border-slate-500 focus:outline-none"
                    />
                  </div>

                  <div className="col-span-12 sm:col-span-3">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Quantity <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      required
                      placeholder="e.g. 500"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                      className="w-full min-h-10 rounded border border-slate-300 px-2.5 py-1.5 text-xs font-mono focus:border-slate-500 focus:outline-none"
                    />
                  </div>

                  <div className="col-span-10 sm:col-span-4">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Allocation ID (Optional)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 1"
                      value={item.allocationId}
                      onChange={(e) => handleItemChange(idx, 'allocationId', e.target.value)}
                      className="w-full min-h-10 rounded border border-slate-300 px-2.5 py-1.5 text-xs font-mono focus:border-slate-500 focus:outline-none"
                    />
                  </div>

                  <div className="col-span-2 sm:col-span-1 flex justify-end pt-5">
                    <button
                      type="button"
                      disabled={formItems.length <= 1}
                      onClick={() => handleRemoveItemRow(idx)}
                      className="flex min-h-10 min-w-10 items-center justify-center rounded p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30 transition-colors"
                      title="Remove Item Row"
                      aria-label={`Remove item row ${idx + 1}`}
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Auto-dispatch option */}
          <div className="rounded-lg border border-indigo-100 bg-indigo-50/70 p-3.5 flex items-start gap-3">
            <input
              type="checkbox"
              id="form-auto-dispatch"
              checked={formAutoDispatch}
              onChange={(e) => setFormAutoDispatch(e.target.checked)}
              className="mt-1 size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="form-auto-dispatch" className="text-xs text-indigo-950 cursor-pointer">
              <strong className="font-semibold text-indigo-900">Auto-Dispatch Immediately:</strong>
              <p className="mt-0.5 text-indigo-800">
                If checked, the system will immediately execute the outbound dispatch workflow, deduct the finished goods quantities from inventory, and generate ledger transactions.
              </p>
            </label>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setCreateModalOpen(false)}
              disabled={createSubmitting}
              className="min-h-11 px-4"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={createSubmitting}
              className="min-h-11 px-5"
            >
              {formAutoDispatch ? 'Create & Dispatch Shipment' : 'Create Dispatch (Prepared)'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Dispatch Detail Drawer */}
      <Drawer
        isOpen={selectedDispatchId != null}
        onClose={handleCloseDrawer}
        title={
          selectedDispatch ? (
            <div className="flex items-center gap-2">
              <span className="font-mono">{selectedDispatch.dispatchNumber}</span>
              <StatusBadge tone={toneForDispatchStatus(selectedDispatch.status)}>
                {selectedDispatch.status}
              </StatusBadge>
            </div>
          ) : (
            'Dispatch Details'
          )
        }
        description="Complete outbound consignment, carrier allocation, item manifest, and audit details."
        size="xl"
        footer={
          selectedDispatch && (
            <div className="flex items-center justify-between w-full">
              <div className="text-xs text-slate-500">
                Status: <strong className="text-slate-800 font-semibold">{selectedDispatch.status}</strong>
              </div>
              <div className="flex items-center gap-2">
                {isFull && selectedDispatch.status?.toUpperCase() === 'PREPARED' && (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() =>
                      setConfirmAction({ type: 'dispatch', dispatch: selectedDispatch })
                    }
                    className="min-h-10 bg-sky-600 hover:bg-sky-700 text-xs"
                  >
                    <Truck className="size-3.5" />
                    Confirm Dispatch
                  </Button>
                )}
                {isFull && selectedDispatch.status?.toUpperCase() === 'DISPATCHED' && (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() =>
                      setConfirmAction({ type: 'deliver', dispatch: selectedDispatch })
                    }
                    className="min-h-10 bg-emerald-600 hover:bg-emerald-700 text-xs"
                  >
                    <CheckCircle2 className="size-3.5" />
                    Mark Delivered
                  </Button>
                )}
                {isFull &&
                  selectedDispatch.status?.toUpperCase() !== 'DELIVERED' &&
                  selectedDispatch.status?.toUpperCase() !== 'CANCELLED' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setConfirmAction({ type: 'cancel', dispatch: selectedDispatch })
                      }
                      className="min-h-10 text-rose-600 hover:bg-rose-50 text-xs"
                    >
                      <Ban className="size-3.5" />
                      Cancel Shipment
                    </Button>
                  )}
                <Button size="sm" variant="secondary" onClick={handleCloseDrawer} className="min-h-10 text-xs">
                  Close
                </Button>
              </div>
            </div>
          )
        }
      >
        {detailLoading ? (
          <div className="py-16 text-center">
            <LoadingSpinner label="Loading dispatch shipment breakdown..." size="lg" />
          </div>
        ) : detailError ? (
          <ErrorState
            title="Unable to load dispatch"
            description={detailError}
            onRetry={() => {
              if (selectedDispatchId) void handleOpenDetails(selectedDispatchId)
            }}
          />
        ) : selectedDispatch ? (
          <div className="space-y-6 text-sm">
            {/* Customer & Order Reference Grid */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Customer & Order Information
              </h3>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <dt className="text-slate-500">Customer Name</dt>
                  <dd className="font-semibold text-slate-900 text-sm mt-0.5">
                    {selectedDispatch.customerName || '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Order Reference</dt>
                  <dd className="font-mono font-bold text-slate-900 mt-0.5">
                    {selectedDispatch.orderNumber || (selectedDispatch.orderId ? `Order #${selectedDispatch.orderId}` : '—')}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Dispatch Number</dt>
                  <dd className="font-mono font-bold text-slate-800 mt-0.5">
                    {selectedDispatch.dispatchNumber}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Dispatch Record ID</dt>
                  <dd className="font-mono text-slate-700 mt-0.5">#{selectedDispatch.dispatchId}</dd>
                </div>
              </dl>
            </div>

            {/* Transport & Carrier Details */}
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                <Truck className="size-4 text-indigo-600" />
                Transport & Carrier Details
              </h3>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <dt className="text-slate-500">Transporter / Carrier</dt>
                  <dd className="font-medium text-slate-900 mt-0.5">
                    {selectedDispatch.carrier || 'Direct / Internal'}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Shipping Method</dt>
                  <dd className="font-medium text-slate-900 mt-0.5">
                    {selectedDispatch.shippingMethod || 'Standard Road Freight'}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Tracking Number</dt>
                  <dd className="font-mono font-bold text-slate-900 mt-0.5">
                    {selectedDispatch.trackingNumber || 'Not assigned'}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Assigned Vehicle</dt>
                  <dd className="font-mono font-bold text-slate-900 mt-0.5">
                    {selectedDispatch.vehicleNumber || 'Unassigned'}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500 flex items-center gap-1">
                    <User className="size-3 text-slate-400" /> Driver Name
                  </dt>
                  <dd className="font-medium text-slate-900 mt-0.5">
                    {selectedDispatch.driverName || 'Unassigned'}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500 flex items-center gap-1">
                    <Phone className="size-3 text-slate-400" /> Driver Phone
                  </dt>
                  <dd className="font-mono text-slate-800 mt-0.5">
                    {selectedDispatch.driverPhone || '—'}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Schedule & Audit Timestamps */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                <Calendar className="size-4 text-slate-600" />
                Schedule & Audit Trail
              </h3>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <dt className="text-slate-500">Scheduled Dispatch Date</dt>
                  <dd className="font-medium text-slate-900 mt-0.5">
                    {selectedDispatch.dispatchDate || '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Expected Delivery Date</dt>
                  <dd className="font-medium text-slate-900 mt-0.5">
                    {selectedDispatch.expectedDeliveryDate || '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Actual Delivery Date</dt>
                  <dd className="font-medium text-slate-900 mt-0.5">
                    {selectedDispatch.actualDeliveryDate || 'Pending arrival'}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Created By User</dt>
                  <dd className="font-medium text-slate-900 mt-0.5">
                    {selectedDispatch.createdByUserName || 'System'}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Items Manifest */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Item Manifest ({selectedDispatch.items?.length || 0} line items)
              </h3>
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-100 font-semibold uppercase text-slate-600">
                    <tr>
                      <th className="px-3 py-2">Batch #</th>
                      <th className="px-3 py-2">Product Name</th>
                      <th className="px-3 py-2">Code</th>
                      <th className="px-3 py-2 text-right">Quantity</th>
                      <th className="px-3 py-2">UOM</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {selectedDispatch.items?.map((item) => (
                      <tr key={item.dispatchItemId} className="hover:bg-slate-50">
                        <td className="px-3 py-2.5 font-mono font-bold text-slate-900">
                          {item.finishedBatchNo || `#${item.finishedBatchId}`}
                        </td>
                        <td className="px-3 py-2.5 font-medium text-slate-800">
                          {item.productName || '—'}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-slate-600">
                          {item.productCode || '—'}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900">
                          {Number(item.quantity).toLocaleString()}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600">{item.uom}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}
      </Drawer>

      {/* Action Confirmation Modal */}
      <Modal
        isOpen={confirmAction != null}
        onClose={() => {
          if (!actionProcessing) setConfirmAction(null)
        }}
        title={
          confirmAction?.type === 'dispatch'
            ? 'Confirm Outbound Dispatch'
            : confirmAction?.type === 'deliver'
              ? 'Mark Shipment as Delivered'
              : 'Cancel Outbound Dispatch'
        }
        description={
          confirmAction?.type === 'dispatch'
            ? `Are you sure you want to mark shipment ${confirmAction?.dispatch.dispatchNumber} as Dispatched?`
            : confirmAction?.type === 'deliver'
              ? `Confirm customer receipt of shipment ${confirmAction?.dispatch.dispatchNumber}?`
              : `Are you sure you want to cancel shipment ${confirmAction?.dispatch.dispatchNumber}?`
        }
        size="md"
      >
        <div className="space-y-4 text-xs">
          {confirmAction?.type === 'dispatch' && (
            <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sky-900">
              <p className="font-semibold">Inventory Deduction Warning:</p>
              <p className="mt-1 leading-relaxed">
                Executing this action will deduct the specified finished goods batch quantities from warehouse inventory and record formal outbound transaction ledger entries.
              </p>
            </div>
          )}

          {confirmAction?.type === 'deliver' && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-900">
              <p className="font-semibold">Delivery Confirmation:</p>
              <p className="mt-1 leading-relaxed">
                This will record the shipment as received at the customer destination and mark the dispatch lifecycle as complete.
              </p>
            </div>
          )}

          {confirmAction?.type === 'cancel' && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-900">
              <p className="font-semibold">Irreversible Cancellation:</p>
              <p className="mt-1 leading-relaxed">
                Once cancelled, this shipment cannot be dispatched or delivered. Any warehouse allocations must be re-staged.
              </p>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setConfirmAction(null)}
              disabled={actionProcessing}
              className="min-h-11 px-4 text-xs"
            >
              Back
            </Button>
            <Button
              type="button"
              variant={confirmAction?.type === 'cancel' ? 'danger' : 'primary'}
              onClick={handleExecuteAction}
              loading={actionProcessing}
              className="min-h-11 px-4 text-xs"
            >
              {confirmAction?.type === 'dispatch'
                ? 'Confirm & Dispatch Stock'
                : confirmAction?.type === 'deliver'
                  ? 'Confirm Delivered'
                  : 'Cancel Shipment'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
