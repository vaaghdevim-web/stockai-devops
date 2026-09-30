import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Copy,
  ExternalLink,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  XCircle,
} from 'lucide-react'
import { getSuppliers, getSupplierById } from '../../api/supplierApi'
import type { SupplierResponse } from '../../types/procurement'
import { useAuthStore } from '../../store/authStore'
import { canMutate } from '../../config/rbac'
import { Button, Card, Drawer, PageHeader, StatusBadge } from '../../components/common'

export function SuppliersPage() {
  const roles = useAuthStore((state) => state.roles)
  const isFullAccess = canMutate(roles, 'needToBuy')

  const [suppliers, setSuppliers] = useState<SupplierResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')

  // Selected supplier for details drawer
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierResponse | null>(null)
  const [drawerLoading, setDrawerLoading] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const fetchSupplierList = useCallback(async () => {
    try {
      setLoading(true)
      setErrorMessage(null)
      // Backend supports ?activeOnly=true|false
      const data = await getSuppliers(false)
      setSuppliers(data)
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } } }
      setErrorMessage(
        apiErr.response?.data?.message || 'Failed to load suppliers from backend API.'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void Promise.resolve().then(fetchSupplierList)
  }, [fetchSupplierList])

  async function handleSelectSupplier(supplier: SupplierResponse) {
    setIsDrawerOpen(true)
    setSelectedSupplier(supplier)
    try {
      setDrawerLoading(true)
      const fresh = await getSupplierById(supplier.supplierId)
      setSelectedSupplier(fresh)
    } catch {
      // Retain the passed item if single fetch fails
    } finally {
      setDrawerLoading(false)
    }
  }

  function handleCloseDrawer() {
    setIsDrawerOpen(false)
    setSelectedSupplier(null)
  }

  function handleCopy(text: string, fieldName: string) {
    navigator.clipboard.writeText(text)
    setCopiedField(fieldName)
    setTimeout(() => setCopiedField(null), 2000)
  }

  // Filtered suppliers
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      if (activeFilter === 'ACTIVE' && s.isActive === false) return false
      if (activeFilter === 'INACTIVE' && s.isActive !== false) return false

      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase().trim()
      return (
        s.supplierName?.toLowerCase().includes(q) ||
        s.gstNo?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.phone?.toLowerCase().includes(q) ||
        s.address?.toLowerCase().includes(q) ||
        String(s.supplierId).includes(q)
      )
    })
  }, [suppliers, activeFilter, searchQuery])

  // Summary metrics
  const totalCount = suppliers.length
  const activeCount = suppliers.filter((s) => s.isActive !== false).length
  const inactiveCount = suppliers.filter((s) => s.isActive === false).length
  const gstRegisteredCount = suppliers.filter((s) => s.gstNo && s.gstNo.trim().length > 0).length

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <PageHeader
        title="Supplier Management"
        description="Approved vendors, commercial contacts & GSTIN compliance records for polymer procurement"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchSupplierList}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs min-h-[44px] sm:min-h-9"
            >
              <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
          </div>
        }
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3.5 bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">
              Total Vendors
            </span>
            <Building2 className="size-4" />
          </div>
          <p className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-slate-900">
            {totalCount}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">Registered Suppliers</p>
        </Card>

        <Card className="p-3.5 bg-emerald-50/70 border-2 border-emerald-500/80 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">
              Active Suppliers
            </span>
            <CheckCircle2 className="size-4 text-emerald-600" />
          </div>
          <p className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-emerald-950">
            {activeCount}
          </p>
          <p className="mt-0.5 text-[11px] text-emerald-800 font-semibold">Ready for Purchase Orders</p>
        </Card>

        <Card className="p-3.5 bg-blue-50/70 border-2 border-blue-500/80 shadow-2xs">
          <div className="flex items-center justify-between text-blue-800">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">
              GST Compliant
            </span>
            <ShieldCheck className="size-4 text-blue-600" />
          </div>
          <p className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-blue-950">
            {gstRegisteredCount}
          </p>
          <p className="mt-0.5 text-[11px] text-blue-800 font-semibold">Verified GSTIN Numbers</p>
        </Card>

        <Card className="p-3.5 bg-slate-50 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">
              Inactive
            </span>
            <XCircle className="size-4 text-slate-400" />
          </div>
          <p className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-slate-700">
            {inactiveCount}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">Suspended / Archival</p>
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
              onClick={() => setActiveFilter('ALL')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer min-h-[44px] sm:min-h-8 ${
                activeFilter === 'ALL'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              All ({totalCount})
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('ACTIVE')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer min-h-[44px] sm:min-h-8 ${
                activeFilter === 'ACTIVE'
                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                  : 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
              }`}
            >
              <span className="size-2 rounded-full bg-emerald-500" />
              <span>Active ({activeCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('INACTIVE')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer min-h-[44px] sm:min-h-8 ${
                activeFilter === 'INACTIVE'
                  ? 'bg-slate-700 text-white border-slate-700 shadow-xs'
                  : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
              }`}
            >
              <span className="size-2 rounded-full bg-slate-400" />
              <span>Inactive ({inactiveCount})</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full lg:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Vendor, GSTIN, Email, City..."
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

      {/* Main Content Area */}
      {loading ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white p-8 text-center">
          <RefreshCw className="size-8 animate-spin text-slate-700" />
          <p className="text-sm font-semibold text-slate-700">Loading Suppliers...</p>
          <p className="text-xs text-slate-500">Connecting to commercial procurement catalog</p>
        </div>
      ) : errorMessage ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <AlertCircle className="mx-auto size-10 text-red-600 mb-2" />
          <h3 className="text-base font-bold text-red-900">Suppliers Unavailable</h3>
          <p className="text-xs text-red-700 mt-1 max-w-md mx-auto">{errorMessage}</p>
          <div className="mt-4">
            <Button variant="secondary" size="sm" onClick={fetchSupplierList} className="gap-1.5">
              <RefreshCw className="size-3.5" />
              Retry
            </Button>
          </div>
        </div>
      ) : filteredSuppliers.length === 0 ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-8 text-center">
          <Building2 className="size-10 text-slate-400" />
          <h4 className="text-sm font-bold text-slate-800">No Suppliers Found</h4>
          <p className="text-xs text-slate-500 max-w-sm">
            {searchQuery
              ? `No suppliers matched your query "${searchQuery}".`
              : 'There are no suppliers registered under this filter.'}
          </p>
          {searchQuery && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSearchQuery('')
                setActiveFilter('ALL')
              }}
            >
              Clear Search &amp; Filters
            </Button>
          )}
        </div>
      ) : (
        /* Suppliers Table */
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 font-mono">
                <tr>
                  <th className="px-4 py-3">Vendor / Supplier</th>
                  <th className="px-4 py-3">GSTIN</th>
                  <th className="px-4 py-3">Contact Details</th>
                  <th className="px-4 py-3">Facility Location</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSuppliers.map((supplier) => (
                  <tr
                    key={supplier.supplierId}
                    onClick={() => handleSelectSupplier(supplier)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    {/* Supplier Name & ID */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-800 font-mono font-bold text-xs border border-slate-200">
                          #{supplier.supplierId}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 text-sm block">
                            {supplier.supplierName}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            Supplier ID: #{supplier.supplierId}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* GSTIN */}
                    <td className="px-4 py-3.5 font-mono text-xs">
                      {supplier.gstNo ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {supplier.gstNo}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCopy(supplier.gstNo!, `gst-${supplier.supplierId}`)
                            }}
                            title="Copy GSTIN"
                            className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                          >
                            <Copy className="size-3" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Not Provided</span>
                      )}
                    </td>

                    {/* Contact Details */}
                    <td className="px-4 py-3.5 text-xs">
                      <div className="space-y-1">
                        {supplier.email && (
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Mail className="size-3 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[180px]">{supplier.email}</span>
                          </div>
                        )}
                        {supplier.phone && (
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Phone className="size-3 text-slate-400 shrink-0" />
                            <span className="font-mono">{supplier.phone}</span>
                          </div>
                        )}
                        {!supplier.email && !supplier.phone && (
                          <span className="text-slate-400 italic">No direct contact</span>
                        )}
                      </div>
                    </td>

                    {/* Address */}
                    <td className="px-4 py-3.5 text-xs text-slate-600 max-w-[240px]">
                      {supplier.address ? (
                        <div className="flex items-start gap-1.5">
                          <MapPin className="size-3 text-slate-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{supplier.address}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">No address on file</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5 text-center">
                      <StatusBadge tone={supplier.isActive !== false ? 'success' : 'neutral'}>
                        {supplier.isActive !== false ? 'ACTIVE' : 'INACTIVE'}
                      </StatusBadge>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSelectSupplier(supplier)
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

      {/* Supplier Details Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        size="lg"
        title={
          <div className="flex items-center gap-2">
            <Building2 className="size-5 text-slate-800" />
            <span className="font-bold text-slate-900 text-base">
              {selectedSupplier?.supplierName || 'Supplier Details'}
            </span>
          </div>
        }
        description={
          selectedSupplier ? (
            <span className="font-mono text-xs text-slate-500">
              Vendor Record ID: #{selectedSupplier.supplierId}
            </span>
          ) : undefined
        }
        footer={
          <div className="flex items-center justify-between w-full">
            <Button variant="secondary" onClick={handleCloseDrawer} className="text-xs">
              Close
            </Button>
            <span className="text-[11px] text-slate-400 font-mono">
              {isFullAccess ? 'Full Commercial Access' : 'Read-Only Mode'}
            </span>
          </div>
        }
      >
        {selectedSupplier && (
          <div className="space-y-5">
            {drawerLoading && (
              <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-2 rounded-md">
                <RefreshCw className="size-3.5 animate-spin" />
                <span>Refreshing live supplier record...</span>
              </div>
            )}

            {/* Status Card */}
            <div
              className={`rounded-xl border-2 p-4 shadow-2xs ${
                selectedSupplier.isActive !== false
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-950'
                  : 'border-slate-300 bg-slate-50 text-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex size-9 items-center justify-center rounded-lg ${
                      selectedSupplier.isActive !== false
                        ? 'bg-emerald-700 text-white'
                        : 'bg-slate-700 text-white'
                    }`}
                  >
                    {selectedSupplier.isActive !== false ? (
                      <CheckCircle2 className="size-5" />
                    ) : (
                      <XCircle className="size-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm uppercase font-mono tracking-wide">
                      {selectedSupplier.isActive !== false
                        ? 'Active Approved Vendor'
                        : 'Inactive / Suspended Vendor'}
                    </h3>
                    <p className="text-xs opacity-90 mt-0.5">
                      {selectedSupplier.isActive !== false
                        ? 'Approved for Purchase Requisitions & Stock Inward Receipts'
                        : 'Not eligible for active purchase order placement'}
                    </p>
                  </div>
                </div>
                <StatusBadge tone={selectedSupplier.isActive !== false ? 'success' : 'neutral'}>
                  {selectedSupplier.isActive !== false ? 'ACTIVE' : 'INACTIVE'}
                </StatusBadge>
              </div>
            </div>

            {/* Commercial Profile & GSTIN */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono flex items-center gap-1.5">
                <ShieldCheck className="size-3.5 text-slate-400" />
                Commercial &amp; Tax Identification
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">
                    Supplier Legal Name
                  </span>
                  <span className="font-bold text-slate-900 text-sm block mt-1">
                    {selectedSupplier.supplierName}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">
                      GSTIN Registration
                    </span>
                    {selectedSupplier.gstNo && (
                      <button
                        type="button"
                        onClick={() => handleCopy(selectedSupplier.gstNo!, 'gst-drawer')}
                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="size-3" />
                        {copiedField === 'gst-drawer' ? 'Copied' : 'Copy'}
                      </button>
                    )}
                  </div>
                  <span className="font-mono font-bold text-slate-900 text-sm block mt-1">
                    {selectedSupplier.gstNo || 'Not Provided'}
                  </span>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono flex items-center gap-1.5">
                <Mail className="size-3.5 text-slate-400" />
                Contact &amp; Logistics Address
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">
                      Email Address
                    </span>
                    {selectedSupplier.email && (
                      <button
                        type="button"
                        onClick={() => handleCopy(selectedSupplier.email!, 'email-drawer')}
                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="size-3" />
                        {copiedField === 'email-drawer' ? 'Copied' : 'Copy'}
                      </button>
                    )}
                  </div>
                  <span className="font-medium text-slate-900 text-xs block mt-1 break-all">
                    {selectedSupplier.email || 'Not Provided'}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">
                      Phone Number
                    </span>
                    {selectedSupplier.phone && (
                      <button
                        type="button"
                        onClick={() => handleCopy(selectedSupplier.phone!, 'phone-drawer')}
                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="size-3" />
                        {copiedField === 'phone-drawer' ? 'Copied' : 'Copy'}
                      </button>
                    )}
                  </div>
                  <span className="font-mono font-bold text-slate-900 text-xs block mt-1">
                    {selectedSupplier.phone || 'Not Provided'}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 col-span-1 sm:col-span-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">
                    Registered Facility Address
                  </span>
                  <p className="text-slate-900 text-xs mt-1 leading-relaxed">
                    {selectedSupplier.address || 'No physical address recorded on server.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}
