import { useEffect, useState, type FormEvent } from 'react'
import {
  AlertCircle,
  Calculator,
  CheckCircle2,
  FileSpreadsheet,
  Layers,
  Percent,
  Plus,
  Power,
  RefreshCw,
  Scale,
  Trash2,
  X,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  activateCompoundingBom,
  createCompoundingBom,
  getCompoundingBoms,
  getRawMaterials,
  retireCompoundingBom,
} from '../../api'
import {
  Button,
  Card,
  EmptyState,
  LoadingSpinner,
  PageHeader,
  StatusBadge,
} from '../../components/common'
import type {
  CompoundingBomItemRequest,
  CompoundingBomResponse,
  RawMaterialResponse,
} from '../../types'
import { usePermissions } from '../../hooks/usePermissions'

type DraftItem = CompoundingBomItemRequest & { key: number }
const apiError = () => 'The server could not complete the compounding BOM request.'

export function CompoundingBomPage() {
  const navigate = useNavigate()
  const [boms, setBoms] = useState<CompoundingBomResponse[]>([])
  const [materials, setMaterials] = useState<RawMaterialResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [working, setWorking] = useState(false)

  // Form state
  const [code, setCode] = useState('')
  const [version, setVersion] = useState('1.0')
  const [weight, setWeight] = useState('1000')
  const [items, setItems] = useState<DraftItem[]>([
    { key: 1, materialId: 0, percentage: 0, isRequired: true },
  ])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [bomList, materialList] = await Promise.all([
        getCompoundingBoms(),
        getRawMaterials(),
      ])
      setBoms(bomList)
      setMaterials(materialList.filter((m) => m.active))
    } catch {
      setError('Unable to load compounding BOMs or raw materials catalog.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void Promise.resolve().then(load)
  }, [])

  function updateItem(key: number, field: 'materialId' | 'percentage', value: number) {
    setItems((current) =>
      current.map((item) => (item.key === key ? { ...item, [field]: value } : item))
    )
  }

  const totalPercentage = items.reduce((sum, item) => sum + (Number(item.percentage) || 0), 0)
  const isPercentageBalanced = Math.abs(totalPercentage - 100) < 0.0001

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (
      !code.trim() ||
      !version.trim() ||
      Number(weight) <= 0 ||
      items.some((item) => item.materialId < 1 || item.percentage <= 0) ||
      !isPercentageBalanced
    ) {
      setError(
        'Please provide BOM code, version, positive target batch weight, valid material selections, and recipe percentages summing exactly to 100%.'
      )
      return
    }

    setWorking(true)
    setError(null)
    try {
      await createCompoundingBom({
        bomCode: code.trim(),
        version: version.trim(),
        targetBatchWeightKg: Number(weight),
        items: items.map((item) => ({
          materialId: item.materialId,
          percentage: item.percentage,
          isRequired: item.isRequired,
        })),
      })
      setShowForm(false)
      setCode('')
      setVersion('1.0')
      setWeight('1000')
      setItems([{ key: Date.now(), materialId: 0, percentage: 0, isRequired: true }])
      await load()
    } catch {
      setError(apiError())
    } finally {
      setWorking(false)
    }
  }

  async function transition(id: number, action: 'activate' | 'retire') {
    setWorking(true)
    setError(null)
    try {
      if (action === 'activate') await activateCompoundingBom(id)
      else await retireCompoundingBom(id)
      await load()
    } catch {
      setError(apiError())
    } finally {
      setWorking(false)
    }
  }

  const activeCount = boms.filter((b) => b.status === 'Active').length
  const totalBomsCount = boms.length

  const { isFull } = usePermissions('compoundingBom')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compounding BOM Recipes"
        description="Configure polymer masterbatch recipes, percentage formulation matrices, and calculate batch requirements."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
              Refresh
            </Button>
            {isFull && (
              <Button
                size="sm"
                variant={showForm ? 'secondary' : 'primary'}
                onClick={() => setShowForm((value) => !value)}
              >
                {showForm ? (
                  <>
                    <X className="size-3.5" aria-hidden="true" />
                    Cancel New BOM
                  </>
                ) : (
                  <>
                    <Plus className="size-3.5" aria-hidden="true" />
                    New Recipe BOM
                  </>
                )}
              </Button>
            )}
          </div>
        }
      />

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-4 border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Total Recipes</p>
            <Layers className="size-4 text-slate-500" aria-hidden="true" />
          </div>
          <p className="mt-2 font-mono text-2xl font-black text-slate-900 tabular-nums">{totalBomsCount}</p>
          <p className="mt-1 text-xs text-slate-500 font-medium">Standard compounding formulations</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-emerald-600 border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Active Formulations</p>
            <CheckCircle2 className="size-4 text-emerald-600" aria-hidden="true" />
          </div>
          <p className="mt-2 font-mono text-2xl font-black text-emerald-950 tabular-nums">{activeCount}</p>
          <p className="mt-1 text-xs text-slate-500 font-medium">Approved for floor batching</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-indigo-600 border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Raw Material Catalog</p>
            <Scale className="size-4 text-indigo-600" aria-hidden="true" />
          </div>
          <p className="mt-2 font-mono text-2xl font-black text-indigo-950 tabular-nums">{materials.length}</p>
          <p className="mt-1 text-xs text-slate-500 font-medium">Active ingredients available</p>
        </Card>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 shadow-xs">
          <AlertCircle className="size-5 shrink-0 text-rose-600 mt-0.5" aria-hidden="true" />
          <div className="flex-1">
            <h4 className="font-bold text-rose-900">BOM Operation Notice</h4>
            <p className="mt-0.5 font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* CREATE NEW BOM FORM */}
      {showForm && (
        <Card className="p-6 border-2 border-indigo-200 bg-gradient-to-b from-indigo-50/20 to-white shadow-md">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <FileSpreadsheet className="size-5 text-indigo-600" aria-hidden="true" />
            <h2 className="text-base font-bold text-slate-900">Define New Compounding Recipe (BOM)</h2>
          </div>

          <form onSubmit={submit} className="mt-5 space-y-5">
            {/* Header Fields */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  BOM Code <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  placeholder="e.g. BOM-PP-WOVEN-01"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Version <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  placeholder="e.g. 1.0"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Target Batch Weight (kg) <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  min="0.0001"
                  step="any"
                  type="number"
                  placeholder="e.g. 1000"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Recipe Formula Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Recipe Ingredients & Percentages
                </span>
                <span
                  className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                    isPercentageBalanced
                      ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                      : 'bg-amber-100 text-amber-950 border border-amber-300'
                  }`}
                >
                  Formula Total: {totalPercentage.toFixed(2)}% / 100.00%
                </span>
              </div>

              {items.map((item, index) => (
                <div
                  key={item.key}
                  className="grid grid-cols-1 gap-2 sm:grid-cols-[2rem_1fr_10rem_auto] items-center rounded-lg border border-slate-200 bg-slate-50/50 p-2.5"
                >
                  <span className="font-mono text-xs font-bold text-slate-400 text-center">
                    #{index + 1}
                  </span>

                  <select
                    required
                    value={item.materialId}
                    onChange={(e) => updateItem(item.key, 'materialId', Number(e.target.value))}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-hidden"
                  >
                    <option value="0">Select raw material component...</option>
                    {materials.map((material) => (
                      <option key={material.materialId} value={material.materialId}>
                        {material.materialCode} — {material.materialName}
                      </option>
                    ))}
                  </select>

                  <div className="relative">
                    <input
                      required
                      type="number"
                      min="0.0001"
                      max="100"
                      step="any"
                      placeholder="e.g. 75.0"
                      value={item.percentage || ''}
                      onChange={(e) => updateItem(item.key, 'percentage', Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 bg-white pl-3 pr-8 py-2 text-xs font-mono font-bold text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-hidden"
                    />
                    <Percent className="absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() =>
                      setItems((current) =>
                        current.length > 1 ? current.filter((v) => v.key !== item.key) : current
                      )
                    }
                    className="text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={() =>
                  setItems((current) => [
                    ...current,
                    { key: Date.now(), materialId: 0, percentage: 0, isRequired: true },
                  ])
                }
              >
                <Plus className="size-3.5" aria-hidden="true" />
                Add Ingredient Line
              </Button>

              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" type="button" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={working}
                  disabled={working || !isPercentageBalanced}
                >
                  <CheckCircle2 className="size-3.5" aria-hidden="true" />
                  Save Compounding Recipe
                </Button>
              </div>
            </div>
          </form>
        </Card>
      )}

      {/* BOM CATALOG LISTING TABLE */}
      {loading ? (
        <Card className="py-20 text-center">
          <LoadingSpinner label="Loading compounding recipes..." size="lg" />
        </Card>
      ) : boms.length === 0 ? (
        <Card className="py-14 text-center">
          <EmptyState
            icon={<Layers className="size-10 text-slate-400" />}
            title="No compounding recipes found"
            description="Create your first masterbatch compounding recipe to calculate batch requirements."
            action={
              <Button size="sm" onClick={() => setShowForm(true)}>
                <Plus className="size-3.5" aria-hidden="true" />
                Create First Recipe
              </Button>
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden p-0 border-slate-200 shadow-xs">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-100/90 text-xs font-bold uppercase tracking-wider text-slate-700">
                <tr>
                  <th scope="col" className="px-5 py-3.5">Recipe Code</th>
                  <th scope="col" className="px-5 py-3.5">Version</th>
                  <th scope="col" className="px-5 py-3.5">Standard Batch</th>
                  <th scope="col" className="px-5 py-3.5">Status</th>
                  <th scope="col" className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                {boms.map((bom) => {
                  const isActive = bom.status === 'Active'
                  const isRetired = bom.status === 'Retired'

                  return (
                    <tr key={bom.compoundingBomId} className="hover:bg-slate-50/80 transition-colors">
                      {/* Code */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="flex size-7 items-center justify-center rounded-md bg-indigo-50 text-indigo-700 font-mono font-bold text-xs">
                            <Layers className="size-3.5 text-indigo-600 shrink-0" aria-hidden="true" />
                          </div>
                          <span className="font-mono font-bold text-slate-900 text-sm">
                            {bom.bomCode}
                          </span>
                        </div>
                      </td>

                      {/* Version */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="font-mono font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-xs">
                          v{bom.version}
                        </span>
                      </td>

                      {/* Target Batch Weight */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="font-mono font-bold text-slate-900 tabular-nums text-sm">
                          {bom.targetBatchWeightKg != null ? Number(bom.targetBatchWeightKg).toLocaleString() : '—'}
                        </span>{' '}
                        <span className="text-[11px] font-bold text-slate-500">KG</span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <StatusBadge tone={isActive ? 'success' : isRetired ? 'danger' : 'neutral'}>
                          {bom.status}
                        </StatusBadge>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => navigate(`/production/bom/${bom.compoundingBomId}/requirements`)}
                            title="Calculate material requirements for desired batch size"
                          >
                            <Calculator className="size-3.5 text-indigo-600" aria-hidden="true" />
                            Calculate
                          </Button>

                          {isFull && !isActive && (
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => transition(bom.compoundingBomId, 'activate')}
                              disabled={working}
                            >
                              <Power className="size-3.5" aria-hidden="true" />
                              Activate
                            </Button>
                          )}

                          {isFull && !isRetired && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => transition(bom.compoundingBomId, 'retire')}
                              disabled={working}
                              className="text-slate-500 hover:text-rose-700"
                            >
                              Retire
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
        </Card>
      )}
    </div>
  )
}
