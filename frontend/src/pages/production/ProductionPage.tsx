import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity,
  ArrowRight,
  Boxes,
  CheckCircle2,
  Clock,
  Factory,
  Play,
  RefreshCw,
  Search,
  Workflow,
  X,
} from 'lucide-react'
import { getProductionRuns, getProductionRun, getProductionStages } from '../../api/productionApi'
import type { ProductionRunResponse, ProductionStageResponse } from '../../types'
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingSpinner,
  PageHeader,
  StatusBadge,
} from '../../components/common'

const number = (value: number | null | undefined) =>
  value == null ? '—' : Number(value).toLocaleString(undefined, { maximumFractionDigits: 3 })

const metricsList = [
  ['Planned quantity', 'plannedQty', 'KG'],
  ['Produced quantity', 'actualQty', 'KG'],
  ['Material input', 'inputWeightKg', 'KG'],
  ['Production output', 'outputWeightKg', 'KG'],
  ['Scrap / wastage', 'scrapWeightKg', 'KG'],
  ['Yield', 'yieldPercentage', '%'],
  ['Bags produced', 'bagsProduced', 'BAGS'],
  ['Bags / kg', 'bagsPerKg', 'BAG/KG'],
] as const

function RunSummary({ run }: { run: ProductionRunResponse }) {
  const isCompleted = run.status === 'Completed'
  const isInProgress = run.status === 'InProgress'

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 font-mono font-bold text-sm">
            <Factory className="size-4.5 text-indigo-600" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-mono text-lg font-bold text-slate-900">{run.productionNumber}</h2>
            <p className="text-xs font-medium text-slate-500">{run.plantName ?? 'Plant unassigned'}</p>
          </div>
        </div>
        <StatusBadge tone={isCompleted ? 'success' : isInProgress ? 'info' : 'neutral'}>
          {isInProgress ? 'In Progress' : run.status}
        </StatusBadge>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {metricsList.map(([label, key, unit]) => {
          const val = run[key as keyof ProductionRunResponse]
          return (
            <div key={key} className="rounded-lg border border-slate-100 bg-slate-50/60 p-2.5">
              <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</dt>
              <dd className="mt-1 font-mono text-sm font-bold text-slate-900 tabular-nums">
                {val != null ? (
                  <>
                    {typeof val === 'number' ? number(val) : String(val)}{' '}
                    <span className="text-[10px] font-semibold text-slate-400">{unit}</span>
                  </>
                ) : (
                  '—'
                )}
              </dd>
            </div>
          )
        })}
      </dl>
    </div>
  )
}

function RunOverview({ id, onClose }: { id: number; onClose: () => void }) {
  const navigate = useNavigate()
  const [run, setRun] = useState<ProductionRunResponse | null>(null)
  const [error, setError] = useState(false)
  const [version, setVersion] = useState(0)
  const [stagesError, setStagesError] = useState(false)
  const [stagesLoading, setStagesLoading] = useState(true)
  const [stages, setStages] = useState<ProductionStageResponse[]>([])

  useEffect(() => {
    let active = true
    void getProductionRun(id)
      .then((value) => {
        if (active) setRun(value)
      })
      .catch(() => {
        if (active) setError(true)
      })
    void getProductionStages(id)
      .then((value) => {
        if (active) setStages(value)
      })
      .catch(() => {
        if (active) setStagesError(true)
      })
      .finally(() => {
        if (active) setStagesLoading(false)
      })
    return () => {
      active = false
    }
  }, [id, version])

  if (error) {
    return (
      <ErrorState
        description="The production overview could not be loaded."
        onRetry={() => {
          setError(false)
          setRun(null)
          setStagesError(false)
          setStagesLoading(true)
          setVersion((v) => v + 1)
        }}
      />
    )
  }

  if (!run) {
    return (
      <Card className="py-12 text-center">
        <LoadingSpinner label="Loading production overview..." />
      </Card>
    )
  }

  return (
    <Card className="p-6 border-2 border-indigo-200 shadow-sm">
      <div className="flex items-center justify-between pb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
          <Workflow className="size-4" aria-hidden="true" />
          Active Production Run Details
        </span>
        <Button variant="ghost" size="sm" onClick={onClose} className="text-xs text-slate-500 hover:text-slate-800">
          <X className="size-4" aria-hidden="true" />
          Close Overview
        </Button>
      </div>

      <RunSummary run={run} />

      {(run.startDatetime || run.endDatetime) && (
        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-mono text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
          {run.startDatetime && (
            <span>
              Started: <strong className="text-slate-700">{run.startDatetime}</strong>
            </span>
          )}
          {run.endDatetime && (
            <span>
              Ended: <strong className="text-slate-700">{run.endDatetime}</strong>
            </span>
          )}
        </div>
      )}

      <div className="mt-6 border-t border-slate-200 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Workflow className="size-4 text-slate-500" aria-hidden="true" />
            Manufacturing Workflow Stages
          </h3>
          <span className="text-xs font-mono font-semibold text-slate-500">
            {stages.length} Stage(s) configured
          </span>
        </div>

        {stagesLoading ? (
          <div className="py-8 text-center">
            <LoadingSpinner label="Loading workflow stages..." />
          </div>
        ) : stagesError ? (
          <ErrorState
            description="Stages could not be loaded. Run details are still available."
            onRetry={() => {
              setStagesError(false)
              setStagesLoading(true)
              setVersion((v) => v + 1)
            }}
          />
        ) : !stages.length ? (
          <EmptyState
            title="No stages configured"
            description="No production stages were returned for this run."
          />
        ) : (
          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[...stages]
              .sort((a, b) => a.sequenceNo - b.sequenceNo)
              .map((stage) => {
                const isRunning = stage.status === 'Running'
                const isReady = stage.status === 'Ready'
                const isCompleted = stage.status === 'Completed'

                return (
                  <li
                    key={stage.stageId}
                    className={`min-w-0 rounded-lg border p-4 transition-all ${
                      isRunning
                        ? 'border-emerald-300 bg-emerald-50/40 ring-1 ring-emerald-200'
                        : isReady
                          ? 'border-amber-300 bg-amber-50/30'
                          : isCompleted
                            ? 'border-slate-200 bg-slate-50/70'
                            : 'border-slate-200 bg-slate-50/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-mono text-[10px] font-bold text-slate-500 uppercase">
                          Step #{stage.sequenceNo} · ID #{stage.stageId}
                        </p>
                        <h4 className="mt-0.5 font-bold text-sm text-slate-900">
                          {stage.stageName || `Step ${stage.sequenceNo}`}
                        </h4>
                      </div>
                      <StatusBadge
                        tone={
                          stage.status === 'Completed'
                            ? 'success'
                            : ['Ready', 'Running'].includes(stage.status)
                              ? 'info'
                              : ['Blocked', 'Failed', 'Cancelled'].includes(stage.status)
                                ? 'danger'
                                : 'neutral'
                        }
                      >
                        {stage.status}
                      </StatusBadge>
                    </div>

                    <div className="mt-2.5 space-y-1 text-xs text-slate-600">
                      <p className="font-mono font-medium text-slate-800 truncate">
                        {[stage.machineCode, stage.machineName].filter(Boolean).join(' · ') || 'Machine unassigned'}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {[stage.unitCode, stage.unitName].filter(Boolean).join(' · ') || 'Unit unassigned'}
                      </p>
                    </div>

                    <dl className="my-3 grid grid-cols-3 gap-1 rounded-md bg-white p-2 border border-slate-100 text-center text-[11px]">
                      <div>
                        <dt className="text-[10px] uppercase text-slate-400">Input</dt>
                        <dd className="font-mono font-bold text-slate-900 tabular-nums">
                          {stage.inputWeightKg != null ? `${number(stage.inputWeightKg)} kg` : '—'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[10px] uppercase text-slate-400">Output</dt>
                        <dd className="font-mono font-bold text-slate-900 tabular-nums">
                          {stage.outputWeightKg != null ? `${number(stage.outputWeightKg)} kg` : '—'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[10px] uppercase text-slate-400">Scrap</dt>
                        <dd className="font-mono font-bold text-slate-900 tabular-nums">
                          {stage.scrapWeightKg != null ? `${number(stage.scrapWeightKg)} kg` : '—'}
                        </dd>
                      </div>
                    </dl>

                    {stage.status === 'Pending' && (
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock className="size-3 text-slate-400" aria-hidden="true" />
                        Waiting for previous stage
                      </p>
                    )}

                    {run.status !== 'Completed' && ['Ready', 'Running'].includes(stage.status) && (
                      <Button
                        variant={isRunning ? 'secondary' : 'primary'}
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => navigate(`/production/${id}/stages/${stage.stageId}`)}
                      >
                        {stage.status === 'Ready' ? (
                          <>
                            <Play className="size-3.5" aria-hidden="true" />
                            Start Stage #{stage.sequenceNo}
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="size-3.5" aria-hidden="true" />
                            Complete Stage #{stage.sequenceNo}
                          </>
                        )}
                      </Button>
                    )}

                    {isCompleted && (
                      <p className="mt-2 text-xs font-semibold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="size-3.5 text-emerald-600" aria-hidden="true" />
                        Stage Completed
                      </p>
                    )}
                  </li>
                )
              })}
          </ol>
        )}
      </div>
    </Card>
  )
}

export function ProductionPage() {
  const [runs, setRuns] = useState<ProductionRunResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [version, setVersion] = useState(0)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('All')
  const [selected, setSelected] = useState<number | null>(null)

  useEffect(() => {
    let active = true
    getProductionRuns()
      .then((value) => {
        if (active) setRuns(value)
      })
      .catch(() => {
        if (active) setError(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [version])

  const refresh = () => {
    setLoading(true)
    setError(false)
    setVersion((v) => v + 1)
  }

  const visibleRuns = runs.filter(
    (run) =>
      (status === 'All' || run.status === status) &&
      [run.productionNumber, run.productionId, run.plantName, run.status].some((value) =>
        String(value ?? '')
          .toLowerCase()
          .includes(search.trim().toLowerCase())
      )
  )

  const inProgressCount = runs.filter((r) => r.status === 'InProgress').length
  const completedCount = runs.filter((r) => r.status === 'Completed').length
  const plannedCount = runs.filter((r) => r.status === 'Planned').length
  const totalActualQty = runs.some((r) => r.actualQty == null)
    ? 'Not available'
    : number(runs.reduce((sum, r) => sum + (r.actualQty ?? 0), 0))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Production Work"
        description="Monitor manufacturing execution runs, floor stage progress, and material balances."
        actions={
          <Button variant="secondary" size="sm" onClick={refresh} disabled={loading}>
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            Refresh Production
          </Button>
        }
      />

      {loading ? (
        <Card className="py-20 text-center">
          <LoadingSpinner label="Loading production runs..." size="lg" />
        </Card>
      ) : error ? (
        <ErrorState description="Production runs could not be loaded from backend." onRetry={refresh} />
      ) : (
        <>
          {/* Industrial Metric Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            <Card className="p-4 border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Total Runs</p>
                <Factory className="size-4 text-slate-500" aria-hidden="true" />
              </div>
              <p className="mt-2 font-mono text-2xl font-black text-slate-900 tabular-nums">{runs.length}</p>
              <p className="mt-1 text-[11px] text-slate-500 font-medium">Logged in factory registry</p>
            </Card>

            <Card className="p-4 border-l-4 border-l-indigo-600 border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600">In Progress</p>
                <Activity className="size-4 text-indigo-600" aria-hidden="true" />
              </div>
              <p className="mt-2 font-mono text-2xl font-black text-indigo-950 tabular-nums">{inProgressCount}</p>
              <p className="mt-1 text-[11px] text-slate-500 font-medium">Actively running on floor</p>
            </Card>

            <Card className="p-4 border-l-4 border-l-emerald-600 border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Completed</p>
                <CheckCircle2 className="size-4 text-emerald-600" aria-hidden="true" />
              </div>
              <p className="mt-2 font-mono text-2xl font-black text-emerald-950 tabular-nums">{completedCount}</p>
              <p className="mt-1 text-[11px] text-slate-500 font-medium">Finished runs stowed</p>
            </Card>

            <Card className="p-4 border-l-4 border-l-amber-600 border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Planned</p>
                <Clock className="size-4 text-amber-600" aria-hidden="true" />
              </div>
              <p className="mt-2 font-mono text-2xl font-black text-amber-950 tabular-nums">{plannedCount}</p>
              <p className="mt-1 text-[11px] text-slate-500 font-medium">Queued for scheduling</p>
            </Card>

            <Card className="p-4 border-l-4 border-l-purple-600 border-slate-200 shadow-xs col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Total Output</p>
                <Boxes className="size-4 text-purple-600" aria-hidden="true" />
              </div>
              <p className="mt-2 font-mono text-xl font-black text-purple-950 tabular-nums truncate">
                {totalActualQty}{' '}
                {typeof totalActualQty === 'string' && totalActualQty !== 'Not available' && (
                  <span className="text-xs font-bold text-slate-500">KG</span>
                )}
              </p>
              <p className="mt-1 text-[11px] text-slate-500 font-medium">Actual produced goods</p>
            </Card>
          </div>

          {/* Selected Run Overview Section */}
          {selected !== null && (
            <section aria-label="Selected production overview" className="space-y-3">
              <RunOverview key={`${selected}-${version}`} id={selected} onClose={() => setSelected(null)} />
            </section>
          )}

          {/* Search & Filter Bar */}
          <Card className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input
                  type="text"
                  className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-9 pr-8 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 shadow-xs"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Filter by run number (PR-...), plant name, or status..."
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="size-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Status:</label>
                <select
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 shadow-xs focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                >
                  <option value="All">All Statuses ({runs.length})</option>
                  {[...new Set(runs.map((run) => run.status))].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>

                {(search || status !== 'All') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearch('')
                      setStatus('All')
                    }}
                    className="text-xs text-slate-500 hover:text-slate-800"
                  >
                    <X className="size-3.5" aria-hidden="true" />
                    Reset
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* Production Run Listing */}
          {!runs.length ? (
            <Card className="py-14 text-center">
              <EmptyState
                icon={<Factory className="size-10 text-slate-400" />}
                title="No production runs"
                description="Production runs will appear here when scheduled or active."
              />
            </Card>
          ) : !visibleRuns.length ? (
            <Card className="py-14 text-center">
              <EmptyState
                icon={<Search className="size-10 text-slate-400" />}
                title="No matching production runs"
                description="No runs matched your active search or status filter."
                action={
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setSearch('')
                      setStatus('All')
                    }}
                  >
                    Reset Filters
                  </Button>
                }
              />
            </Card>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {visibleRuns.map((run) => {
                const isSelected = selected === run.productionId

                return (
                  <Card
                    key={run.productionId}
                    className={`p-5 transition-all ${
                      isSelected
                        ? 'border-2 border-indigo-500 bg-indigo-50/20 shadow-md'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <RunSummary run={run} />

                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                      <span className="font-mono text-xs text-slate-400">ID #{run.productionId}</span>
                      <Button
                        variant={isSelected ? 'primary' : 'secondary'}
                        size="sm"
                        aria-expanded={isSelected}
                        onClick={() => setSelected(isSelected ? null : run.productionId)}
                      >
                        {isSelected ? 'Viewing Stages' : `Inspect ${run.productionNumber}`}
                        <ArrowRight className="size-3.5" aria-hidden="true" />
                      </Button>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
