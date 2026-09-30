import type { ProductionStageStatus } from './production'

export interface WipStageItem {
  productionId: number
  productionNumber: string
  plantName: string | null
  runStatus: string
  plannedQty: number | null
  actualQty: number | null
  stageId: number
  sequenceNo: number
  stageName: string
  status: ProductionStageStatus
  unitCode: string | null
  unitName: string | null
  machineCode: string | null
  machineName: string | null
  inputWeightKg: number
  outputWeightKg: number
  scrapWeightKg: number
  wipWeightKg: number | null
  startedAt: string | null
  completedAt: string | null
}

export interface WipSummaryMetrics {
  activeRunsCount: number
  totalRunsCount: number
  runningStagesCount: number
  readyStagesCount: number
  pendingStagesCount: number
  completedStagesCount: number
  totalWipWeightKg: number | null
  totalInputWeightKg: number
  totalOutputWeightKg: number
  totalScrapWeightKg: number
  activeMachinesCount: number
  involvedMachinesList: string[]
}

export interface WipProductionRunGroup {
  productionId: number
  productionNumber: string
  plantName: string | null
  runStatus: string
  plannedQty: number | null
  actualQty: number | null
  inputWeightKg: number | null
  outputWeightKg: number | null
  scrapWeightKg: number | null
  yieldPercentage: number | null
  currentStage: WipStageItem | null
  stages: WipStageItem[]
  runWipWeightKg: number | null
  stagesError?: boolean
}

export interface WipViewData {
  metrics: WipSummaryMetrics
  items: WipStageItem[]
  runGroups: WipProductionRunGroup[]
  availableUnits: string[]
  availableMachines: string[]
  availableRunNumbers: string[]
}
