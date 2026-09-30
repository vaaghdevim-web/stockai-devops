export type QualityStatus = 'Available' | 'Hold' | 'Quarantine' | 'Rejected' | 'Expired'

export interface RawMaterialResponse {
  materialId: number
  materialName: string
  materialCode: string
  categoryId?: number | null
  categoryName?: string | null
  defaultUomId?: number | null
  defaultUomCode?: string | null
  standardCost: number
  reorderLevel: number
  safetyStock: number
  leadTimeDays: number
  active: boolean
}

export interface RawMaterialReceiptRequest {
  materialId: number
  supplierId?: number | null
  binId: number
  batchNo: string
  lotNumber?: string | null
  expiryDate?: string | null
  quantityKg: number
  unitCost: number
  receivedAt?: string | null
  qualityStatus?: QualityStatus | string | null
}

export interface RawMaterialReceiptResponse {
  batchId: number
  inventoryId: number
  transactionId: number
  batchNo: string
  quantityKg: number
  receivedAt: string
  qualityStatus: QualityStatus | string
}

export interface MaterialBatchResponse {
  batchId: number
  batchNo: string
  lotNumber?: string | null
  availableWeightKg: number
  receivedAt?: string | null
}

