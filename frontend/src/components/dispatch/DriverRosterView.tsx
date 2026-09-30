import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Copy,
  ExternalLink,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  User,
  XCircle,
} from 'lucide-react'
import { getDrivers, getDriverById } from '../../api/driverApi'
import type { DriverResponse } from '../../types/dispatch'
import { Button, Card, Drawer, StatusBadge } from '../common'

export interface DriverRosterViewProps {
  isFullAccess?: boolean
}

export function DriverRosterView({ isFullAccess = false }: DriverRosterViewProps) {
  const [drivers, setDrivers] = useState<DriverResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')

  // Drawer
  const [selectedDriver, setSelectedDriver] = useState<DriverResponse | null>(null)
  const [drawerLoading, setDrawerLoading] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const fetchDrivers = useCallback(async () => {
    try {
      setLoading(true)
      setErrorMessage(null)
      const data = await getDrivers()
      setDrivers(data)
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } } }
      setErrorMessage(
        apiErr.response?.data?.message || 'Failed to fetch drivers from backend API.'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void Promise.resolve().then(fetchDrivers)
  }, [fetchDrivers])

  async function handleSelectDriver(driver: DriverResponse) {
    setIsDrawerOpen(true)
    setSelectedDriver(driver)
    try {
      setDrawerLoading(true)
      const fresh = await getDriverById(driver.driverId)
      setSelectedDriver(fresh)
    } catch {
      // Retain selected
    } finally {
      setDrawerLoading(false)
    }
  }

  function handleCloseDrawer() {
    setIsDrawerOpen(false)
    setSelectedDriver(null)
  }

  function handleCopy(text: string, fieldName: string) {
    navigator.clipboard.writeText(text)
    setCopiedField(fieldName)
    setTimeout(() => setCopiedField(null), 2000)
  }

  // Filter logic
  const filteredDrivers = useMemo(() => {
    return drivers.filter((d) => {
      if (statusFilter === 'ACTIVE' && d.isActive === false) return false
      if (statusFilter === 'INACTIVE' && d.isActive !== false) return false

      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase().trim()
      return (
        d.driverName?.toLowerCase().includes(q) ||
        d.licenseNumber?.toLowerCase().includes(q) ||
        d.phone?.toLowerCase().includes(q) ||
        String(d.driverId).includes(q)
      )
    })
  }, [drivers, statusFilter, searchQuery])

  // KPIs
  const totalDrivers = drivers.length
  const activeDrivers = drivers.filter((d) => d.isActive !== false).length
  const inactiveDrivers = drivers.filter((d) => d.isActive === false).length
  const validLicenses = drivers.filter((d) => {
    if (!d.licenseExpiry) return true
    const expiry = new Date(d.licenseExpiry)
    return expiry > new Date()
  }).length

  return (
    <div className="space-y-4">
      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3.5 bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">
              Total Drivers
            </span>
            <User className="size-4" />
          </div>
          <p className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-slate-900">
            {totalDrivers}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">Registered Personnel</p>
        </Card>

        <Card className="p-3.5 bg-emerald-50/70 border-2 border-emerald-500/80 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">
              Active Drivers
            </span>
            <CheckCircle2 className="size-4 text-emerald-600" />
          </div>
          <p className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-emerald-950">
            {activeDrivers}
          </p>
          <p className="mt-0.5 text-[11px] text-emerald-800 font-semibold">Ready for Dispatch</p>
        </Card>

        <Card className="p-3.5 bg-blue-50/70 border-2 border-blue-500/80 shadow-2xs">
          <div className="flex items-center justify-between text-blue-800">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">
              Valid Licenses
            </span>
            <ShieldCheck className="size-4 text-blue-600" />
          </div>
          <p className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-blue-950">
            {validLicenses}
          </p>
          <p className="mt-0.5 text-[11px] text-blue-800 font-semibold">Unexpired Driver Badges</p>
        </Card>

        <Card className="p-3.5 bg-slate-50 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">
              Inactive
            </span>
            <XCircle className="size-4 text-slate-400" />
          </div>
          <p className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-slate-700">
            {inactiveDrivers}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">On Leave / Inactive</p>
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
              All ({totalDrivers})
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
              <span>Active ({activeDrivers})</span>
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
              <span>Inactive ({inactiveDrivers})</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full lg:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Driver Name, License, Phone..."
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
          <p className="text-sm font-semibold text-slate-700">Loading Authorized Drivers...</p>
          <p className="text-xs text-slate-500">Connecting to dispatch personnel records</p>
        </div>
      ) : errorMessage ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <AlertCircle className="mx-auto size-10 text-red-600 mb-2" />
          <h3 className="text-base font-bold text-red-900">Driver Data Unavailable</h3>
          <p className="text-xs text-red-700 mt-1 max-w-md mx-auto">{errorMessage}</p>
          <div className="mt-4">
            <Button variant="secondary" size="sm" onClick={fetchDrivers} className="gap-1.5">
              <RefreshCw className="size-3.5" />
              Retry
            </Button>
          </div>
        </div>
      ) : filteredDrivers.length === 0 ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-8 text-center">
          <User className="size-10 text-slate-400" />
          <h4 className="text-sm font-bold text-slate-800">No Drivers Found</h4>
          <p className="text-xs text-slate-500 max-w-sm">
            {searchQuery
              ? `No drivers matched your search "${searchQuery}".`
              : 'There are no drivers registered in the roster.'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 font-mono">
                <tr>
                  <th className="px-4 py-3">Driver Name</th>
                  <th className="px-4 py-3">License Number</th>
                  <th className="px-4 py-3">License Expiry</th>
                  <th className="px-4 py-3">Contact Phone</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDrivers.map((driver) => {
                  const isExpired =
                    driver.licenseExpiry && new Date(driver.licenseExpiry) < new Date()

                  return (
                    <tr
                      key={driver.driverId}
                      onClick={() => handleSelectDriver(driver)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      {/* Driver Name & ID */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-800 font-mono font-bold text-xs border border-slate-200">
                            <User className="size-4" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 text-sm block">
                              {driver.driverName}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              Driver ID: #{driver.driverId}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* License Number */}
                      <td className="px-4 py-3.5 font-mono text-xs">
                        {driver.licenseNumber ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              {driver.licenseNumber}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleCopy(driver.licenseNumber!, `lic-${driver.driverId}`)
                              }}
                              title="Copy License Number"
                              className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                            >
                              <Copy className="size-3" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">—</span>
                        )}
                      </td>

                      {/* License Expiry */}
                      <td className="px-4 py-3.5 font-mono text-xs">
                        {driver.licenseExpiry ? (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="size-3.5 text-slate-400" />
                            <span
                              className={`font-semibold ${
                                isExpired ? 'text-red-600 font-bold' : 'text-slate-800'
                              }`}
                            >
                              {driver.licenseExpiry}
                            </span>
                            {isExpired && (
                              <span className="rounded bg-red-100 px-1.5 py-0.2 text-[10px] font-bold text-red-700">
                                EXPIRED
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">—</span>
                        )}
                      </td>

                      {/* Phone */}
                      <td className="px-4 py-3.5 font-mono text-xs text-slate-800">
                        {driver.phone ? (
                          <div className="flex items-center gap-1.5">
                            <Phone className="size-3 text-slate-400" />
                            <span>{driver.phone}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No phone on record</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 text-center">
                        <StatusBadge tone={driver.isActive !== false ? 'success' : 'neutral'}>
                          {driver.isActive !== false ? 'ACTIVE' : 'INACTIVE'}
                        </StatusBadge>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSelectDriver(driver)
                          }}
                          className="gap-1 text-xs min-h-[44px] sm:min-h-7"
                        >
                          <span>Details</span>
                          <ExternalLink className="size-3" />
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

      {/* Driver Details Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        size="lg"
        title={
          <div className="flex items-center gap-2">
            <User className="size-5 text-slate-800" />
            <span className="font-bold text-slate-900 text-base">
              {selectedDriver?.driverName || 'Driver Details'}
            </span>
          </div>
        }
        description={
          selectedDriver ? (
            <span className="font-mono text-xs text-slate-500">
              Driver Personnel ID: #{selectedDriver.driverId}
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
        {selectedDriver && (
          <div className="space-y-5">
            {drawerLoading && (
              <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-2 rounded-md">
                <RefreshCw className="size-3.5 animate-spin" />
                <span>Refreshing live driver record...</span>
              </div>
            )}

            {/* Status Card */}
            <div
              className={`rounded-xl border-2 p-4 shadow-2xs ${
                selectedDriver.isActive !== false
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-950'
                  : 'border-slate-300 bg-slate-50 text-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex size-9 items-center justify-center rounded-lg ${
                      selectedDriver.isActive !== false
                        ? 'bg-emerald-700 text-white'
                        : 'bg-slate-700 text-white'
                    }`}
                  >
                    {selectedDriver.isActive !== false ? (
                      <CheckCircle2 className="size-5" />
                    ) : (
                      <XCircle className="size-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm uppercase font-mono tracking-wide">
                      {selectedDriver.isActive !== false
                        ? 'Authorized Transport Driver'
                        : 'Inactive Driver Profile'}
                    </h3>
                    <p className="text-xs opacity-90 mt-0.5">
                      {selectedDriver.isActive !== false
                        ? 'Permitted for assignment on active outbound shipments'
                        : 'Currently inactive for shipment dispatch'}
                    </p>
                  </div>
                </div>
                <StatusBadge tone={selectedDriver.isActive !== false ? 'success' : 'neutral'}>
                  {selectedDriver.isActive !== false ? 'ACTIVE' : 'INACTIVE'}
                </StatusBadge>
              </div>
            </div>

            {/* Driver Identity & License Information */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono flex items-center gap-1.5">
                <ShieldCheck className="size-3.5 text-slate-400" />
                Commercial Driving Credentials
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">
                    Full Driver Name
                  </span>
                  <span className="font-bold text-slate-900 text-sm block mt-1">
                    {selectedDriver.driverName}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">
                      License Number
                    </span>
                    {selectedDriver.licenseNumber && (
                      <button
                        type="button"
                        onClick={() => handleCopy(selectedDriver.licenseNumber!, 'lic-drawer')}
                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="size-3" />
                        {copiedField === 'lic-drawer' ? 'Copied' : 'Copy'}
                      </button>
                    )}
                  </div>
                  <span className="font-mono font-bold text-slate-900 text-sm block mt-1">
                    {selectedDriver.licenseNumber || 'Not Recorded'}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">
                    License Expiry Date
                  </span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Calendar className="size-3.5 text-slate-400" />
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {selectedDriver.licenseExpiry || 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">
                      Contact Phone
                    </span>
                    {selectedDriver.phone && (
                      <button
                        type="button"
                        onClick={() => handleCopy(selectedDriver.phone!, 'phone-drawer')}
                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="size-3" />
                        {copiedField === 'phone-drawer' ? 'Copied' : 'Copy'}
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Phone className="size-3.5 text-slate-400" />
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {selectedDriver.phone || 'No phone recorded'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}
