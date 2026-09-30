import { apiClient } from './client'
import type {
  PurchaseRecommendationResponse,
  ReorderCheckSummaryResponse,
} from '../types'

const BASE_URL = '/api/v1/procurement'

export async function triggerReorderCheck(): Promise<ReorderCheckSummaryResponse> {
  const response = await apiClient.post<ReorderCheckSummaryResponse>(
    `${BASE_URL}/reorder-check`
  )
  return response.data
}

export async function getRecommendations(
  status?: string,
  priority?: string
): Promise<PurchaseRecommendationResponse[]> {
  const response = await apiClient.get<PurchaseRecommendationResponse[]>(
    `${BASE_URL}/recommendations`,
    {
      params: {
        ...(status ? { status } : {}),
        ...(priority ? { priority } : {}),
      },
    }
  )
  return response.data
}

export async function approveRecommendation(
  id: number
): Promise<PurchaseRecommendationResponse> {
  const response = await apiClient.patch<PurchaseRecommendationResponse>(
    `${BASE_URL}/recommendations/${id}/approve`
  )
  return response.data
}

