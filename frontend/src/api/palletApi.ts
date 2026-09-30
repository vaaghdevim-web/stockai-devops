import { apiClient } from './client'
import type {
  CreatePalletRequest,
  PalletResponse,
} from '../types'

const BASE_URL = '/api/v1/pallets'

export async function createPallet(
  request: CreatePalletRequest
): Promise<PalletResponse> {
  const response = await apiClient.post<PalletResponse>(BASE_URL, request)
  return response.data
}

export async function getPalletByIdentifier(
  identifier: string
): Promise<PalletResponse> {
  const response = await apiClient.get<PalletResponse>(
    `${BASE_URL}/${encodeURIComponent(identifier.trim())}`
  )
  return response.data
}

