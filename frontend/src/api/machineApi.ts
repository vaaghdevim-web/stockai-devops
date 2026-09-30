import { apiClient } from './client'
import type { ActiveMachineResponse } from '../types'

export async function getActiveMachines(): Promise<ActiveMachineResponse[]> {
  const response = await apiClient.get<ActiveMachineResponse[]>('/api/v1/machines/active')
  return Array.isArray(response.data) ? response.data : []
}

export async function getAllMachines(): Promise<ActiveMachineResponse[]> {
  const response = await apiClient.get<ActiveMachineResponse[]>('/api/v1/machines')
  return Array.isArray(response.data) ? response.data : []
}

export async function getMachineById(id: number): Promise<ActiveMachineResponse> {
  const response = await apiClient.get<ActiveMachineResponse>(`/api/v1/machines/${id}`)
  return response.data
}
