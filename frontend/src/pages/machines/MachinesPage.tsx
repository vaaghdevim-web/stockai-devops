import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Cog,
  Factory,
  Power,
  RefreshCw,
  Search,
  Settings,
  X,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getActiveMachines } from '../../api/machineApi'
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingSpinner,
  PageHeader,
  StatusBadge,
} from '../../components/common'
import type { ActiveMachineResponse } from '../../types'

function getMachineStatusTone(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  const s = status.toUpperCase()
  if (s === 'RUNNING' || s === 'ACTIVE') return 'success'
  if (s === 'WARNING') return 'warning'
  if (s === 'FAULT' || s === 'ERROR' || s === 'EMERGENCY_STOP' || s === 'STOPPED') return 'danger'
  return 'neutral'
}

export function MachinesPage() {
  const navigate = useNavigate()
  const [machines, setMachines] = useState<ActiveMachineResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const fetchMachines = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getActiveMachines()
      setMachines(data)
    } catch {
      setError('Unable to load active machines from the server.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void Promise.resolve().then(fetchMachines)
  }, [fetchMachines])

  const filteredMachines = useMemo(() => {
    return machines.filter((m) => {
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !q ||
        m.machineCode.toLowerCase().includes(q) ||
        m.machineName.toLowerCase().includes(q) ||
        String(m.unitId).includes(q) ||
        String(m.machineId).includes(q)

      const matchesStatus =
        statusFilter === 'ALL' || m.status.toUpperCase() === statusFilter.toUpperCase()

      return matchesSearch && matchesStatus
    })
  }, [machines, searchQuery, statusFilter])

  const statusOptions = useMemo(() => {
    const statuses = new Set<string>()
    machines.forEach((m) => statuses.add(m.status))
    return Array.from(statuses)
  }, [machines])

  const runningCount = machines.filter(
    (m) => m.status.toUpperCase() === 'RUNNING' || m.status.toUpperCase() === 'ACTIVE'
  ).length
  const warningCount = machines.filter((m) => m.status.toUpperCase() === 'WARNING').length
  const stoppedCount = machines.filter((m) =>
    ['FAULT', 'ERROR', 'EMERGENCY_STOP', 'STOPPED'].includes(m.status.toUpperCase())
  ).length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Plant Machinery Registry"
        description="Monitor factory production machines, operational status, unit allocations, and real-time telemetry."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void fetchMachines()}
              disabled={loading}
            >
              <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
              Refresh
            </Button>
            <Button size="sm" onClick={() => navigate('/telemetry')}>
              <Activity className="size-3.5" aria-hidden="true" />
              Live Telemetry Stream
            </Button>
          </div>
        }
      />

      {/* Industrial Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4 border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Total Machinery</p>
            <Cog className="size-4 text-slate-500" aria-hidden="true" />
          </div>
          <p className="mt-2 font-mono text-2xl font-black text-slate-900 tabular-nums">{machines.length}</p>
          <p className="mt-1 text-[11px] text-slate-500 font-medium">Active plant equipment</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-emerald-600 border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Running (Active)</p>
            <CheckCircle2 className="size-4 text-emerald-600" aria-hidden="true" />
          </div>
          <p className="mt-2 font-mono text-2xl font-black text-emerald-950 tabular-nums">{runningCount}</p>
          <p className="mt-1 text-[11px] text-slate-500 font-medium">Operating under load</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-amber-600 border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Warning State</p>
            <AlertTriangle className="size-4 text-amber-600" aria-hidden="true" />
          </div>
          <p className="mt-2 font-mono text-2xl font-black text-amber-950 tabular-nums">{warningCount}</p>
          <p className="mt-1 text-[11px] text-slate-500 font-medium">Sensor threshold warning</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-rose-600 border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Stopped / Fault</p>
            <Power className="size-4 text-rose-600" aria-hidden="true" />
          </div>
          <p className="mt-2 font-mono text-2xl font-black text-rose-950 tabular-nums">{stoppedCount}</p>
          <p className="mt-1 text-[11px] text-slate-500 font-medium">Offline or maintenance</p>
        </Card>
      </div>

      {error && (
        <ErrorState
          title="Machine Catalog Error"
          description={error}
          onRetry={() => void fetchMachines()}
          retryLabel="Try Again"
        />
      )}

      {/* Filter and Search Controls */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              type="text"
              placeholder="Search by machine code (MCH-...), name, unit, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-9 pr-8 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 shadow-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="machine-status-filter" className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Status:
            </label>
            <select
              id="machine-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 shadow-xs focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">All Statuses ({machines.length})</option>
              {statusOptions.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>

            {(searchQuery || statusFilter !== 'ALL') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('')
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
      </Card>

      {/* Machine Listing */}
      {loading ? (
        <Card className="py-20 text-center">
          <LoadingSpinner label="Loading active machinery catalog..." size="lg" />
        </Card>
      ) : machines.length === 0 ? (
        <Card className="py-14 text-center">
          <EmptyState
            icon={<Cog className="size-10 text-slate-400" />}
            title="No active machines registered"
            description="The factory machine registry reported no equipment records at this time."
          />
        </Card>
      ) : filteredMachines.length === 0 ? (
        <Card className="py-14 text-center">
          <EmptyState
            icon={<Search className="size-10 text-slate-400" />}
            title="No matching machinery found"
            description="No machines matched your active search and status filter criteria."
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSearchQuery('')
                  setStatusFilter('ALL')
                }}
              >
                Reset Filters
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
                  <th scope="col" className="px-5 py-3.5">Machine Code</th>
                  <th scope="col" className="px-5 py-3.5">Equipment Name</th>
                  <th scope="col" className="px-5 py-3.5">Assigned Facility Unit</th>
                  <th scope="col" className="px-5 py-3.5">System ID</th>
                  <th scope="col" className="px-5 py-3.5">Status</th>
                  <th scope="col" className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                {filteredMachines.map((machine) => (
                  <tr key={machine.machineId} className="hover:bg-slate-50/80 transition-colors">
                    {/* Code */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => navigate(`/machines/${encodeURIComponent(machine.machineCode)}`)}
                        className="font-mono font-bold text-slate-900 hover:text-indigo-600 inline-flex items-center gap-2 group cursor-pointer text-sm"
                      >
                        <div className="flex size-7 items-center justify-center rounded-md bg-indigo-50 text-indigo-700 group-hover:bg-indigo-100">
                          <Settings className="size-3.5 text-indigo-600" aria-hidden="true" />
                        </div>
                        <span className="underline-offset-2 group-hover:underline">
                          {machine.machineCode}
                        </span>
                      </button>
                    </td>

                    {/* Name */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="font-bold text-slate-900 text-sm block">
                        {machine.machineName}
                      </span>
                    </td>

                    {/* Unit */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                        <Factory className="size-3.5 text-slate-400" aria-hidden="true" />
                        <span>Unit #{machine.unitId}</span>
                      </div>
                    </td>

                    {/* Machine ID */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="font-mono font-semibold text-slate-500 text-xs">
                        #{machine.machineId}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <StatusBadge tone={getMachineStatusTone(machine.status)}>
                        {machine.status}
                      </StatusBadge>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 whitespace-nowrap text-right">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            navigate(`/telemetry?machineCode=${encodeURIComponent(machine.machineCode)}`)
                          }
                          title="Stream live telemetry for this machine"
                          className="text-slate-600 hover:text-slate-950"
                        >
                          <Activity className="size-3.5 text-indigo-600" aria-hidden="true" />
                          Telemetry
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            navigate(`/machines/${encodeURIComponent(machine.machineCode)}`)
                          }
                        >
                          Details
                          <ArrowRight className="size-3.5" aria-hidden="true" />
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
    </div>
  )
}
