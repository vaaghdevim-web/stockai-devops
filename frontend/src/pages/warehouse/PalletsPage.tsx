import { PalletCameraScanner } from '../../components/warehouse/PalletCameraScanner'
import { useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  Barcode,
  Camera,
  Boxes,
  CheckCircle2,
  Eye,
  Filter,
  Layers,
  MapPin,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  Search,
  Warehouse,
  X,
} from 'lucide-react'
import { getPalletByIdentifier } from '../../api/palletApi'
import type { PalletResponse } from '../../types'
import { printPalletDocument } from '../../utils/palletPrintUtil'
import {
  Button,
  Card,
  EmptyState,
  PageHeader,
  StatusBadge,
} from '../../components/common'
import {
  CreatePalletModal,
  PalletDetailsDrawer,
} from '../../components/warehouse'
import { MASTER_BINS } from '../../components/warehouse/warehouseConstants'
import { usePermissions } from '../../hooks/usePermissions'

export function PalletsPage() {
  const [pallets, setPallets] = useState<PalletResponse[]>([])

  // Barcode Scanner input state
  const scanInputRef = useRef<HTMLInputElement>(null)
  const lookupInFlight = useRef(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraNotice, setCameraNotice] = useState('')
  const [scannerQuery, setScannerQuery] = useState('')
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<PalletResponse | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)

  // Table Registry Search & Filters
  const [tableSearchQuery, setTableSearchQuery] = useState('')
  const [tableStatusFilter, setTableStatusFilter] = useState<'ALL' | 'OPEN' | 'STORED'>('ALL')

  // Modals & Drawers
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedPallet, setSelectedPallet] = useState<PalletResponse | null>(null)



  async function handleBarcodeLookup(e?: React.FormEvent, customQuery?: string) {
    if (e) e.preventDefault()
    const rawTarget = (customQuery ?? scannerQuery).trim()
    if (!rawTarget || lookupInFlight.current) return

    lookupInFlight.current = true
    setScanning(true)
    setScanError(null)
    setScanResult(null)

    // Normalize: strip leading '#' e.g. '#1' -> '1'
    const clean = rawTarget.replace(/^#+/, '').trim()

    try {
      let response: PalletResponse | null = null

      // 1. Try API lookup first (with automatic case normalization)
      try {
        response = await getPalletByIdentifier(clean)
      } catch (apiErr) {
        // 2. If backend fails (e.g. 404), check local ledger list as fallback
        const qLower = clean.toLowerCase()
        const localMatch = pallets.find(
          (p) =>
            String(p.palletId) === clean ||
            p.palletCode?.toLowerCase() === qLower ||
            p.barcode?.toLowerCase() === qLower
        )
        if (localMatch) {
          response = localMatch
        } else {
          throw apiErr
        }
      }

      if (response) {
        setScanResult(response)
        // Ensure pallet is in ledger table
        setPallets((prev) => {
          const idx = prev.findIndex((p) => p.palletId === response!.palletId || p.palletCode === response!.palletCode)
          if (idx >= 0) {
            const updated = [...prev]
            updated[idx] = response!
            return updated
          }
          return [response!, ...prev]
        })
      }
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } } }
      const msg =
        apiErr.response?.data?.message ||
        `Pallet not found for identifier: "${rawTarget}". Please verify the barcode, pallet code, or ID.`
      setScanError(msg)
      scanInputRef.current?.focus({ preventScroll: true })
    } finally {
      lookupInFlight.current = false
      setScanning(false)
    }
  }

  function handlePalletCreated(newPallet: PalletResponse) {
    setPallets((prev) => [newPallet, ...prev.filter((p) => p.palletId !== newPallet.palletId)])
    setScanResult(newPallet)
  }

  // Metrics
  const metrics = useMemo(() => {
    const total = pallets.length
    const open = pallets.filter((p) => p.status?.toLowerCase() === 'open').length
    const stored = pallets.filter((p) => p.status?.toLowerCase() === 'stored').length
    const totalBags = pallets.some(p => p.quantity == null)
      ? 'Not recorded'
      : pallets.reduce((acc, p) => acc + Number(p.quantity), 0)

    return { total, open, stored, totalBags }
  }, [pallets])

  // Filtered pallets in registry table
  const filteredPallets = useMemo(() => {
    return pallets.filter((p) => {
      if (tableStatusFilter === 'OPEN' && p.status?.toLowerCase() !== 'open') return false
      if (tableStatusFilter === 'STORED' && p.status?.toLowerCase() !== 'stored') return false

      if (!tableSearchQuery.trim()) return true
      const q = tableSearchQuery.toLowerCase()
      const matchesCode = p.palletCode?.toLowerCase().includes(q)
      const matchesBarcode = p.barcode?.toLowerCase().includes(q)
      const matchesId = String(p.palletId).includes(q)
      return matchesCode || matchesBarcode || matchesId
    })
  }, [pallets, tableSearchQuery, tableStatusFilter])

  const { canCreate } = usePermissions('pallets')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pallets & Barcodes"
        description="Pack finished goods bags onto pallets, generate Code-128 barcodes, and simulate handheld scanner lookups."
        actions={
          canCreate ? (
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsCreateModalOpen(true)}
              >
                <Plus className="size-3.5" aria-hidden="true" />
                Build New Pallet
              </Button>
            </div>
          ) : undefined
        }
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4 border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Total Pallets</p>
            <Boxes className="size-4 text-slate-500" aria-hidden="true" />
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900 font-mono tabular-nums">{metrics.total}</p>
          <p className="mt-1 text-xs text-slate-500 font-medium">Tracked in finished goods</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-emerald-600 border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Open / Active</p>
            <CheckCircle2 className="size-4 text-emerald-600" aria-hidden="true" />
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-950 font-mono tabular-nums">{metrics.open}</p>
          <p className="mt-1 text-xs text-slate-500 font-medium">Ready for storage or dispatch</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-indigo-600 border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Storage Facility</p>
            <Warehouse className="size-4 text-indigo-600" aria-hidden="true" />
          </div>
          <p className="mt-2 text-2xl font-black text-indigo-950">Unit 3 FG</p>
          <p className="mt-1 text-xs text-slate-500 font-medium">Primary packaging warehouse</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-amber-600 border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Packaged Units</p>
            <Layers className="size-4 text-amber-600" aria-hidden="true" />
          </div>
          <p className="mt-2 text-2xl font-black text-amber-950 font-mono tabular-nums">
            {typeof metrics.totalBags === 'number' ? metrics.totalBags.toLocaleString() : metrics.totalBags} <span className="text-sm font-bold text-slate-600">Bags</span>
          </p>
          <p className="mt-1 text-xs text-slate-500 font-medium">Fertilizer bags stowed on pallets</p>
        </Card>
      </div>

      {/* Barcode Scanner Gun Simulator Widget */}
      <Card className="p-5 border-2 border-indigo-200 bg-gradient-to-r from-indigo-50/60 to-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md">
              <Barcode className="size-6" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Handheld Barcode Scanner & Lookup
              </h3>
              <p className="text-xs text-slate-500">
                Simulate optical barcode scanner gun or manually enter numeric Pallet ID, Pallet Code (<span className="font-mono text-indigo-700">PAL-...</span>), or Barcode (<span className="font-mono text-indigo-700">BC-...</span>).
              </p>
            </div>
          </div>

          <form onSubmit={handleBarcodeLookup} className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
              <QrCode
                className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="text"
                ref={scanInputRef}
                aria-label="Pallet barcode, code, or ID"
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && (event.repeat || event.nativeEvent.isComposing)) {
                    event.preventDefault()
                  }
                }}
                placeholder="Scan or enter barcode / code..."
                value={scannerQuery}
                onChange={(e) => setScannerQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs font-mono text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 shadow-xs"
              />
            </div>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              disabled={scanning || !scannerQuery.trim()}
              className="shrink-0"
            >
              {scanning ? (
                <>
                  <RefreshCw className="size-3.5 animate-spin" aria-hidden="true" />
                  Scanning...
                </>
              ) : (
                <>
                  <Search className="size-3.5" aria-hidden="true" />
                  Scan Lookup
                </>
              )}
            </Button>
            <Button type="button" variant="secondary" size="sm" disabled={scanning}
              onClick={() => { setCameraNotice(''); setCameraOpen(true) }}>
              <Camera className="size-4" aria-hidden="true" />Scan with Camera
            </Button>
          </form>
        </div>

        {cameraNotice && <p role="status" className="mt-3 text-sm text-slate-600">{cameraNotice}</p>}
        {cameraOpen && <PalletCameraScanner
          onClose={() => setCameraOpen(false)}
          onScan={(code) => {
            setCameraOpen(false)
            setScannerQuery(code)
            setCameraNotice('Code scanned. Looking up pallet details.')
            void handleBarcodeLookup(undefined, code)
          }}
        />}

        {/* Scan Error Message */}
        {scanError && (
          <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
            <AlertCircle className="size-4 shrink-0 text-rose-600 mt-0.5" aria-hidden="true" />
            <div>{scanError}</div>
          </div>
        )}

        {/* Scanned Result Banner */}
        {scanResult && (
          <div className="mt-4 rounded-xl border border-emerald-300 bg-white p-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="size-5" aria-hidden="true" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-slate-900">
                      {scanResult.palletCode}
                    </span>
                    <StatusBadge tone="success">{scanResult.status}</StatusBadge>
                  </div>
                  <div className="mt-1 flex items-center gap-4 text-xs text-slate-500 font-mono">
                    <span>Barcode: <span className="font-bold text-slate-800">{scanResult.barcode}</span></span>
                    <span>Facility: <span className="text-slate-800">Unit 3 FG</span></span>
                    <span>Bin: <span className="font-bold text-indigo-700">{MASTER_BINS.find(b => b.id === scanResult.binId)?.code || (scanResult.binId === 3 ? 'BIN-U3-01' : scanResult.binId ? `BIN #${scanResult.binId}` : 'Staging')}</span></span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedPallet(scanResult)}
                >
                  <Eye className="size-3.5" aria-hidden="true" />
                  Inspect Tag
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    printPalletDocument({
                      companyName: 'Sri Vidha Polymers',
                      unitNumber: scanResult.warehouseId === 1 ? 'Unit 1' : 'Unit 3',
                      barcode: scanResult.barcode,
                      palletCode: scanResult.palletCode,
                      palletId: scanResult.palletId,
                      quantity: scanResult.quantity,
                      uom: 'BAGS',
                      binCode: MASTER_BINS.find(b => b.id === scanResult.binId)?.code || (scanResult.binId === 3 ? 'BIN-U3-01' : scanResult.binId ? `BIN #${scanResult.binId}` : 'Staging'),
                      warehouseName: scanResult.warehouseId === 1 ? 'Unit 1 Raw Material Warehouse' : 'Unit 3 Finished Goods Warehouse',
                      storageCoordinates: (scanResult.binId === 5 || scanResult.binId === 3) ? 'Rack 03 / Shelf 01 (Bay B-02)' : 'Staging Area Grid 1A',
                      batchNo: 'FB-2026-BAG-01',
                      productName: '50KG PP Fertilizer Bag',
                      productCode: 'FP-BAG-50KG-01',
                      qaStatus: 'Not recorded',
                    })
                  }}
                >
                  <Printer className="size-3.5" aria-hidden="true" />
                  Print Tag
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Pallets Ledger Table */}
      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 px-6 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Registered Pallet Registry</h3>
            <p className="text-xs text-slate-500">Active finished goods pallet inventory and storage bins</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search
                className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="text"
                placeholder="Filter pallets..."
                value={tableSearchQuery}
                onChange={(e) => setTableSearchQuery(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 shadow-xs"
              />
            </div>

            {/* Status Filter Dropdown */}
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 shadow-xs">
              <Filter className="size-3 text-slate-400" aria-hidden="true" />
              <select
                value={tableStatusFilter}
                onChange={(e) => setTableStatusFilter(e.target.value as 'ALL' | 'OPEN' | 'STORED')}
                className="bg-transparent text-xs font-medium text-slate-700 outline-none"
              >
                <option value="ALL">All Statuses ({pallets.length})</option>
                <option value="OPEN">Open Only ({metrics.open})</option>
                <option value="STORED">Stored Only ({metrics.stored})</option>
              </select>
            </div>

            {(tableSearchQuery || tableStatusFilter !== 'ALL') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setTableSearchQuery('')
                  setTableStatusFilter('ALL')
                }}
                className="text-xs text-slate-500 hover:text-slate-800"
              >
                <X className="size-3.5" aria-hidden="true" />
                Reset
              </Button>
            )}
          </div>
        </div>

        {filteredPallets.length === 0 ? (
          <div className="py-12">
            <EmptyState
              icon={<Boxes className="size-10 text-slate-400" />}
              title="No matching pallets found"
              description={
                tableSearchQuery || tableStatusFilter !== 'ALL'
                  ? 'No pallets in the registry match the active search or status filters.'
                  : 'No finished goods pallets have been registered yet.'
              }
              action={
                tableSearchQuery || tableStatusFilter !== 'ALL' ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setTableSearchQuery('')
                      setTableStatusFilter('ALL')
                    }}
                  >
                    Reset Filters
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => setIsCreateModalOpen(true)}>
                    <Plus className="size-3.5" aria-hidden="true" />
                    Build First Pallet
                  </Button>
                )
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-100/90 text-xs font-bold uppercase tracking-wider text-slate-700">
                <tr>
                  <th scope="col" className="px-6 py-3.5">Pallet Code</th>
                  <th scope="col" className="px-6 py-3.5">Barcode</th>
                  <th scope="col" className="px-6 py-3.5">Facility & Bin</th>
                  <th scope="col" className="px-6 py-3.5">Batch / Product</th>
                  <th scope="col" className="px-6 py-3.5 text-right">Units Stowed</th>
                  <th scope="col" className="px-6 py-3.5">Status</th>
                  <th scope="col" className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredPallets.map((pallet) => {
                  const isUnit3 = pallet.warehouseId === 3
                  const binLabel = MASTER_BINS.find(b => b.id === pallet.binId)?.code || (pallet.binId === 3 ? 'BIN-U3-01' : pallet.binId ? `BIN #${pallet.binId}` : 'Staging')
                  const isOpen = pallet.status?.toLowerCase() === 'open'

                  return (
                    <tr
                      key={pallet.palletId}
                      onClick={() => setSelectedPallet(pallet)}
                      className="cursor-pointer hover:bg-slate-50/80 transition-colors"
                    >
                      {/* Pallet Code */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="flex size-7 items-center justify-center rounded-md bg-indigo-50 text-indigo-700 font-mono font-bold text-xs">
                            <Boxes className="size-3.5 text-indigo-600 shrink-0" aria-hidden="true" />
                          </div>
                          <span className="font-mono font-bold text-slate-900 text-sm">
                            {pallet.palletCode}
                          </span>
                        </div>
                      </td>

                      {/* Barcode */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setScannerQuery(pallet.barcode)
                            handleBarcodeLookup(undefined, pallet.barcode)
                          }}
                          title="Click to simulate scanner lookup"
                          className="group inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-indigo-800 bg-indigo-50/80 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded transition-colors"
                        >
                          <Barcode className="size-3 text-indigo-600 group-hover:text-indigo-800" aria-hidden="true" />
                          <span>{pallet.barcode}</span>
                        </button>
                      </td>

                      {/* Facility & Bin */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs">
                        <div className="font-bold text-slate-900">
                          {isUnit3 ? 'Unit 3 Finished Goods' : `Warehouse #${pallet.warehouseId}`}
                        </div>
                        <div className="flex items-center gap-1 text-slate-600 font-mono mt-0.5">
                          <MapPin className="size-3 text-slate-500" aria-hidden="true" />
                          <span className="font-semibold">{binLabel}</span>
                        </div>
                      </td>

                      {/* Batch */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs">
                        <span className="font-bold text-slate-900 block">50KG PP Fertilizer Bag</span>
                        <span className="font-mono text-slate-500">FB-2026-BAG-01</span>
                      </td>

                      {/* Units */}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                        <span className="font-mono font-bold text-slate-900 tabular-nums text-sm">
                          {pallet.quantity == null ? 'Not recorded' : Number(pallet.quantity).toLocaleString()}
                        </span>{' '}
                        <span className="text-[11px] font-bold text-slate-500">BAGS</span>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          isOpen
                            ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                            : 'bg-slate-100 text-slate-800 border border-slate-300'
                        }`}>
                          <span className={`size-1.5 rounded-full ${isOpen ? 'bg-emerald-600' : 'bg-slate-500'}`} aria-hidden="true" />
                          {pallet.status || 'Open'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              setScannerQuery(pallet.barcode)
                              handleBarcodeLookup(undefined, pallet.barcode)
                            }}
                            title="Scan in scanner gun simulator"
                          >
                            <Barcode className="size-3.5" aria-hidden="true" />
                            Scan
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedPallet(pallet)
                            }}
                          >
                            <Eye className="size-3.5" aria-hidden="true" />
                            View Tag
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Build Pallet Modal */}
      <CreatePalletModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handlePalletCreated}
      />

      {/* Pallet Tag & Barcode Details Drawer */}
      <PalletDetailsDrawer
        pallet={selectedPallet}
        isOpen={selectedPallet !== null}
        onClose={() => setSelectedPallet(null)}
      />
    </div>
  )
}
