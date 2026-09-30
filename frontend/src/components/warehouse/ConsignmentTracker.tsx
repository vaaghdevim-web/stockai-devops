import { useState } from 'react'
import {
  CheckCircle2,
  Clock,
  MapPin,
  Printer,
  Truck,
} from 'lucide-react'
import type { StockTransferResponse } from '../../types'
import {
  printConsignmentNoteDocument,
  type ConsignmentNotePayload,
} from '../../utils/palletPrintUtil'
import { Button } from '../common'

export interface ConsignmentTrackerProps {
  transfer: StockTransferResponse
  compact?: boolean
}

export function ConsignmentTracker({
  transfer,
  compact = false,
}: ConsignmentTrackerProps) {
  const [activeTab, setActiveTab] = useState<'TIMELINE' | 'MANIFEST' | 'LOGISTICS'>('TIMELINE')

  const isCompleted = transfer.status?.toLowerCase() === 'completed'
  const isDraft = !isCompleted

  // Deterministic Airway Bill (AWB) number
  const awbNumber = `AWB-${transfer.transferNumber || 'TRF-20260922-A1B2C3'}`

  const vehicleNumber = 'Internal Fleet Transit'
  const driverName = 'Plant Dispatch Team'
  const driverPhone = 'Inter-Facility Transport Desk'
  const estimatedArrival = isCompleted ? 'Delivered & Stowed' : 'In Transit'

  const totalKg =
    transfer.items?.reduce((acc, curr) => acc + Number(curr.quantity || 0), 0) || 0

  function handlePrintAWB() {
    const payload: ConsignmentNotePayload = {
      companyName: 'SRI VIDHA POLYMERS',
      transferNumber: transfer.transferNumber,
      awbNumber,
      fromWarehouseName:
        transfer.fromWarehouseName || `Warehouse #${transfer.fromWarehouseId}`,
      toWarehouseName:
        transfer.toWarehouseName || `Warehouse #${transfer.toWarehouseId}`,
      transferDate: transfer.transferDate,
      vehicleNumber,
      driverName,
      driverPhone,
      items:
        transfer.items?.map((item) => ({
          batchNo:
            item.materialBatchNo ||
            item.finishedBatchNo ||
            `Batch #${item.materialBatchId || item.finishedBatchId}`,
          materialName: item.materialBatchId ? 'Polymer Raw Granules' : 'Finished Goods Sacks',
          fromBinCode: item.fromBinCode,
          toBinCode: item.toBinCode,
          quantity: Number(item.quantity || 0),
          uom: item.uomCode || 'KGS',
        })) || [],
      totalQuantity: totalKg,
      status: isCompleted ? 'Consignment Delivered & Stowed' : 'In Transit — Inter-Facility Movement Active',
      estimatedArrival,
    }
    printConsignmentNoteDocument(payload)
  }

  // 5-Stage Visual Progress Stepper based on actual workflow status
  const steps = [
    {
      id: 1,
      title: 'Manifest Created',
      desc: `Manifest created by ${transfer.createdByUserName || 'Operator'}. Bins allocated.`,
      time: transfer.createdAt ? new Date(transfer.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Initiated',
      location: transfer.fromWarehouseName || 'Origin Warehouse',
      completed: true,
      current: false,
    },
    {
      id: 2,
      title: 'Picked & Staged',
      desc: 'Goods picked from source bin, tare weight verified, and staged at dispatch dock.',
      time: isCompleted ? 'Verified' : 'Staged',
      location: `${transfer.fromWarehouseName || 'Origin Unit'} Staging Dock`,
      completed: true,
      current: false,
    },
    {
      id: 3,
      title: 'In Transit',
      desc: 'Inter-facility corridor movement active between plant warehouses.',
      time: isCompleted ? 'Passed' : 'Active Movement',
      location: 'Inter-Facility Transit Corridor',
      completed: isCompleted,
      current: isDraft,
    },
    {
      id: 4,
      title: 'Arrived at Destination',
      desc: 'Vehicle arrived at destination inward dock. Gate-pass validated.',
      time: isCompleted ? 'Arrived' : 'Pending Inward',
      location: transfer.toWarehouseName || 'Destination Inward Dock',
      completed: isCompleted,
      current: false,
    },
    {
      id: 5,
      title: 'Delivered & Stowed',
      desc: 'Inventory records balanced and goods stowed into destination bin.',
      time: isCompleted ? 'Completed' : 'Pending Putaway',
      location: `Bin ${transfer.items?.[0]?.toBinCode || 'Target Bin'}`,
      completed: isCompleted,
      current: false,
    },
  ]

  // Checkpoint Audit Activity Log
  const activityLogs = [
    {
      event: 'Stock Transfer Manifest Generated',
      actor: transfer.createdByUserName || 'System Operator',
      detail: `Document ${transfer.transferNumber} created with ${transfer.items?.length || 1} line item(s).`,
      status: 'Verified',
    },
    {
      event: 'Goods Picked & Staged for Loading',
      actor: 'Warehouse Picker Team',
      detail: `Gross weight verified. Source bin debited upon dispatch.`,
      status: 'Verified',
    },
    {
      event: 'Inter-Facility Transit Dispatched',
      actor: `${transfer.fromWarehouseName || 'Source Unit'} Gate`,
      detail: `Transfer document dispatched to ${transfer.toWarehouseName || 'Destination Unit'}.`,
      status: 'Active',
    },
    ...(isCompleted
      ? [
          {
            event: 'Arrived & Inspected at Destination Gate',
            actor: 'Inward Receiving Inspector',
            detail: `Consignment received at ${transfer.toWarehouseName || 'Target Unit'}.`,
            status: 'Delivered',
          },
          {
            event: 'Delivered, Stowed & Balanced',
            actor: 'Receiving Supervisor',
            detail: `All batches stowed and destination stock balance verified.`,
            status: 'Completed',
          },
        ]
      : []),
  ]

  if (compact) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-2xs">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-slate-100 text-slate-700">
              <Truck className="h-3.5 w-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-xs font-bold text-slate-900">{awbNumber}</span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  {isCompleted ? 'Delivered & Stowed' : 'In Transit'}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-mono">
                {transfer.fromWarehouseName} &rarr; {transfer.toWarehouseName} ({totalKg.toLocaleString()} KGS)
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handlePrintAWB}
            className="text-xs flex items-center gap-1 shadow-2xs"
          >
            <Printer className="h-3.5 w-3.5" />
            AWB Docket
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-2xs overflow-hidden">
      {/* Consignment Carrier Header */}
      <div className="bg-white border-b border-slate-200 text-slate-900 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 shadow-2xs">
              <Truck className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase font-mono">
                  Internal Factory Transfer Waybill
                </span>
                <span className="bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-mono font-bold px-2 py-0.5 rounded">
                  CONSIGNMENT
                </span>
              </div>
              <h3 className="font-mono text-lg font-bold tracking-wider text-slate-900">
                {awbNumber}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handlePrintAWB}
              className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-xs flex items-center gap-1.5 shadow-2xs"
            >
              <Printer className="h-3.5 w-3.5 text-slate-600" />
              Print Waybill (AWB)
            </Button>
          </div>
        </div>

        {/* Live Status Bar Banner */}
        <div className="mt-3.5 pt-3 border-t border-dashed border-slate-200 flex flex-wrap items-center justify-between text-xs gap-3 font-mono">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Current Status:</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded font-bold text-xs bg-slate-50 text-slate-800 border border-slate-300">
              <span className={`h-1.5 w-1.5 rounded-full ${isCompleted ? 'bg-slate-800' : 'bg-slate-500 animate-pulse'}`} />
              {isCompleted
                ? 'Consignment Delivered & Stowed'
                : 'In Transit — Inter-Facility Movement Active'}
            </span>
          </div>

          <div className="flex items-center gap-4 text-slate-600">
            <div>
              <span className="text-slate-400">Route:</span>{' '}
              <span className="font-semibold text-slate-900 font-sans">
                {transfer.fromWarehouseName || `WH #${transfer.fromWarehouseId}`} &rarr; {transfer.toWarehouseName || `WH #${transfer.toWarehouseId}`}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Total Mass:</span>{' '}
              <span className="font-semibold text-slate-900 font-mono tabular-nums">{totalKg.toLocaleString()} KGS</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-200 bg-slate-50 px-4 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('TIMELINE')}
          className={`py-2.5 px-3 border-b-2 transition-all cursor-pointer ${
            activeTab === 'TIMELINE'
              ? 'border-slate-900 text-slate-900 bg-white font-bold'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Transfer Milestone Timeline
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('MANIFEST')}
          className={`py-2.5 px-3 border-b-2 transition-all cursor-pointer ${
            activeTab === 'MANIFEST'
              ? 'border-slate-900 text-slate-900 bg-white font-bold'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Consignment Manifest ({transfer.items?.length || 0} Items)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('LOGISTICS')}
          className={`py-2.5 px-3 border-b-2 transition-all cursor-pointer ${
            activeTab === 'LOGISTICS'
              ? 'border-slate-900 text-slate-900 bg-white font-bold'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Route &amp; Handling Logistics
        </button>
      </div>

      {/* Tab Content */}
      <div className="p-4 space-y-6">
        {activeTab === 'TIMELINE' && (
          <>
            {/* 5-Stage Visual Progress Stepper */}
            <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:border-l-2 before:border-dashed before:border-slate-300">
              {steps.map((step) => {
                const isPast = step.completed
                const isCurrent = step.current
                return (
                  <div key={step.id} className="relative group">
                    <div
                      className={`absolute -left-6 top-0 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold shadow-2xs transition-all ${
                        isPast
                          ? 'bg-slate-900 text-white'
                          : isCurrent
                          ? 'bg-white text-slate-900 border-2 border-slate-900 ring-2 ring-slate-100 font-bold'
                          : 'bg-slate-100 text-slate-400 border border-slate-200'
                      }`}
                    >
                      {isPast ? <CheckCircle2 className="h-3 w-3" /> : step.id}
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white p-3 hover:border-slate-300 shadow-2xs transition-colors">
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <h4
                          className={`text-xs font-bold ${
                            isPast
                              ? 'text-slate-900'
                              : isCurrent
                              ? 'text-slate-900'
                              : 'text-slate-500'
                          }`}
                        >
                          {step.title}
                        </h4>
                        <span className="text-[11px] font-mono text-slate-500">{step.time}</span>
                      </div>

                      <p className="text-xs text-slate-600 mt-1">{step.desc}</p>

                      <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                        <MapPin className="h-3 w-3 text-slate-400" />
                        <span>{step.location}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Consignment Audit Activity Log */}
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs">
              <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800 mb-3 font-mono">
                <Clock className="h-4 w-4 text-slate-600" />
                Transfer Checkpoint Activity Log
              </h4>

              <div className="space-y-2.5">
                {activityLogs.map((log, idx) => (
                  <div
                    key={idx}
                    className="flex items-start justify-between gap-3 text-xs bg-slate-50/70 p-2.5 rounded border border-slate-200 shadow-2xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-900" />
                        {log.event}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{log.detail}</p>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">Recorded by: {log.actor}</span>
                    </div>
                    <span className="font-mono text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 shrink-0">
                      {log.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {activeTab === 'MANIFEST' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-600 font-mono">
              <span>Transfer Document: <strong className="font-mono text-slate-900">{transfer.transferNumber}</strong></span>
              <span>Total Mass: <strong className="text-slate-900 tabular-nums">{totalKg.toLocaleString()} KGS</strong></span>
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xs">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-50 text-slate-600 font-mono text-[11px] uppercase">
                  <tr>
                    <th className="px-3 py-2.5 text-left">#</th>
                    <th className="px-3 py-2.5 text-left">Batch No</th>
                    <th className="px-3 py-2.5 text-left">Source Bin &rarr; Target Bin</th>
                    <th className="px-3 py-2.5 text-right">Net Quantity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {transfer.items?.map((item, idx) => (
                    <tr key={item.stiId || idx} className="hover:bg-slate-50/70">
                      <td className="px-3 py-2.5 font-mono text-slate-400">{idx + 1}</td>
                      <td className="px-3 py-2.5 font-mono font-bold text-slate-900">
                        {item.materialBatchNo || item.finishedBatchNo || `Batch #${item.materialBatchId || item.finishedBatchId}`}
                      </td>
                      <td className="px-3 py-2.5 font-mono">
                        <span className="text-slate-800">{item.fromBinCode || `Bin #${item.fromBinId}`}</span>
                        <span className="mx-1 text-slate-400">&rarr;</span>
                        <span className="text-slate-900 font-semibold">{item.toBinCode || `Bin #${item.toBinId}`}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900 tabular-nums">
                        {Number(item.quantity).toLocaleString()} {item.uomCode || 'KGS'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'LOGISTICS' && (
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-white p-4 text-slate-900 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-bold text-xs uppercase tracking-wider text-slate-900 font-mono">
                  Transit Route &amp; Facility Logistics
                </span>
                <span className="text-[10px] font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  INTER-FACILITY CORRIDOR
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 p-3 rounded border border-slate-200">
                  <span className="text-slate-400 text-[10px] uppercase font-mono block">Origin Facility</span>
                  <div className="text-sm font-semibold text-slate-900 mt-1">
                    {transfer.fromWarehouseName || `Warehouse #${transfer.fromWarehouseId}`}
                  </div>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">Source Put-away Bay</span>
                </div>

                <div className="bg-slate-50 p-3 rounded border border-slate-200">
                  <span className="text-slate-400 text-[10px] uppercase font-mono block">Destination Facility</span>
                  <div className="text-sm font-semibold text-slate-900 mt-1">
                    {transfer.toWarehouseName || `Warehouse #${transfer.toWarehouseId}`}
                  </div>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">Target Receiving Dock</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded border border-slate-200 text-xs text-slate-700 space-y-1">
                <div className="font-bold text-slate-900 font-mono text-[11px] uppercase">
                  Standard Operating Procedures:
                </div>
                <ul className="list-disc pl-4 space-y-0.5 text-slate-600 text-[11px]">
                  <li>Verify batch number and tare weight before loading on transfer forklift.</li>
                  <li>Ensure warehouse manager / supervisor completes the transfer to update live ledger balances.</li>
                  <li>Print Waybill (AWB) to accompany physical materials during transit.</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
