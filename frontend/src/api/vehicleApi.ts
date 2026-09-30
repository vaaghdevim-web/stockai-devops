import { apiClient } from './client'
import type { VehicleResponse } from '../types/dispatch'

const BASE_URL = '/api/v1/vehicles'

/**
 * Fetch all vehicles from the fleet catalog.
 */
export async function getVehicles(): Promise<VehicleResponse[]> {
  const response = await apiClient.get<VehicleResponse[]>(BASE_URL)
  return Array.isArray(response.data) ? response.data : []
}

/**
 * Fetch a single vehicle by its ID.
 */
export async function getVehicleById(id: number): Promise<VehicleResponse> {
  const response = await apiClient.get<VehicleResponse>(`${BASE_URL}/${id}`)
  return response.data
}
