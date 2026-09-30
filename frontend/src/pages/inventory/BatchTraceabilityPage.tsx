import { useCallback, useEffect, useId, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  AlertCircle,
  Barcode,
  Boxes,
  Calendar,
  Camera,
  Check,
  ClipboardCheck,
  Clock,
  Copy,
  Factory,
  FileSpreadsheet,
  FlaskConical,
  GitFork,
  Layers,
  MapPin,
  Package,
  PackagePlus,
  RefreshCw,
  Search,
  Truck,
  User,
  X,
} from 'lucide-react'
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingSpinner,
  PageHeader,
  StatusBadge,
} from '../../components/common'
import { PalletCameraScanner } from '../../components/warehouse/PalletCameraScanner'
import {
  getAvailableBatchSuggestions,
  getBatchTraceability,
} from '../../api/traceabilityApi'
import type {
  AvailableBatchSuggestion,
  BatchTraceabilityResult,
  TraceabilityEventType,
} from '../../types'

export function BatchTraceabilityPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeQuery = (searchParams.get('batch') || searchParams.get('search') || '').trim()

  const [searchInput, setSearchInput] = useState(activeQuery)
  const [traceResult, setTraceResult] = useState<BatchTraceabilityResult | null>(null)
  const [suggestions, setSuggestions] = useState<AvailableBatchSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingSuggestions, setLoadingSuggestions] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [selectedEventType, setSelectedEventType] = useState<string>('ALL')
  const [copiedBatch, setCopiedBatch] = useState(false)
  const [copiedPallet, setCopiedPallet] = useState<string | null>(null)

  const searchInputId = useId()

  // Load available suggestions on mount
  useEffect(() => {
    let cancelled = false
    void Promise.resolve().then(async () => {
      try {
        const list = await getAvailableBatchSuggestions()
        if (!cancelled) {
          setSuggestions(list)
        }
      } catch {
        // Non-critical background suggestions load
      } finally {
        if (!cancelled) {
          setLoadingSuggestions(false)
        }
      }
    })

    return () => {
      cancelled = true
    }
  }, [])

  // Execute search when activeQuery changes
  const executeTraceabilitySearch = useCallback(async (query: string) => {
    const trimmed = query.trim()
    if (!trimmed) {
      setTraceResult(null)
      setError(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await getBatchTraceability(trimmed)
      setTraceResult(result)
    } catch {
      setError('Unable to retrieve traceability records. Please check the network and try again.')
      setTraceResult(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const query = activeQuery.trim()

    if (!query) {
      void Promise.resolve().then(() => {
        if (!cancelled) {
          setTraceResult(null)
          setError(null)
          setLoading(false)
          setSearchInput('')
        }
      })
      return
    }

    void Promise.resolve().then(async () => {
      if (cancelled) return
      setSearchInput(query)
      setLoading(true)
      setError(null)
      try {
        const result = await getBatchTraceability(query)
        if (!cancelled) {
          setTraceResult(result)
        }
      } catch {
        if (!cancelled) {
          setError('Unable to retrieve traceability records. Please check the network and try again.')
          setTraceResult(null)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    })

    return () => {
      cancelled = true
    }
  }, [activeQuery])

  function handleSearchSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault()
    const trimmed = searchInput.trim()
    if (trimmed) {
      setSearchParams({ batch: trimmed })
    } else {
      setSearchParams({})
    }
  }

  function handleSelectBatch(batchNo: string) {
    setSearchInput(batchNo)
    setSearchParams({ batch: batchNo })
  }

  function handleReset() {
    setSearchInput('')
    setSearchParams({})
    setTraceResult(null)
    setError(null)
  }

  function handleCameraScan(code: string) {
    setIsScannerOpen(false)
    if (code) {
      setSearchInput(code)
      setSearchParams({ batch: code })
    }
  }

  function handleCopyText(text: string, isPalletCode = false) {
    navigator.clipboard?.writeText(text)
    if (isPalletCode) {
      setCopiedPallet(text)
      setTimeout(() => setCopiedPallet(null), 2000)
    } else {
      setCopiedBatch(true)
      setTimeout(() => setCopiedBatch(false), 2000)
    }
  }

  // Filter events by selected category
  const filteredEvents = traceResult
    ? traceResult.events.filter((event) => {
        if (selectedEventType === 'ALL') return true
        if (selectedEventType === 'QC') return event.eventType === 'QUALITY_INSPECTION'
        if (selectedEventType === 'TRANSFER') return event.eventType === 'STOCK_TRANSFER'
        if (selectedEventType === 'INTAKE') return event.eventType === 'INTAKE'
        if (selectedEventType === 'PRODUCTION') return event.eventType === 'PRODUCTION_STAGE'
        if (selectedEventType === 'PALLET') return event.eventType === 'PALLETIZATION'
        return true
      })
    : []

  const eventCounts = traceResult
    ? {
        all: traceResult.events.length,
        qc: traceResult.events.filter((e) => e.eventType === 'QUALITY_INSPECTION').length,
        transfer: traceResult.events.filter((e) => e.eventType === 'STOCK_TRANSFER').length,
        intake: traceResult.events.filter((e) => e.eventType === 'INTAKE').length,
        production: traceResult.events.filter((e) => e.eventType === 'PRODUCTION_STAGE').length,
        pallet: traceResult.events.filter((e) => e.eventType === 'PALLETIZATION').length,
      }
    : { all: 0, qc: 0, transfer: 0, intake: 0, production: 0, pallet: 0 }

  function getEventIcon(eventType: TraceabilityEventType) {
    switch (eventType) {
      case 'INTAKE':
        return <PackagePlus className="size-4.5 text-emerald-600" aria-hidden="true" />
      case 'QUALITY_INSPECTION':
        return <ClipboardCheck className="size-4.5 text-blue-600" aria-hidden="true" />
      case 'STOCK_TRANSFER':
        return <Truck className="size-4.5 text-indigo-600" aria-hidden="true" />
      case 'PRODUCTION_STAGE':
        return <Factory className="size-4.5 text-amber-600" aria-hidden="true" />
      case 'PALLETIZATION':
        return <Boxes className="size-4.5 text-purple-600" aria-hidden="true" />
      case 'DISPATCH':
        return <FileSpreadsheet className="size-4.5 text-slate-600" aria-hidden="true" />
      default:
        return <Layers className="size-4.5 text-slate-600" aria-hidden="true" />
    }
  }

  function getEventTheme(eventType: TraceabilityEventType) {
    switch (eventType) {
      case 'INTAKE':
        return {
          bg: 'bg-emerald-50 border-emerald-200',
          dot: 'bg-emerald-500 ring-emerald-100',
          line: 'border-emerald-200',
        }
      case 'QUALITY_INSPECTION':
        return {
          bg: 'bg-blue-50 border-blue-200',
          dot: 'bg-blue-500 ring-blue-100',
          line: 'border-blue-200',
        }
      case 'STOCK_TRANSFER':
        return {
          bg: 'bg-indigo-50 border-indigo-200',
          dot: 'bg-indigo-500 ring-indigo-100',
          line: 'border-indigo-200',
        }
      case 'PRODUCTION_STAGE':
        return {
          bg: 'bg-amber-50 border-amber-200',
          dot: 'bg-amber-500 ring-amber-100',
          line: 'border-amber-200',
        }
      case 'PALLETIZATION':
        return {
          bg: 'bg-purple-50 border-purple-200',
          dot: 'bg-purple-500 ring-purple-100',
          line: 'border-purple-200',
        }
      default:
        return {
          bg: 'bg-slate-50 border-slate-200',
          dot: 'bg-slate-500 ring-slate-100',
          line: 'border-slate-200',
        }
    }
  }

  return (
    <div className="operations-page space-y-6 pb-12">
      {/* Page Header */}
      <PageHeader
        title="Track Batch"
        description="Scan a code or enter a batch number."
        actions={
          <div className="flex items-center gap-2">
            {activeQuery && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => executeTraceabilitySearch(activeQuery)}
                disabled={loading}
              >
                <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
                Refresh
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsScannerOpen(true)}
            >
              <Camera className="size-3.5" aria-hidden="true" />
              Scan Barcode / QR
            </Button>
          </div>
        }
      />

      {/* Search Bar & Quick Suggestions Card */}
      <Card className="batch-search-panel">
        <form onSubmit={handleSearchSubmit} className="space-y-3">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <label htmlFor={searchInputId} className="sr-only">
                Batch number, pallet code, or barcode
              </label>
              <Search
                className="absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                id={searchInputId}
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by Batch No (e.g. RM-2026-PP-01), Pallet Code, Barcode, or Supplier Lot..."
                className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-9 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-accent-700 focus:outline-hidden focus:ring-1 focus:ring-accent-700"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md"
                  aria-label="Clear search input"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button type="submit" loading={loading} className="w-full sm:w-auto">
                <Search className="size-3.5" aria-hidden="true" />
                Track Batch
              </Button>
              {activeQuery && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleReset}
                  className="shrink-0"
                >
                  <X className="size-3.5" aria-hidden="true" />
                  Clear
                </Button>
              )}
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsScannerOpen(true)}
                title="Open Camera Scanner"
                className="shrink-0"
              >
                <Camera className="size-3.5" aria-hidden="true" />
                <span>Scan</span>
              </Button>
            </div>
          </div>

          {/* Quick suggestions chips */}
          {suggestions.length > 0 && (
            <div className="pt-1">
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600">
                <span className="font-semibold text-slate-500 flex items-center gap-1 mr-1">
                  <Layers className="size-3 text-slate-400" aria-hidden="true" />
                  Active Batches:
                </span>
                {suggestions.slice(0, 8).map((s) => {
                  const isSelected = activeQuery.toLowerCase() === s.batchNo.toLowerCase()
                  return (
                    <button
                      key={s.batchNo}
                      type="button"
                      onClick={() => handleSelectBatch(s.batchNo)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-mono text-xs font-semibold transition-colors ${
                        isSelected
                          ? 'bg-accent-700 text-white ring-1 ring-accent-700'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                      }`}
                    >
                      <span>{s.batchNo}</span>
                      <span className="text-[10px] opacity-70 font-sans">
                        ({s.materialCode})
                      </span>
                    </button>
                  )
                })}
                {loadingSuggestions && (
                  <span className="text-[11px] text-slate-400 italic">loading more...</span>
                )}
              </div>
            </div>
          )}
        </form>
      </Card>

      {/* Main Content Area */}
      {loading ? (
        <Card className="py-8 text-center">
          <LoadingSpinner label="Tracing batch genealogy and movement history across facilities..." size="lg" />
        </Card>
      ) : error ? (
        <ErrorState
          title="Traceability Lookup Failed"
          description={error}
          onRetry={() => executeTraceabilitySearch(activeQuery)}
          retryLabel="Retry Traceability Search"
        />
      ) : !activeQuery ? (
        /* Initial Empty State */
        <Card className="py-4">
          <EmptyState
            icon={<GitFork className="size-12 text-accent-700" />}
            title="Search Batch or Scan Barcode"
            description="Enter a Raw Material Batch No, Finished Product Batch No, Pallet Tag, Barcode, or Supplier Lot Number to inspect its complete end-to-end lifecycle."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button size="sm" onClick={() => setIsScannerOpen(true)}>
                  <Camera className="size-3.5" aria-hidden="true" />
                  Scan Barcode / QR
                </Button>
                {suggestions[0] && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleSelectBatch(suggestions[0].batchNo)}
                  >
                    <Layers className="size-3.5" aria-hidden="true" />
                    Try Example: {suggestions[0].batchNo}
                  </Button>
                )}
              </div>
            }
          />
        </Card>
      ) : !traceResult ? (
        /* No Matching Batch Found */
        <Card className="py-4">
          <EmptyState
            icon={<AlertCircle className="size-12 text-amber-500" />}
            title="No Matching Traceability Record Found"
            description={`No batch intake, quality inspection, transfer ledger, or pallet tag matched "${activeQuery}". Verify that the batch number or barcode was entered accurately.`}
            action={
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={handleReset}>
                  <X className="size-3.5" aria-hidden="true" />
                  Clear Search
                </Button>
                <Button size="sm" onClick={() => setIsScannerOpen(true)}>
                  <Camera className="size-3.5" aria-hidden="true" />
                  Scan with Camera
                </Button>
              </div>
            }
          />
        </Card>
      ) : (
        /* Results Section */
        <div className="space-y-6">
          {/* Summary Banner Card */}
          <Card className="batch-summary border-t-4 border-t-accent-700">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {traceResult.summary.batchTypeLabel}
                  </span>
                  <StatusBadge tone={traceResult.summary.statusTone}>
                    {traceResult.summary.currentStatus}
                  </StatusBadge>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-bold font-mono text-slate-900">
                    {traceResult.summary.batchNumber}
                  </h2>
                  <button
                    type="button"
                    onClick={() => handleCopyText(traceResult.summary.batchNumber)}
                    title="Copy batch number"
                    className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                  >
                    {copiedBatch ? (
                      <Check className="size-4 text-emerald-600" aria-hidden="true" />
                    ) : (
                      <Copy className="size-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
                <p className="text-sm font-medium text-slate-700 mt-0.5">
                  {traceResult.summary.materialName} ({traceResult.summary.materialCode})
                  {traceResult.summary.categoryName ? ` · ${traceResult.summary.categoryName}` : ''}
                </p>
              </div>

              {/* Quick Metrics */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-slate-50 p-3 border border-slate-100">
                  <p className="text-[11px] font-medium text-slate-500 uppercase">Available Balance</p>
                  <p className="text-base font-bold font-mono text-slate-900 mt-0.5">
                    {traceResult.summary.currentQuantity != null
                      ? `${Number(traceResult.summary.currentQuantity).toLocaleString()} ${traceResult.summary.uom || 'KG'}`
                      : 'Recorded in Ledger'}
                  </p>
                </div>

                <div className="rounded-lg bg-slate-50 p-3 border border-slate-100">
                  <p className="text-[11px] font-medium text-slate-500 uppercase">Current Location</p>
                  <p className="text-xs font-semibold text-slate-900 mt-1 truncate" title={traceResult.summary.currentLocation || 'Facility'}>
                    {traceResult.summary.currentLocation || 'Factory Storage'}
                  </p>
                </div>

                <div className="rounded-lg bg-slate-50 p-3 border border-slate-100 col-span-2 sm:col-span-1">
                  <p className="text-[11px] font-medium text-slate-500 uppercase">Audit Records</p>
                  <p className="text-base font-bold text-accent-700 mt-0.5">
                    {traceResult.summary.totalEventsCount} Event(s)
                  </p>
                </div>
              </div>
            </div>

            {/* Sub-details grid */}
            <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600">
              <div className="flex items-center gap-1.5">
                <Calendar className="size-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                <span>
                  Intake / Creation:{' '}
                  <strong className="text-slate-800">
                    {traceResult.summary.receivedOrCreatedDate
                      ? new Date(traceResult.summary.receivedOrCreatedDate).toLocaleDateString()
                      : 'Not recorded'}
                  </strong>
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <Package className="size-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                <span>
                  Supplier Lot:{' '}
                  <strong className="text-slate-800 font-mono">
                    {traceResult.summary.supplierLot || '—'}
                  </strong>
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <Clock className="size-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                <span>
                  Status Quality:{' '}
                  <strong className="text-slate-800">
                    {traceResult.summary.currentStatus}
                  </strong>
                </span>
              </div>
            </div>
          </Card>

          {/* Timeline Filter Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500 mr-2">Filter Timeline:</span>
              <button
                type="button"
                onClick={() => setSelectedEventType('ALL')}
                className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                  selectedEventType === 'ALL'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All ({eventCounts.all})
              </button>

              {eventCounts.intake > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedEventType('INTAKE')}
                  className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                    selectedEventType === 'INTAKE'
                      ? 'bg-emerald-700 text-white'
                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                  }`}
                >
                  Intake ({eventCounts.intake})
                </button>
              )}

              {eventCounts.qc > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedEventType('QC')}
                  className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                    selectedEventType === 'QC'
                      ? 'bg-blue-700 text-white'
                      : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200'
                  }`}
                >
                  QC Inspections ({eventCounts.qc})
                </button>
              )}

              {eventCounts.transfer > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedEventType('TRANSFER')}
                  className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                    selectedEventType === 'TRANSFER'
                      ? 'bg-indigo-700 text-white'
                      : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200'
                  }`}
                >
                  Transfers ({eventCounts.transfer})
                </button>
              )}

              {eventCounts.production > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedEventType('PRODUCTION')}
                  className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                    selectedEventType === 'PRODUCTION'
                      ? 'bg-amber-700 text-white'
                      : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                  }`}
                >
                  Production ({eventCounts.production})
                </button>
              )}

              {eventCounts.pallet > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedEventType('PALLET')}
                  className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                    selectedEventType === 'PALLET'
                      ? 'bg-purple-700 text-white'
                      : 'bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200'
                  }`}
                >
                  Pallets ({eventCounts.pallet})
                </button>
              )}
            </div>

            <span className="text-xs text-slate-500 font-medium">
              Showing {filteredEvents.length} of {traceResult.events.length} step(s)
            </span>
          </div>

          {/* Chronological Process Flow & Timeline */}
          {filteredEvents.length === 0 ? (
            <Card className="py-12 text-center">
              <EmptyState
                title="No events for selected filter"
                description="Try selecting 'All' to view the complete history of this batch."
                action={
                  <Button size="sm" variant="secondary" onClick={() => setSelectedEventType('ALL')}>
                    Show All Events
                  </Button>
                }
              />
            </Card>
          ) : (
            <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-1 before:bg-slate-300">
              {filteredEvents.map((event, index) => {
                const theme = getEventTheme(event.eventType)
                const isLatest = index === filteredEvents.length - 1

                return (
                  <div key={event.id} className="relative group">
                    {/* Node Dot Icon */}
                    <div
                      className={`absolute -left-6 sm:-left-8 top-1.5 size-6 sm:size-8 rounded-full flex items-center justify-center border-2 border-white shadow-xs ${theme.dot} ring-4`}
                      aria-hidden="true"
                    >
                      <span className="text-white text-[10px] sm:text-xs font-bold font-mono">
                        {index + 1}
                      </span>
                    </div>

                    {/* Event Card */}
                    <Card
                      data-event={event.eventType}
                      className={`genealogy-card transition-shadow hover:shadow-md ${
                        isLatest ? 'ring-1 ring-accent-300' : ''
                      }`}
                    >
                      {/* Event Header */}
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-2 rounded-lg border ${theme.bg}`}>
                            {getEventIcon(event.eventType)}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                                {event.title}
                              </h3>
                              {event.badgeLabel && (
                                <StatusBadge tone={event.statusTone}>
                                  {event.badgeLabel}
                                </StatusBadge>
                              )}
                            </div>
                            {event.subtitle && (
                              <p className="text-xs text-slate-600 mt-0.5 font-medium">
                                {event.subtitle}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Timestamp */}
                        <div className="text-xs text-slate-500 sm:text-right shrink-0">
                          <div className="flex items-center gap-1 sm:justify-end">
                            <Clock className="size-3.5 text-slate-400" aria-hidden="true" />
                            <span className="font-medium text-slate-700">
                              {event.timestamp
                                ? new Date(event.timestamp).toLocaleString()
                                : 'Recorded Entry'}
                            </span>
                          </div>
                          {event.referenceNumber && (
                            <span className="block font-mono text-[11px] text-slate-400 mt-0.5">
                              Ref: {event.referenceNumber}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Event Details Body */}
                      <div className="pt-3.5 space-y-3 text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          {/* Quantity */}
                          {event.quantity != null && (
                            <div className="bg-slate-50 p-2.5 rounded-md border border-slate-100">
                              <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                                Quantity Transacted
                              </span>
                              <span className="font-mono text-sm font-bold text-slate-900">
                                {Number(event.quantity).toLocaleString()} {event.uom || 'KG'}
                              </span>
                            </div>
                          )}

                          {/* Source Location */}
                          {event.sourceLocation && (
                            <div className="bg-slate-50 p-2.5 rounded-md border border-slate-100">
                              <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                                Source Facility / Lot
                              </span>
                              <div className="flex items-center gap-1 text-slate-800 font-medium mt-0.5">
                                <MapPin className="size-3 text-slate-400 shrink-0" aria-hidden="true" />
                                <span className="truncate">{event.sourceLocation}</span>
                              </div>
                            </div>
                          )}

                          {/* Destination Location */}
                          {event.destinationLocation && (
                            <div className="bg-slate-50 p-2.5 rounded-md border border-slate-100">
                              <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                                Target Facility / Bin
                              </span>
                              <div className="flex items-center gap-1 text-slate-800 font-medium mt-0.5">
                                <MapPin className="size-3 text-indigo-500 shrink-0" aria-hidden="true" />
                                <span className="truncate">{event.destinationLocation}</span>
                              </div>
                            </div>
                          )}

                          {/* Operator / Inspector */}
                          {event.operatorOrInspector && (
                            <div className="bg-slate-50 p-2.5 rounded-md border border-slate-100">
                              <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                                Logged By
                              </span>
                              <div className="flex items-center gap-1 text-slate-800 font-medium mt-0.5">
                                <User className="size-3 text-slate-400 shrink-0" aria-hidden="true" />
                                <span className="truncate">{event.operatorOrInspector}</span>
                              </div>
                            </div>
                          )}

                          {/* Machine / Unit */}
                          {event.machine && (
                            <div className="bg-slate-50 p-2.5 rounded-md border border-slate-100">
                              <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                                Production Machine
                              </span>
                              <div className="flex items-center gap-1 text-slate-800 font-medium mt-0.5 font-mono">
                                <Factory className="size-3 text-amber-500 shrink-0" aria-hidden="true" />
                                <span>{event.machine}</span>
                              </div>
                            </div>
                          )}

                          {/* Pallet Barcode */}
                          {event.palletBarcode && (
                            <div className="bg-slate-50 p-2.5 rounded-md border border-slate-100">
                              <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                                Pallet Barcode (Code-128)
                              </span>
                              <div className="flex items-center justify-between gap-1 mt-0.5">
                                <div className="flex items-center gap-1 text-indigo-700 font-mono font-bold">
                                  <Barcode className="size-3.5 text-indigo-500 shrink-0" aria-hidden="true" />
                                  <span>{event.palletBarcode}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleCopyText(event.palletBarcode || '', true)}
                                  className="p-0.5 text-slate-400 hover:text-slate-600 rounded"
                                  title="Copy barcode"
                                >
                                  {copiedPallet === event.palletBarcode ? (
                                    <Check className="size-3 text-emerald-600" aria-hidden="true" />
                                  ) : (
                                    <Copy className="size-3" aria-hidden="true" />
                                  )}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* QC Test Results Table */}
                        {event.qcResults && event.qcResults.length > 0 && (
                          <div className="mt-3 rounded-lg border border-slate-200 overflow-hidden">
                            <div className="bg-slate-50 px-3.5 py-2 border-b border-slate-200 flex items-center justify-between">
                              <span className="font-semibold text-slate-700 flex items-center gap-1.5 text-xs">
                                <FlaskConical className="size-3.5 text-blue-600" aria-hidden="true" />
                                Laboratory Inspection Parameters ({event.qcResults.length} tests)
                              </span>
                              <StatusBadge tone={event.statusTone}>
                                Overall {event.status}
                              </StatusBadge>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs">
                                <thead className="bg-slate-100/75 text-[10px] uppercase text-slate-500">
                                  <tr>
                                    <th className="px-3.5 py-2">Test Parameter</th>
                                    <th className="px-3.5 py-2">Observed</th>
                                    <th className="px-3.5 py-2">Spec / Range</th>
                                    <th className="px-3.5 py-2 text-center">Result</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                  {event.qcResults.map((item, qIdx) => {
                                    const isPass = item.result?.toLowerCase() === 'pass'
                                    return (
                                      <tr key={qIdx} className="hover:bg-slate-50/75">
                                        <td className="px-3.5 py-2 font-medium text-slate-800">
                                          {item.parameterName}
                                          {item.isCritical && (
                                            <span className="ml-1.5 rounded bg-red-100 px-1 py-0.2 text-[9px] font-bold text-red-700">
                                              CRITICAL
                                            </span>
                                          )}
                                        </td>
                                        <td className="px-3.5 py-2 font-mono font-bold text-slate-900">
                                          {item.observedValue} {item.measurementUnit || ''}
                                        </td>
                                        <td className="px-3.5 py-2 text-slate-500 font-mono">
                                          {item.minimumValue != null || item.maximumValue != null
                                            ? `${item.minimumValue ?? '—'} – ${item.maximumValue ?? '—'} ${item.measurementUnit || ''}`
                                            : item.targetValue != null
                                              ? `Target: ${item.targetValue} ${item.measurementUnit || ''}`
                                              : 'Standard specification'}
                                        </td>
                                        <td className="px-3.5 py-2 text-center">
                                          <StatusBadge tone={isPass ? 'success' : 'danger'}>
                                            {item.result || (isPass ? 'Pass' : 'Fail')}
                                          </StatusBadge>
                                        </td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Remarks */}
                        {event.remarks && (
                          <div className="text-slate-600 bg-slate-50/80 px-3 py-2 rounded-md border border-slate-100 flex items-start gap-1.5">
                            <span className="font-semibold text-slate-500 shrink-0">Notes:</span>
                            <span className="italic">{event.remarks}</span>
                          </div>
                        )}
                      </div>
                    </Card>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Camera Barcode / QR Scanner Modal */}
      {isScannerOpen && (
        <PalletCameraScanner
          onScan={handleCameraScan}
          onClose={() => setIsScannerOpen(false)}
        />
      )}
    </div>
  )
}
