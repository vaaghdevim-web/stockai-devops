import { Plus, ChevronRight } from 'lucide-react'
import type {
  BinStatus,
  LocationBinNode,
  WarehouseFacility,
} from '../../../types/warehouseMap'
import { RackShelfUnit } from './RackShelfUnit'

export interface WarehouseFloorCanvasProps {
  facility: WarehouseFacility
  selectedBinId: number | null
  highlightedBinIds: number[]
  statusFilter: BinStatus | 'ALL'
  onSelectBin: (bin: LocationBinNode) => void
  onOpenAddRackModal?: () => void
  onAddShelf?: (rackId: number) => void
}

export function WarehouseFloorCanvas({
  facility,
  selectedBinId,
  highlightedBinIds,
  statusFilter,
  onSelectBin,
  onOpenAddRackModal,
  onAddShelf,
}: WarehouseFloorCanvasProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs space-y-4">
      {/* Blueprint Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-slate-900 text-white font-mono font-bold text-xs shadow-2xs">
            U{facility.warehouseId}
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-900 leading-tight">
              {facility.warehouseName}
            </h3>
            <p className="text-xs text-slate-500 font-mono">
              {facility.plantName} • Visual Warehouse Storage Layout
            </p>
          </div>
        </div>

        {/* Facility Info */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-700 font-bold tabular-nums">
            {facility.racks.length} Storage Racks
          </span>
        </div>
      </div>

      {/* Storage Racks Section Header */}
      <div className="flex items-center justify-between px-0.5 pt-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-800 font-mono">
            Storage Racks
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {onOpenAddRackModal && (
            <button
              type="button"
              onClick={onOpenAddRackModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-2xs font-mono cursor-pointer"
            >
              <Plus className="size-3.5 text-amber-400" />
              <span>Add Rack</span>
            </button>
          )}
          <span className="text-xs text-slate-500 hidden sm:inline flex items-center gap-0.5">
            <span>Click any Cell for Details</span>
            <ChevronRight className="size-3 text-slate-400" />
          </span>
        </div>
      </div>

      {/* Racks Full-Width Adaptive Grid (Up to 4 Columns on XL screens) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
        {facility.racks.map((rack) => (
          <RackShelfUnit
            key={rack.rackId}
            rack={rack}
            selectedBinId={selectedBinId}
            highlightedBinIds={highlightedBinIds}
            activeStatusFilter={statusFilter}
            onSelectBin={onSelectBin}
            onAddShelf={onAddShelf}
          />
        ))}
      </div>
    </div>
  )
}
