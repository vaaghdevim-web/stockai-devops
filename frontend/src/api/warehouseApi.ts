import { apiClient } from './client'
import type {
  BinOccupancyResponse,
  CreateBinRequest,
  CreateRackRequest,
  CreateShelfRequest,
  CreateWarehouseRequest,
  LocationBinResponse,
  LocationRackResponse,
  LocationShelfResponse,
  WarehouseResponse,
  WarehouseStorageHierarchyResponse,
} from '../types/warehouseMap'

const BASE_URL = '/api/v1/warehouses'

/**
 * Fetch all warehouses, optionally filtered by plantId or type ('Raw' | 'FG' | 'Both').
 */
export async function getWarehouses(params?: {
  plantId?: number
  type?: string
}): Promise<WarehouseResponse[]> {
  const response = await apiClient.get<WarehouseResponse[]>(BASE_URL, {
    params,
  })
  return response.data
}

/**
 * Fetch single warehouse metadata by ID.
 */
export async function getWarehouseById(id: number): Promise<WarehouseResponse> {
  const response = await apiClient.get<WarehouseResponse>(`${BASE_URL}/${id}`)
  return response.data
}

/**
 * Fetch full 5-tier storage hierarchy tree for a warehouse from the backend.
 * (Warehouses -> Racks -> Shelves -> Bins with capacity, currentStockKg, utilization)
 */
export async function getWarehouseStorageHierarchy(
  warehouseId: number
): Promise<WarehouseStorageHierarchyResponse> {
  const response = await apiClient.get<WarehouseStorageHierarchyResponse>(
    `${BASE_URL}/${warehouseId}/storage-tree`
  )
  return response.data
}

/**
 * Fetch live occupancy metrics and pallet details for a specific bin.
 */
export async function getBinOccupancy(binId: number): Promise<BinOccupancyResponse> {
  const response = await apiClient.get<BinOccupancyResponse>(
    `${BASE_URL}/bins/${binId}/occupancy`
  )
  return response.data
}

/**
 * Fetch all flat bin entities belonging to a warehouse.
 */
export async function getBinsByWarehouseId(warehouseId: number): Promise<LocationBinResponse[]> {
  const response = await apiClient.get<LocationBinResponse[]>(
    `${BASE_URL}/${warehouseId}/bins`
  )
  return response.data
}

/**
 * Create a new warehouse.
 */
export async function createWarehouse(
  request: CreateWarehouseRequest
): Promise<WarehouseResponse> {
  const response = await apiClient.post<WarehouseResponse>(BASE_URL, request)
  return response.data
}

/**
 * Create a new rack with shelves and bins inside a warehouse.
 */
export async function createWarehouseRack(
  warehouseId: number,
  request: CreateRackRequest
): Promise<LocationRackResponse> {
  const response = await apiClient.post<LocationRackResponse>(
    `${BASE_URL}/${warehouseId}/racks`,
    request
  )
  return response.data
}

/**
 * Add a new shelf level to a rack.
 */
export async function createWarehouseShelf(
  rackId: number,
  request: CreateShelfRequest
): Promise<LocationShelfResponse> {
  const response = await apiClient.post<LocationShelfResponse>(
    `${BASE_URL}/racks/${rackId}/shelves`,
    request
  )
  return response.data
}

/**
 * Add a new bin to a shelf.
 */
export async function createWarehouseBin(
  shelfId: number,
  request: CreateBinRequest
): Promise<LocationBinResponse> {
  const response = await apiClient.post<LocationBinResponse>(
    `${BASE_URL}/shelves/${shelfId}/bins`,
    request
  )
  return response.data
}

/**
 * Delete a rack from the warehouse.
 */
export async function deleteWarehouseRack(rackId: number): Promise<{ message: string }> {
  const response = await apiClient.delete<{ message: string }>(
    `${BASE_URL}/racks/${rackId}`
  )
  return response.data
}

/**
 * Delete a shelf from a rack.
 */
export async function deleteWarehouseShelf(shelfId: number): Promise<{ message: string }> {
  const response = await apiClient.delete<{ message: string }>(
    `${BASE_URL}/shelves/${shelfId}`
  )
  return response.data
}

/**
 * Delete a bin from a shelf.
 */
export async function deleteWarehouseBin(binId: number): Promise<{ message: string }> {
  const response = await apiClient.delete<{ message: string }>(
    `${BASE_URL}/bins/${binId}`
  )
  return response.data
}
