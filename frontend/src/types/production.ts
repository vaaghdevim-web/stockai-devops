export type ProductionStageStatus = 'Pending' | 'Ready' | 'Running' | 'Completed' | 'Blocked' | 'Failed' | 'Cancelled' | string

export interface ProductionRunResponse {
  productionId: number
  plantId: number | null
  plantName: string | null
  bomId: number | null
  productionNumber: string
  startDatetime: string | null
  endDatetime: string | null
  status: string
  plannedQty: number | null
  actualQty: number | null
  inputWeightKg: number | null
  outputWeightKg: number | null
  scrapWeightKg: number | null
  yieldPercentage: number | null
  bagsProduced: number | null
  bagsPerKg: number | null
  createdAt: string | null
  updatedAt: string | null
}

export interface CompleteProductionStageRequest {
  inputWeightKg: number
  outputWeightKg: number
  scrapWeightKg: number
}

export interface ProductionStageResponse {
  stageId: number
  productionId: number
  sequenceNo: number
  stageName?: string | null
  status: ProductionStageStatus
  unitId?: number | null
  unitCode?: string | null
  unitName?: string | null
  machineId?: number | null
  machineCode?: string | null
  machineName?: string | null
  inputWeightKg: number | null
  outputWeightKg: number | null
  scrapWeightKg: number | null
  startedAt: string | null
  completedAt: string | null
}
