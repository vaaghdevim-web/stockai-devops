import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Boxes,
  CheckCircle2,
  Clock,
  Cog,
  Factory,
  Filter,
  ListFilter,
  Play,
  RefreshCw,
  Search,
  Workflow,
  X,
} from 'lucide-react'
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingSpinner,
  PageHeader,
  StatusBadge,
} from '../../components/common'
import { getWipViewData } from '../../api/wipApi'
import type {
  ProductionStageStatus,
  WipProductionRunGroup,
  WipStageItem,
  WipViewData,
} from '../../types'

function getStageStatusTone(status: ProductionStageStatus) {
  const s = status?.toLowerCase() || ''
  if (s === 'completed') return 'success'
  if (s === 'running') return 'info'
  if (s === 'ready') return 'warning'
  if (s === 'blocked' || s === 'failed' || s === 'cancelled') return 'danger'
  return 'neutral'
}

function formatWeight(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—'
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })
}

export function WorkInProgressPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<WipViewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [runFilter, setRunFilter] = useState<string>('ALL')
  const [unitFilter, setUnitFilter] = useState<string>('ALL')
  const [machineFilter, setMachineFilter] = useState<string>('ALL')
  const [viewMode, setViewMode] = useState<'pipeline' | 'table'>('pipeline')

  const loadWipData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getWipViewData()
      setData(result)
    } catch {
      setError('Unable to load Work In Progress records. Please verify backend connection and try again.')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void Promise.resolve().then(async () => {
      try {
        const result = await getWipViewData()
        if (!cancelled) {
          setData(result)
        }
      } catch {
        if (!cancelled) {
          setError('Unable to load Work In Progress records. Please verify backend connection and try again.')
          setData(null)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    })

    return () => {
      cancelled = true
    }
  }, [])

  // Filter items
  const filteredRunGroups: WipProductionRunGroup[] = (data?.runGroups || []).filter((group) => {
    // Run filter
    if (runFilter !== 'ALL' && group.productionNumber !== runFilter) return false

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      const matchesRun = group.productionNumber?.toLowerCase().includes(q)
      const matchesPlant = group.plantName?.toLowerCase().includes(q)
      const matchesStages = group.stages.some(
        (s) =>
          s.stageName?.toLowerCase().includes(q) ||
          s.machineCode?.toLowerCase().includes(q) ||
          s.machineName?.toLowerCase().includes(q) ||
          s.unitCode?.toLowerCase().includes(q)
      )
      if (!matchesRun && !matchesPlant && !matchesStages) return false
    }

    // Status filter on run stages
    if (statusFilter !== 'ALL') {
      const hasMatchingStage = group.stages.some((s) => s.status.toLowerCase() === statusFilter.toLowerCase())
      if (!hasMatchingStage) return false
    }

    // Unit filter
    if (unitFilter !== 'ALL') {
      const hasMatchingUnit = group.stages.some(
        (s) => s.unitCode === unitFilter || s.unitName === unitFilter
      )
      if (!hasMatchingUnit) return false
    }

    // Machine filter
    if (machineFilter !== 'ALL') {
      const hasMatchingMachine = group.stages.some((s) => s.machineCode === machineFilter)
      if (!hasMatchingMachine) return false
    }

    return true
  })

  const filteredStageItems: WipStageItem[] = (data?.items || []).filter((item) => {
    if (runFilter !== 'ALL' && item.productionNumber !== runFilter) return false
    if (statusFilter !== 'ALL' && item.status.toLowerCase() !== statusFilter.toLowerCase()) return false
    if (unitFilter !== 'ALL' && item.unitCode !== unitFilter && item.unitName !== unitFilter) return false
    if (machineFilter !== 'ALL' && item.machineCode !== machineFilter) return false

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      const matchesRun = item.productionNumber?.toLowerCase().includes(q)
      const matchesPlant = item.plantName?.toLowerCase().includes(q)
      const matchesStage = item.stageName?.toLowerCase().includes(q)
      const matchesMachine = item.machineCode?.toLowerCase().includes(q) || item.machineName?.toLowerCase().includes(q)
      const matchesUnit = item.unitCode?.toLowerCase().includes(q) || item.unitName?.toLowerCase().includes(q)
      if (!matchesRun && !matchesPlant && !matchesStage && !matchesMachine && !matchesUnit) return false
    }

    return true
  })

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    statusFilter !== 'ALL' ||
    runFilter !== 'ALL' ||
    unitFilter !== 'ALL' ||
    machineFilter !== 'ALL'

  function handleResetFilters() {
    setSearchQuery('')
    setStatusFilter('ALL')
    setRunFilter('ALL')
    setUnitFilter('ALL')
    setMachineFilter('ALL')
  }

  return (
    <div className="operations-page space-y-6 pb-12">
      {/* Header */}
      <PageHeader
        title="Current Work (WIP)"
        description="Live shop-floor pipeline monitoring active production runs, in-flight WIP quantities, and stage queues."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={loadWipData}
              disabled={loading}
            >
              <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
              Refresh
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/production')}
            >
              <Factory className="size-3.5" aria-hidden="true" />
              Production Runs
            </Button>
          </div>
        }
      />

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {/* Active Runs */}
        <Card className="p-4 border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Active Runs</p>
            <Activity className="size-4 text-indigo-600" aria-hidden="true" />
          </div>
          <p className="mt-2 text-2xl font-black tabular-nums text-slate-900 font-mono">
            {loading || error ? '—' : data?.metrics.activeRunsCount ?? 0}
          </p>
          <p className="mt-1 text-[11px] text-slate-500 font-medium">
            {loading || error ? 'Loading...' : `of ${data?.metrics.totalRunsCount ?? 0} total runs`}
          </p>
        </Card>

        {/* Running Stages */}
        <Card className="p-4 border-l-4 border-l-emerald-600 border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Running Stages</p>
            <span className="relative flex size-2.5">
              <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full size-2.5 bg-emerald-600" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-black tabular-nums text-emerald-950 font-mono">
            {loading || error ? '—' : data?.metrics.runningStagesCount ?? 0}
          </p>
          <p className="mt-1 text-[11px] text-slate-500 font-medium">Currently executing</p>
        </Card>

        {/* Ready Stages */}
        <Card className="p-4 border-l-4 border-l-amber-600 border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Ready in Queue</p>
            <Play className="size-4 text-amber-600" aria-hidden="true" />
          </div>
          <p className="mt-2 text-2xl font-black tabular-nums text-amber-950 font-mono">
            {loading || error ? '—' : data?.metrics.readyStagesCount ?? 0}
          </p>
          <p className="mt-1 text-[11px] text-slate-500 font-medium">Ready to start</p>
        </Card>

        {/* Pending Stages */}
        <Card className="p-4 border-l-4 border-l-slate-400 border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Waiting Stages</p>
            <Clock className="size-4 text-slate-400" aria-hidden="true" />
          </div>
          <p className="mt-2 text-2xl font-black tabular-nums text-slate-700 font-mono">
            {loading || error ? '—' : data?.metrics.pendingStagesCount ?? 0}
          </p>
          <p className="mt-1 text-[11px] text-slate-500 font-medium">Waiting on sequence</p>
        </Card>

        {/* WIP Quantity */}
        <Card className="p-4 border-l-4 border-l-purple-600 border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600">In-Flight WIP</p>
            <Boxes className="size-4 text-purple-600" aria-hidden="true" />
          </div>
          <p className="mt-2 text-xl font-black tabular-nums text-purple-950 font-mono break-words">
            {loading || error ? '—' : data?.metrics.totalWipWeightKg != null ? `${formatWeight(data.metrics.totalWipWeightKg)} KG` : 'Not available'}
          </p>
          <p className="mt-1 text-[11px] text-slate-500 truncate font-medium" title={`Input: ${formatWeight(data?.metrics.totalInputWeightKg)} KG`}>
            {loading || error ? 'Loading...' : data?.metrics.totalWipWeightKg != null ? `Input: ${formatWeight(data.metrics.totalInputWeightKg)} KG` : 'Awaiting input weights'}
          </p>
        </Card>

        {/* Active Machines */}
        <Card className="p-4 border-l-4 border-l-indigo-600 border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Floor Machines</p>
            <Cog className="size-4 text-indigo-600" aria-hidden="true" />
          </div>
          <p className="mt-2 text-2xl font-black tabular-nums text-slate-900 font-mono">
            {loading || error ? '—' : data?.metrics.activeMachinesCount ?? 0}
          </p>
          <p className="mt-1 text-[11px] text-slate-500 font-medium">Engaged in floor runs</p>
        </Card>
      </div>

      {/* Filter & View Mode Controls */}
      <Card className="p-4">
        <div className="space-y-3">
          {/* Top Row: Search & View Toggle */}
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            {/* Search Input */}
            <div className="relative flex-1 sm:max-w-md">
              <Search
                className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search run #, stage name, machine code, or plant..."
                className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-9 pr-8 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 shadow-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600"
                  aria-label="Clear search"
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              )}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setViewMode('pipeline')}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-colors ${
                  viewMode === 'pipeline'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Workflow className="size-3.5 text-indigo-600" aria-hidden="true" />
                Pipeline Flow
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-colors ${
                  viewMode === 'table'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ListFilter className="size-3.5 text-indigo-600" aria-hidden="true" />
                Granular Table
              </button>
            </div>
          </div>

          {/* Bottom Row: Filter Dropdowns & Status Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
            {/* Status Pills */}
            <div className="flex flex-wrap items-center gap-1">
              {['ALL', 'Running', 'Ready', 'Pending', 'Completed'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                    statusFilter === st
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {st === 'ALL' ? 'All Statuses' : st}
                </button>
              ))}
            </div>

            <div className="h-4 w-px bg-slate-200 hidden sm:block" />

            {/* Run Filter */}
            {data && data.availableRunNumbers.length > 0 && (
              <select
                value={runFilter}
                onChange={(e) => setRunFilter(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-xs focus:border-indigo-500 focus:outline-hidden"
              >
                <option value="ALL">All Runs ({data.availableRunNumbers.length})</option>
                {data.availableRunNumbers.map((runNo) => (
                  <option key={runNo} value={runNo}>
                    {runNo}
                  </option>
                ))}
              </select>
            )}

            {/* Unit Filter */}
            {data && data.availableUnits.length > 0 && (
              <select
                value={unitFilter}
                onChange={(e) => setUnitFilter(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-xs focus:border-indigo-500 focus:outline-hidden"
              >
                <option value="ALL">All Units</option>
                {data.availableUnits.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            )}

            {/* Machine Filter */}
            {data && data.availableMachines.length > 0 && (
              <select
                value={machineFilter}
                onChange={(e) => setMachineFilter(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-xs focus:border-indigo-500 focus:outline-hidden"
              >
                <option value="ALL">All Machines</option>
                {data.availableMachines.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            )}

            {/* Reset */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="text-xs h-7 text-slate-500 hover:text-slate-800"
              >
                <X className="size-3" aria-hidden="true" />
                Reset Filters
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Main Content Area */}
      {loading ? (
        <Card className="py-20 text-center">
          <LoadingSpinner label="Compiling live factory Work In Progress data..." size="lg" />
        </Card>
      ) : error ? (
        <ErrorState
          title="Unable to load Work In Progress records"
          description={error}
          onRetry={loadWipData}
          retryLabel="Try again"
        />
      ) : (viewMode === 'pipeline' ? filteredRunGroups.length === 0 : filteredStageItems.length === 0) ? (
        <Card className="py-14 text-center">
          <EmptyState
            icon={<Filter className="size-10 text-slate-400" />}
            title={hasActiveFilters ? 'No Matching WIP Records' : 'No Active Production Runs'}
            description={
              hasActiveFilters
                ? 'No production stages or runs matched your active filters. Try resetting the filters.'
                : 'No production runs are currently registered in the system.'
            }
            action={
              hasActiveFilters ? (
                <Button variant="secondary" size="sm" onClick={handleResetFilters}>
                  <X className="size-3.5" aria-hidden="true" />
                  Reset Filters
                </Button>
              ) : (
                <Button size="sm" onClick={() => navigate('/production')}>
                  <Factory className="size-3.5" aria-hidden="true" />
                  Go to Production
                </Button>
              )
            }
          />
        </Card>
      ) : viewMode === 'pipeline' ? (
        /* Pipeline Flow View */
        <div className="space-y-4">
          {filteredRunGroups.map((group) => {
            const isCompleted = group.runStatus?.toLowerCase() === 'completed'
            const sortedStages = [...group.stages].sort((a, b) => a.sequenceNo - b.sequenceNo)

            return (
              <Card key={group.productionId} className="p-5 border-slate-200 shadow-xs overflow-hidden">
                {/* Run Header Banner */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 font-mono font-bold text-xs">
                        <Factory className="size-4 text-indigo-600" aria-hidden="true" />
                      </div>
                      <h3 className="font-mono text-lg font-bold text-slate-900">
                        {group.productionNumber}
                      </h3>
                      <StatusBadge tone={isCompleted ? 'success' : 'info'}>
                        {group.runStatus === 'InProgress' ? 'In Progress' : group.runStatus || 'Active'}
                      </StatusBadge>
                      <span className="text-xs text-slate-500 font-medium">
                        {group.plantName || 'Main Factory Plant'}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                      <span>
                        Planned Qty:{' '}
                        <strong className="text-slate-900 font-mono tabular-nums font-bold">
                          {formatWeight(group.plannedQty)}
                        </strong>
                      </span>
                      <span>
                        Input:{' '}
                        <strong className="text-slate-900 font-mono tabular-nums font-bold">
                          {formatWeight(group.inputWeightKg)} KG
                        </strong>
                      </span>
                      <span>
                        Output:{' '}
                        <strong className="text-slate-900 font-mono tabular-nums font-bold">
                          {formatWeight(group.outputWeightKg)} KG
                        </strong>
                      </span>
                      {group.runWipWeightKg != null && (
                        <span>
                          Run In-Flight WIP:{' '}
                          <strong className="text-purple-700 font-mono tabular-nums font-black">
                            {formatWeight(group.runWipWeightKg)} KG
                          </strong>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                      {sortedStages.length} Stage(s)
                    </span>
                  </div>
                </div>

                {/* Stage Pipeline Sequence */}
                <div className="mt-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                    <Workflow className="size-3.5 text-slate-400" aria-hidden="true" />
                    Manufacturing Process Stages
                  </p>

                  {group.stagesError && sortedStages.length === 0 ? (
                    <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-50 p-3 rounded-lg border border-amber-200">
                      <AlertTriangle className="size-4 shrink-0 text-amber-600" aria-hidden="true" />
                      <span>Stage details could not be retrieved for this production run.</span>
                    </div>
                  ) : sortedStages.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No stages configured for this run.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {sortedStages.map((stage) => {
                        const statusTone = getStageStatusTone(stage.status)
                        const isRunning = stage.status === 'Running'
                        const isReady = stage.status === 'Ready'
                        const isStageCompleted = stage.status === 'Completed'

                        return (
                          <div
                            key={stage.stageId}
                            data-stage-status={stage.status}
                            className={`work-stage rounded-lg border p-4 transition-all ${
                              isRunning
                                ? 'border-emerald-300 bg-emerald-50/40 shadow-xs ring-1 ring-emerald-200'
                                : isReady
                                  ? 'border-amber-300 bg-amber-50/30'
                                  : isStageCompleted
                                    ? 'border-slate-200 bg-slate-50/70'
                                    : 'border-slate-200 bg-slate-50/40'
                            }`}
                          >
                            {/* Step Header */}
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="font-mono text-[10px] font-bold text-slate-500 uppercase">
                                  Step #{stage.sequenceNo} · ID #{stage.stageId}
                                </span>
                                <h4 className="font-bold text-sm text-slate-900 mt-0.5">
                                  {stage.stageName}
                                </h4>
                              </div>
                              <StatusBadge tone={statusTone}>{stage.status}</StatusBadge>
                            </div>

                            {/* Machine & Unit */}
                            <div className="mt-2.5 space-y-1 text-xs">
                              <div className="flex items-center gap-1 text-slate-700">
                                <Cog className="size-3 text-slate-400 shrink-0" aria-hidden="true" />
                                <span className="font-mono font-medium truncate">
                                  {stage.machineName
                                    ? `${stage.machineName} (${stage.machineCode || 'MCH'})`
                                    : stage.machineCode || 'Machine unassigned'}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-slate-500 text-[11px]">
                                <Factory className="size-3 text-slate-400 shrink-0" aria-hidden="true" />
                                <span className="truncate">
                                  {stage.unitName || stage.unitCode || 'Unit unassigned'}
                                </span>
                              </div>
                            </div>

                            {/* Stage Weights Grid */}
                            <div className="mt-3 grid grid-cols-3 gap-1.5 rounded-md bg-white p-2 border border-slate-100 text-center text-[11px]">
                              <div>
                                <span className="text-[10px] text-slate-400 uppercase font-bold block">Input</span>
                                <span className="font-mono font-bold text-slate-900 tabular-nums">
                                  {formatWeight(stage.inputWeightKg)}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 uppercase font-bold block">Output</span>
                                <span className="font-mono font-bold text-slate-900 tabular-nums">
                                  {formatWeight(stage.outputWeightKg)}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 uppercase font-bold block">Scrap</span>
                                <span className="font-mono font-bold text-slate-900 tabular-nums">
                                  {formatWeight(stage.scrapWeightKg)}
                                </span>
                              </div>
                            </div>

                            {/* Action Button */}
                            <div className="mt-3 pt-2.5 border-t border-slate-100/80 flex items-center justify-between">
                              <span className="text-[10px] text-slate-500 font-mono">
                                {stage.startedAt ? new Date(stage.startedAt).toLocaleTimeString() : 'Not started'}
                              </span>

                              {(isRunning || isReady) && (
                                <Button
                                  size="sm"
                                  variant={isRunning ? 'secondary' : 'primary'}
                                  onClick={() => navigate(`/production/${group.productionId}/stages/${stage.stageId}`)}
                                  className="text-xs h-7 px-2.5"
                                >
                                  {isRunning ? 'Complete Stage' : 'Start Stage'}
                                  <ArrowRight className="size-3" aria-hidden="true" />
                                </Button>
                              )}

                              {isStageCompleted && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                                  <CheckCircle2 className="size-3.5 text-emerald-600" aria-hidden="true" />
                                  Completed
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      ) : (
        /* Granular Table View */
        <Card className="overflow-hidden p-0 border-slate-200 shadow-xs">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-100/90 text-xs font-bold uppercase tracking-wider text-slate-700">
                <tr>
                  <th scope="col" className="px-4 py-3">Production Run</th>
                  <th scope="col" className="px-4 py-3">Step & Stage</th>
                  <th scope="col" className="px-4 py-3">Machine & Unit</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  <th scope="col" className="px-4 py-3 text-right">Input (KG)</th>
                  <th scope="col" className="px-4 py-3 text-right">Output (KG)</th>
                  <th scope="col" className="px-4 py-3 text-right">Scrap (KG)</th>
                  <th scope="col" className="px-4 py-3 text-right">Stage WIP</th>
                  <th scope="col" className="px-4 py-3">Started</th>
                  <th scope="col" className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                {filteredStageItems.map((item) => {
                  const statusTone = getStageStatusTone(item.status)
                  const isRunning = item.status === 'Running'
                  const isReady = item.status === 'Ready'

                  return (
                    <tr key={`${item.productionId}-${item.stageId}`} className="hover:bg-slate-50/80 transition-colors">
                      {/* Run */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-mono font-bold text-slate-900 block">
                          {item.productionNumber}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {item.plantName || 'Plant'}
                        </span>
                      </td>

                      {/* Stage Name */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-bold text-slate-800 block">
                          {item.stageName}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">
                          Step #{item.sequenceNo} (Stage #{item.stageId})
                        </span>
                      </td>

                      {/* Machine & Unit */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-mono font-medium text-slate-800 block">
                          {item.machineCode || '—'}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {item.unitName || item.unitCode || 'Floor'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge tone={statusTone}>{item.status}</StatusBadge>
                      </td>

                      {/* Input */}
                      <td className="px-4 py-3 whitespace-nowrap text-right font-mono font-bold text-slate-900 tabular-nums">
                        {formatWeight(item.inputWeightKg)}
                      </td>

                      {/* Output */}
                      <td className="px-4 py-3 whitespace-nowrap text-right font-mono font-bold text-slate-900 tabular-nums">
                        {formatWeight(item.outputWeightKg)}
                      </td>

                      {/* Scrap */}
                      <td className="px-4 py-3 whitespace-nowrap text-right font-mono text-slate-600 tabular-nums">
                        {formatWeight(item.scrapWeightKg)}
                      </td>

                      {/* Stage WIP */}
                      <td className="px-4 py-3 whitespace-nowrap text-right font-mono font-black text-purple-700 tabular-nums">
                        {item.wipWeightKg != null ? `${formatWeight(item.wipWeightKg)} KG` : '—'}
                      </td>

                      {/* Started */}
                      <td className="px-4 py-3 whitespace-nowrap text-slate-500 text-[11px] font-mono">
                        {item.startedAt ? new Date(item.startedAt).toLocaleTimeString() : '—'}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        {isRunning || isReady ? (
                          <Button
                            size="sm"
                            variant={isRunning ? 'secondary' : 'primary'}
                            onClick={() => navigate(`/production/${item.productionId}/stages/${item.stageId}`)}
                            className="text-xs h-7 px-2"
                          >
                            {isRunning ? 'Complete Stage' : 'Start Stage'}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => navigate(`/production/${item.productionId}/stages/${item.stageId}`)}
                            className="text-xs h-7 px-2 text-slate-600 hover:text-slate-900"
                          >
                            View Stage
                          </Button>
                        )}
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
