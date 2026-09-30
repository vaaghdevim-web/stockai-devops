import { getProductionRuns } from './productionApi'
import { getQualityInspections } from './qcApi'
import { getActiveMachines } from './machineApi'
import { getRecentTelemetryEvents } from './telemetryApi'
import { getRawMaterials } from './inventoryApi'
import { getRecommendations } from './procurementApi'
import { listTransfers } from './transferApi'
import { getApiError } from '../utils/apiError'
import type { RawMaterialResponse, PurchaseRecommendationResponse, StockTransferResponse } from '../types'

export type DashboardSource<T> =
  | { data: T[]; error: null; status?: number }
  | { data: null; error: string; status?: number }

export interface DashboardData {
  materials: DashboardSource<RawMaterialResponse>
  recommendations: DashboardSource<PurchaseRecommendationResponse>
  transfers: DashboardSource<StockTransferResponse>
}

async function readSource<T>(load: () => Promise<T[]>, fallback: string): Promise<DashboardSource<T>> {
  try {
    const data = await load()
    if (!Array.isArray(data)) throw new Error('Unexpected list response')
    return { data, error: null }
  } catch (error) {
    const details = getApiError(error, fallback)
    return {
      data: null,
      error: details.correlationId
        ? `${details.message} (Reference: ${details.correlationId})`
        : details.message,
      status: details.status,
    }
  }
}

export const dashboardSources = {
  production: () => readSource(getProductionRuns, 'Production data unavailable.'),
  quality: () => readSource(getQualityInspections, 'Quality data unavailable.'),
  machines: () => readSource(getActiveMachines, 'Machine data unavailable.'),
  telemetry: () => readSource(() => getRecentTelemetryEvents(20), 'Telemetry data unavailable.'),
  materials: () => readSource(getRawMaterials, 'Unable to load raw materials.'),
  recommendations: () => readSource(getRecommendations, 'Unable to load reorder recommendations.'),
  transfers: () => readSource(listTransfers, 'Unable to load stock transfers.'),
}

/** Read-only summary: no reorder scans, approvals, or inventory mutations. */
export async function getDashboardData(): Promise<DashboardData> {
  const [materials, recommendations, transfers] = await Promise.all([
    dashboardSources.materials(),
    dashboardSources.recommendations(),
    dashboardSources.transfers(),
  ])
  return { materials, recommendations, transfers }
}
