import { useEffect, useState, type FormEvent } from 'react'
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Cog,
  Factory,
  Play,
  RefreshCw,
  Scale,
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  completeProductionStage,
  startProductionStage,
  getProductionRun,
  getProductionStage,
} from '../../api'
import {
  Button,
  Card,
  LoadingSpinner,
  PageHeader,
  StatusBadge,
} from '../../components/common'
import type { ProductionStageResponse } from '../../types'
import { usePermissions } from '../../hooks/usePermissions'

function errorMessage(error: unknown) {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string; detail?: string } } }).response
    return response?.data?.message || response?.data?.detail || 'The server could not process this stage action.'
  }
  return 'The server could not process this stage action.'
}

function toneForStatus(status: string) {
  if (status === 'Completed') return 'success' as const
  if (status === 'Running') return 'info' as const
  if (status === 'Blocked' || status === 'Failed' || status === 'Cancelled') return 'danger' as const
  if (status === 'Ready') return 'warning' as const
  return 'neutral' as const
}

const number = (value: number | null | undefined) =>
  value == null ? '—' : Number(value).toLocaleString(undefined, { maximumFractionDigits: 3 })

export function ProductionStagePage() {
  const { productionId, stageId } = useParams()
  return <StageContent key={`${productionId}-${stageId}`} />
}

function StageContent() {
  const { productionId: productionIdParam, stageId: stageIdParam } = useParams()
  const navigate = useNavigate()
  const productionId = Number(productionIdParam)
  const stageId = Number(stageIdParam)

  const [runName, setRunName] = useState('Production Run')
  const [runCompleted, setRunCompleted] = useState(false)
  const [stage, setStage] = useState<ProductionStageResponse | null>(null)
  const [inputWeightKg, setInputWeightKg] = useState('')
  const [outputWeightKg, setOutputWeightKg] = useState('')
  const [scrapWeightKg, setScrapWeightKg] = useState('0')
  const [action, setAction] = useState<'start' | 'complete' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [loading, setLoading] = useState(true)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let active = true
    if (Number.isSafeInteger(productionId) && productionId > 0 && Number.isSafeInteger(stageId) && stageId > 0) {
      Promise.all([getProductionRun(productionId), getProductionStage(productionId, stageId)])
        .then(([run, current]) => {
          if (!active) return
          setRunName(run.productionNumber)
          setRunCompleted(run.status === 'Completed')
          if (current && (current.stageId !== stageId || current.productionId !== productionId)) {
            throw new Error('Stage response does not match the selected run and stage.')
          }
          setStage(current ?? null)
          if (current) {
            if (current.inputWeightKg != null) setInputWeightKg(String(current.inputWeightKg))
            if (current.outputWeightKg != null) setOutputWeightKg(String(current.outputWeightKg))
            if (current.scrapWeightKg != null) setScrapWeightKg(String(current.scrapWeightKg))
          }
          if (!current) setError('This stage was not found in the selected production run.')
        })
        .catch((requestError) => {
          if (active) {
            setStage(null)
            setError(errorMessage(requestError))
          }
        })
        .finally(() => {
          if (active) setLoading(false)
        })
    }
    return () => {
      active = false
    }
  }, [productionId, stageId, version])

  function refreshStage() {
    setLoading(true)
    setError(null)
    setVersion((value) => value + 1)
  }

  const validIds =
    Number.isSafeInteger(productionId) && productionId > 0 && Number.isSafeInteger(stageId) && stageId > 0

  const parsedInput = Number(inputWeightKg)
  const parsedOutput = Number(outputWeightKg)
  const parsedScrap = Number(scrapWeightKg)
  const validWeights = [inputWeightKg, outputWeightKg, scrapWeightKg].every(
    (value) => value.trim() !== '' && Number.isFinite(Number(value)) && Number(value) >= 0
  )
  const balanced = validWeights && Math.abs(parsedInput - parsedOutput - parsedScrap) < 0.0001
  const balanceDifference = parsedInput - (parsedOutput + parsedScrap)

  async function handleStart() {
    if (!validIds || runCompleted || action || loading || !stage || stage.status !== 'Ready') return
    setAction('start')
    setError(null)
    try {
      // STRICT REQUIREMENT: must use stage.stageId, never sequenceNo
      const updated = await startProductionStage(productionId, stage.stageId)
      setStage(updated)
      refreshStage()
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setAction(null)
    }
  }

  async function handleComplete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (runCompleted || action || loading || !stage || stage.status !== 'Running') return
    if (!validIds || !balanced || parsedInput < 0 || parsedOutput < 0 || parsedScrap < 0) {
      setError('Material balance rule: Input weight must equal output weight plus scrap weight.')
      return
    }
    setAction('complete')
    setError(null)
    try {
      // STRICT REQUIREMENT: must use stage.stageId, never sequenceNo
      const updated = await completeProductionStage(productionId, stage.stageId, {
        inputWeightKg: parsedInput,
        outputWeightKg: parsedOutput,
        scrapWeightKg: parsedScrap,
      })
      setStage(updated)
      refreshStage()
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setAction(null)
    }
  }

  const { canExecute } = usePermissions('currentWork')

  if (!validIds) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Invalid Production Stage"
          description="Production run and stage references must be valid positive integers."
        />
        <Button variant="secondary" onClick={() => navigate('/production')}>
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to Production
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={runName}
        description={
          stage
            ? `Step #${stage.sequenceNo} — ${stage.stageName || 'Stage'} · ${[
                stage.machineCode,
                stage.machineName,
                stage.unitName || stage.unitCode,
              ]
                .filter(Boolean)
                .join(' · ')}`
            : 'Production Stage Execution'
        }
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => navigate('/production')}>
              <ArrowLeft className="size-3.5" aria-hidden="true" />
              All Production
            </Button>
            <Button variant="secondary" size="sm" onClick={() => navigate('/wip')}>
              <Activity className="size-3.5" aria-hidden="true" />
              WIP Queue
            </Button>
            <Button variant="secondary" size="sm" onClick={refreshStage} disabled={loading || action !== null}>
              <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
              Refresh
            </Button>
          </div>
        }
      />

      {/* Error Alert */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 shadow-xs">
          <AlertCircle className="size-5 shrink-0 text-rose-600 mt-0.5" aria-hidden="true" />
          <div className="flex-1">
            <h4 className="font-bold text-rose-900">Stage Action Failed</h4>
            <p className="mt-0.5 font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Stage Specification & Identity Card */}
      {stage && (
        <Card className="p-5 border-slate-200 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 font-mono font-bold text-sm shadow-xs">
                #{stage.sequenceNo}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-slate-900">
                    {stage.stageName || `Stage #${stage.sequenceNo}`}
                  </h3>
                  <StatusBadge tone={toneForStatus(stage.status)}>{stage.status}</StatusBadge>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 font-mono">
                  <span className="flex items-center gap-1">
                    <Cog className="size-3.5 text-slate-400" aria-hidden="true" />
                    {[stage.machineCode, stage.machineName].filter(Boolean).join(' · ') || 'Machine unassigned'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Factory className="size-3.5 text-slate-400" aria-hidden="true" />
                    {[stage.unitCode, stage.unitName].filter(Boolean).join(' · ') || 'Unit unassigned'}
                  </span>
                  <span className="text-slate-400">
                    Stage ID: <strong className="text-slate-700">#{stage.stageId}</strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Execution Status
              </span>
              <span className="font-mono text-sm font-bold text-slate-800">
                {stage.status === 'Completed'
                  ? 'Finished & Stowed'
                  : stage.status === 'Running'
                    ? 'In Progress (Active)'
                    : stage.status === 'Ready'
                      ? 'Ready to Start'
                      : 'Pending Sequence'}
              </span>
            </div>
          </div>

          {/* Current Material Metrics Recorded */}
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs">
            <div className="rounded-lg border border-slate-200/80 bg-slate-50 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Recorded Input Weight
              </span>
              <p className="mt-1 font-mono text-lg font-black text-slate-900 tabular-nums">
                {stage.inputWeightKg != null ? `${number(stage.inputWeightKg)} kg` : '—'}
              </p>
              <span className="text-[10px] text-slate-400">Debited raw material / WIP</span>
            </div>

            <div className="rounded-lg border border-slate-200/80 bg-slate-50 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Recorded Output Weight
              </span>
              <p className="mt-1 font-mono text-lg font-black text-slate-900 tabular-nums">
                {stage.outputWeightKg != null ? `${number(stage.outputWeightKg)} kg` : '—'}
              </p>
              <span className="text-[10px] text-slate-400">Good production yield</span>
            </div>

            <div className="rounded-lg border border-slate-200/80 bg-slate-50 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Recorded Scrap / Wastage
              </span>
              <p className="mt-1 font-mono text-lg font-black text-slate-900 tabular-nums">
                {stage.scrapWeightKg != null ? `${number(stage.scrapWeightKg)} kg` : '—'}
              </p>
              <span className="text-[10px] text-slate-400">Trimmings & startup waste</span>
            </div>
          </div>
        </Card>
      )}

      {/* Completed Banner */}
      {stage?.status === 'Completed' && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-5 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 shrink-0">
              <CheckCircle2 className="size-6" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-emerald-950">Stage Completed Successfully</h3>
              <p className="mt-0.5 text-xs text-emerald-800 leading-relaxed">
                Material balance was validated and permanently recorded on the server. Output has been credited to
                downstream WIP or finished goods inventory.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => navigate('/production')}>
                  Return to Production Runs
                </Button>
                <Button size="sm" variant="secondary" onClick={() => navigate('/wip')}>
                  View Work In Progress
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Production Run Already Completed Banner */}
      {runCompleted && stage?.status !== 'Completed' && (
        <div className="rounded-xl border border-slate-300 bg-slate-100 p-4 text-xs text-slate-700">
          <p className="font-semibold">This production run is marked Completed.</p>
          <p className="mt-0.5 text-slate-500">No further stage actions or weight modifications are permitted.</p>
        </div>
      )}

      {/* Loading state */}
      {loading && !stage && (
        <Card className="py-20 text-center">
          <LoadingSpinner label="Loading current stage details..." size="lg" />
        </Card>
      )}

      {/* Pending State Card */}
      {!loading && stage?.status === 'Pending' && (
        <Card className="p-6 border-slate-200 bg-slate-50/70 text-center py-10">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-slate-200 text-slate-600 mb-3">
            <Clock className="size-6" aria-hidden="true" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Waiting for Prior Stage Completion</h3>
          <p className="mt-1 text-xs text-slate-600 max-w-md mx-auto">
            Step #{stage.sequenceNo} ({stage.stageName}) is in <strong className="uppercase">Pending</strong> status.
            The preceding workflow stages must be fully executed and completed before this stage can be started.
          </p>
          <div className="mt-4">
            <Button variant="secondary" size="sm" onClick={() => navigate('/production')}>
              Back to Run Workflow
            </Button>
          </div>
        </Card>
      )}

      {/* Action Cards: Start vs Complete */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* VIEW-ONLY NOTICE */}
        {!loading && !canExecute && (stage?.status === 'Ready' || stage?.status === 'Running') && (
          <Card className="p-6 border-slate-200 bg-slate-50 text-slate-700 lg:col-span-2">
            <h3 className="text-sm font-bold text-slate-900">View-Only Stage Overview</h3>
            <p className="mt-1 text-xs text-slate-600">
              You are viewing this production stage in read-only mode. Direct machine start and material balance completion actions are restricted to operators and production supervisors.
            </p>
          </Card>
        )}

        {/* START STAGE CARD */}
        {canExecute && !loading && !runCompleted && stage?.status === 'Ready' && (
          <Card className="p-6 border-2 border-amber-300 bg-amber-50/20 shadow-xs lg:col-span-2">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex size-12 items-center justify-center rounded-xl bg-amber-500 text-white shrink-0 shadow-md">
                  <Play className="size-6 ml-0.5" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Ready to Start Stage #{stage.sequenceNo}</h3>
                  <p className="mt-1 text-xs text-slate-600 leading-relaxed max-w-xl">
                    Prior stages are complete. Verify machine setup on{' '}
                    <strong className="font-mono text-slate-800">
                      {[stage.machineCode, stage.machineName].filter(Boolean).join(' · ')}
                    </strong>
                    , inspect safety interlocks, and start the stage to log run execution.
                  </p>
                </div>
              </div>

              <div className="shrink-0">
                <Button
                  variant="primary"
                  size="lg"
                  loading={action === 'start'}
                  disabled={action !== null}
                  onClick={handleStart}
                  className="w-full md:w-auto px-6 py-3 text-sm font-bold shadow-md cursor-pointer"
                >
                  <Play className="size-4" aria-hidden="true" />
                  Start Stage #{stage.sequenceNo} Now
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* COMPLETE STAGE & MATERIAL BALANCE CARD */}
        {canExecute && !loading && !runCompleted && stage?.status === 'Running' && (
          <Card className="p-6 border-2 border-indigo-200 shadow-sm lg:col-span-2">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="flex size-11 items-center justify-center rounded-xl bg-indigo-600 text-white shrink-0 shadow-md">
                <Scale className="size-6" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Complete Stage #{stage.sequenceNo} & Validate Material Balance
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  The manufacturing server strictly enforces material conservation:{' '}
                  <strong className="font-mono text-slate-800">Input = Output + Scrap</strong>.
                </p>
              </div>
            </div>

            <form className="mt-6 space-y-6" onSubmit={handleComplete}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {/* Input Weight */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Material Input (kg) <span className="text-rose-500">*</span>
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      required
                      min="0"
                      step="any"
                      type="number"
                      value={inputWeightKg}
                      onChange={(event) => setInputWeightKg(event.target.value)}
                      placeholder="e.g. 500"
                      className="w-full rounded-lg border border-slate-300 bg-white pl-3 pr-14 py-2.5 text-sm font-mono font-bold text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                    />
                    <span className="absolute inset-y-0 right-3 flex items-center text-xs font-bold text-slate-400">
                      KG
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">Raw granules or input WIP consumed</p>
                </div>

                {/* Output Weight */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Production Output (kg) <span className="text-rose-500">*</span>
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      required
                      min="0"
                      step="any"
                      type="number"
                      value={outputWeightKg}
                      onChange={(event) => setOutputWeightKg(event.target.value)}
                      placeholder="e.g. 485"
                      className="w-full rounded-lg border border-slate-300 bg-white pl-3 pr-14 py-2.5 text-sm font-mono font-bold text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                    />
                    <span className="absolute inset-y-0 right-3 flex items-center text-xs font-bold text-slate-400">
                      KG
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">Good produced quality material</p>
                </div>

                {/* Scrap Weight */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Scrap / Wastage (kg) <span className="text-rose-500">*</span>
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      required
                      min="0"
                      step="any"
                      type="number"
                      value={scrapWeightKg}
                      onChange={(event) => setScrapWeightKg(event.target.value)}
                      placeholder="e.g. 15"
                      className="w-full rounded-lg border border-slate-300 bg-white pl-3 pr-14 py-2.5 text-sm font-mono font-bold text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                    />
                    <span className="absolute inset-y-0 right-3 flex items-center text-xs font-bold text-slate-400">
                      KG
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">Trimmings, lumps, or reject bags</p>
                </div>
              </div>

              {/* Real-time Material Conservation Calculator Gauge */}
              <div
                className={`rounded-xl border p-4 transition-colors ${
                  !validWeights
                    ? 'border-slate-200 bg-slate-50'
                    : balanced
                      ? 'border-emerald-300 bg-emerald-50/70 text-emerald-950'
                      : 'border-amber-300 bg-amber-50/70 text-amber-950'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    {balanced ? (
                      <div className="flex size-8 items-center justify-center rounded-full bg-emerald-200 text-emerald-800">
                        <CheckCircle2 className="size-5" aria-hidden="true" />
                      </div>
                    ) : (
                      <div className="flex size-8 items-center justify-center rounded-full bg-amber-200 text-amber-800">
                        <AlertTriangle className="size-5" aria-hidden="true" />
                      </div>
                    )}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider">
                        {balanced
                          ? 'Material Conservation: Valid & Balanced'
                          : !validWeights
                            ? 'Awaiting Valid Positive Numbers'
                            : 'Material Conservation: Unbalanced'}
                      </h4>
                      <p className="text-xs font-mono font-semibold mt-0.5">
                        {validWeights ? (
                          <>
                            Input: <strong>{parsedInput} kg</strong> · (Output: {parsedOutput} kg + Scrap:{' '}
                            {parsedScrap} kg = <strong>{parsedOutput + parsedScrap} kg</strong>)
                          </>
                        ) : (
                          'Enter valid numerical weights above to compute live balance.'
                        )}
                      </p>
                    </div>
                  </div>

                  {validWeights && !balanced && (
                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase text-amber-700 block">Variance:</span>
                      <span className="font-mono text-xs font-black text-amber-900">
                        {balanceDifference > 0
                          ? `Missing ${balanceDifference.toFixed(3)} kg`
                          : `Excess ${Math.abs(balanceDifference).toFixed(3)} kg`}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Form Submission Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <Button variant="secondary" type="button" onClick={() => navigate('/production')}>
                  Cancel & Exit
                </Button>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={action === 'complete'}
                  disabled={!balanced || action !== null}
                  className="px-6 py-2.5 text-sm font-bold shadow-md cursor-pointer"
                >
                  <CheckCircle2 className="size-4" aria-hidden="true" />
                  Complete Stage & Record Balance
                </Button>
              </div>
            </form>
          </Card>
        )}
      </div>
    </div>
  )
}
