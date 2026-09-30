import { apiClient } from './client'
import type {
  CompleteProductionStageRequest,
  ProductionRunResponse,
  ProductionStageResponse,
} from '../types'

const RUNS_BASE_URL = '/api/v1/production-runs'

function stagesUrl(productionId: number, stageId?: number) {
  if (stageId != null) {
    return `${RUNS_BASE_URL}/${productionId}/stages/${stageId}`
  }
  return `${RUNS_BASE_URL}/${productionId}/stages`
}

export async function getProductionRuns(params?: {
  plantId?: number
  status?: string
}): Promise<ProductionRunResponse[]> {
  const response = await apiClient.get<ProductionRunResponse[]>(RUNS_BASE_URL, { params })
  return Array.isArray(response.data) ? response.data : []
}

export async function getProductionStages(productionId: number): Promise<ProductionStageResponse[]> {
  const response = await apiClient.get<ProductionStageResponse[]>(stagesUrl(productionId))
  return Array.isArray(response.data) ? response.data : []
}

export async function getProductionStage(
  productionId: number,
  stageId: number,
): Promise<ProductionStageResponse> {
  const response = await apiClient.get<ProductionStageResponse>(stagesUrl(productionId, stageId))
  return response.data
}

export async function startProductionStage(
  productionId: number,
  stageId: number,
): Promise<ProductionStageResponse> {
  const response = await apiClient.post<ProductionStageResponse>(`${stagesUrl(productionId, stageId)}/start`)
  return response.data
}

export async function completeProductionStage(
  productionId: number,
  stageId: number,
  request: CompleteProductionStageRequest,
): Promise<ProductionStageResponse> {
  const response = await apiClient.post<ProductionStageResponse>(`${stagesUrl(productionId, stageId)}/complete`, request)
  return response.data
}

export async function getProductionRunById(productionId: number): Promise<ProductionRunResponse> {
  const response = await apiClient.get<ProductionRunResponse>(`${RUNS_BASE_URL}/${productionId}`)
  return response.data
}

// Compatibility name used by existing production and stage views.
export const getProductionRun = getProductionRunById
