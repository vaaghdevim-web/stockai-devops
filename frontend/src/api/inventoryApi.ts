import { apiClient } from './client'
import type {
  MaterialBatchResponse,
  RawMaterialReceiptRequest,
  RawMaterialReceiptResponse,
  RawMaterialResponse,
} from '../types'

const BASE_URL = '/api/v1/inventory/raw-materials'

export async function getRawMaterials(): Promise<RawMaterialResponse[]> {
  const response = await apiClient.get<RawMaterialResponse[]>(BASE_URL)
  return Array.isArray(response.data) ? response.data : []
}

export async function getRawMaterialById(materialId: number): Promise<RawMaterialResponse> {
  const response = await apiClient.get<RawMaterialResponse>(`${BASE_URL}/${materialId}`)
  return response.data
}

export async function getFifoBatches(materialId: number): Promise<MaterialBatchResponse[]> {
  const response = await apiClient.get<MaterialBatchResponse[]>(`${BASE_URL}/${materialId}/batches/fifo`)
  return Array.isArray(response.data) ? response.data : []
}

export async function getAvailableStock(materialId: number): Promise<number> {
  const response = await apiClient.get<number>(`${BASE_URL}/${materialId}/available-stock`)
  return typeof response.data === 'number' ? response.data : Number(response.data) || 0
}

export async function receiveRawMaterial(
  request: RawMaterialReceiptRequest
): Promise<RawMaterialReceiptResponse> {
  const response = await apiClient.post<RawMaterialReceiptResponse>(
    `${BASE_URL}/receipts`,
    request
  )
  return response.data
}
