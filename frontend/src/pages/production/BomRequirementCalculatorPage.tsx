import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  Calculator,
  CheckCircle2,
  Layers,
  Scale,
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { calculateBomRequirements, getCompoundingBom } from '../../api'
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingSpinner,
  PageHeader,
  StatusBadge,
} from '../../components/common'
import type {
  BatchRequirementCalculationResponse,
  CompoundingBomResponse,
} from '../../types'

export function BomRequirementCalculatorPage() {
  const { bomId: bomParam } = useParams()
  const navigate = useNavigate()
  const bomId = Number(bomParam)

  const [bom, setBom] = useState<CompoundingBomResponse | null>(null)
  const [weight, setWeight] = useState('')
  const [result, setResult] = useState<BatchRequirementCalculationResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!Number.isInteger(bomId) || bomId < 1) return
    setLoading(true)
    setError(null)
    try {
      const data = await getCompoundingBom(bomId)
      setBom(data)
      setWeight(String(data.targetBatchWeightKg))
    } catch {
      setError('Unable to load this compounding BOM specification from backend.')
    } finally {
      setLoading(false)
    }
  }, [bomId])

  useEffect(() => {
    void Promise.resolve().then(load)
  }, [load])

  async function calculate(event: FormEvent) {
    event.preventDefault()
    const desired = Number(weight)
    if (!Number.isFinite(desired) || desired <= 0) {
      setError('Desired batch weight must be a positive number greater than zero.')
      return
    }
    setWorking(true)
    setError(null)
    try {
      const calculated = await calculateBomRequirements(bomId, desired)
      setResult(calculated)
    } catch {
      setError('Unable to calculate material requirements. Please check backend connection.')
    } finally {
      setWorking(false)
    }
  }

  if (!Number.isInteger(bomId) || bomId < 1) {
    return (
      <ErrorState
        title="Invalid BOM Reference"
        description="The recipe ID specified in the URL must be a valid positive integer."
        onRetry={() => navigate('/production/bom')}
        retryLabel="Back to Recipes"
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="BOM Material Requirement Calculator"
        description="Server-calculated formulation weights based on active compounding percentage matrices."
        actions={
          <Button variant="secondary" size="sm" onClick={() => navigate('/production/bom')}>
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Back to Recipes
          </Button>
        }
      />

      {loading ? (
        <Card className="py-20 text-center">
          <LoadingSpinner label="Loading compounding recipe specifications..." size="lg" />
        </Card>
      ) : error && !bom ? (
        <ErrorState title="Unable to Load BOM" description={error} onRetry={load} />
      ) : (
        bom && (
          <>
            {/* Recipe Profile & Batch Calculation Form */}
            <Card className="p-6 border-slate-200 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 font-mono font-bold text-sm shadow-xs">
                    <Layers className="size-5 text-indigo-600" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-mono font-bold text-slate-900">{bom.bomCode}</h2>
                      <span className="font-mono text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        v{bom.version}
                      </span>
                      <StatusBadge tone={bom.status === 'Active' ? 'success' : 'neutral'}>
                        {bom.status}
                      </StatusBadge>
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Standard Master Formulation · Default batch:{' '}
                      <span className="font-mono font-bold text-slate-700">
                        {Number(bom.targetBatchWeightKg).toLocaleString()} kg
                      </span>
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Recipe ID
                  </span>
                  <span className="font-mono text-sm font-bold text-slate-800">
                    #{bom.compoundingBomId}
                  </span>
                </div>
              </div>

              {/* Calculator Form */}
              <form onSubmit={calculate} className="mt-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                  <div className="flex-1 max-w-sm">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Desired Batch Weight (kg) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        required
                        min="0.0001"
                        step="any"
                        type="number"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        placeholder="e.g. 2500"
                        className="w-full rounded-lg border border-slate-300 bg-white pl-3 pr-14 py-2 text-sm font-mono font-bold text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                      />
                      <span className="absolute inset-y-0 right-3 flex items-center text-xs font-bold text-slate-400">
                        KG
                      </span>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    loading={working}
                    className="h-9.5 px-5 font-bold shadow-xs cursor-pointer"
                  >
                    <Calculator className="size-4" aria-hidden="true" />
                    Calculate Requirements
                  </Button>
                </div>

                {/* Batch Presets */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Quick Presets:</span>
                  {[500, 1000, 2500, 5000, 10000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setWeight(String(preset))}
                      className="rounded bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 px-2 py-0.5 text-xs font-mono font-medium text-slate-600 transition-colors cursor-pointer"
                    >
                      {preset.toLocaleString()} kg
                    </button>
                  ))}
                </div>
              </form>
            </Card>

            {error && (
              <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 shadow-xs">
                <AlertCircle className="size-5 shrink-0 text-rose-600 mt-0.5" aria-hidden="true" />
                <div className="flex-1">
                  <h4 className="font-bold text-rose-900">Calculation Error</h4>
                  <p className="mt-0.5 font-medium">{error}</p>
                </div>
              </div>
            )}

            {/* Calculated Requirements Breakdown */}
            {result ? (
              <Card className="overflow-hidden p-0 border-slate-200 shadow-xs">
                <div className="border-b border-slate-200 bg-slate-50/70 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Calculated Raw Material Requirements
                    </h3>
                    <p className="text-xs text-slate-500">
                      Exact proportional batching weights for target batch of{' '}
                      <strong className="font-mono text-slate-800">
                        {Number(result.desiredBatchWeightKg).toLocaleString()} kg
                      </strong>
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-950">
                    <CheckCircle2 className="size-3.5 text-emerald-600" aria-hidden="true" />
                    <span>Calculated by Manufacturing Backend</span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                    <thead className="bg-slate-100/90 text-xs font-bold uppercase tracking-wider text-slate-700">
                      <tr>
                        <th scope="col" className="px-6 py-3.5">Material Code</th>
                        <th scope="col" className="px-6 py-3.5">Material Name</th>
                        <th scope="col" className="px-6 py-3.5 text-right">Formula %</th>
                        <th scope="col" className="px-6 py-3.5 text-right">Required Batch Weight</th>
                        <th scope="col" className="px-6 py-3.5 text-center">Required Component</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                      {result.calculatedRequirements.map((item) => (
                        <tr key={item.materialId} className="hover:bg-slate-50/80 transition-colors">
                          {/* Code */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="font-mono font-bold text-slate-900 text-sm">
                              {item.materialCode}
                            </span>
                          </td>

                          {/* Name */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="font-medium text-slate-800">
                              {item.materialName}
                            </span>
                          </td>

                          {/* Percentage */}
                          <td className="px-6 py-4 whitespace-nowrap text-right font-mono font-semibold text-slate-700 text-xs">
                            {Number(item.percentage).toFixed(2)}%
                          </td>

                          {/* Required Weight */}
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <span className="font-mono font-black text-slate-900 tabular-nums text-sm">
                              {Number(item.requiredQuantityKg).toLocaleString(undefined, {
                                maximumFractionDigits: 3,
                              })}
                            </span>{' '}
                            <span className="text-[11px] font-bold text-slate-500">KG</span>
                          </td>

                          {/* Required */}
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                                item.isRequired
                                  ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {item.isRequired ? 'Mandatory' : 'Optional'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-200">
                      <tr>
                        <td colSpan={2} className="px-6 py-3.5 text-xs uppercase text-slate-700">
                          Total Batch Material Requirements:
                        </td>
                        <td className="px-6 py-3.5 text-right font-mono text-xs text-slate-800">
                          100.00%
                        </td>
                        <td className="px-6 py-3.5 text-right font-mono text-sm text-slate-900">
                          {Number(result.desiredBatchWeightKg).toLocaleString()} KG
                        </td>
                        <td className="px-6 py-3.5 text-center text-xs text-slate-500">
                          {result.calculatedRequirements.length} Ingredient(s)
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </Card>
            ) : (
              <Card className="py-14 text-center">
                <EmptyState
                  icon={<Scale className="size-10 text-slate-400" />}
                  title="Ready to Calculate Requirements"
                  description="Enter your desired target batch weight above and tap 'Calculate Requirements' to view exact ingredient quantities."
                />
              </Card>
            )}
          </>
        )
      )}
    </div>
  )
}
