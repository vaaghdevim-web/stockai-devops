import { apiClient } from './client'
import type { SupplierResponse } from '../types/procurement'

const BASE_URL = '/api/v1/suppliers'

/**
 * Fetch all suppliers, optionally filtering by active status.
 */
export async function getSuppliers(activeOnly = true): Promise<SupplierResponse[]> {
  const response = await apiClient.get<SupplierResponse[]>(BASE_URL, {
    params: { activeOnly },
  })
  return response.data
}

/**
 * Fetch a single supplier by ID.
 */
export async function getSupplierById(id: number): Promise<SupplierResponse> {
  const response = await apiClient.get<SupplierResponse>(`${BASE_URL}/${id}`)
  return response.data
}
