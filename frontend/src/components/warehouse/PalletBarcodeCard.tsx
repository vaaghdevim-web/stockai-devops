import { useMemo } from 'react'
import { Boxes, Layers, Scissors, Warehouse } from 'lucide-react'
import type { PalletResponse } from '../../types'
import { getCode128BarcodeData } from '../../utils/palletPrintUtil'
import { MASTER_BINS } from './warehouseConstants'

export interface PalletBarcodeCardProps {
  pallet: PalletResponse | {
    palletId: number | string
    palletCode: string
    barcode: string
    quantity?: number | string | null
    warehouseId?: number
    binId?: number | null
    status?: string
  }
  companyName?: string
  unitNumber?: string
  binCode?: string
  warehouseName?: string
  batchNo?: string
  productName?: string
  productCode?: string
  storageCoordinates?: string
  qaStatus?: string
  showAdditionalInfo?: boolean
}

export function PalletBarcodeCard({
  pallet,
  companyName = 'Sri Vidha Polymers',
  unitNumber,
  binCode,
  warehouseName,
  batchNo = 'FB-2026-BAG-01',
  productName = '50KG PP Fertilizer Bag',
  productCode = 'FP-BAG-50KG-01',
  storageCoordinates = 'Rack 03 / Shelf 01 (Bay B-02)',
  qaStatus = 'QA Passed / Available Stock',
  showAdditionalInfo = true,
}: PalletBarcodeCardProps) {
  const resolvedUnit =
    unitNumber || (pallet.warehouseId === 1 ? 'Unit 1' : 'Unit 3')

  const resolvedBin =
    binCode ||
    MASTER_BINS.find((b) => b.id === pallet.binId)?.code ||
    (pallet.binId === 3
      ? 'BIN-U3-01'
      : pallet.binId
      ? `BIN #${pallet.binId}`
      : 'Unassigned Staging')

  const resolvedWarehouse =
    warehouseName ||
    (pallet.warehouseId === 3
      ? 'Unit 3 Finished Goods Warehouse'
      : pallet.warehouseId === 1
      ? 'Unit 1 Raw Material Warehouse'
      : `Warehouse #${pallet.warehouseId || 3}`)

  const resolvedQty = pallet.quantity == null
    ? 'Not recorded'
    : Number(pallet.quantity).toLocaleString()

  const palletIdDisplay = String(pallet.palletId).startsWith('#')
    ? pallet.palletId
    : `#${pallet.palletId}`

  const barcodeData = useMemo(
    () => getCode128BarcodeData(pallet.barcode, 54),
    [pallet.barcode]
  )

  return (
    <div className="space-y-0">
      {/* ==================================================================== */}
      {/* 1. PHYSICAL GOODS LABEL (AFFIXED TO PHYSICAL GOODS - STRICT & CONCISE) */}
      {/* ==================================================================== */}
      <div className="rounded-xl border-2 border-slate-900 bg-white p-5 shadow-sm">
        {/* Header: Company Name, Unit Number */}
        <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3">
          <div className="flex items-center gap-2">
            <Boxes className="size-5 text-slate-900" aria-hidden="true" />
            <span className="text-sm font-black uppercase tracking-wider text-slate-900">
              {companyName}
            </span>
          </div>
          <span className="rounded bg-slate-900 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-white">
            {resolvedUnit}
          </span>
        </div>

        {/* Barcode with ID Number (Rendered with genuine Code-128 vector SVG rects) */}
        <div className="my-4 flex flex-col items-center justify-center rounded-lg border border-slate-300 bg-white p-3 shadow-xs">
          <div className="flex w-full max-w-xs items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox={`0 0 ${barcodeData.viewBoxWidth} ${barcodeData.viewBoxHeight}`}
              className="h-14 w-full"
              style={{ display: 'block' }}
            >
              <rect
                x="0"
                y="0"
                width={barcodeData.viewBoxWidth}
                height={barcodeData.viewBoxHeight}
                fill="#ffffff"
              />
              {barcodeData.rects.map((r, idx) => (
                <rect
                  key={idx}
                  x={r.x}
                  y="2"
                  width={r.width}
                  height={barcodeData.viewBoxHeight - 4}
                  fill="#000000"
                />
              ))}
            </svg>
          </div>
          <p className="mt-2 font-mono text-sm font-bold tracking-widest text-slate-900">
            {pallet.barcode}
          </p>
        </div>

        {/* Concise 4-Field Specification Grid */}
        <div className="grid grid-cols-2 gap-3 border-t-2 border-slate-900 pt-3 text-xs">
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Pallet Identifier
            </span>
            <p className="font-mono font-bold text-slate-900">
              {pallet.palletCode}
            </p>
          </div>
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              System Record ID
            </span>
            <p className="font-mono font-bold text-slate-900">
              {palletIdDisplay}
            </p>
          </div>
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Stowed Units
            </span>
            <p className="font-mono font-bold text-slate-900">
              {resolvedQty} BAGS
            </p>
          </div>
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Storage Staging Bin
            </span>
            <p className="font-mono font-bold text-indigo-700">
              {resolvedBin}
            </p>
          </div>
        </div>
      </div>

      {showAdditionalInfo && (
        <>
          {/* ==================================================================== */}
          {/* 2. CUTTING SYMBOLS AND DOTTED LINE                                    */}
          {/* ==================================================================== */}
          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t-2 border-dashed border-slate-400" />
            </div>
            <div className="relative inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-600 shadow-xs">
              <Scissors className="size-3.5 text-slate-500" aria-hidden="true" />
              <span>Cut Along Dotted Line — Affix Upper Section to Physical Goods</span>
            </div>
          </div>

          {/* ==================================================================== */}
          {/* 3. ADDITIONAL INFORMATION (NOT PASTED ON PHYSICAL GOODS)              */}
          {/* ==================================================================== */}
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Additional Information (Office & Internal Reference)
              </span>
              <span className="text-[10px] font-medium text-slate-400">
                Not pasted on physical goods
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
              {/* Storage Location Coordinates */}
              <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
                <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-700 text-[11px]">
                  <Warehouse className="size-3.5 text-slate-500" aria-hidden="true" />
                  <span>Storage Location Coordinates</span>
                </div>
                <div className="space-y-1 text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Facility:</span>
                    <span className="font-medium text-slate-800">{resolvedWarehouse}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Staging Bin:</span>
                    <span className="font-mono font-bold text-indigo-700">{resolvedBin}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Coordinates:</span>
                    <span className="font-medium text-slate-800">{storageCoordinates}</span>
                  </div>
                </div>
              </div>

              {/* Production Batch Association */}
              <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
                <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-700 text-[11px]">
                  <Layers className="size-3.5 text-slate-500" aria-hidden="true" />
                  <span>Production Batch Association</span>
                </div>
                <div className="space-y-1 text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Finished Batch:</span>
                    <span className="font-mono font-bold text-slate-900">{batchNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Product Line:</span>
                    <span className="font-medium text-slate-800 truncate max-w-[140px]">{productName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Item Code:</span>
                    <span className="font-mono text-slate-700">{productCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">QA Status:</span>
                    <span className="font-semibold text-emerald-700">{qaStatus}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
