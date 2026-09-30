import { useState, useMemo } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Factory,
  Folder,
  Layers,
  MapPin,
  Package,
  Warehouse,
  Filter,
  X,
  Eye,
  EyeOff,
  ChevronsUpDown,
  ChevronsDownUp,
  Search,
} from 'lucide-react'
import type {
  BinStatus,
  LocationBinNode,
  WarehouseFacility,
} from '../../../types/warehouseMap'
import { StatusBadge } from '../../common'

export interface StorageHierarchyTreeProps {
  facility: WarehouseFacility
  onSelectBin: (bin: LocationBinNode) => void
  selectedBinId: number | null
  statusFilter?: BinStatus | 'ALL'
  highlightedBinIds?: number[]
  onClearFilter?: () => void
}

function checkBinMatchesStatus(
  bin: LocationBinNode,
  filter: BinStatus | 'ALL'
): boolean {
  if (filter === 'ALL') return true
  if (filter === 'NEAR_FULL') {
    return (
      bin.status === 'NEAR_FULL' ||
      (bin.capacityKg > 0 &&
        bin.currentKg / bin.capacityKg >= 0.9 &&
        bin.status !== 'QUARANTINE' &&
        bin.status !== 'RESERVED')
    )
  }
  return bin.status === filter
}

export function StorageHierarchyTree({
  facility,
  onSelectBin,
  selectedBinId,
  statusFilter = 'ALL',
  highlightedBinIds = [],
  onClearFilter,
}: StorageHierarchyTreeProps) {
  // Option to completely hide non-matching items vs dimming them
  const [hideNonMatching, setHideNonMatching] = useState(false)

  // Track open/collapsed state of tree nodes
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    [`plant-${facility.plantId}`]: true,
    [`wh-${facility.warehouseId}`]: true,
    [`rack-${facility.racks[0]?.rackId}`]: true,
  })

  // Auto-expand branches containing matches whenever statusFilter or search changes
  const effectiveExpandedNodes = useMemo(() => {
    const hasFilter = statusFilter !== 'ALL'
    const hasSearch = highlightedBinIds.length > 0

    const autoExpanded: Record<string, boolean> = {}

    if (hasFilter || hasSearch) {
      autoExpanded[`plant-${facility.plantId}`] = true
      autoExpanded[`wh-${facility.warehouseId}`] = true

      facility.racks.forEach((rack) => {
        let rackHasMatch = false
        rack.shelves.forEach((shelf) => {
          const shelfHasMatch = shelf.bins.some((bin) => {
            const matchesStatus = checkBinMatchesStatus(bin, statusFilter)
            const matchesSearch =
              highlightedBinIds.length === 0 || highlightedBinIds.includes(bin.binId)
            return matchesStatus && matchesSearch
          })
          if (shelfHasMatch) {
            rackHasMatch = true
          }
        })
        if (rackHasMatch) {
          autoExpanded[`rack-${rack.rackId}`] = true
        }
      })
    }

    return {
      ...expandedNodes,
      ...autoExpanded,
    }
  }, [expandedNodes, statusFilter, highlightedBinIds, facility])

  function toggleNode(nodeKey: string) {
    setExpandedNodes((prev) => ({
      ...prev,
      [nodeKey]: !prev[nodeKey],
    }))
  }

  function handleExpandAll() {
    const allExpanded: Record<string, boolean> = {
      [`plant-${facility.plantId}`]: true,
      [`wh-${facility.warehouseId}`]: true,
    }
    facility.racks.forEach((rack) => {
      allExpanded[`rack-${rack.rackId}`] = true
    })
    setExpandedNodes(allExpanded)
  }

  function handleCollapseAll() {
    setExpandedNodes({
      [`plant-${facility.plantId}`]: true,
      [`wh-${facility.warehouseId}`]: false,
    })
  }

  const isPlantOpen = effectiveExpandedNodes[`plant-${facility.plantId}`] ?? true
  const isWhOpen = effectiveExpandedNodes[`wh-${facility.warehouseId}`] ?? true

  // Compute facility-wide totals & matches
  let totalFacilityBins = 0
  let matchingFacilityBins = 0

  facility.racks.forEach((rack) => {
    rack.shelves.forEach((shelf) => {
      shelf.bins.forEach((bin) => {
        totalFacilityBins += 1
        const matchesStatus = checkBinMatchesStatus(bin, statusFilter)
        const matchesSearch =
          highlightedBinIds.length === 0 || highlightedBinIds.includes(bin.binId)
        if (matchesStatus && matchesSearch) {
          matchingFacilityBins += 1
        }
      })
    })
  })

  const isFilterActive = statusFilter !== 'ALL' || highlightedBinIds.length > 0

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs space-y-4">
      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-slate-700" aria-hidden="true" />
            <h3 className="text-sm font-bold text-slate-900">
              5-Tier Storage Hierarchy Tree
            </h3>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-slate-700 tabular-nums">
              {totalFacilityBins} Bins Total
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Physical structural hierarchy from Plant down to granular Bin &amp; Inventory Batch.
          </p>
        </div>

        {/* Tree Controls: Expand/Collapse & Filter Match Status */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Active Filter Indicator */}
          {isFilterActive && (
            <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 border border-slate-300 px-2.5 py-1 text-xs font-medium">
              <Filter className="size-3 text-slate-600" />
              <span className="text-slate-600 font-sans">Filtered:</span>
              <span className="font-mono font-bold text-slate-900 tabular-nums">
                {matchingFacilityBins} / {totalFacilityBins}
              </span>
              {statusFilter !== 'ALL' && (
                <StatusBadge
                  tone={
                    statusFilter === 'AVAILABLE'
                      ? 'success'
                      : statusFilter === 'QUARANTINE'
                      ? 'danger'
                      : statusFilter === 'RESERVED'
                      ? 'warning'
                      : statusFilter === 'NEAR_FULL'
                      ? 'warning'
                      : 'neutral'
                  }
                  className="ml-1 text-[10px] py-0"
                >
                  {statusFilter}
                </StatusBadge>
              )}
              {highlightedBinIds.length > 0 && (
                <span className="rounded bg-amber-200 text-amber-900 px-1.5 py-0.5 text-[10px] font-bold font-mono">
                  Search
                </span>
              )}
              {onClearFilter && statusFilter !== 'ALL' && (
                <button
                  type="button"
                  onClick={onClearFilter}
                  title="Clear status filter"
                  className="ml-1 rounded p-0.5 text-slate-500 hover:bg-slate-200 hover:text-slate-800 cursor-pointer"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
          )}

          {/* Toggle Hide Non-Matching */}
          {isFilterActive && (
            <button
              type="button"
              onClick={() => setHideNonMatching((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer ${
                hideNonMatching
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
              title={hideNonMatching ? 'Show all bins (dim non-matching)' : 'Hide non-matching bins'}
            >
              {hideNonMatching ? (
                <>
                  <EyeOff className="size-3.5" />
                  <span>Only Matches</span>
                </>
              ) : (
                <>
                  <Eye className="size-3.5" />
                  <span>Dim Others</span>
                </>
              )}
            </button>
          )}

          {/* Expand / Collapse All */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
            <button
              type="button"
              onClick={handleExpandAll}
              className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-medium text-slate-700 hover:bg-white hover:text-slate-900 hover:shadow-2xs transition-all cursor-pointer"
              title="Expand all racks"
            >
              <ChevronsUpDown className="size-3.5" />
              <span>Expand All</span>
            </button>
            <button
              type="button"
              onClick={handleCollapseAll}
              className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-medium text-slate-700 hover:bg-white hover:text-slate-900 hover:shadow-2xs transition-all cursor-pointer"
              title="Collapse all racks"
            >
              <ChevronsDownUp className="size-3.5" />
              <span>Collapse</span>
            </button>
          </div>
        </div>
      </div>

      <div className="font-mono text-xs space-y-2">
        {/* Tier 1: Plant */}
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
          <div
            role="button"
            tabIndex={0}
            onClick={() => toggleNode(`plant-${facility.plantId}`)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') toggleNode(`plant-${facility.plantId}`)
            }}
            className="flex items-center gap-2 font-bold text-slate-900 cursor-pointer select-none hover:text-slate-700 transition-colors"
          >
            {isPlantOpen ? (
              <ChevronDown className="size-4 text-slate-400" />
            ) : (
              <ChevronRight className="size-4 text-slate-400" />
            )}
            <Factory className="size-4 text-slate-700" />
            <span className="text-sm">Plant: "{facility.plantName}"</span>
            <span className="text-[11px] font-normal text-slate-500 font-sans">
              (Hyderabad, Telangana)
            </span>
          </div>

          {/* Tier 2: Warehouse */}
          {isPlantOpen && (
            <div className="ml-6 mt-3 pl-4 border-l-2 border-dashed border-slate-300 space-y-3">
              <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-2xs">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleNode(`wh-${facility.warehouseId}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') toggleNode(`wh-${facility.warehouseId}`)
                  }}
                  className="flex items-center justify-between font-bold text-slate-900 cursor-pointer select-none hover:text-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {isWhOpen ? (
                      <ChevronDown className="size-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="size-4 text-slate-400" />
                    )}
                    <Warehouse className="size-4 text-slate-700" />
                    <span>Warehouse: "{facility.warehouseName}"</span>
                    <span className="text-[10px] rounded bg-slate-100 text-slate-700 px-2 py-0.5 uppercase font-mono font-bold">
                      Type: {facility.type}
                    </span>
                  </div>

                  <span className="text-[11px] text-slate-500 font-normal font-sans tabular-nums">
                    {facility.racks.length} Storage Racks
                  </span>
                </div>

                {/* Tier 3: Location Racks */}
                {isWhOpen && (
                  <div className="ml-6 mt-3 pl-4 border-l-2 border-dashed border-slate-300 space-y-3">
                    {facility.racks.map((rack) => {
                      const isRackOpen = effectiveExpandedNodes[`rack-${rack.rackId}`] ?? false

                      // Compute rack-level counts
                      let rackTotalBins = 0
                      let rackMatches = 0
                      rack.shelves.forEach((s) => {
                        s.bins.forEach((b) => {
                          rackTotalBins += 1
                          const matchesStatus = checkBinMatchesStatus(b, statusFilter)
                          const matchesSearch =
                            highlightedBinIds.length === 0 || highlightedBinIds.includes(b.binId)
                          if (matchesStatus && matchesSearch) {
                            rackMatches += 1
                          }
                        })
                      })

                      // If hiding non-matching and rack has 0 matches, skip rack rendering
                      if (hideNonMatching && isFilterActive && rackMatches === 0) {
                        return null
                      }

                      const hasMatchingBinsInRack = isFilterActive && rackMatches > 0

                      return (
                        <div
                          key={rack.rackId}
                          className={`rounded-lg border transition-all ${
                            hasMatchingBinsInRack
                              ? 'border-slate-300 bg-slate-50/90 shadow-2xs ring-1 ring-slate-200'
                              : 'border-slate-200/80 bg-slate-50/50'
                          }`}
                        >
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => toggleNode(`rack-${rack.rackId}`)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') toggleNode(`rack-${rack.rackId}`)
                            }}
                            className="flex items-center justify-between p-2.5 font-semibold text-slate-800 cursor-pointer select-none hover:text-slate-900 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              {isRackOpen ? (
                                <ChevronDown className="size-3.5 text-slate-400" />
                              ) : (
                                <ChevronRight className="size-3.5 text-slate-400" />
                              )}
                              <Folder className="size-3.5 text-slate-600" />
                              <span className="font-bold text-slate-900 font-mono">
                                Location Rack: "{rack.rackCode}"
                              </span>
                              <span className="text-[11px] text-slate-500 font-sans">
                                ({rack.aisle})
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              {/* Rack Filter / Match Badge */}
                              {isFilterActive ? (
                                rackMatches > 0 ? (
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-mono font-bold tabular-nums ${
                                      statusFilter === 'AVAILABLE'
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                        : statusFilter === 'QUARANTINE'
                                        ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                        : statusFilter === 'RESERVED'
                                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                        : statusFilter === 'NEAR_FULL'
                                        ? 'bg-purple-100 text-purple-800 border border-purple-300'
                                        : statusFilter === 'OCCUPIED'
                                        ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                        : 'bg-slate-200 text-slate-800'
                                    }`}
                                  >
                                    {rackMatches} / {rackTotalBins} Match
                                    {rackMatches === 1 ? '' : 'es'}
                                  </span>
                                ) : (
                                  <span className="rounded-full bg-slate-100 text-slate-500 px-2 py-0.5 text-[10px] font-mono tabular-nums">
                                    0 Matches
                                  </span>
                                )
                              ) : (
                                <span className="text-[11px] text-slate-500 font-mono tabular-nums">
                                  {rackTotalBins} Bins
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Tier 4: Location Shelves */}
                          {isRackOpen && (
                            <div className="ml-5 mt-1 pb-2.5 pl-3 border-l-2 border-dashed border-slate-300 space-y-2.5">
                              {rack.shelves.map((shelf) => {
                                // Compute shelf-level matches
                                let shelfMatches = 0
                                shelf.bins.forEach((b) => {
                                  const matchesStatus = checkBinMatchesStatus(b, statusFilter)
                                  const matchesSearch =
                                    highlightedBinIds.length === 0 || highlightedBinIds.includes(b.binId)
                                  if (matchesStatus && matchesSearch) {
                                    shelfMatches += 1
                                  }
                                })

                                if (hideNonMatching && isFilterActive && shelfMatches === 0) {
                                  return null
                                }

                                return (
                                  <div
                                    key={shelf.shelfId}
                                    className="rounded border border-slate-200 bg-white p-2"
                                  >
                                    <div className="flex items-center justify-between font-medium text-slate-700 text-xs">
                                      <div className="flex items-center gap-2">
                                        <Layers className="size-3.5 text-slate-400" />
                                        <span>
                                          Location Shelf: <strong>"{shelf.shelfCode}"</strong>
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-mono">
                                          (Tier {shelf.tierLevel})
                                        </span>
                                      </div>

                                      {isFilterActive && (
                                        <span
                                          className={`text-[10px] font-mono font-semibold tabular-nums ${
                                            shelfMatches > 0 ? 'text-slate-800' : 'text-slate-400'
                                          }`}
                                        >
                                          {shelfMatches} of {shelf.bins.length} Match
                                          {shelfMatches === 1 ? '' : 'es'}
                                        </span>
                                      )}
                                    </div>

                                    {/* Tier 5: Location Bins & Inventory */}
                                    <div className="ml-5 mt-2 pl-3 border-l-2 border-dashed border-slate-300 space-y-1.5">
                                      {shelf.bins.map((bin) => {
                                        const isSelected = selectedBinId === bin.binId
                                        const matchesStatus = checkBinMatchesStatus(bin, statusFilter)
                                        const matchesSearch =
                                          highlightedBinIds.length === 0 ||
                                          highlightedBinIds.includes(bin.binId)
                                        const isMatch = matchesStatus && matchesSearch
                                        const isSearchHighlighted = highlightedBinIds.includes(bin.binId)

                                        // If hideNonMatching is active and this bin is not a match, skip it
                                        if (hideNonMatching && isFilterActive && !isMatch) {
                                          return null
                                        }

                                        // Styling based on status filter & search
                                        const isDimmed = isFilterActive && !isMatch

                                        return (
                                          <div
                                            key={bin.binId}
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => onSelectBin(bin)}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter' || e.key === ' ') onSelectBin(bin)
                                            }}
                                            className={`flex flex-wrap items-center justify-between gap-2 rounded p-2 text-xs cursor-pointer transition-all ${
                                              isSelected
                                                ? 'bg-slate-100 border-2 border-slate-900 shadow-2xs text-slate-950 font-bold'
                                                : isDimmed
                                                ? 'opacity-35 hover:opacity-100 border border-dashed border-slate-200 bg-slate-50/50 text-slate-500'
                                                : isFilterActive && isMatch
                                                ? bin.status === 'AVAILABLE'
                                                  ? 'bg-emerald-50/80 border-2 border-emerald-400 shadow-2xs text-slate-900 ring-1 ring-emerald-200'
                                                  : bin.status === 'QUARANTINE'
                                                  ? 'bg-rose-50/80 border-2 border-rose-400 shadow-2xs text-slate-900 ring-1 ring-rose-200'
                                                  : bin.status === 'RESERVED'
                                                  ? 'bg-amber-50/80 border-2 border-amber-400 shadow-2xs text-slate-900 ring-1 ring-amber-200'
                                                  : bin.status === 'NEAR_FULL' || statusFilter === 'NEAR_FULL'
                                                  ? 'bg-purple-50/80 border-2 border-purple-400 shadow-2xs text-slate-900 ring-1 ring-purple-200'
                                                  : 'bg-blue-50/80 border-2 border-blue-400 shadow-2xs text-slate-900 ring-1 ring-blue-200'
                                                : 'bg-slate-50/80 hover:bg-slate-100 text-slate-800 border border-slate-200/60'
                                            }`}
                                          >
                                            <div className="flex items-center gap-2">
                                              <MapPin className="size-3 text-slate-700" />
                                              <span className="font-mono font-bold">
                                                Location Bin: "{bin.binCode}"
                                              </span>

                                              {/* Search Match Ping Badge */}
                                              {isSearchHighlighted && (
                                                <span className="inline-flex items-center gap-1 rounded bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 text-[10px] font-bold font-mono">
                                                  <Search className="size-2.5" />
                                                  Search Match
                                                </span>
                                              )}

                                              {/* Status Badge */}
                                              <StatusBadge
                                                tone={
                                                  bin.status === 'AVAILABLE'
                                                    ? 'success'
                                                    : bin.status === 'QUARANTINE'
                                                    ? 'danger'
                                                    : bin.status === 'RESERVED'
                                                    ? 'warning'
                                                    : bin.status === 'NEAR_FULL'
                                                    ? 'warning'
                                                    : 'neutral'
                                                }
                                              >
                                                {bin.status}
                                              </StatusBadge>
                                            </div>

                                            {/* Inventory Record */}
                                            {bin.batchNo ? (
                                              <div className="flex items-center gap-2 text-[11px] text-slate-700 font-sans">
                                                <Package className="size-3 text-slate-500" />
                                                <span className="font-mono font-semibold text-slate-900">
                                                  {bin.batchNo}
                                                </span>
                                                <span>•</span>
                                                <span className="font-mono tabular-nums">{bin.currentKg.toLocaleString()} KG</span>
                                                <span>•</span>
                                                <span className="text-emerald-800 font-semibold">
                                                  {bin.qualityStatus}
                                                </span>
                                              </div>
                                            ) : (
                                              <span className="text-[11px] text-slate-400 italic font-sans">
                                                (Empty Bin - Ready for Put-away)
                                              </span>
                                            )}
                                          </div>
                                        )
                                      })}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
