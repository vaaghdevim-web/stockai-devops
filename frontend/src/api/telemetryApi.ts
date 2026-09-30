import { apiClient } from './client'
import type { TelemetryBurstRequest, TelemetryIngestResponse, TelemetryPacketRequest, TelemetryStreamEvent, TelemetryStreamTicketResponse } from '../types'

const BASE_URL = '/api/v1/iot/telemetry'

export async function ingestTelemetryPacket(request: TelemetryPacketRequest): Promise<TelemetryIngestResponse> {
  const response = await apiClient.post<TelemetryIngestResponse>(`${BASE_URL}/packet`, request)
  return response.data
}

export async function ingestTelemetryBurst(request: TelemetryBurstRequest): Promise<TelemetryIngestResponse> {
  const response = await apiClient.post<TelemetryIngestResponse>(`${BASE_URL}/burst`, request)
  return response.data
}

export async function getLatestTelemetry(machineCode: string): Promise<TelemetryPacketRequest> {
  const response = await apiClient.get<TelemetryPacketRequest>(`${BASE_URL}/latest/${encodeURIComponent(machineCode)}`)
  return response.data
}

export async function getRecentTelemetryEvents(limit = 20): Promise<TelemetryStreamEvent[]> {
  const response = await apiClient.get<TelemetryStreamEvent[]>(`${BASE_URL}/recent`, { params: { limit } })
  return Array.isArray(response.data) ? response.data : []
}

export async function createTelemetryStreamTicket(signal?: AbortSignal): Promise<TelemetryStreamTicketResponse> {
  const response = await apiClient.post<TelemetryStreamTicketResponse>(`${BASE_URL}/stream/ticket`, undefined, { signal })
  return response.data
}
