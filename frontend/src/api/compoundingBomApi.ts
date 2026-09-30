import { apiClient } from './client'
import type { BatchRequirementCalculationResponse, CompoundingBomRequest, CompoundingBomResponse } from '../types'
const BASE_URL = '/api/v1/factory/compounding/boms'
export async function createCompoundingBom(request: CompoundingBomRequest) { return (await apiClient.post<CompoundingBomResponse>(BASE_URL, request)).data }
export async function getCompoundingBoms(status?: string) { const r = await apiClient.get<CompoundingBomResponse[]>(BASE_URL, { params: status ? { status } : undefined }); return Array.isArray(r.data) ? r.data : [] }
export async function getCompoundingBom(bomId: number) { return (await apiClient.get<CompoundingBomResponse>(`${BASE_URL}/${bomId}`)).data }
export async function activateCompoundingBom(bomId: number) { return (await apiClient.patch<CompoundingBomResponse>(`${BASE_URL}/${bomId}/activate`)).data }
export async function retireCompoundingBom(bomId: number) { return (await apiClient.patch<CompoundingBomResponse>(`${BASE_URL}/${bomId}/retire`)).data }
export async function calculateBomRequirements(bomId: number, batchWeightKg: number) { return (await apiClient.get<BatchRequirementCalculationResponse>(`${BASE_URL}/${bomId}/calculate-requirements`, { params: { batchWeightKg } })).data }
