import { apiClient } from './client'
import type {
  StockTransferRequest,
  StockTransferResponse,
} from '../types'

const BASE_URL = '/api/v1/transfers'

export async function createTransfer(
  request: StockTransferRequest
): Promise<StockTransferResponse> {
  const response = await apiClient.post<StockTransferResponse>(BASE_URL, request)
  return response.data
}

export async function completeTransfer(
  transferId: number
): Promise<StockTransferResponse> {
  const response = await apiClient.patch<StockTransferResponse>(
    `${BASE_URL}/${transferId}/complete`
  )
  return response.data
}

export async function getTransferById(
  transferId: number
): Promise<StockTransferResponse> {
  const response = await apiClient.get<StockTransferResponse>(
    `${BASE_URL}/${transferId}`
  )
  return response.data
}

export async function listTransfers(
  status?: string
): Promise<StockTransferResponse[]> {
  const response = await apiClient.get<StockTransferResponse[]>(BASE_URL, {
    params: status ? { status } : {},
  })
  return Array.isArray(response.data) ? response.data : []
}

