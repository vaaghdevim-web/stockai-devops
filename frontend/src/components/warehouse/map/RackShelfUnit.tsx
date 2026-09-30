import { Layers, CheckCircle2, Plus } from 'lucide-react'
import type { BinStatus, LocationBinNode, LocationRackNode } from '../../../types/warehouseMap'
import { BinCell } from './BinCell'

export interface RackShelfUnitProps {
  rack: LocationRackNode
  selectedBinId: number | null
  highlightedBinIds: number[]
  activeStatusFilter?: BinStatus | 'ALL'
  onSelectBin: (bin: LocationBinNode) => void
  onAddShelf?: (rackId: number) => void
}

export function RackShelfUnit({
  rack,
  selectedBinId,
  highlightedBinIds,
  activeStatusFilter = 'ALL',
  onSelectBin,
  onAddShelf,
}: RackShelfUnitProps) {
  // Compute availability summary for this specific rack
  const allRackBins = rack.shelves.flatMap((s) => s.bins)
  const availableCount = allRackBins.filter((b) => b.status === 'AVAILABLE').length
  const totalCount = allRackBins.length

  return (
    <div className="rounded-lg border border-slate-300 bg-white shadow-xs overflow-hidden flex flex-col transition-all hover:border-slate-400">
      {/* Industrial Rack Header Beam */}
      <div className="bg-slate-900 text-white px-3 py-2 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex size-6 shrink-0 items-center justify-center rounded bg-slate-800 text-amber-400 font-mono font-bold text-xs border border-slate-700">
            <Layers className="size-3.5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-mono text-xs font-bold text-white tracking-wide truncate">
                {rack.rackCode}
              </span>
              {rack.aisle && (
                <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 truncate">
                  {rack.aisle}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick availability pill on the rack */}
        <div className="shrink-0 ml-2">
          {availableCount > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 text-[11px] font-bold font-mono tabular-nums">
              <CheckCircle2 className="size-3 text-emerald-400" />
              <span>{availableCount} Free</span>
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 text-[10px] font-mono tabular-nums">
              Full ({totalCount})
            </span>
          )}
        </div>
      </div>

      {/* Visual Shelves (Tiers) inside the Rack Frame */}
      <div className="p-2.5 space-y-2 bg-slate-50/70 flex-1 max-h-[380px] overflow-y-auto">
        {rack.shelves.map((shelf) => (
          <div
            key={shelf.shelfId}
            className="rounded-md border border-slate-200 bg-white p-2 shadow-2xs"
          >
            {/* Horizontal Shelf Beam Bar */}
            <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100 text-[11px] font-semibold text-slate-600">
              <div className="flex items-center gap-1 font-mono text-[10px]">
                <span className="bg-slate-100 px-1 py-0.2 rounded text-slate-700 font-bold">
                  Tier {shelf.tierLevel}
                </span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-600 font-mono text-[10px]">
                  {shelf.shelfCode.replace(/^SHELF-U\d+-/, 'S-')}
                </span>
              </div>
              <span className="text-[9px] text-slate-500 font-mono tabular-nums">
                {shelf.bins.length} Cells
              </span>
            </div>

            {/* Storage Cells Grid (Visual Shelf Blocks) */}
            <div className="grid grid-cols-2 gap-1.5">
              {shelf.bins.map((bin) => {
                const isMatchingFilter =
                  activeStatusFilter === 'ALL' ||
                  bin.status === activeStatusFilter ||
                  (activeStatusFilter === 'NEAR_FULL' &&
                    bin.capacityKg > 0 &&
                    bin.currentKg / bin.capacityKg >= 0.9 &&
                    bin.status !== 'QUARANTINE')
                const isDimmed = !isMatchingFilter

                return (
                  <BinCell
                    key={bin.binId}
                    bin={bin}
                    isSelected={selectedBinId === bin.binId}
                    isHighlighted={highlightedBinIds.includes(bin.binId)}
                    isDimmed={isDimmed}
                    onClick={onSelectBin}
                  />
                )
              })}
            </div>
          </div>
        ))}

        {onAddShelf && (
          <button
            type="button"
            onClick={() => onAddShelf(rack.rackId)}
            className="w-full py-2 px-2 border border-dashed border-slate-300 rounded-md text-[11px] font-semibold text-slate-700 hover:text-slate-900 hover:border-slate-400 hover:bg-white transition-all flex items-center justify-center gap-1 shadow-2xs cursor-pointer min-h-[36px]"
          >
            <Plus className="size-3 text-slate-600" />
            <span>Add Shelf Tier</span>
          </button>
        )}
      </div>
    </div>
  )
}
