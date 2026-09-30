export type PalletStatus = 'Open' | 'Stored' | 'Allocated' | 'Dispatched' | 'Closed' | 'Cancelled'

export interface CreatePalletRequest {
  finishedBatchId: number
  warehouseId: number
  binId?: number | null
  quantity: number
}

export interface PalletResponse {
  palletId: number
  palletCode: string
  barcode: string
  status: PalletStatus | string
  warehouseId: number
  binId?: number | null
  finishedBatchId?: number | null
  quantity?: number | null
}

