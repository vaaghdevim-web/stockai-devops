import { apiClient } from './client'
import type { QcSpecificationResponse, QualityInspectionRequest, QualityInspectionResponse } from '../types'

const BASE_URL = '/api/v1/qc'

export async function createQualityInspection(request: QualityInspectionRequest): Promise<QualityInspectionResponse> {
  const response = await apiClient.post<QualityInspectionResponse>(`${BASE_URL}/inspections`, request)
  return response.data
}

export async function getQualityInspection(inspectionId: number): Promise<QualityInspectionResponse> {
  const response = await apiClient.get<QualityInspectionResponse>(`${BASE_URL}/inspections/${inspectionId}`)
  return response.data
}

export async function getQualityInspections(params?: { status?: string; inspectionType?: string }): Promise<QualityInspectionResponse[]> {
  const response = await apiClient.get<QualityInspectionResponse[]>(`${BASE_URL}/inspections`, { params })
  return Array.isArray(response.data) ? response.data : []
}

export async function getQualityInspectionsByBatch(type: string, id: number): Promise<QualityInspectionResponse[]> {
  const response = await apiClient.get<QualityInspectionResponse[]>(`${BASE_URL}/inspections/batch/${encodeURIComponent(type)}/${id}`)
  return Array.isArray(response.data) ? response.data : []
}

export async function getQcSpecifications(params?: { productId?: number; inspectionType?: string }): Promise<QcSpecificationResponse[]> {
  const response = await apiClient.get<QcSpecificationResponse[]>(`${BASE_URL}/specifications`, { params })
  return Array.isArray(response.data) ? response.data : []
}
