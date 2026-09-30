export type StockTransferStatus = 'Draft' | 'Completed' | 'Cancelled'

export interface StockTransferItemRequest {
  materialBatchId?: number | null
  finishedBatchId?: number | null
  fromBinId: number
  toBinId: number
  quantity: number
  uomId?: number | null
  uomCode?: string | null
}

export interface StockTransferRequest {
  fromWarehouseId: number
  toWarehouseId: number
  transferDate?: string | null
  autoComplete?: boolean | null
  items: StockTransferItemRequest[]
}

export interface StockTransferItemResponse {
  stiId: number
  materialBatchId?: number | null
  materialBatchNo?: string | null
  finishedBatchId?: number | null
  finishedBatchNo?: string | null
  fromBinId?: number | null
  fromBinCode?: string | null
  toBinId?: number | null
  toBinCode?: string | null
  quantity: number
  uomId?: number | null
  uomCode?: string | null
}

export interface StockTransferResponse {
  transferId: number
  transferNumber: string
  fromWarehouseId: number
  fromWarehouseName?: string | null
  toWarehouseId: number
  toWarehouseName?: string | null
  transferDate: string
  status: StockTransferStatus | string
  createdByUserName?: string | null
  createdAt?: string | null
  items: StockTransferItemResponse[]
}

