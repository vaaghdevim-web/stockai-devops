import { apiClient } from './client'
import type {
  CreateDispatchRequest,
  DispatchResponse,
  FinishedGoodsMetricsResponse,
  StoredDocumentResponse,
} from '../types'

const DISPATCH_BASE_URL = '/api/v1/dispatches'

export async function listDispatches(params?: {
  status?: string
  orderId?: number
}): Promise<DispatchResponse[]> {
  const queryParams: Record<string, string | number> = {}
  if (params?.status && params.status !== 'ALL') {
    queryParams.status = params.status
  }
  if (params?.orderId) {
    queryParams.orderId = params.orderId
  }
  const response = await apiClient.get<DispatchResponse[]>(DISPATCH_BASE_URL, {
    params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
  })
  return Array.isArray(response.data) ? response.data : []
}

export async function getDispatchById(id: number): Promise<DispatchResponse> {
  const response = await apiClient.get<DispatchResponse>(`${DISPATCH_BASE_URL}/${id}`)
  return response.data
}

export async function createDispatch(
  request: CreateDispatchRequest,
): Promise<DispatchResponse> {
  const response = await apiClient.post<DispatchResponse>(DISPATCH_BASE_URL, request)
  return response.data
}

export async function markAsDispatched(id: number): Promise<DispatchResponse> {
  const response = await apiClient.patch<DispatchResponse>(`${DISPATCH_BASE_URL}/${id}/dispatch`)
  return response.data
}

export async function markAsDelivered(id: number): Promise<DispatchResponse> {
  const response = await apiClient.patch<DispatchResponse>(`${DISPATCH_BASE_URL}/${id}/deliver`)
  return response.data
}

export async function cancelDispatch(id: number): Promise<DispatchResponse> {
  const response = await apiClient.patch<DispatchResponse>(`${DISPATCH_BASE_URL}/${id}/cancel`)
  return response.data
}

export { getVehicles, getVehicleById } from './vehicleApi'
export { getDrivers, getDriverById } from './driverApi'

export async function getFinishedGoodsMetrics(
  productionId: number,
): Promise<FinishedGoodsMetricsResponse> {
  const response = await apiClient.get<FinishedGoodsMetricsResponse>(
    `/api/v1/finished-goods/production/${productionId}/metrics`,
  )
  return response.data
}

export async function getDispatchDocuments(
  category?: string,
): Promise<StoredDocumentResponse[]> {
  const response = await apiClient.get<StoredDocumentResponse[]>('/api/v1/documents', {
    params: category ? { category } : undefined,
  })
  return Array.isArray(response.data) ? response.data : []
}

export async function downloadDispatchDocument(documentId: string): Promise<Blob> {
  const response = await apiClient.get<Blob>(`/api/v1/documents/${documentId}/download`, {
    responseType: 'blob',
  })
  return response.data
}
