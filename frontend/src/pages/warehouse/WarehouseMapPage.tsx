import { useState, useMemo, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  Boxes,
  CheckCircle2,
  Clock,
  LayoutGrid,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Warehouse,
  Workflow,
} from 'lucide-react'
import {
  computeWarehouseMetrics,
  searchWarehouseBins,
  transformHierarchyToFacility,
  WAREHOUSE_FACILITIES,
} from '../../utils/warehouseCoordinates'
import type {
  BinStatus,
  CreateRackRequest,
  LocationBinNode,
  WarehouseFacility,
  WarehouseResponse,
} from '../../types/warehouseMap'
import {
  getWarehouses,
  getWarehouseStorageHierarchy,
  createWarehouseRack,
  createWarehouseShelf,
} from '../../api/warehouseApi'
import { useAuthStore } from '../../store/authStore'
import { canMutate } from '../../config/rbac'
import {
  WarehouseFloorCanvas,
  StorageHierarchyTree,
  BinDetailsDrawer,
  AddRackModal,
} from '../../components/warehouse/map'
import { Button, Card, PageHeader } from '../../components/common'

type ViewMode = 'MAP' | 'TREE'

export function WarehouseMapPage() {
  const navigate = useNavigate()
  const roles = useAuthStore((state) => state.roles)
  const isFullAccess = canMutate(roles, 'digitalTwin')

  // Warehouse list from backend
  const [warehouseList, setWarehouseList] = useState<WarehouseResponse[]>([])
  const [selectedFacilityId, setSelectedFacilityId] = useState<number>(1)
  const [facility, setFacility] = useState<WarehouseFacility | null>(null)

  // Loading & error states
  const [loading, setLoading] = useState(true)
  const [hierarchyLoading, setHierarchyLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isAddRackOpen, setIsAddRackOpen] = useState(false)

  const [viewMode, setViewMode] = useState<ViewMode>('MAP')

  // Search query & status filter
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<BinStatus | 'ALL'>('ALL')

  // Selected bin for the inspection drawer
  const [selectedBin, setSelectedBin] = useState<LocationBinNode | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  // 1. Fetch initial warehouse list
  const fetchWarehouses = useCallback(async () => {
    try {
      setLoading(true)
      setErrorMessage(null)
      const list = await getWarehouses()
      setWarehouseList(list)
      if (list.length > 0) {
        // Default to first warehouse if current selected is not in list
        const exists = list.some((w) => w.warehouseId === selectedFacilityId)
        if (!exists) {
          setSelectedFacilityId(list[0].warehouseId)
        }
      }
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } } }
      setErrorMessage(
        apiErr.response?.data?.message || 'Failed to load warehouses from backend.'
      )
    } finally {
      setLoading(false)
    }
  }, [selectedFacilityId])

  useEffect(() => {
    void Promise.resolve().then(fetchWarehouses)
  }, [fetchWarehouses])

  // 2. Fetch live storage tree for selected facility
  const fetchStorageTree = useCallback(async (warehouseId: number) => {
    try {
      setHierarchyLoading(true)
      const data = await getWarehouseStorageHierarchy(warehouseId)
      const transformed = transformHierarchyToFacility(data)
      setFacility(transformed)
    } catch {
      // Fallback to static model if tree endpoint fails or is empty
      const fallback = WAREHOUSE_FACILITIES.find((w) => w.warehouseId === warehouseId) || WAREHOUSE_FACILITIES[0]
      setFacility(fallback)
    } finally {
      setHierarchyLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedFacilityId) {
      void Promise.resolve().then(() => fetchStorageTree(selectedFacilityId))
    }
  }, [selectedFacilityId, fetchStorageTree])

  // Current active facility object
  const currentFacility = useMemo<WarehouseFacility>(() => {
    if (facility) return facility
    const fallback = WAREHOUSE_FACILITIES.find((f) => f.warehouseId === selectedFacilityId)
    return fallback || WAREHOUSE_FACILITIES[0]
  }, [facility, selectedFacilityId])

  // Computed metrics for current facility
  const metrics = useMemo(() => {
    return computeWarehouseMetrics(currentFacility)
  }, [currentFacility])

  // Search matched bin IDs
  const searchMatchedBins = useMemo(() => {
    if (!searchQuery.trim()) return []
    return searchWarehouseBins(currentFacility, searchQuery)
  }, [currentFacility, searchQuery])

  const searchMatchedIds = useMemo(() => {
    return new Set(searchMatchedBins.map((b) => b.binId))
  }, [searchMatchedBins])

  function handleSelectBin(bin: LocationBinNode) {
    setSelectedBin(bin)
    setIsDrawerOpen(true)
  }

  function handleCloseDrawer() {
    setIsDrawerOpen(false)
    setSelectedBin(null)
  }

  function handleInitiateTransfer(bin: LocationBinNode) {
    navigate('/warehouse/transfers', {
      state: {
        prefillFromWarehouseId: currentFacility.warehouseId,
        prefillBatchNo: bin.batchNo,
        prefillMaterialCode: bin.materialCode,
        prefillBinCode: bin.binCode,
      },
    })
  }

  async function handleAddRack(request: CreateRackRequest) {
    await createWarehouseRack(selectedFacilityId, request)
    await fetchStorageTree(selectedFacilityId)
  }

  async function handleAddShelf(rackId: number) {
    const targetRack = currentFacility.racks.find((r) => r.rackId === rackId)
    const newTierLevel = (targetRack?.shelves.length ?? 0) + 1
    const tierSuffix = newTierLevel < 10 ? `0${newTierLevel}` : `${newTierLevel}`
    const shelfCode = `${targetRack?.rackCode || 'RACK'}-S${tierSuffix}`

    await createWarehouseShelf(rackId, {
      shelfCode,
      shelfLevel: newTierLevel,
      numberOfBins: 2,
      defaultBinCapacityKg: 5000,
    })
    await fetchStorageTree(selectedFacilityId)
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white p-8 text-center">
        <RefreshCw className="size-8 animate-spin text-slate-700" />
        <p className="text-sm font-semibold text-slate-700">Connecting to Warehouse Digital Twin...</p>
        <p className="text-xs text-slate-500">Fetching live storage nodes and occupancy records</p>
      </div>
    )
  }

  if (errorMessage) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <AlertCircle className="mx-auto size-10 text-red-600 mb-2" />
        <h3 className="text-base font-bold text-red-900">Warehouse Data Unavailable</h3>
        <p className="text-xs text-red-700 mt-1 max-w-md mx-auto">{errorMessage}</p>
        <div className="mt-4">
          <Button variant="secondary" size="sm" onClick={fetchWarehouses} className="gap-1.5">
            <RefreshCw className="size-3.5" />
            Retry Connection
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Page Header with plain language title and view switcher */}
      <PageHeader
        title="Warehouse Digital Twin & Map"
        description="Live industrial rack layout, shelf tiers & bin occupancy for plant operations"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {/* View Mode Toggle: Visual Map vs Hierarchy Tree */}
            <div className="inline-flex rounded-lg bg-slate-100 p-1 border border-slate-200 shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode('MAP')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'MAP'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="size-3.5 text-slate-700" />
                <span>Visual Rack Map</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('TREE')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'TREE'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Workflow className="size-3.5 text-slate-700" />
                <span>Tree Explorer</span>
              </button>
            </div>

            {/* Action to add custom rack (FULL RBAC only) */}
            {isFullAccess && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsAddRackOpen(true)}
                className="flex items-center gap-1.5 text-xs font-mono"
              >
                <Plus className="size-3.5" />
                <span>Add Custom Rack</span>
              </Button>
            )}

            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                fetchStorageTree(selectedFacilityId)
              }}
              disabled={hierarchyLoading}
              className="flex items-center gap-1.5 text-xs"
              title="Refresh live storage tree from backend"
            >
              <RefreshCw className={`size-3.5 ${hierarchyLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>

            {(statusFilter !== 'ALL' || searchQuery) && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSearchQuery('')
                  setStatusFilter('ALL')
                }}
                className="flex items-center gap-1.5 text-xs"
              >
                Reset Filter
              </Button>
            )}
          </div>
        }
      />

      {/* Facility Switcher Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {(warehouseList.length > 0 ? warehouseList : WAREHOUSE_FACILITIES).map((wh) => {
          const isSelected = wh.warehouseId === selectedFacilityId
          return (
            <button
              key={wh.warehouseId}
              type="button"
              onClick={() => {
                setSelectedFacilityId(wh.warehouseId)
                setSearchQuery('')
              }}
              className={`text-left rounded-xl p-3.5 transition-all cursor-pointer border ${
                isSelected
                  ? 'border-2 border-slate-900 bg-white shadow-xs'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`flex size-6 items-center justify-center rounded text-xs font-mono font-bold ${
                      isSelected
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    U{wh.warehouseId}
                  </div>
                  <span className="text-xs font-bold text-slate-900">
                    {wh.warehouseName}
                  </span>
                </div>
                <span
                  className={`rounded px-2 py-0.5 text-[10px] font-mono font-bold uppercase ${
                    isSelected
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {wh.type}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500 line-clamp-1">
                {wh.type === 'Raw' && 'Raw Polymer Granules, Bags & Fillers'}
                {wh.type === 'Both' && 'Extrusion Bobbins & Woven Rolls'}
                {wh.type === 'FG' && 'Finished Goods Pallets for Dispatch'}
              </p>
            </button>
          )
        })}
      </div>

      {/* Top Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* Card 1: Total Racks */}
        <Card className="p-3.5 bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">
              Total Racks
            </span>
            <Warehouse className="size-4" />
          </div>
          <p className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-slate-900">
            {currentFacility.racks.length}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500 tabular-nums font-mono">
            {metrics.totalBins} Locations
          </p>
        </Card>

        {/* Card 2: Available (Green) */}
        <Card className="p-3.5 bg-emerald-50/70 border-2 border-emerald-500/80 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">
              Available
            </span>
            <CheckCircle2 className="size-4 text-emerald-600" />
          </div>
          <p className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-emerald-950">
            {metrics.availableBins}
          </p>
          <p className="mt-0.5 text-[11px] text-emerald-800 font-semibold">
            Ready for Stock
          </p>
        </Card>

        {/* Card 3: Occupied (Blue) */}
        <Card className="p-3.5 bg-blue-50/70 border-2 border-blue-500/80 shadow-2xs">
          <div className="flex items-center justify-between text-blue-800">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">
              Occupied
            </span>
            <Boxes className="size-4 text-blue-600" />
          </div>
          <p className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-blue-950">
            {metrics.occupiedBins}
          </p>
          <p className="mt-0.5 text-[11px] text-blue-800 font-semibold">
            Material Stored
          </p>
        </Card>

        {/* Card 4: Reserved (Amber) */}
        <Card className="p-3.5 bg-amber-50/70 border-2 border-amber-500/80 shadow-2xs">
          <div className="flex items-center justify-between text-amber-800">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">
              Reserved
            </span>
            <Clock className="size-4 text-amber-600" />
          </div>
          <p className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-amber-950">
            {metrics.reservedBins}
          </p>
          <p className="mt-0.5 text-[11px] text-amber-800 font-semibold">
            Transit Hold
          </p>
        </Card>

        {/* Card 5: QA Hold (Red) */}
        <Card className="p-3.5 bg-rose-50/70 border-2 border-rose-500/80 shadow-2xs col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-rose-800">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">
              QA Hold
            </span>
            <ShieldAlert className="size-4 text-rose-600" />
          </div>
          <p className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-rose-950">
            {metrics.quarantineBins}
          </p>
          <p className="mt-0.5 text-[11px] text-rose-800 font-semibold">
            Lab Inspection
          </p>
        </Card>
      </div>

      {/* Visual Filter Bar & Search Tool */}
      <Card className="p-3 bg-white border border-slate-200 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Status Filter Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-slate-500 mr-1 uppercase tracking-wider flex items-center gap-1 font-mono">
              <SlidersHorizontal className="size-3" /> Filter By:
            </span>

            {/* All */}
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              All ({metrics.totalBins})
            </button>

            {/* Available (Green) */}
            <button
              type="button"
              onClick={() => setStatusFilter('AVAILABLE')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                statusFilter === 'AVAILABLE'
                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                  : 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
              }`}
            >
              <span className="size-2 rounded-full bg-emerald-500" />
              <span>Available ({metrics.availableBins})</span>
            </button>

            {/* Occupied (Blue) */}
            <button
              type="button"
              onClick={() => setStatusFilter('OCCUPIED')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                statusFilter === 'OCCUPIED'
                  ? 'bg-blue-700 text-white border-blue-700 shadow-xs'
                  : 'bg-blue-50 text-blue-900 border-blue-300 hover:bg-blue-100'
              }`}
            >
              <span className="size-2 rounded-full bg-blue-600" />
              <span>Occupied ({metrics.occupiedBins})</span>
            </button>

            {/* Near Full (Purple) */}
            <button
              type="button"
              onClick={() => setStatusFilter('NEAR_FULL')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                statusFilter === 'NEAR_FULL'
                  ? 'bg-purple-700 text-white border-purple-700 shadow-xs'
                  : 'bg-purple-50 text-purple-900 border-purple-300 hover:bg-purple-100'
              }`}
            >
              <span className="size-2 rounded-full bg-purple-600" />
              <span>Near Full ({metrics.nearFullBins})</span>
            </button>

            {/* Reserved (Amber) */}
            <button
              type="button"
              onClick={() => setStatusFilter('RESERVED')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                statusFilter === 'RESERVED'
                  ? 'bg-amber-700 text-white border-amber-700 shadow-xs'
                  : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
              }`}
            >
              <span className="size-2 rounded-full bg-amber-500" />
              <span>Reserved ({metrics.reservedBins})</span>
            </button>

            {/* QA Hold (Red) */}
            <button
              type="button"
              onClick={() => setStatusFilter('QUARANTINE')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                statusFilter === 'QUARANTINE'
                  ? 'bg-rose-700 text-white border-rose-700 shadow-xs'
                  : 'bg-rose-50 text-rose-900 border-rose-300 hover:bg-rose-100'
              }`}
            >
              <span className="size-2 rounded-full bg-rose-500" />
              <span>QA Hold ({metrics.quarantineBins})</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full lg:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Bin #, Batch, Material..."
              className="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-slate-300 bg-white font-mono text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:border-slate-800 focus:outline-hidden focus:ring-1 focus:ring-slate-800"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Search Result Feedback */}
        {searchQuery && (
          <div className="mt-2 text-xs font-medium text-slate-900 bg-slate-100 px-3 py-1.5 rounded-md border border-slate-200 flex items-center gap-1.5 font-mono">
            <span className="size-2 rounded-full bg-amber-500 animate-ping" />
            Found {searchMatchedBins.length} matching location
            {searchMatchedBins.length === 1 ? '' : 's'}
          </div>
        )}
      </Card>

      {/* Main View Area: 2D Visual Rack Layout or Hierarchy Tree */}
      {viewMode === 'MAP' ? (
        <WarehouseFloorCanvas
          facility={currentFacility}
          selectedBinId={selectedBin?.binId ?? null}
          highlightedBinIds={Array.from(searchMatchedIds)}
          statusFilter={statusFilter}
          onSelectBin={handleSelectBin}
          onOpenAddRackModal={isFullAccess ? () => setIsAddRackOpen(true) : undefined}
          onAddShelf={isFullAccess ? handleAddShelf : undefined}
        />
      ) : (
        <StorageHierarchyTree
          facility={currentFacility}
          selectedBinId={selectedBin?.binId ?? null}
          statusFilter={statusFilter}
          highlightedBinIds={Array.from(searchMatchedIds)}
          onSelectBin={handleSelectBin}
          onClearFilter={() => setStatusFilter('ALL')}
        />
      )}

      {/* Right-Side Details Drawer */}
      <BinDetailsDrawer
        bin={selectedBin}
        facility={currentFacility}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        onInitiateTransfer={handleInitiateTransfer}
      />

      {/* Add Custom Storage Rack Modal */}
      {isFullAccess && (
        <AddRackModal
          isOpen={isAddRackOpen}
          facility={currentFacility}
          onClose={() => setIsAddRackOpen(false)}
          onAddRack={handleAddRack}
        />
      )}
    </div>
  )
}
