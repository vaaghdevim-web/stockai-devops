import { getRecommendations } from './procurementApi'
import { getProductionRuns, getProductionStages } from './productionApi'
import { getQualityInspections } from './qcApi'
import { listTransfers } from './transferApi'
import { getRecentTelemetryEvents } from './telemetryApi'
import { getApiError } from '../utils/apiError'
import type { AlertSourceResult, OperationalAlert } from '../types/alerts'

const normalize = (value: string) => value.toLowerCase()
function errorMessage(error: unknown) {
  const detail = getApiError(error, 'Source data unavailable.')
  return detail.correlationId ? `${detail.message} (Reference: ${detail.correlationId})` : detail.message
}
function source(load: () => Promise<OperationalAlert[]>): () => Promise<AlertSourceResult> {
  return async () => {
    try { return { alerts: await load(), errors: [] } }
    catch (error) { return { alerts: null, errors: [errorMessage(error)] } }
  }
}

export const alertSources: Record<string, () => Promise<AlertSourceResult>> = {
  Procurement: source(async () => (await getRecommendations())
    .filter((item) => ['New', 'InReview'].includes(item.status))
    .map((item) => ({ id: `recommendation-${item.recommendationId}`, category: 'Procurement',
      severity: item.priority === 'Critical' ? 'critical' : item.priority === 'High' ? 'warning' : 'info',
      title: `${item.materialName}: reorder recommendation`,
      description: `Priority: ${item.priority}. Suggested quantity: ${item.recommendedQty}. ${item.reason || ''}`,
      timestamp: item.recommendedDate, reference: item.materialCode,
      route: '/procurement/reorder-recommendations', status: item.status }))),
  Quality: source(async () => (await getQualityInspections())
    .filter((item) => ['fail', 'rejected', 'hold', 'quarantine'].includes(normalize(item.status)) || item.items?.some((parameter) => normalize(parameter.result) === 'fail'))
    .map((item) => ({ id: `qc-${item.inspectionId}`, category: 'Quality',
      severity: item.items?.some((parameter) => parameter.isCritical && normalize(parameter.result) === 'fail') ? 'critical' : 'warning',
      title: `Inspection ${item.inspectionId}: ${item.status}`,
      description: item.items?.filter((parameter) => normalize(parameter.result) === 'fail').map((parameter) => `${parameter.parameterName}: ${parameter.result}`).join('; ') || item.remarks || item.inspectionType,
      timestamp: item.inspectionDate, reference: item.materialBatchNo || item.finishedBatchNo || item.productionRunNumber || `Inspection ${item.inspectionId}`,
      route: `/quality/inspections/${item.inspectionId}`, status: item.status }))),
  Transfers: source(async () => (await listTransfers())
    .filter((item) => ['Cancelled', 'Rejected', 'Draft', 'Pending', 'Approved', 'InTransit'].includes(item.status))
    .map((item) => ({ id: `transfer-${item.transferId}`, category: 'Transfers',
      severity: ['Cancelled', 'Rejected'].includes(item.status) ? 'warning' : 'info',
      title: `${item.transferNumber}: ${item.status}`,
      description: ['Cancelled', 'Rejected'].includes(item.status) ? 'Review the reported transfer status.' : 'Informational workflow record; no failure or delay is inferred.',
      timestamp: item.transferDate, reference: item.transferNumber, route: '/warehouse/transfers', status: item.status }))),
  Telemetry: source(async () => {
    const alerts = new Map<string, OperationalAlert>()
    for (const event of await getRecentTelemetryEvents(20)) {
      for (const anomaly of event.anomalies ?? []) {
        const id = JSON.stringify([anomaly.machineCode, anomaly.anomalyType, anomaly.parameterName, anomaly.detectedAt, anomaly.observedValue, anomaly.thresholdValue])
        alerts.set(id, { id, category: 'Telemetry',
          severity: normalize(anomaly.severity) === 'critical' ? 'critical' : ['warning', 'high'].includes(normalize(anomaly.severity)) ? 'warning' : 'info',
          title: `${anomaly.machineCode}: ${anomaly.anomalyType}`, description: `${anomaly.message} Reported severity: ${anomaly.severity}.`,
          timestamp: anomaly.detectedAt, reference: anomaly.machineCode, route: '/telemetry', status: 'Recorded anomaly' })
      }
    }
    return [...alerts.values()]
  }),
  Production: async () => {
    try {
      const runs = await getProductionRuns()
      const alerts: OperationalAlert[] = []
      const errors: string[] = []
      // Bound concurrency: avoid a request burst for large production histories.
      for (let offset = 0; offset < runs.length; offset += 4) {
        await Promise.all(runs.slice(offset, offset + 4).map(async (run) => {
          if (['failed', 'cancelled'].includes(normalize(run.status))) alerts.push({
            id: `run-${run.productionId}`, category: 'Production', severity: 'warning',
            title: `${run.productionNumber}: ${run.status}`, description: 'Review the production run status.',
            reference: run.productionNumber, route: '/production', status: run.status,
          })
          try {
            for (const stage of await getProductionStages(run.productionId)) {
              if (!['blocked', 'failed'].includes(normalize(stage.status))) continue
              alerts.push({ id: `stage-${run.productionId}-${stage.stageId}`, category: 'Production', severity: 'warning',
                title: `${stage.stageName || `Sequence ${stage.sequenceNo}`}: ${stage.status}`,
                description: `Production ${run.productionNumber} · Stage ID ${stage.stageId} · Sequence ${stage.sequenceNo}`,
                reference: run.productionNumber, route: `/production/${run.productionId}/stages/${stage.stageId}`, status: stage.status })
            }
          } catch (error) { errors.push(`${run.productionNumber} stages: ${errorMessage(error)}`) }
        }))
      }
      return { alerts, errors }
    } catch (error) { return { alerts: null, errors: [errorMessage(error)] } }
  },
}
