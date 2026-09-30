import { getRawMaterials, getFifoBatches } from './inventoryApi'
import { listTransfers } from './transferApi'
import { getQualityInspections, getQualityInspectionsByBatch } from './qcApi'
import { getPalletByIdentifier } from './palletApi'
import { getProductionStages } from './productionApi'
import type {
  AvailableBatchSuggestion,
  BatchTraceabilityResult,
  BatchTraceabilitySummary,
  PalletResponse,
  ProductionStageResponse,
  QualityInspectionResponse,
  RawMaterialResponse,
  StockTransferResponse,
  TraceabilityEvent,
  TraceabilityQcItem,
  TraceabilityStatusTone,
} from '../types'

function mapQcTone(status: string): TraceabilityStatusTone {
  const s = status?.toLowerCase() || ''
  if (s === 'pass' || s === 'released' || s === 'available') return 'success'
  if (s === 'fail' || s === 'rejected') return 'danger'
  if (s === 'quarantine' || s === 'hold' || s === 'pending') return 'warning'
  return 'info'
}

function mapTransferTone(status: string): TraceabilityStatusTone {
  const s = status?.toLowerCase() || ''
  if (s === 'completed') return 'success'
  if (s === 'draft') return 'warning'
  if (s === 'cancelled') return 'danger'
  return 'info'
}

function mapStageTone(status: string): TraceabilityStatusTone {
  const s = status?.toLowerCase() || ''
  if (s === 'completed') return 'success'
  if (s === 'running' || s === 'ready') return 'info'
  if (s === 'pending') return 'neutral'
  if (s === 'blocked' || s === 'failed' || s === 'cancelled') return 'danger'
  return 'warning'
}

/**
 * Fetch available active batches from inventory and recent records for quick suggestions
 */
export async function getAvailableBatchSuggestions(): Promise<AvailableBatchSuggestion[]> {
  const suggestionsMap = new Map<string, AvailableBatchSuggestion>()

  try {
    const materials = await getRawMaterials()
    const batchPromises = materials.slice(0, 10).map(async (material) => {
      try {
        const batches = await getFifoBatches(material.materialId)
        return batches.map((b) => ({
          batchNo: b.batchNo,
          materialName: material.materialName,
          materialCode: material.materialCode,
          availableWeightKg: b.availableWeightKg,
          type: 'RAW_MATERIAL' as const,
        }))
      } catch {
        return []
      }
    })

    const nestedBatches = await Promise.all(batchPromises)
    nestedBatches.flat().forEach((b) => {
      if (b.batchNo && !suggestionsMap.has(b.batchNo)) {
        suggestionsMap.set(b.batchNo, b)
      }
    })
  } catch {
    // Graceful fallback
  }

  // Also check transfers for additional batch codes
  try {
    const transfers = await listTransfers()
    transfers.forEach((t) => {
      t.items?.forEach((item) => {
        if (item.materialBatchNo && !suggestionsMap.has(item.materialBatchNo)) {
          suggestionsMap.set(item.materialBatchNo, {
            batchNo: item.materialBatchNo,
            materialName: 'Raw Material Batch',
            materialCode: 'RM',
            availableWeightKg: item.quantity || 0,
            type: 'RAW_MATERIAL',
          })
        }
        if (item.finishedBatchNo && !suggestionsMap.has(item.finishedBatchNo)) {
          suggestionsMap.set(item.finishedBatchNo, {
            batchNo: item.finishedBatchNo,
            materialName: 'Finished Product Batch',
            materialCode: 'FG',
            availableWeightKg: item.quantity || 0,
            type: 'FINISHED_GOODS',
          })
        }
      })
    })
  } catch {
    // Graceful fallback
  }

  // Also check QC inspections for batch references
  try {
    const inspections = await getQualityInspections()
    inspections.forEach((insp) => {
      if (insp.materialBatchNo && !suggestionsMap.has(insp.materialBatchNo)) {
        suggestionsMap.set(insp.materialBatchNo, {
          batchNo: insp.materialBatchNo,
          materialName: 'Raw Material Batch',
          materialCode: 'RM',
          availableWeightKg: 0,
          type: 'RAW_MATERIAL',
        })
      }
      if (insp.finishedBatchNo && !suggestionsMap.has(insp.finishedBatchNo)) {
        suggestionsMap.set(insp.finishedBatchNo, {
          batchNo: insp.finishedBatchNo,
          materialName: 'Finished Product Batch',
          materialCode: 'FG',
          availableWeightKg: 0,
          type: 'FINISHED_GOODS',
        })
      }
    })
  } catch {
    // Graceful fallback
  }

  return Array.from(suggestionsMap.values())
}

/**
 * Fetch and construct comprehensive traceability history for a given batch number, pallet code, or barcode
 */
export async function getBatchTraceability(searchQuery: string): Promise<BatchTraceabilityResult | null> {
  const query = searchQuery.trim()
  if (!query) return null

  const queryLower = query.toLowerCase()

  // 1. Concurrently fetch core data sets
  let materials: RawMaterialResponse[] = []
  let allTransfers: StockTransferResponse[] = []
  let allInspections: QualityInspectionResponse[] = []
  let matchedPallet: PalletResponse | null = null

  const fetchPalletPromise = (async () => {
    try {
      return await getPalletByIdentifier(query)
    } catch {
      return null
    }
  })()

  const [materialsResult, transfersResult, inspectionsResult, palletResult] = await Promise.allSettled([
    getRawMaterials(),
    listTransfers(),
    getQualityInspections(),
    fetchPalletPromise,
  ])

  if (materialsResult.status === 'fulfilled') materials = materialsResult.value
  if (transfersResult.status === 'fulfilled') allTransfers = transfersResult.value
  if (inspectionsResult.status === 'fulfilled') allInspections = inspectionsResult.value
  if (palletResult.status === 'fulfilled') matchedPallet = palletResult.value

  // 2. Search for matching Raw Material Batch across all materials
  let matchedMaterial: RawMaterialResponse | null = null
  let matchedMaterialBatch: {
    batchId: number
    batchNo: string
    lotNumber?: string | null
    availableWeightKg: number
    receivedAt?: string | null
  } | null = null

  // Search through all materials' FIFO batches
  const batchSearches = materials.map(async (mat) => {
    try {
      const batches = await getFifoBatches(mat.materialId)
      const found = batches.find(
        (b) =>
          b.batchNo.toLowerCase() === queryLower ||
          (b.lotNumber && b.lotNumber.toLowerCase() === queryLower) ||
          String(b.batchId) === query
      )
      if (found) {
        return { material: mat, batch: found }
      }
    } catch {
      return null
    }
    return null
  })

  const batchResults = await Promise.all(batchSearches)
  const batchMatch = batchResults.find((r) => r !== null)
  if (batchMatch) {
    matchedMaterial = batchMatch.material
    matchedMaterialBatch = batchMatch.batch
  }

  // 3. Search for matching transfers
  const matchedTransfers = allTransfers.filter((t) =>
    t.items?.some(
      (item) =>
        (item.materialBatchNo && item.materialBatchNo.toLowerCase() === queryLower) ||
        (matchedMaterialBatch && item.materialBatchId === matchedMaterialBatch.batchId) ||
        (item.finishedBatchNo && item.finishedBatchNo.toLowerCase() === queryLower) ||
        (matchedPallet?.finishedBatchId && item.finishedBatchId === matchedPallet.finishedBatchId) ||
        t.transferNumber.toLowerCase() === queryLower
    )
  )

  // 4. Search for matching QC inspections
  const matchedInspections = allInspections.filter(
    (insp) =>
      (insp.materialBatchNo && insp.materialBatchNo.toLowerCase() === queryLower) ||
      (matchedMaterialBatch && insp.materialBatchId === matchedMaterialBatch.batchId) ||
      (insp.finishedBatchNo && insp.finishedBatchNo.toLowerCase() === queryLower) ||
      (matchedPallet?.finishedBatchId && insp.finishedBatchId === matchedPallet.finishedBatchId) ||
      (insp.productionRunNumber && insp.productionRunNumber.toLowerCase() === queryLower)
  )

  // If we have a batch ID, also check batch-specific QC endpoint
  if (matchedMaterialBatch?.batchId) {
    try {
      const batchSpecificQc = await getQualityInspectionsByBatch('material', matchedMaterialBatch.batchId)
      const existingIds = new Set(matchedInspections.map((i) => i.inspectionId))
      batchSpecificQc.forEach((i) => {
        if (!existingIds.has(i.inspectionId)) {
          matchedInspections.push(i)
        }
      })
    } catch {
      // Ignore
    }
  }

  if (matchedPallet?.finishedBatchId) {
    try {
      const finishedQc = await getQualityInspectionsByBatch('finished', matchedPallet.finishedBatchId)
      const existingIds = new Set(matchedInspections.map((i) => i.inspectionId))
      finishedQc.forEach((i) => {
        if (!existingIds.has(i.inspectionId)) {
          matchedInspections.push(i)
        }
      })
    } catch {
      // Ignore
    }
  }

  // 5. Look for linked production runs and production stages
  let matchedStages: ProductionStageResponse[] = []
  const linkedProductionRunIds = new Set<number>()

  matchedInspections.forEach((insp) => {
    if (insp.productionRunId) linkedProductionRunIds.add(insp.productionRunId)
  })

  // Try fetching production stages if any run is linked
  for (const runId of linkedProductionRunIds) {
    try {
      const stages = await getProductionStages(runId)
      matchedStages = matchedStages.concat(stages)
    } catch {
      // 404 or not implemented, gracefully handle
    }
  }

  // 6. Check if we found ANY matching record
  const hasMatches =
    matchedMaterialBatch !== null ||
    matchedPallet !== null ||
    matchedTransfers.length > 0 ||
    matchedInspections.length > 0 ||
    matchedStages.length > 0

  if (!hasMatches) {
    return null
  }

  // 7. Assemble real chronological events
  const events: TraceabilityEvent[] = []

  // Event: Material Intake / Goods Receipt
  if (matchedMaterialBatch) {
    events.push({
      id: `intake-${matchedMaterialBatch.batchId}`,
      eventType: 'INTAKE',
      title: 'Material Intake & Goods Receipt',
      subtitle: `${matchedMaterial?.materialName || 'Raw Material'} (${matchedMaterial?.materialCode || 'RM'})`,
      timestamp: matchedMaterialBatch.receivedAt || null,
      status: 'Received',
      statusTone: 'success',
      badgeLabel: 'Intake Complete',
      batchNo: matchedMaterialBatch.batchNo,
      materialOrProduct: matchedMaterial?.materialName,
      quantity: matchedMaterialBatch.availableWeightKg,
      uom: matchedMaterial?.defaultUomCode || 'KG',
      sourceLocation: matchedMaterialBatch.lotNumber ? `Supplier Lot: ${matchedMaterialBatch.lotNumber}` : 'Vendor Delivery',
      destinationLocation: 'Raw Material Warehouse (Staging Bin)',
      referenceNumber: matchedMaterialBatch.lotNumber || `BATCH #${matchedMaterialBatch.batchId}`,
      remarks: matchedMaterial ? `Category: ${matchedMaterial.categoryName || 'Raw Material'} · Standard Cost: ₹${matchedMaterial.standardCost}` : null,
    })
  }

  // Events: Quality Inspections
  matchedInspections.forEach((insp) => {
    const qcResults: TraceabilityQcItem[] = (insp.items || []).map((item) => ({
      parameterName: item.parameterName,
      observedValue: item.observedValue,
      targetValue: item.targetValue,
      minimumValue: item.minimumValue,
      maximumValue: item.maximumValue,
      measurementUnit: item.measurementUnit,
      result: item.result,
      isCritical: item.isCritical,
    }))

    const typeLabel = insp.inspectionType === 'Incoming'
      ? 'Incoming QC Inspection'
      : insp.inspectionType === 'InProcess'
        ? 'In-Process QC Inspection'
        : insp.inspectionType === 'Final'
          ? 'Final Finished Goods QC Inspection'
          : `${insp.inspectionType} QC Inspection`

    events.push({
      id: `qc-${insp.inspectionId}`,
      eventType: 'QUALITY_INSPECTION',
      title: typeLabel,
      subtitle: insp.materialBatchNo || insp.finishedBatchNo || insp.productionRunNumber || `Inspection #${insp.inspectionId}`,
      timestamp: insp.inspectionDate || null,
      status: insp.status || 'Pass',
      statusTone: mapQcTone(insp.status),
      badgeLabel: `QC ${insp.status || 'Verified'}`,
      batchNo: insp.materialBatchNo || insp.finishedBatchNo,
      referenceNumber: `QC #${insp.inspectionId}`,
      operatorOrInspector: insp.inspectedByUserName || 'QC Laboratory Tech',
      qcResults: qcResults.length > 0 ? qcResults : undefined,
      remarks: insp.remarks || null,
    })
  })

  // Events: Stock Transfers
  matchedTransfers.forEach((transfer) => {
    const matchingItems = (transfer.items || []).filter(
      (item) =>
        (item.materialBatchNo && item.materialBatchNo.toLowerCase() === queryLower) ||
        (matchedMaterialBatch && item.materialBatchId === matchedMaterialBatch.batchId) ||
        (item.finishedBatchNo && item.finishedBatchNo.toLowerCase() === queryLower) ||
        (matchedPallet?.finishedBatchId && item.finishedBatchId === matchedPallet.finishedBatchId)
    )

    const itemsToUse = matchingItems.length > 0 ? matchingItems : transfer.items || []
    const totalQty = itemsToUse.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0)
    const uom = itemsToUse[0]?.uomCode || 'KG'
    const fromBin = itemsToUse[0]?.fromBinCode ? ` [${itemsToUse[0].fromBinCode}]` : ''
    const toBin = itemsToUse[0]?.toBinCode ? ` [${itemsToUse[0].toBinCode}]` : ''

    const isCompleted = transfer.status?.toLowerCase() === 'completed'

    events.push({
      id: `transfer-${transfer.transferId}`,
      eventType: 'STOCK_TRANSFER',
      title: 'Warehouse Stock Transfer',
      subtitle: `${transfer.fromWarehouseName || `WH #${transfer.fromWarehouseId}`}${fromBin} → ${transfer.toWarehouseName || `WH #${transfer.toWarehouseId}`}${toBin}`,
      timestamp: transfer.transferDate || transfer.createdAt || null,
      status: transfer.status || 'Completed',
      statusTone: mapTransferTone(transfer.status),
      badgeLabel: isCompleted ? 'Moved & Stored' : 'Transfer Pending',
      batchNo: itemsToUse[0]?.materialBatchNo || itemsToUse[0]?.finishedBatchNo || query,
      quantity: totalQty,
      uom,
      sourceLocation: `${transfer.fromWarehouseName || `Warehouse #${transfer.fromWarehouseId}`}${fromBin}`,
      destinationLocation: `${transfer.toWarehouseName || `Warehouse #${transfer.toWarehouseId}`}${toBin}`,
      referenceNumber: transfer.transferNumber,
      operatorOrInspector: transfer.createdByUserName || 'Warehouse Logistics Officer',
      remarks: `${itemsToUse.length} line item(s) in transfer manifest`,
    })
  })

  // Events: Production Stages
  matchedStages.forEach((stage) => {
    events.push({
      id: `stage-${stage.stageId}`,
      eventType: 'PRODUCTION_STAGE',
      title: `Production Stage: ${stage.stageName || `Stage #${stage.sequenceNo}`}`,
      subtitle: stage.unitName || stage.unitCode ? `Unit: ${stage.unitName || stage.unitCode}` : undefined,
      timestamp: stage.completedAt || stage.startedAt || null,
      status: stage.status || 'Completed',
      statusTone: mapStageTone(stage.status),
      badgeLabel: `Seq #${stage.sequenceNo} (${stage.status})`,
      machine: stage.machineName ? `${stage.machineName} (${stage.machineCode})` : stage.machineCode,
      unit: stage.unitName || stage.unitCode,
      quantity: stage.outputWeightKg || stage.inputWeightKg,
      uom: 'KG',
      remarks: `Input: ${stage.inputWeightKg || 0} KG · Output: ${stage.outputWeightKg || 0} KG · Scrap: ${stage.scrapWeightKg || 0} KG`,
    })
  })

  // Events: Palletization
  if (matchedPallet) {
    events.push({
      id: `pallet-${matchedPallet.palletId}`,
      eventType: 'PALLETIZATION',
      title: 'Finished Goods Palletization',
      subtitle: `Pallet Tag: ${matchedPallet.palletCode}`,
      timestamp: null,
      status: matchedPallet.status || 'Open',
      statusTone: matchedPallet.status?.toLowerCase() === 'open' ? 'success' : 'neutral',
      badgeLabel: 'Pallet Tagged',
      batchNo: query,
      palletCode: matchedPallet.palletCode,
      palletBarcode: matchedPallet.barcode,
      quantity: matchedPallet.quantity ?? null,
      uom: 'BAGS',
      destinationLocation: matchedPallet.warehouseId === 3 ? 'Unit 3 Finished Goods Warehouse' : `Warehouse #${matchedPallet.warehouseId}`,
      referenceNumber: matchedPallet.palletCode,
      remarks: `Barcode: ${matchedPallet.barcode} · Bin: ${matchedPallet.binId ? `BIN #${matchedPallet.binId}` : 'Staging Area'}`,
    })
  }

  // Sort events chronologically (events with null timestamps placed at logical end or start)
  events.sort((a, b) => {
    if (!a.timestamp && !b.timestamp) return 0
    if (!a.timestamp) return 1
    if (!b.timestamp) return -1
    return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  })

  // 8. Build Summary Section
  const resolvedBatchNumber =
    matchedMaterialBatch?.batchNo ||
    matchedPallet?.palletCode ||
    matchedInspections[0]?.materialBatchNo ||
    matchedInspections[0]?.finishedBatchNo ||
    matchedTransfers[0]?.items?.[0]?.materialBatchNo ||
    matchedTransfers[0]?.items?.[0]?.finishedBatchNo ||
    query

  const isPallet = matchedPallet !== null || queryLower.startsWith('pal')
  const isFinished =
    !isPallet &&
    (queryLower.startsWith('fb') ||
      queryLower.startsWith('fg') ||
      matchedInspections.some((i) => i.finishedBatchNo) ||
      matchedTransfers.some((t) => t.items?.some((i) => i.finishedBatchNo)))

  const batchType = isPallet ? 'PALLET' : isFinished ? 'FINISHED_GOODS' : 'RAW_MATERIAL'
  const batchTypeLabel = isPallet ? 'Pallet / Barcode Tag' : isFinished ? 'Finished Goods Batch' : 'Raw Material Batch'

  // Latest Location calculation
  let currentLocation = 'Warehouse Staging'
  if (matchedPallet) {
    currentLocation = matchedPallet.warehouseId === 3 ? 'Unit 3 Finished Goods Warehouse' : `Warehouse #${matchedPallet.warehouseId}`
  } else if (matchedTransfers.length > 0) {
    const latestTransfer = matchedTransfers[matchedTransfers.length - 1]
    currentLocation = latestTransfer.toWarehouseName || `Warehouse #${latestTransfer.toWarehouseId}`
  } else if (matchedMaterialBatch) {
    currentLocation = 'Raw Material Warehouse (Active Bin)'
  }

  // Latest Status calculation
  let currentStatus = 'Active / Available'
  let statusTone: TraceabilityStatusTone = 'success'

  const latestQc = matchedInspections[matchedInspections.length - 1]
  if (latestQc) {
    currentStatus = `QC ${latestQc.status || 'Verified'}`
    statusTone = mapQcTone(latestQc.status)
  } else if (matchedPallet) {
    currentStatus = matchedPallet.status || 'Open'
    statusTone = 'success'
  }

  const currentQuantity = matchedMaterialBatch?.availableWeightKg ?? matchedPallet?.quantity ?? null
  const uom = isPallet ? 'BAGS' : matchedMaterial?.defaultUomCode || 'KG'

  const summary: BatchTraceabilitySummary = {
    batchNumber: resolvedBatchNumber,
    batchType,
    batchTypeLabel,
    materialName: matchedMaterial?.materialName || (isFinished ? '50KG PP Fertilizer Bag' : isPallet ? 'Finished Goods Pallet' : 'Polymer Material'),
    materialCode: matchedMaterial?.materialCode || (isFinished ? 'FG-BAG-50KG' : isPallet ? 'PALLET' : 'RAW-MAT'),
    categoryName: matchedMaterial?.categoryName || (isFinished ? 'Finished Products' : 'Raw Materials'),
    currentQuantity,
    uom,
    currentLocation,
    currentStatus,
    statusTone,
    supplierLot: matchedMaterialBatch?.lotNumber || null,
    receivedOrCreatedDate: matchedMaterialBatch?.receivedAt || events[0]?.timestamp || null,
    expiryDate: null,
    totalEventsCount: events.length,
  }

  return {
    summary,
    events,
  }
}
