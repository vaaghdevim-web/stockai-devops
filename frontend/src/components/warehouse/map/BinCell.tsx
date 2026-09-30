import type { LocationBinNode } from '../../../types/warehouseMap'
import { CheckCircle2, Box, AlertCircle, Clock, ShieldAlert } from 'lucide-react'

export interface BinCellProps {
  bin: LocationBinNode
  isSelected?: boolean
  isHighlighted?: boolean
  isDimmed?: boolean
  onClick: (bin: LocationBinNode) => void
}

export function BinCell({
  bin,
  isSelected = false,
  isHighlighted = false,
  isDimmed = false,
  onClick,
}: BinCellProps) {
  // Ultra-clean, non-technical status styling with high contrast
  const config = {
    AVAILABLE: {
      cardBg: 'bg-emerald-50/90 hover:bg-emerald-100',
      border: 'border border-emerald-500',
      badgeBg: 'bg-emerald-700 text-white',
      badgeDot: 'bg-emerald-500',
      textColor: 'text-emerald-950',
      subtextColor: 'text-emerald-800',
      label: 'Free',
      subtext: 'Available',
      icon: CheckCircle2,
    },
    OCCUPIED: {
      cardBg: 'bg-blue-50/90 hover:bg-blue-100',
      border: 'border border-blue-500',
      badgeBg: 'bg-blue-700 text-white',
      badgeDot: 'bg-blue-600',
      textColor: 'text-blue-950',
      subtextColor: 'text-blue-800',
      label: 'Stored',
      subtext: bin.materialCode || 'Active Stock',
      icon: Box,
    },
    RESERVED: {
      cardBg: 'bg-amber-50/90 hover:bg-amber-100',
      border: 'border border-amber-500',
      badgeBg: 'bg-amber-700 text-white',
      badgeDot: 'bg-amber-500',
      textColor: 'text-amber-950',
      subtextColor: 'text-amber-800',
      label: 'Hold',
      subtext: 'Reserved',
      icon: Clock,
    },
    QUARANTINE: {
      cardBg: 'bg-rose-50/90 hover:bg-rose-100',
      border: 'border border-dashed border-rose-500',
      badgeBg: 'bg-rose-700 text-white',
      badgeDot: 'bg-rose-600',
      textColor: 'text-rose-950',
      subtextColor: 'text-rose-800',
      label: 'QA',
      subtext: 'Lab Hold',
      icon: ShieldAlert,
    },
    NEAR_FULL: {
      cardBg: 'bg-purple-50/90 hover:bg-purple-100',
      border: 'border border-purple-500',
      badgeBg: 'bg-purple-700 text-white',
      badgeDot: 'bg-purple-600',
      textColor: 'text-purple-950',
      subtextColor: 'text-purple-800',
      label: 'Near Full',
      subtext: `${Math.round((bin.currentKg / (bin.capacityKg || 5000)) * 100)}% Full`,
      icon: AlertCircle,
    },
  }[bin.status] || {
    cardBg: 'bg-slate-50 hover:bg-slate-100',
    border: 'border border-slate-300',
    badgeBg: 'bg-slate-700 text-white',
    badgeDot: 'bg-slate-500',
    textColor: 'text-slate-900',
    subtextColor: 'text-slate-600',
    label: bin.status,
    subtext: '',
    icon: Box,
  }

  // Format clean human-readable slot identifier (e.g. Cell 01, Cell 02)
  const slotSuffix = bin.binCode.match(/-(\d+)$/)?.[1] || bin.binCode.slice(-2)
  const displaySlot = `Cell ${slotSuffix}`
  const StatusIcon = config.icon

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(bin)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick(bin)
        }
      }}
      className={`relative cursor-pointer rounded-md p-2 transition-all duration-150 text-left select-none flex flex-col justify-between min-h-[56px] shadow-2xs overflow-hidden ${
        config.cardBg
      } ${config.border} ${
        isSelected
          ? 'ring-2 ring-slate-900 shadow-sm scale-[1.02] z-20 bg-white'
          : 'hover:shadow-xs hover:border-slate-500'
      } ${
        isHighlighted
          ? 'ring-2 ring-amber-400 scale-[1.02] z-30 animate-pulse'
          : ''
      } ${isDimmed ? 'opacity-30 grayscale-[50%]' : 'opacity-100'}`}
      title={`${bin.binCode} (${config.subtext}) - Click for details`}
    >
      {/* Search match beacon */}
      {isHighlighted && (
        <span className="absolute -top-1 -right-1 flex size-3 items-center justify-center">
          <span className="absolute inline-flex size-full rounded-full bg-amber-400 opacity-75 animate-ping" />
          <span className="relative inline-flex size-2 rounded-full bg-amber-600" />
        </span>
      )}

      {/* Top row: Clean Slot Name & Status Tag with Icon */}
      <div className="flex items-center justify-between gap-1 leading-none">
        <span className="font-mono text-xs font-bold text-slate-900 tracking-tight truncate tabular-nums">
          {displaySlot}
        </span>
        <span
          className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${config.badgeBg}`}
        >
          <StatusIcon className="size-2.5" />
          <span>{config.label}</span>
        </span>
      </div>

      {/* Bottom row: Status or Material Code */}
      <div className="flex items-center justify-between gap-1 leading-none">
        <span
          className={`text-[10px] font-bold truncate ${config.subtextColor}`}
          title={config.subtext}
        >
          {config.subtext}
        </span>
        <span className="font-mono text-[9px] text-slate-500 truncate tabular-nums">
          {bin.binCode.replace(/^BIN-U\d+-/, '')}
        </span>
      </div>
    </div>
  )
}
