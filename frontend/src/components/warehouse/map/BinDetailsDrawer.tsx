import { useEffect, useState } from 'react'
import {
  Boxes,
  Clock,
  Layers,
  MapPin,
  ShieldCheck,
  Truck,
  CheckCircle2,
  AlertTriangle,
  FileText,
  RefreshCw,
} from 'lucide-react'
import type { BinOccupancyResponse, LocationBinNode, WarehouseFacility } from '../../../types/warehouseMap'
import { getBinOccupancy } from '../../../api/warehouseApi'
import { Button, Drawer } from '../../common'

export interface BinDetailsDrawerProps {
  bin: LocationBinNode | null
  facility: WarehouseFacility
  isOpen: boolean
  onClose: () => void
  onInitiateTransfer?: (bin: LocationBinNode) => void
}

export function BinDetailsDrawer({
  bin,
  facility,
  isOpen,
  onClose,
  onInitiateTransfer,
}: BinDetailsDrawerProps) {
  const [occupancy, setOccupancy] = useState<BinOccupancyResponse | null>(null)
  const [loadingOccupancy, setLoadingOccupancy] = useState(false)

  useEffect(() => {
    let isMounted = true
    if (isOpen && bin?.binId) {
      void Promise.resolve().then(() => {
        if (!isMounted) return
        setLoadingOccupancy(true)
        getBinOccupancy(bin.binId)
          .then((data) => {
            if (isMounted) setOccupancy(data)
          })
          .catch(() => {
            // Keep using the passed bin node as fallback
          })
          .finally(() => {
            if (isMounted) setLoadingOccupancy(false)
          })
      })
    } else {
      void Promise.resolve().then(() => setOccupancy(null))
    }
    return () => {
      isMounted = false
    }
  }, [isOpen, bin?.binId])

  if (!bin) return null

  const capacityKg = occupancy?.capacityKg ?? bin.capacityKg ?? 5000
  const currentKg = occupancy?.currentStockKg ?? bin.currentKg ?? 0
  const activePallets = occupancy?.activePalletCount ?? bin.activePalletCount ?? 0

  const fillPercent =
    capacityKg > 0
      ? Math.min(100, Math.round((currentKg / capacityKg) * 100))
      : 0

  const isAvailable = bin.status === 'AVAILABLE' && currentKg === 0

  // Friendly, high-contrast status banners for factory staff
  const statusTheme = {
    AVAILABLE: {
      border: 'border-emerald-500 bg-emerald-50 text-emerald-950',
      badge: 'bg-emerald-700 text-white',
      title: 'AVAILABLE / EMPTY',
      desc: 'This storage location is clean, free, and ready for new material put-away.',
      icon: CheckCircle2,
    },
    OCCUPIED: {
      border: 'border-blue-500 bg-blue-50 text-blue-950',
      badge: 'bg-blue-700 text-white',
      title: 'OCCUPIED — MATERIAL STORED',
      desc: `Currently holding active inventory for ${bin.materialName || 'stored material'}.`,
      icon: Boxes,
    },
    RESERVED: {
      border: 'border-amber-500 bg-amber-50 text-amber-950',
      badge: 'bg-amber-700 text-white',
      title: 'RESERVED LOCATION',
      desc: 'This location is reserved for pending inter-facility stock transfers or allocations.',
      icon: Clock,
    },
    QUARANTINE: {
      border: 'border-rose-500 bg-rose-50 text-rose-950',
      badge: 'bg-rose-700 text-white',
      title: 'QA HOLD / QUARANTINE',
      desc: 'Material is currently locked under lab quality inspection and cannot be dispatched.',
      icon: AlertTriangle,
    },
    NEAR_FULL: {
      border: 'border-purple-500 bg-purple-50 text-purple-950',
      badge: 'bg-purple-700 text-white',
      title: 'NEARLY FULL (>90% CAPACITY)',
      desc: 'High occupancy detected. Approaching maximum volumetric safety threshold.',
      icon: Layers,
    },
  }[bin.status] || {
    border: 'border-slate-300 bg-slate-50 text-slate-900',
    badge: 'bg-slate-800 text-white',
    title: bin.status,
    desc: '',
    icon: Boxes,
  }

  const StatusIcon = statusTheme.icon

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded bg-slate-900 text-white font-mono text-xs font-bold">
            {bin.rackCode}
          </div>
          <span className="font-bold text-slate-900 text-base">
            Storage Location Details: {bin.binCode}
          </span>
          {loadingOccupancy && (
            <RefreshCw className="size-3.5 animate-spin text-slate-400" />
          )}
        </div>
      }
      description={
        <span className="text-xs text-slate-500 font-mono">
          {facility.warehouseName} • {facility.plantName}
        </span>
      }
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="secondary" onClick={onClose} className="text-xs">
            Close Details
          </Button>

          <div className="flex items-center gap-2">
            {!isAvailable && onInitiateTransfer && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onInitiateTransfer(bin)}
                className="gap-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-white font-bold"
              >
                <Truck className="size-3.5" aria-hidden="true" />
                Transfer from this Bin
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {/* 1. Big Visual Status Banner */}
        <div className={`rounded-xl border-2 p-4 shadow-2xs ${statusTheme.border}`}>
          <div className="flex items-center gap-3">
            <div className={`flex size-9 items-center justify-center rounded-lg shadow-xs shrink-0 ${statusTheme.badge}`}>
              <StatusIcon className="size-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-wide uppercase font-mono">
                {statusTheme.title}
              </h3>
              <p className="text-xs mt-0.5 opacity-90">{statusTheme.desc}</p>
            </div>
          </div>
        </div>

        {/* 2. Location Hierarchy Details */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono flex items-center gap-1.5">
            <MapPin className="size-3.5 text-slate-400" />
            Physical Location Coordinates
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">
                Rack ID
              </span>
              <span className="font-mono text-sm font-bold text-slate-900 mt-0.5 block">
                {occupancy?.rackCode ?? bin.rackCode}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">
                Shelf ID
              </span>
              <span className="font-mono text-sm font-bold text-slate-900 mt-0.5 block">
                {occupancy?.shelfCode ?? bin.shelfCode}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">
                Bin Code
              </span>
              <span className="font-mono text-sm font-bold text-slate-900 mt-0.5 block">
                {occupancy?.binCode ?? bin.binCode}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">
                Warehouse
              </span>
              <span className="font-semibold text-slate-900 text-xs mt-0.5 block truncate">
                {occupancy?.warehouseName ?? facility.warehouseName}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Capacity & Weight Storage Metrics */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono flex items-center gap-1.5">
              <Layers className="size-3.5 text-slate-400" />
              Weight &amp; Capacity Utilization
            </h4>
            <span className="font-mono text-xs font-bold text-slate-900 tabular-nums">
              {fillPercent}% Filled
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">
                Current Weight
              </span>
              <span className="font-mono text-lg font-bold text-slate-900 block mt-1 tabular-nums">
                {currentKg.toLocaleString()}{' '}
                <span className="text-xs font-normal text-slate-500">KG</span>
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">
                Available Space
              </span>
              <span className="font-mono text-lg font-bold text-slate-900 block mt-1 tabular-nums">
                {Math.max(0, capacityKg - currentKg).toLocaleString()}{' '}
                <span className="text-xs font-normal text-slate-500">KG</span>
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 col-span-2 sm:col-span-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">
                Max Capacity
              </span>
              <span className="font-mono text-lg font-bold text-slate-900 block mt-1 tabular-nums">
                {capacityKg.toLocaleString()}{' '}
                <span className="text-xs font-normal text-slate-500">KG</span>
              </span>
            </div>
          </div>

          {/* Clean Visual Gauge */}
          <div className="pt-2">
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 border border-slate-200">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  fillPercent >= 90
                    ? 'bg-purple-600'
                    : fillPercent > 0
                    ? 'bg-blue-600'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.max(5, fillPercent)}%` }}
              />
            </div>
          </div>

          {activePallets > 0 && (
            <div className="text-xs text-slate-600 flex items-center justify-between border-t border-slate-100 pt-2 font-mono">
              <span>Active Pallets Staged:</span>
              <span className="font-bold text-slate-900">{activePallets} Pallets</span>
            </div>
          )}
        </div>

        {/* 4. Stored Material & Batch Details (When occupied and details present) */}
        {!isAvailable && (bin.materialCode || bin.materialName || bin.batchNo) && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono flex items-center gap-1.5">
                <FileText className="size-3.5 text-slate-400" />
                Stored Inventory Information
              </h4>
              {bin.qualityStatus && (
                <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                  <ShieldCheck className="size-3.5" />
                  {bin.qualityStatus}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {bin.materialName && (
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">
                    Material Name
                  </span>
                  <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                    {bin.materialName}
                  </span>
                  {bin.materialCode && (
                    <span className="font-mono text-slate-500 text-[11px]">
                      {bin.materialCode}
                    </span>
                  )}
                </div>
              )}

              {bin.batchNo && (
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">
                    Batch Number
                  </span>
                  <span className="font-mono font-bold text-slate-900 text-sm mt-0.5 block">
                    {bin.batchNo}
                  </span>
                  <span className="text-[10px] text-slate-500">Verified Factory Traceability</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Available State Callout */}
        {isAvailable && (
          <div className="rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50/50 p-6 text-center">
            <CheckCircle2 className="mx-auto size-10 text-emerald-600 mb-2" />
            <h4 className="text-sm font-bold text-emerald-950 font-mono">Space Ready for Storage</h4>
            <p className="text-xs text-emerald-800 mt-1 max-w-sm mx-auto">
              This storage location has a capacity of <span className="font-mono font-bold">{capacityKg.toLocaleString()} KG</span> and is completely free for new raw material receipts, WIP extrusion batches, or finished pallet staging.
            </p>
          </div>
        )}
      </div>
    </Drawer>
  )
}
