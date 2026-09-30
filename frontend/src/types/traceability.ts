export type TraceabilityEventType =
  | 'INTAKE'
  | 'QUALITY_INSPECTION'
  | 'STOCK_TRANSFER'
  | 'PRODUCTION_STAGE'
  | 'PALLETIZATION'
  | 'DISPATCH'

export type TraceabilityStatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

export interface TraceabilityQcItem {
  parameterName: string
  observedValue: number
  targetValue?: number | null
  minimumValue?: number | null
  maximumValue?: number | null
  measurementUnit?: string | null
  result: string
  isCritical?: boolean | null
}

export interface TraceabilityEvent {
  id: string
  eventType: TraceabilityEventType
  title: string
  subtitle?: string | null
  timestamp: string | null
  status: string
  statusTone: TraceabilityStatusTone
  badgeLabel?: string
  batchNo?: string | null
  materialOrProduct?: string | null
  quantity?: number | null
  uom?: string | null
  sourceLocation?: string | null
  destinationLocation?: string | null
  referenceNumber?: string | null
  operatorOrInspector?: string | null
  machine?: string | null
  unit?: string | null
  palletCode?: string | null
  palletBarcode?: string | null
  qcResults?: TraceabilityQcItem[]
  remarks?: string | null
  rawDetails?: Record<string, unknown>
}

export interface BatchTraceabilitySummary {
  batchNumber: string
  batchType: 'RAW_MATERIAL' | 'FINISHED_GOODS' | 'PALLET' | 'UNKNOWN'
  batchTypeLabel: string
  materialName?: string | null
  materialCode?: string | null
  categoryName?: string | null
  currentQuantity?: number | null
  uom?: string | null
  currentLocation?: string | null
  currentStatus: string
  statusTone: TraceabilityStatusTone
  supplierLot?: string | null
  receivedOrCreatedDate?: string | null
  expiryDate?: string | null
  totalEventsCount: number
}

export interface BatchTraceabilityResult {
  summary: BatchTraceabilitySummary
  events: TraceabilityEvent[]
}

export interface AvailableBatchSuggestion {
  batchNo: string
  materialName: string
  materialCode: string
  availableWeightKg: number
  type: 'RAW_MATERIAL' | 'FINISHED_GOODS' | 'PALLET'
}
