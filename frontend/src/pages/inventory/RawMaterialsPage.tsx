import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Eye, Filter, Layers, Package, PackagePlus, RefreshCw, Search, X } from 'lucide-react'
import { getRawMaterials } from '../../api/inventoryApi'
import type { RawMaterialResponse } from '../../types'
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingSpinner,
  PageHeader,
  StatusBadge,
} from '../../components/common'
import { MaterialDetailsDrawer, MaterialReceivingModal } from '../../components/inventory'
import { usePermissions } from '../../hooks/usePermissions'

export function RawMaterialsPage() {
  const navigate = useNavigate()
  const [materials, setMaterials] = useState<RawMaterialResponse[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false)
  const [selectedMaterialForIntake, setSelectedMaterialForIntake] = useState<number | null>(null)
  const [selectedMaterialForDetails, setSelectedMaterialForDetails] = useState<number | null>(null)

  const [refreshVersion, setRefreshVersion] = useState(0)

  function fetchMaterials() {
    setLoading(true)
    setError(null)
    setRefreshVersion((version) => version + 1)
  }

  useEffect(() => {
    let active = true
    async function loadMaterials() {
      try {
        const data = await getRawMaterials()
        if (active) setMaterials(data)
      } catch {
        if (active) setError('Unable to load raw materials from the server. Please check your connection.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void loadMaterials()
    return () => { active = false }
  }, [refreshVersion])

  const categories = useMemo(() => {
    if (!Array.isArray(materials)) return []
    const catSet = new Set<string>()
    materials.forEach((m) => {
      if (m.categoryName) catSet.add(m.categoryName)
    })
    return Array.from(catSet).sort()
  }, [materials])

  const filteredMaterials = useMemo(() => {
    if (!Array.isArray(materials)) return []
    return materials.filter((m) => {
      // Category filter
      if (selectedCategory !== 'ALL' && m.categoryName !== selectedCategory) {
        return false
      }
      // Status filter
      if (statusFilter === 'ACTIVE' && !m.active) return false
      if (statusFilter === 'INACTIVE' && m.active) return false

      // Search query
      if (!searchQuery.trim()) return true
      const query = searchQuery.toLowerCase()
      return (
        m.materialCode.toLowerCase().includes(query) ||
        m.materialName.toLowerCase().includes(query) ||
        (m.categoryName && m.categoryName.toLowerCase().includes(query))
      )
    })
  }, [materials, searchQuery, selectedCategory, statusFilter])

  const { canReceive } = usePermissions('rawMaterials')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Raw Materials Inventory"
        description="Master catalog of production resins, additives, and masterbatches with real-time stock thresholds."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchMaterials}
              disabled={loading}
            >
              <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
              Refresh
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/inventory/batches')}
            >
              <Layers className="size-3.5" aria-hidden="true" />
              Manage Batches
            </Button>
            {canReceive && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setSelectedMaterialForIntake(null)
                  setIsReceiveModalOpen(true)
                }}
              >
                <PackagePlus className="size-3.5" aria-hidden="true" />
                Receive Shipment
              </Button>
            )}
          </div>
        }
      />

      {/* Metric Highlights */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Total Materials</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{loading ? '—' : materials.length}</p>
          <p className="mt-1 text-xs text-slate-500">Cataloged in factory inventory</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Active Materials</p>
          <p className="mt-2 text-2xl font-bold text-emerald-600">
            {loading ? '—' : materials.filter((m) => m.active).length}
          </p>
          <p className="mt-1 text-xs text-slate-500">Available for production compounding</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Material Categories</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {loading ? '—' : new Set(materials.map((m) => m.categoryName).filter(Boolean)).size}
          </p>
          <p className="mt-1 text-xs text-slate-500">Resins, Fillers, Masterbatches, Additives</p>
        </Card>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-xs">
          <Search className="size-4 text-slate-400 shrink-0" aria-hidden="true" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search materials by code, name, or category..."
            className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-xs font-medium text-slate-400 hover:text-slate-600"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Dropdown */}
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 shadow-xs">
            <Filter className="size-3.5 text-slate-400" aria-hidden="true" />
            <select
              aria-label="Material category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent text-xs font-medium text-slate-700 outline-none"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Status Dropdown */}
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 shadow-xs">
            <select
              aria-label="Material status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs font-medium text-slate-700 outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>
          </div>

          {(searchQuery || selectedCategory !== 'ALL' || statusFilter !== 'ALL') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery('')
                setSelectedCategory('ALL')
                setStatusFilter('ALL')
              }}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              <X className="size-3.5" aria-hidden="true" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Main Table / State Display */}
      {loading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner label="Fetching raw materials catalog..." size="lg" />
        </div>
      ) : error ? (
        <ErrorState
          title="Failed to Load Materials"
          description={error}
          onRetry={fetchMaterials}
          retryLabel="Try again"
        />
      ) : filteredMaterials.length === 0 ? (
        <EmptyState
          icon={<Package className="size-10 text-slate-400" />}
          title="No matching materials found"
          description={
            searchQuery || selectedCategory !== 'ALL' || statusFilter !== 'ALL'
              ? 'No raw materials match the selected search keywords or filter criteria. Try clearing or resetting your filters.'
              : 'The raw materials catalog is currently empty.'
          }
          action={
            searchQuery || selectedCategory !== 'ALL' || statusFilter !== 'ALL' ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSearchQuery('')
                  setSelectedCategory('ALL')
                  setStatusFilter('ALL')
                }}
              >
                Reset Filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Card className="overflow-hidden" contentClassName="p-0 sm:p-0">
          <div className="max-w-full overflow-x-auto overscroll-x-contain" tabIndex={0} role="region" aria-label="Scrollable data table">
            <table className="w-full min-w-[48rem] border-collapse text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="px-5 py-3">Material Code</th>
                  <th className="px-5 py-3">Material Name</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3 text-right">Standard Cost</th>
                  <th className="px-5 py-3 text-right">Reorder Level</th>
                  <th className="px-5 py-3 text-right">Safety Stock</th>
                  <th className="px-5 py-3 text-center">Lead Time</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredMaterials.map((m) => (
                  <tr key={m.materialId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => setSelectedMaterialForDetails(m.materialId)}
                        className="text-slate-800 hover:text-accent-700 hover:underline font-mono text-left"
                        title="Click to view polymer specifications & genealogy"
                      >
                        {m.materialCode}
                      </button>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-900">
                      <button
                        type="button"
                        onClick={() => setSelectedMaterialForDetails(m.materialId)}
                        className="text-left hover:text-accent-700 hover:underline"
                        title="Click to view polymer specifications & genealogy"
                      >
                        {m.materialName}
                      </button>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {m.categoryName || '—'}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-slate-700">
                      ₹{Number(m.standardCost).toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-slate-700">
                      {Number(m.reorderLevel).toLocaleString()} {m.defaultUomCode || 'KG'}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-slate-700">
                      {Number(m.safetyStock).toLocaleString()} {m.defaultUomCode || 'KG'}
                    </td>
                    <td className="px-5 py-3.5 text-center text-slate-600">
                      {m.leadTimeDays}d
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <StatusBadge tone={m.active ? 'success' : 'neutral'}>
                        {m.active ? 'Active' : 'Inactive'}
                      </StatusBadge>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs"
                          onClick={() => setSelectedMaterialForDetails(m.materialId)}
                          title={`View polymer specifications & batch genealogy for ${m.materialName}`}
                        >
                          <Eye className="size-3" aria-hidden="true" />
                          Specs
                        </Button>
                        {canReceive && (
                          <Button
                            variant="secondary"
                            size="sm"
                            className="text-xs"
                            onClick={() => {
                              setSelectedMaterialForIntake(m.materialId)
                              setIsReceiveModalOpen(true)
                            }}
                            title={`Receive shipment intake for ${m.materialName}`}
                          >
                            <PackagePlus className="size-3" aria-hidden="true" />
                            Receive
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs"
                          onClick={() => navigate(`/inventory/batches?materialId=${m.materialId}`)}
                          title={`View FIFO batches for ${m.materialName}`}
                        >
                          Batches
                          <ArrowRight className="size-3" aria-hidden="true" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Material Technical Details Slide-Over Drawer */}
      <MaterialDetailsDrawer
        isOpen={selectedMaterialForDetails !== null}
        onClose={() => setSelectedMaterialForDetails(null)}
        materialId={selectedMaterialForDetails}
        onReceiveIntake={(id) => {
          setSelectedMaterialForIntake(id)
          setIsReceiveModalOpen(true)
        }}
        onViewBatches={(id) => navigate(`/inventory/batches?materialId=${id}`)}
      />

      {/* Material Receiving Intake Modal */}
      <MaterialReceivingModal
        isOpen={isReceiveModalOpen}
        onClose={() => setIsReceiveModalOpen(false)}
        initialMaterialId={selectedMaterialForIntake}
        onSuccess={() => {
          fetchMaterials()
        }}
      />
    </div>
  )
}

