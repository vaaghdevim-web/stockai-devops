import { apiClient } from './client'
import type { DriverResponse } from '../types/dispatch'

const BASE_URL = '/api/v1/drivers'

/**
 * Fetch all registered drivers.
 */
export async function getDrivers(): Promise<DriverResponse[]> {
  const response = await apiClient.get<DriverResponse[]>(BASE_URL)
  return Array.isArray(response.data) ? response.data : []
}

/**
 * Fetch a single driver by ID.
 */
export async function getDriverById(id: number): Promise<DriverResponse> {
  const response = await apiClient.get<DriverResponse>(`${BASE_URL}/${id}`)
  return response.data
}
