export type RecommendationPriority = 'Low' | 'Medium' | 'High' | 'Critical'

export type RecommendationStatus = 'New' | 'InReview' | 'Approved' | 'Converted' | 'Rejected'

export interface PurchaseRecommendationResponse {
  recommendationId: number
  materialId: number
  materialCode: string
  materialName: string
  plantId?: number | null
  plantName?: string | null
  recommendedDate: string
  recommendedQty: number
  estimatedCost: number
  safetyStock: number
  currentStock: number
  leadTimeDays: number
  priority: RecommendationPriority | string
  reason?: string | null
  status: RecommendationStatus | string
  approvedByUserName?: string | null
  approvedAt?: string | null
}

export interface ReorderCheckSummaryResponse {
  totalMaterialsEvaluated: number
  lowStockCount: number
  criticalStockCount: number
  newRecommendationsCreated: number
  scanTimestamp: string
  generatedRecommendations: PurchaseRecommendationResponse[]
}

export interface SupplierResponse {
  supplierId: number
  supplierName: string
  gstNo?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  isActive?: boolean
}

