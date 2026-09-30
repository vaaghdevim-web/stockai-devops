import type { BinStatus } from '../../../types/warehouseMap'

export interface WarehouseMapLegendProps {
  activeStatusFilter?: BinStatus | 'ALL'
  onStatusFilterChange?: (status: BinStatus | 'ALL') => void
  statusCounts?: Partial<Record<BinStatus, number>>
}

export function WarehouseMapLegend({
  activeStatusFilter = 'ALL',
  onStatusFilterChange,
  statusCounts = {},
}: WarehouseMapLegendProps) {
  const legendItems: Array<{
    status: BinStatus
    label: string
    colorClass: string
    dotClass: string
  }> = [
    {
      status: 'AVAILABLE',
      label: 'Available / Empty',
      colorClass: 'bg-emerald-50 text-emerald-900 border-emerald-300',
      dotClass: 'bg-emerald-500',
    },
    {
      status: 'OCCUPIED',
      label: 'Occupied / Material Stored',
      colorClass: 'bg-blue-50 text-blue-900 border-blue-300',
      dotClass: 'bg-blue-600',
    },
    {
      status: 'RESERVED',
      label: 'Reserved',
      colorClass: 'bg-amber-50 text-amber-900 border-amber-300',
      dotClass: 'bg-amber-500',
    },
    {
      status: 'QUARANTINE',
      label: 'QA Hold / Quarantine',
      colorClass: 'bg-rose-50 text-rose-900 border-rose-300',
      dotClass: 'bg-rose-500',
    },
  ]

  return (
    <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-white shadow-2xs text-xs">
      <span className="font-bold uppercase tracking-wider text-slate-500 text-[10px] font-mono mr-1">
        Status Legend:
      </span>

      {legendItems.map((item) => {
        const count = statusCounts[item.status]
        const isSelected = activeStatusFilter === item.status

        return (
          <button
            key={item.status}
            type="button"
            onClick={() => onStatusFilterChange?.(isSelected ? 'ALL' : item.status)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border font-semibold transition-all cursor-pointer ${
              item.colorClass
            } ${
              isSelected
                ? 'ring-2 ring-slate-900 shadow-xs font-bold'
                : 'hover:opacity-90'
            }`}
          >
            <span className={`size-2.5 rounded-full ${item.dotClass}`} aria-hidden="true" />
            <span>{item.label}</span>
            {count !== undefined && (
              <span className="ml-0.5 rounded-full bg-white/90 px-1.5 py-0.2 text-[10px] font-mono font-bold tabular-nums">
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
