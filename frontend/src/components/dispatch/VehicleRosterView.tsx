import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  ExternalLink,
  Layers,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Truck,
  Weight,
  XCircle,
} from 'lucide-react'
import { getVehicles, getVehicleById } from '../../api/vehicleApi'
import type { VehicleResponse } from '../../types/dispatch'
import { Button, Card, Drawer, StatusBadge } from '../common'

export interface VehicleRosterViewProps {
  isFullAccess?: boolean
}

export function VehicleRosterView({ isFullAccess = false }: VehicleRosterViewProps) {
  const [vehicles, setVehicles] = useState<VehicleResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')

  // Drawer
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleResponse | null>(null)
  const [drawerLoading, setDrawerLoading] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const fetchVehicles = useCallback(async () => {
    try {
      setLoading(true)
      setErrorMessage(null)
      const data = await getVehicles()
      setVehicles(data)
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } } }
      setErrorMessage(
        apiErr.response?.data?.message || 'Failed to fetch vehicles from backend API.'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void Promise.resolve().then(fetchVehicles)
  }, [fetchVehicles])

  async function handleSelectVehicle(vehicle: VehicleResponse) {
    setIsDrawerOpen(true)
    setSelectedVehicle(vehicle)
    try {
      setDrawerLoading(true)
      const fresh = await getVehicleById(vehicle.vehicleId)
      setSelectedVehicle(fresh)
    } catch {
      // Keep selected
    } finally {
      setDrawerLoading(false)
    }
  }

  function handleCloseDrawer() {
    setIsDrawerOpen(false)
    setSelectedVehicle(null)
  }

  function handleCopy(text: string, fieldName: string) {
    navigator.clipboard.writeText(text)
    setCopiedField(fieldName)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      if (statusFilter === 'ACTIVE' && v.isActive === false) return false
      if (statusFilter === 'INACTIVE' && v.isActive !== false) return false

      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase().trim()
      return (
        v.vehicleNumber?.toLowerCase().includes(q) ||
        v.vehicleType?.toLowerCase().includes(q) ||
        v.capacityUomCode?.toLowerCase().includes(q) ||
        String(v.vehicleId).includes(q) ||
        String(v.capacity).includes(q)
      )
    })
  }, [vehicles, statusFilter, searchQuery])

  // KPI calculations
  const totalVehicles = vehicles.length
  const activeVehicles = vehicles.filter((v) => v.isActive !== false).length
  const inactiveVehicles = vehicles.filter((v) => v.isActive === false).length
  const totalCapacitySum = vehicles.reduce((acc, v) => acc + (Number(v.capacity) || 0), 0)

  return (
    <div className="space-y-4">
      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3.5 bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">
              Fleet Total
            </span>
            <Truck className="size-4" />
          </div>
          <p className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-slate-900">
            {totalVehicles}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">Registered Vehicles</p>
        </Card>

        <Card className="p-3.5 bg-emerald-50/70 border-2 border-emerald-500/80 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">
              Active Fleet
            </span>
            <CheckCircle2 className="size-4 text-emerald-600" />
          </div>
          <p className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-emerald-950">
            {activeVehicles}
          </p>
          <p className="mt-0.5 text-[11px] text-emerald-800 font-semibold">Available for Dispatch</p>
        </Card>

        <Card className="p-3.5 bg-blue-50/70 border-2 border-blue-500/80 shadow-2xs">
          <div className="flex items-center justify-between text-blue-800">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">
              Total Fleet Capacity
            </span>
            <Weight className="size-4 text-blue-600" />
          </div>
          <p className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-blue-950">
            {totalCapacitySum.toLocaleString()}
          </p>
          <p className="mt-0.5 text-[11px] text-blue-800 font-semibold">KG Payload Volume</p>
        </Card>

        <Card className="p-3.5 bg-slate-50 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">
              Inactive
            </span>
            <XCircle className="size-4 text-slate-400" />
          </div>
          <p className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-slate-700">
            {inactiveVehicles}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">Maintenance / Off-duty</p>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-3 bg-white border border-slate-200 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Status Filter Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-slate-500 mr-1 uppercase tracking-wider flex items-center gap-1 font-mono">
              <SlidersHorizontal className="size-3" /> Status:
            </span>

            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer min-h-[44px] sm:min-h-8 ${
                statusFilter === 'ALL'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              All ({totalVehicles})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('ACTIVE')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer min-h-[44px] sm:min-h-8 ${
                statusFilter === 'ACTIVE'
                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                  : 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
              }`}
            >
              <span className="size-2 rounded-full bg-emerald-500" />
              <span>Active ({activeVehicles})</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('INACTIVE')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer min-h-[44px] sm:min-h-8 ${
                statusFilter === 'INACTIVE'
                  ? 'bg-slate-700 text-white border-slate-700 shadow-xs'
                  : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
              }`}
            >
              <span className="size-2 rounded-full bg-slate-400" />
              <span>Inactive ({inactiveVehicles})</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full lg:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Vehicle #, Type, Capacity..."
              className="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-slate-300 bg-white font-mono text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:border-slate-800 focus:outline-hidden focus:ring-1 focus:ring-slate-800 min-h-[44px] sm:min-h-8"
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
      </Card>

      {/* Main Table */}
      {loading ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white p-8 text-center">
          <RefreshCw className="size-8 animate-spin text-slate-700" />
          <p className="text-sm font-semibold text-slate-700">Loading Fleet Vehicles...</p>
          <p className="text-xs text-slate-500">Connecting to dispatch vehicle catalog</p>
        </div>
      ) : errorMessage ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <AlertCircle className="mx-auto size-10 text-red-600 mb-2" />
          <h3 className="text-base font-bold text-red-900">Vehicle Data Unavailable</h3>
          <p className="text-xs text-red-700 mt-1 max-w-md mx-auto">{errorMessage}</p>
          <div className="mt-4">
            <Button variant="secondary" size="sm" onClick={fetchVehicles} className="gap-1.5">
              <RefreshCw className="size-3.5" />
              Retry
            </Button>
          </div>
        </div>
      ) : filteredVehicles.length === 0 ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-8 text-center">
          <Truck className="size-10 text-slate-400" />
          <h4 className="text-sm font-bold text-slate-800">No Vehicles Found</h4>
          <p className="text-xs text-slate-500 max-w-sm">
            {searchQuery
              ? `No vehicles matched your search "${searchQuery}".`
              : 'There are no vehicles recorded in the fleet.'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 font-mono">
                <tr>
                  <th className="px-4 py-3">Vehicle Number</th>
                  <th className="px-4 py-3">Vehicle Type</th>
                  <th className="px-4 py-3">Payload Capacity</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVehicles.map((vehicle) => (
                  <tr
                    key={vehicle.vehicleId}
                    onClick={() => handleSelectVehicle(vehicle)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    {/* Vehicle Number */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-amber-400 font-mono font-bold text-xs shadow-2xs">
                          <Truck className="size-4" />
                        </div>
                        <div>
                          <span className="font-mono font-bold text-slate-900 text-sm block">
                            {vehicle.vehicleNumber}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            Vehicle ID: #{vehicle.vehicleId}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Vehicle Type */}
                    <td className="px-4 py-3.5 text-xs font-medium text-slate-800">
                      {vehicle.vehicleType ? (
                        <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-slate-800 font-semibold">
                          <Layers className="size-3 text-slate-500" />
                          {vehicle.vehicleType}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Standard Freight Truck</span>
                      )}
                    </td>

                    {/* Capacity */}
                    <td className="px-4 py-3.5 font-mono text-xs">
                      {vehicle.capacity != null ? (
                        <span className="font-bold text-slate-900">
                          {Number(vehicle.capacity).toLocaleString()}{' '}
                          <span className="text-slate-500 font-normal">
                            {vehicle.capacityUomCode || 'KG'}
                          </span>
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5 text-center">
                      <StatusBadge tone={vehicle.isActive !== false ? 'success' : 'neutral'}>
                        {vehicle.isActive !== false ? 'ACTIVE' : 'INACTIVE'}
                      </StatusBadge>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSelectVehicle(vehicle)
                        }}
                        className="gap-1 text-xs min-h-[44px] sm:min-h-7"
                      >
                        <span>Details</span>
                        <ExternalLink className="size-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Vehicle Details Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        size="lg"
        title={
          <div className="flex items-center gap-2">
            <Truck className="size-5 text-slate-800" />
            <span className="font-bold text-slate-900 text-base font-mono">
              {selectedVehicle?.vehicleNumber || 'Vehicle Details'}
            </span>
          </div>
        }
        description={
          selectedVehicle ? (
            <span className="font-mono text-xs text-slate-500">
              Fleet Asset ID: #{selectedVehicle.vehicleId}
            </span>
          ) : undefined
        }
        footer={
          <div className="flex items-center justify-between w-full">
            <Button variant="secondary" onClick={handleCloseDrawer} className="text-xs">
              Close
            </Button>
            <span className="text-[11px] text-slate-400 font-mono">
              {isFullAccess ? 'Full Dispatch Access' : 'Read-Only Mode'}
            </span>
          </div>
        }
      >
        {selectedVehicle && (
          <div className="space-y-5">
            {drawerLoading && (
              <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-2 rounded-md">
                <RefreshCw className="size-3.5 animate-spin" />
                <span>Refreshing live vehicle records...</span>
              </div>
            )}

            {/* Status Card */}
            <div
              className={`rounded-xl border-2 p-4 shadow-2xs ${
                selectedVehicle.isActive !== false
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-950'
                  : 'border-slate-300 bg-slate-50 text-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex size-9 items-center justify-center rounded-lg ${
                      selectedVehicle.isActive !== false
                        ? 'bg-emerald-700 text-white'
                        : 'bg-slate-700 text-white'
                    }`}
                  >
                    {selectedVehicle.isActive !== false ? (
                      <CheckCircle2 className="size-5" />
                    ) : (
                      <XCircle className="size-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm uppercase font-mono tracking-wide">
                      {selectedVehicle.isActive !== false
                        ? 'Operational Fleet Vehicle'
                        : 'Inactive / Maintenance Hold'}
                    </h3>
                    <p className="text-xs opacity-90 mt-0.5">
                      {selectedVehicle.isActive !== false
                        ? 'Eligible for dispatch allocation and freight haulage'
                        : 'Temporarily unavailable for dispatch orders'}
                    </p>
                  </div>
                </div>
                <StatusBadge tone={selectedVehicle.isActive !== false ? 'success' : 'neutral'}>
                  {selectedVehicle.isActive !== false ? 'ACTIVE' : 'INACTIVE'}
                </StatusBadge>
              </div>
            </div>

            {/* Registration & Specs */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono flex items-center gap-1.5">
                <Truck className="size-3.5 text-slate-400" />
                Vehicle Registration &amp; Specification
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">
                      Registration Number
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(selectedVehicle.vehicleNumber, 'veh-num')}
                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="size-3" />
                      {copiedField === 'veh-num' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <span className="font-mono font-bold text-slate-900 text-base block mt-1">
                    {selectedVehicle.vehicleNumber}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">
                    Body / Vehicle Type
                  </span>
                  <span className="font-bold text-slate-900 text-sm block mt-1">
                    {selectedVehicle.vehicleType || 'Standard Truck'}
                  </span>
                </div>
              </div>
            </div>

            {/* Payload Capacity */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono flex items-center gap-1.5">
                <Weight className="size-3.5 text-slate-400" />
                Payload Capacity
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">
                    Rated Capacity
                  </span>
                  <span className="font-mono font-bold text-slate-900 text-base block mt-1">
                    {selectedVehicle.capacity != null
                      ? Number(selectedVehicle.capacity).toLocaleString()
                      : 'N/A'}{' '}
                    <span className="text-xs font-normal text-slate-500">
                      {selectedVehicle.capacityUomCode || 'KG'}
                    </span>
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">
                    Unit of Measurement
                  </span>
                  <span className="font-mono font-bold text-slate-900 text-sm block mt-1">
                    {selectedVehicle.capacityUomCode || 'KG'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}
