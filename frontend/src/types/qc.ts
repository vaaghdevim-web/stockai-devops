export type InspectionType = 'Incoming' | 'InProcess' | 'Final' | string

export interface QualityInspectionItemRequest {
  qcSpecificationId?: number | null
  parameterName: string
  minimumValue?: number | null
  maximumValue?: number | null
  observedValue: number
  targetValue?: number | null
  measurementUnit?: string | null
  specification?: string | null
  isCritical?: boolean | null
}

export interface QualityInspectionRequest {
  inspectionType: InspectionType
  materialBatchId?: number | null
  productionRunId?: number | null
  finishedBatchId?: number | null
  remarks?: string | null
  items: QualityInspectionItemRequest[]
}

export interface QualityInspectionItemResponse extends QualityInspectionItemRequest {
  qiId: number
  result: string
}

export interface QualityInspectionResponse {
  inspectionId: number
  materialBatchId: number | null
  materialBatchNo: string | null
  productionRunId: number | null
  productionRunNumber: string | null
  finishedBatchId: number | null
  finishedBatchNo: string | null
  inspectionType: InspectionType
  inspectionDate: string
  inspectedByUserName: string | null
  status: string
  remarks: string | null
  items: QualityInspectionItemResponse[]
}

export interface QcSpecificationResponse {
  qcSpecificationId: number
  productId: number
  productCode: string
  productName: string
  inspectionType: InspectionType
  parameterName: string
  minimumValue: number | null
  maximumValue: number | null
  targetValue: number | null
  measurementUnit: string | null
  specification: string | null
  isCritical: boolean | null
  isActive: boolean | null
}
