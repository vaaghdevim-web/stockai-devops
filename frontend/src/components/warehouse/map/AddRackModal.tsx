import { useState } from 'react'
import { Layers, Plus, Warehouse, CheckCircle2, RefreshCw } from 'lucide-react'
import type {
  CreateRackRequest,
  WarehouseFacility,
} from '../../../types/warehouseMap'
import { Button, Modal } from '../../common'

export interface AddRackModalProps {
  isOpen: boolean
  facility: WarehouseFacility
  onClose: () => void
  onAddRack: (request: CreateRackRequest) => Promise<void> | void
}

export function AddRackModal(props: AddRackModalProps) {
  return (
    <Modal
      isOpen={props.isOpen}
      onClose={props.onClose}
      size="md"
      title={
        <div className="flex items-center gap-2">
          <Warehouse className="size-5 text-slate-800" aria-hidden="true" />
          <span>Add Custom Storage Rack</span>
        </div>
      }
      description={`Add a new physical rack to ${props.facility.warehouseName}. All new storage cells will be initialized as Available (Green).`}
    >
      {props.isOpen && (
        <AddRackForm
          facility={props.facility}
          onClose={props.onClose}
          onAddRack={props.onAddRack}
        />
      )}
    </Modal>
  )
}

function AddRackForm({
  facility,
  onClose,
  onAddRack,
}: Omit<AddRackModalProps, 'isOpen'>) {
  // Suggest next rack number
  const nextRackNum = facility.racks.length + 1
  const defaultRackCode = `RACK-U${facility.warehouseId}-0${nextRackNum}`

  const [rackCode, setRackCode] = useState(defaultRackCode)
  const [tierCount, setTierCount] = useState<number>(2)
  const [binsPerTier, setBinsPerTier] = useState<number>(2)
  const [capacityKg, setCapacityKg] = useState<number>(5000)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!rackCode.trim()) {
      setError('Rack Code is required')
      return
    }

    // Check duplicate rack code in facility
    const isDuplicate = facility.racks.some(
      (r) => r.rackCode.toUpperCase() === rackCode.trim().toUpperCase()
    )
    if (isDuplicate) {
      setError(`A rack with code "${rackCode.trim()}" already exists in ${facility.warehouseName}`)
      return
    }

    setSubmitting(true)
    try {
      await onAddRack({
        rackCode: rackCode.trim(),
        numberOfShelves: tierCount,
        binsPerShelf: binsPerTier,
        defaultBinCapacityKg: capacityKg,
      })
      onClose()
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } } }
      setError(apiErr.response?.data?.message || 'Failed to create rack on the server.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-1">
      {error && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium">
          {error}
        </div>
      )}

      {/* Rack Code & Capacity Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div>
          <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1 font-mono">
            Rack Code / Identifier *
          </label>
          <input
            type="text"
            value={rackCode}
            onChange={(e) => setRackCode(e.target.value)}
            placeholder="e.g. RACK-U1-04"
            className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-sm font-bold text-slate-900 focus:border-slate-800 focus:outline-hidden focus:ring-1 focus:ring-slate-800"
            required
            disabled={submitting}
          />
        </div>

        <div>
          <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1 font-mono">
            Capacity per Bin (KG) *
          </label>
          <input
            type="number"
            min={100}
            step={100}
            value={capacityKg}
            onChange={(e) => setCapacityKg(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-sm font-semibold text-slate-900 focus:border-slate-800 focus:outline-hidden focus:ring-1 focus:ring-slate-800"
            required
            disabled={submitting}
          />
        </div>
      </div>

      {/* Shelves & Bins Configuration */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div>
          <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1 font-mono">
            Shelf Tiers (Levels)
          </label>
          <select
            value={tierCount}
            onChange={(e) => setTierCount(Number(e.target.value))}
            disabled={submitting}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono text-sm font-semibold text-slate-900 focus:border-slate-800 focus:outline-hidden focus:ring-1 focus:ring-slate-800"
          >
            <option value={1}>1 Tier (Single Level)</option>
            <option value={2}>2 Tiers (Standard)</option>
            <option value={3}>3 Tiers</option>
            <option value={4}>4 Tiers</option>
            <option value={5}>5 Tiers (High-Bay)</option>
          </select>
        </div>

        <div>
          <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1 font-mono">
            Bins per Shelf
          </label>
          <select
            value={binsPerTier}
            onChange={(e) => setBinsPerTier(Number(e.target.value))}
            disabled={submitting}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono text-sm font-semibold text-slate-900 focus:border-slate-800 focus:outline-hidden focus:ring-1 focus:ring-slate-800"
          >
            <option value={1}>1 Bin / Pallet Slot</option>
            <option value={2}>2 Bins (Dual Slot)</option>
            <option value={3}>3 Bins</option>
            <option value={4}>4 Bins (High Density)</option>
          </select>
        </div>
      </div>

      {/* Live Visual Rack Preview */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2">
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 font-mono uppercase">
          <span className="flex items-center gap-1">
            <Layers className="size-3.5 text-slate-500" />
            Live Visual Preview:
          </span>
          <span className="text-emerald-800 font-bold tabular-nums">
            +{tierCount * binsPerTier} Available Bins (Green)
          </span>
        </div>

        <div className="rounded-lg border-2 border-slate-300 bg-white p-2.5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between bg-slate-900 text-white px-2.5 py-1.5 rounded font-mono text-xs">
            <span className="font-bold">{rackCode || 'RACK-NEW'}</span>
            <span className="text-[10px] text-emerald-400 font-bold tabular-nums">
              {tierCount * binsPerTier} Available
            </span>
          </div>

          <div className="space-y-1.5">
            {Array.from({ length: tierCount }).map((_, tierIdx) => (
              <div
                key={tierIdx}
                className="rounded border border-dashed border-slate-300 bg-slate-50/50 p-1.5"
              >
                <div className="text-[10px] font-mono text-slate-500 mb-1">
                  Tier {tierIdx + 1}
                </div>
                <div
                  className="grid gap-1.5"
                  style={{ gridTemplateColumns: `repeat(${binsPerTier}, minmax(0, 1fr))` }}
                >
                  {Array.from({ length: binsPerTier }).map((_, binIdx) => (
                    <div
                      key={binIdx}
                      className="rounded border border-emerald-500 bg-emerald-50 p-1.5 text-center text-[10px] font-mono font-bold text-emerald-950 flex items-center justify-center gap-1 shadow-2xs"
                    >
                      <CheckCircle2 className="size-2.5 text-emerald-600" />
                      <span>AVAILABLE</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
        <Button type="button" variant="secondary" onClick={onClose} size="sm" disabled={submitting}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={submitting}
          className="bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-1.5 font-bold"
        >
          {submitting ? (
            <>
              <RefreshCw className="size-3.5 animate-spin" />
              <span>Creating...</span>
            </>
          ) : (
            <>
              <Plus className="size-3.5" />
              <span>Create Rack &amp; Bins</span>
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
