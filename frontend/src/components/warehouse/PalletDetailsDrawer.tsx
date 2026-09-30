import { useState } from 'react'
import { Boxes, Copy, Printer } from 'lucide-react'
import type { PalletResponse } from '../../types'
import { Button, Drawer } from '../common'
import { printPalletDocument } from '../../utils/palletPrintUtil'
import { PalletBarcodeCard } from './PalletBarcodeCard'
import { MASTER_BINS } from './warehouseConstants'

export interface PalletDetailsDrawerProps {
  pallet: PalletResponse | null
  isOpen: boolean
  onClose: () => void
}

export function PalletDetailsDrawer({
  pallet,
  isOpen,
  onClose,
}: PalletDetailsDrawerProps) {
  const [copied, setCopied] = useState(false)

  if (!isOpen || !pallet) return null

  function handleCopyBarcode() {
    if (pallet?.barcode) {
      navigator.clipboard.writeText(pallet.barcode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const warehouseName =
    pallet.warehouseId === 3
      ? 'Unit 3 Finished Goods Warehouse'
      : pallet.warehouseId === 1
      ? 'Unit 1 Raw Material Warehouse'
      : `Warehouse #${pallet.warehouseId}`

  const binCode =
    MASTER_BINS.find((b) => b.id === pallet.binId)?.code ||
    (pallet.binId === 3
      ? 'BIN-U3-01'
      : pallet.binId
      ? `BIN #${pallet.binId}`
      : 'Unassigned Staging')

  function handlePrint() {
    if (!pallet) return
    printPalletDocument({
      companyName: 'Sri Vidha Polymers',
      unitNumber: pallet.warehouseId === 1 ? 'Unit 1' : 'Unit 3',
      barcode: pallet.barcode,
      palletCode: pallet.palletCode,
      palletId: pallet.palletId,
      quantity: pallet.quantity,
      uom: 'BAGS',
      binCode: binCode,
      warehouseName: warehouseName,
      storageCoordinates: (pallet.binId === 5 || pallet.binId === 3) ? 'Rack 03 / Shelf 01 (Bay B-02)' : 'Staging Area Grid 1A',
      batchNo: 'FB-2026-BAG-01',
      productName: '50KG PP Fertilizer Bag',
      productCode: 'FP-BAG-50KG-01',
      qaStatus: 'Not recorded',
    })
  }

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={
        <div className="flex items-center gap-2">
          <Boxes className="size-5 text-indigo-600" aria-hidden="true" />
          <span className="font-bold">{pallet.palletCode}</span>
        </div>
      }
      description="Finished goods pallet specifications, warehouse location, and Code-128 barcode details."
      footer={
        <div className="flex items-center justify-between">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={handleCopyBarcode}>
              <Copy className="size-3.5" aria-hidden="true" />
              {copied ? 'Copied!' : 'Copy Barcode'}
            </Button>
            <Button variant="primary" onClick={handlePrint}>
              <Printer className="size-3.5" aria-hidden="true" />
              Print Pallet Tag
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <PalletBarcodeCard
          pallet={pallet}
          companyName="Sri Vidha Polymers"
          unitNumber={pallet.warehouseId === 1 ? 'Unit 1' : 'Unit 3'}
          binCode={binCode}
          warehouseName={warehouseName}
          batchNo="FB-2026-BAG-01"
          productName="50KG PP Fertilizer Bag"
          productCode="FP-BAG-50KG-01"
          storageCoordinates={pallet.binId === 3 ? 'Rack 03 / Shelf 01 (Bay B-02)' : 'Staging Area Grid 1A'}
          showAdditionalInfo={true}
        />
      </div>
    </Drawer>
  )
}
