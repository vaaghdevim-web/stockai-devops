import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ChevronRight,
  Factory,
  Info,
  Layers,
  Package,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  ShoppingCart,
  Sliders,
  Truck,
  Zap,
} from 'lucide-react'
import { dashboardSources } from '../api/dashboardApi'
import type { DashboardSource } from '../api/dashboardApi'
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingSpinner,
  PageHeader,
  StatusBadge,
} from '../components/common'
import { moduleNavigation } from '../components/common/navigation'
import { hasPageAccess } from '../config/rbac'
import { useAuthStore } from '../store/authStore'

function ManagementLink({
  path,
  label,
  variant = 'link',
}: {
  path: string
  label?: string
  variant?: 'link' | 'button'
}) {
  const roles = useAuthStore((state) => state.roles)
  const item = moduleNavigation.find((entry) => entry.path === path)
  if (!item || !hasPageAccess(roles, item.pageKey)) return null

  const displayTitle = label ?? item.title

  if (variant === 'button') {
    return (
      <Link
        to={path}
        className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 transition-colors"
      >
        <span>{displayTitle}</span>
        <ArrowRight className="size-3.5" aria-hidden="true" />
      </Link>
    )
  }

  return (
    <Link
      to={path}
      className="inline-flex min-h-9 items-center gap-1 rounded-md px-2.5 py-1 text-xs font-bold text-sky-700 hover:bg-sky-50 hover:text-sky-900 focus-visible:outline-2 focus-visible:outline-sky-600 transition-colors"
    >
      <span>{displayTitle}</span>
      <ChevronRight className="size-3.5" aria-hidden="true" />
    </Link>
  )
}

function SectionLoader<T>({
  load,
  version,
  children,
  minHeight = 'min-h-36',
}: {
  load: () => Promise<DashboardSource<T>>
  version: number
  children: (data: T[]) => ReactNode
  minHeight?: string
}) {
  const [result, setResult] = useState<{ value: DashboardSource<T>; request: string } | null>(null)
  const [retry, setRetry] = useState(0)
  const request = `${version}:${retry}`
  const loading = result?.request !== request

  useEffect(() => {
    let active = true
    void load().then((value) => {
      if (active) setResult({ value, request })
    })
    return () => {
      active = false
    }
  }, [load, request])

  if (loading) {
    return (
      <div className={`flex ${minHeight} items-center justify-center py-6`}>
        <LoadingSpinner label="Loading operational records…" size="md" />
      </div>
    )
  }

  const value = result?.value

  if (value?.status === 403) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-4">
        <div className="flex items-start gap-2.5">
          <Info className="size-4.5 shrink-0 text-slate-500 mt-0.5" aria-hidden="true" />
          <div className="min-w-0 text-xs">
            <h4 className="font-bold text-slate-900">Access Restricted</h4>
            <p className="mt-0.5 leading-relaxed text-slate-600">
              Live telemetry and edge sensor logs require supervisor or maintenance privileges.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (value?.error != null) {
    return (
      <ErrorState
        title="Data Source Unavailable"
        description={value.error}
        onRetry={() => setRetry((n) => n + 1)}
        retryLabel="Retry"
      />
    )
  }

  if (!value?.data || value.data.length === 0) {
    return (
      <EmptyState
        title="No records available"
        description="The backend service returned an empty dataset."
      />
    )
  }

  return <>{children(value.data)}</>
}

function getToneForStatus(status: string): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  const s = status.toLowerCase()
  if (['completed', 'pass', 'active', 'received', 'running', 'approved'].includes(s))
    return 'success'
  if (['ready', 'inreview', 'planned', 'in progress', 'inprogress', 'open'].includes(s))
    return 'info'
  if (['high', 'medium', 'pending', 'new', 'draft', 'dispatched'].includes(s)) return 'warning'
  if (['critical', 'fail', 'blocked', 'failed', 'cancelled', 'stopped', 'rejected'].includes(s))
    return 'danger'
  return 'neutral'
}

function StatusPills({ records }: { records: { status: string }[] }) {
  const counts = new Map<string, number>()
  records.forEach(({ status }) => {
    const key = status || 'Unspecified'
    counts.set(key, (counts.get(key) ?? 0) + 1)
  })

  return (
    <div className="flex flex-wrap gap-1.5 pt-1">
      {[...counts].map(([status, count]) => (
        <StatusBadge key={status} tone={getToneForStatus(status)}>
          {status}: <span className="tabular-nums font-mono font-bold">{count}</span>
        </StatusBadge>
      ))}
    </div>
  )
}

export function DashboardPage() {
  const [version, setVersion] = useState(0)

  return (
    <div className="space-y-6 sm:space-y-7">
      {/* SECTION 1: OPERATIONS SUMMARY */}
      <div className="space-y-3.5">
        <PageHeader
          title="Factory Operations Overview"
          description="Integrated operational monitoring across raw material inventories, manufacturing execution, quality gates, machinery, and warehouse logistics."
          actions={
            <div className="flex flex-wrap items-center gap-3">
              <ManagementLink path="/alerts" label="Alerts & Notices" variant="button" />
              <Button
                variant="secondary"
                onClick={() => setVersion((n) => n + 1)}
                aria-label="Refresh all dashboard sections"
                className="gap-2 font-bold"
              >
                <RefreshCw className="size-4 shrink-0 text-slate-700" aria-hidden="true" />
                <span>Refresh all</span>
              </Button>
            </div>
          }
        />

        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4.5 py-3 text-xs sm:text-sm text-slate-600 shadow-2xs">
          <Info className="size-4.5 shrink-0 text-sky-600" aria-hidden="true" />
          <span>
            Real-time shop-floor operational status. Counts reflect active records returned directly by backend services.
          </span>
        </div>
      </div>

      {/* SECTION 2: PRIMARY OPERATIONS (3 Visually Prominent Cards) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Core Production &amp; Material Pillars
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Card 1: Raw Materials */}
          <Card
            className="flex flex-col justify-between border-slate-200 p-6 sm:p-7 hover:border-slate-300 transition-colors shadow-xs"
            title={
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100 shrink-0">
                  <Package className="size-5.5" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Raw Materials</h3>
                  <p className="text-xs text-slate-500 font-normal">Polymer &amp; Additive Catalog</p>
                </div>
              </div>
            }
            actions={<ManagementLink path="/inventory/raw-materials" label="Manage Catalog" />}
          >
            <SectionLoader load={dashboardSources.materials} version={version}>
              {(data) => {
                const activeCount = data.filter((item) => item.active).length
                return (
                  <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-2 gap-3.5">
                      <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 sm:p-4">
                        <p className="font-mono text-3xl sm:text-4xl font-bold tabular-nums text-slate-900">
                          {data.length}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-600">Total Items</p>
                      </div>
                      <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3.5 sm:p-4">
                        <p className="font-mono text-3xl sm:text-4xl font-bold tabular-nums text-emerald-700">
                          {activeCount}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-emerald-800">Active Formulations</p>
                      </div>
                    </div>
                    <p className="text-xs sm:text-[13px] text-slate-500 leading-relaxed">
                      Material master list. Physical stock balances and warehouse bin allocations are maintained in warehouse storage.
                    </p>
                  </div>
                )
              }}
            </SectionLoader>
          </Card>

          {/* Card 2: Production Work (Most Prominent) */}
          <Card
            className="flex flex-col justify-between border-2 border-slate-800 bg-white p-6 sm:p-7 shadow-xs relative"
            title={
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-slate-900 text-amber-400 shrink-0 shadow-2xs">
                  <Factory className="size-5.5" aria-hidden="true" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">Production Work</h3>
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                      Primary
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-normal">Active Manufacturing Batches</p>
                </div>
              </div>
            }
            actions={<ManagementLink path="/production" label="Production Floor" />}
          >
            <SectionLoader load={dashboardSources.production} version={version}>
              {(data) => {
                const inProgressCount = data.filter(
                  (r) =>
                    r.status?.toLowerCase() === 'running' ||
                    r.status?.toLowerCase() === 'inprogress' ||
                    r.status?.toLowerCase() === 'in progress'
                ).length
                return (
                  <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-2 gap-3.5">
                      <div className="rounded-xl border border-slate-200 bg-slate-900 p-3.5 sm:p-4 text-white">
                        <p className="font-mono text-3xl sm:text-4xl font-bold tabular-nums text-white">
                          {data.length}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-300">Total Runs</p>
                      </div>
                      <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 sm:p-4">
                        <p className="font-mono text-3xl sm:text-4xl font-bold tabular-nums text-amber-900">
                          {inProgressCount}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-amber-800">Running on Floor</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                        Stage Status Distribution
                      </p>
                      <StatusPills records={data} />
                    </div>
                  </div>
                )
              }}
            </SectionLoader>
          </Card>

          {/* Card 3: Quality Check */}
          <Card
            className="flex flex-col justify-between border-slate-200 p-6 sm:p-7 hover:border-slate-300 transition-colors shadow-xs"
            title={
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 shrink-0">
                  <ShieldCheck className="size-5.5" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Quality Check</h3>
                  <p className="text-xs text-slate-500 font-normal">Laboratory Inspection Ledger</p>
                </div>
              </div>
            }
            actions={<ManagementLink path="/quality/inspections" label="Quality Ledger" />}
          >
            <SectionLoader load={dashboardSources.quality} version={version}>
              {(data) => {
                const failed = data.filter((item) => item.status?.toLowerCase() === 'fail')
                const passed = data.filter((item) => item.status?.toLowerCase() === 'pass')
                return (
                  <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-2 gap-3.5">
                      <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 sm:p-4">
                        <p className="font-mono text-3xl sm:text-4xl font-bold tabular-nums text-slate-900">
                          {data.length}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-600">Total Inspections</p>
                      </div>
                      <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3.5 sm:p-4">
                        <p className="font-mono text-3xl sm:text-4xl font-bold tabular-nums text-emerald-700">
                          {passed.length}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-emerald-800">Passed QC Gates</p>
                      </div>
                    </div>
                    {failed.length > 0 ? (
                      <div className="rounded-lg border border-red-200 bg-red-50 p-3 flex items-center justify-between text-xs sm:text-sm">
                        <span className="flex items-center gap-2 font-bold text-red-900">
                          <ShieldAlert className="size-4.5 text-red-600" />
                          {failed.length} Failed Inspection{failed.length > 1 ? 's' : ''}
                        </span>
                        <span className="text-xs font-semibold text-red-700">Triage Required</span>
                      </div>
                    ) : (
                      <StatusPills records={data} />
                    )}
                  </div>
                )
              }}
            </SectionLoader>
          </Card>
        </div>
      </div>

      {/* SECTION 3: ACTIVE OPERATIONS (Asymmetric Layout on Desktop: 8/4 or 7/5 Split) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Active Operations &amp; Material Urgency
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* LEFT (Span 7 on lg, Span 8 on xl): Production Runs & WIP */}
          <Card
            className="p-6 sm:p-7 lg:col-span-7 xl:col-span-8 flex flex-col justify-between shadow-xs border-slate-200"
            title={
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700 border border-amber-100 shrink-0">
                    <Layers className="size-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Manufacturing Runs &amp; Work In Progress
                    </h3>
                    <p className="text-xs text-slate-500">Real-time factory floor batch queue</p>
                  </div>
                </div>
              </div>
            }
            actions={<ManagementLink path="/production/wip" label="Open Current Work (WIP)" />}
          >
            <SectionLoader load={dashboardSources.production} version={version}>
              {(data) => (
                <div className="space-y-4 pt-2">
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <table className="w-full text-left text-xs sm:text-sm border-collapse">
                      <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[11px] sm:text-xs border-b border-slate-200">
                        <tr>
                          <th className="px-4.5 py-3">Run #</th>
                          <th className="px-4.5 py-3">Plant</th>
                          <th className="px-4.5 py-3 text-right">Output</th>
                          <th className="px-4.5 py-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {data.slice(0, 5).map((run) => (
                          <tr key={run.productionId} className="hover:bg-slate-50/75 transition-colors">
                            <td className="px-4.5 py-3.5 font-mono font-bold text-slate-900">
                              {run.productionNumber}
                            </td>
                            <td className="px-4.5 py-3.5 text-slate-600">{run.plantName || 'Unit 1'}</td>
                            <td className="px-4.5 py-3.5 text-right font-mono font-semibold text-slate-800">
                              {run.outputWeightKg != null
                                ? `${run.outputWeightKg.toLocaleString()} kg`
                                : run.bagsProduced != null
                                ? `${run.bagsProduced.toLocaleString()} bags`
                                : '—'}
                            </td>
                            <td className="px-4.5 py-3.5 text-right">
                              <StatusBadge tone={getToneForStatus(run.status || '')}>
                                {run.status}
                              </StatusBadge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs sm:text-sm">
                    <span className="text-slate-500">
                      Showing top {Math.min(5, data.length)} of {data.length} recorded manufacturing runs.
                    </span>
                    <ManagementLink path="/production" label="View All Production Runs" variant="button" />
                  </div>
                </div>
              )}
            </SectionLoader>
          </Card>

          {/* RIGHT (Span 5 on lg, Span 4 on xl): Need to Buy / Reorder Urgency */}
          <Card
            className="p-6 sm:p-7 lg:col-span-5 xl:col-span-4 flex flex-col justify-between shadow-xs border-slate-200"
            title={
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-red-50 text-red-600 border border-red-100 shrink-0">
                    <ShoppingCart className="size-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Need to Buy (Reorder Alerts)
                    </h3>
                    <p className="text-xs text-slate-500">Stock replenishment triggers</p>
                  </div>
                </div>
              </div>
            }
            actions={
              <ManagementLink
                path="/procurement/reorder-recommendations"
                label="Procurement Reorder"
              />
            }
          >
            <SectionLoader load={dashboardSources.recommendations} version={version}>
              {(data) => {
                const criticalCount = data.filter(
                  (r) =>
                    r.priority?.toLowerCase() === 'critical' || r.priority?.toLowerCase() === 'high'
                ).length
                return (
                  <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-2 gap-3.5">
                      <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3.5">
                        <p className="font-mono text-2xl sm:text-3xl font-bold tabular-nums text-slate-900">
                          {data.length}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-600">Total Triggers</p>
                      </div>
                      <div className="rounded-xl border border-red-100 bg-red-50/70 p-3.5">
                        <p className="font-mono text-2xl sm:text-3xl font-bold tabular-nums text-red-700">
                          {criticalCount}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-red-800">Critical / High</p>
                      </div>
                    </div>

                    <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white p-2.5">
                      {data.slice(0, 3).map((item) => (
                        <div
                          key={item.recommendationId}
                          className="py-2.5 px-2.5 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate">{item.materialName}</p>
                            <p className="text-[11px] text-slate-500 font-mono">
                              Suggested: {Number(item.recommendedQty).toLocaleString()} KG
                            </p>
                          </div>
                          <StatusBadge
                            tone={
                              item.priority?.toLowerCase() === 'critical'
                                ? 'danger'
                                : item.priority?.toLowerCase() === 'high'
                                ? 'warning'
                                : 'neutral'
                            }
                          >
                            {item.priority}
                          </StatusBadge>
                        </div>
                      ))}
                    </div>

                    <div className="pt-1">
                      <ManagementLink
                        path="/procurement/reorder-recommendations"
                        label="Review Purchase Requisitions"
                        variant="button"
                      />
                    </div>
                  </div>
                )
              }}
            </SectionLoader>
          </Card>
        </div>
      </div>

      {/* SECTION 4: SUPPORTING OPERATIONS (3-Column Row) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Machinery, Internal Logistics &amp; Sensor Telemetry
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {/* Card 1: Machines */}
          <Card
            className="flex flex-col justify-between border-slate-200 p-6 shadow-xs"
            title={
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 shrink-0">
                  <Sliders className="size-4.5" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Machines Registry</h3>
                  <p className="text-xs text-slate-500">Registered Plant Equipment</p>
                </div>
              </div>
            }
            actions={<ManagementLink path="/machines" label="Machinery" />}
          >
            <SectionLoader load={dashboardSources.machines} version={version}>
              {(data) => (
                <div className="space-y-3.5 pt-2">
                  <div className="flex items-baseline gap-2.5">
                    <span className="font-mono text-3xl sm:text-4xl font-bold tabular-nums text-slate-900">
                      {data.length}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">Active Units</span>
                  </div>
                  <StatusPills records={data} />
                  <p className="text-xs text-slate-500 pt-1 leading-relaxed">
                    Equipment catalog across compounding, extrusion, and weaving lines.
                  </p>
                </div>
              )}
            </SectionLoader>
          </Card>

          {/* Card 2: Move Stock (Transfers) */}
          <Card
            className="flex flex-col justify-between border-slate-200 p-6 shadow-xs"
            title={
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shrink-0">
                  <Truck className="size-4.5" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Move Stock (Transfers)</h3>
                  <p className="text-xs text-slate-500">Inter-Facility Logistics</p>
                </div>
              </div>
            }
            actions={<ManagementLink path="/warehouse/transfers" label="Move Stock" />}
          >
            <SectionLoader load={dashboardSources.transfers} version={version}>
              {(data) => (
                <div className="space-y-3.5 pt-2">
                  <div className="flex items-baseline gap-2.5">
                    <span className="font-mono text-3xl sm:text-4xl font-bold tabular-nums text-slate-900">
                      {data.length}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">Total Transfers</span>
                  </div>
                  <div className="divide-y divide-slate-100 text-xs">
                    {data.slice(0, 2).map((item) => (
                      <div key={item.transferId} className="py-2.5 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-mono font-bold text-slate-900 block truncate">
                            {item.transferNumber}
                          </span>
                          <span className="text-[11px] text-slate-500 truncate block">
                            {item.fromWarehouseName || `Unit ${item.fromWarehouseId}`} →{' '}
                            {item.toWarehouseName || `Unit ${item.toWarehouseId}`}
                          </span>
                        </div>
                        <StatusBadge tone={getToneForStatus(item.status)}>{item.status}</StatusBadge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </SectionLoader>
          </Card>

          {/* Card 3: Machine Live Status (Telemetry) */}
          <Card
            className="flex flex-col justify-between border-slate-200 p-6 shadow-xs"
            title={
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600 shrink-0">
                  <Zap className="size-4.5" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Machine Live Status</h3>
                  <p className="text-xs text-slate-500">SSE Sensor Feed</p>
                </div>
              </div>
            }
            actions={<ManagementLink path="/telemetry" label="Sensor Feed" />}
          >
            <SectionLoader load={dashboardSources.telemetry} version={version}>
              {(data) => {
                const anomalyCount = data.reduce(
                  (total, event) => total + (event.anomalies?.length ?? 0),
                  0
                )
                return (
                  <div className="space-y-3.5 pt-2">
                    <div className="grid grid-cols-2 gap-3.5">
                      <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                        <p className="font-mono text-2xl sm:text-3xl font-bold tabular-nums text-slate-900">
                          {data.length}
                        </p>
                        <p className="text-xs font-semibold text-slate-500">Recent Frames</p>
                      </div>
                      <div className="rounded-xl border border-purple-100 bg-purple-50/60 p-3">
                        <p className="font-mono text-2xl sm:text-3xl font-bold tabular-nums text-purple-700">
                          {anomalyCount}
                        </p>
                        <p className="text-xs font-semibold text-purple-800">Anomalies</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Recent telemetry frames from connected factory PLC sensor logs.
                    </p>
                  </div>
                )
              }}
            </SectionLoader>
          </Card>
        </div>
      </div>

      {/* SECTION 5: OPERATIONAL DATA BOUNDARY NOTE */}
      <Card
        className="border-slate-200 bg-slate-50/80 p-5 sm:p-6"
        title={
          <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
            <Info className="size-4 text-slate-500" aria-hidden="true" />
            <span>Factory Operational Scope</span>
          </span>
        }
      >
        <p className="text-xs sm:text-sm leading-relaxed text-slate-600">
          This dashboard summarizes verified backend records for quick factory triage. Pallet allocations, stage parameters, batch genealogy, and dispatch documents remain directly accessible within their dedicated operational modules.
        </p>
      </Card>
    </div>
  )
}
