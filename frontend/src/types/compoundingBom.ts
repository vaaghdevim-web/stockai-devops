export interface CompoundingBomItemRequest { materialId: number; percentage: number; isRequired?: boolean }
export interface CompoundingBomRequest {
  bomCode: string; version: string; effectiveFrom?: string | null; effectiveTo?: string | null
  targetBatchWeightKg: number; items: CompoundingBomItemRequest[]
}
export interface CompoundingBomItemResponse {
  compoundingBomItemId: number; materialId: number; materialCode: string; materialName: string
  categoryName: string | null; percentage: number; targetQuantityKg: number; isRequired: boolean
}
export interface CompoundingBomResponse {
  compoundingBomId: number; bomCode: string; version: string; effectiveFrom: string | null; effectiveTo: string | null
  targetBatchWeightKg: number; status: string; createdByUserName: string | null; createdAt: string; updatedAt: string
  items: CompoundingBomItemResponse[]
}
export interface CalculatedItemRequirement {
  materialId: number; materialCode: string; materialName: string; categoryName: string | null
  percentage: number; requiredQuantityKg: number; isRequired: boolean
}
export interface BatchRequirementCalculationResponse {
  compoundingBomId: number; bomCode: string; version: string; desiredBatchWeightKg: number
  calculatedRequirements: CalculatedItemRequirement[]
}
