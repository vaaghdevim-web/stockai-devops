export interface FinishedGoodsMetricsResponse {
  productionId: number
  inputWeightKg: number | null
  outputWeightKg: number | null
  scrapWeightKg: number | null
  yieldPercentage: number | null
  scrapPercentage: number | null
  bagsProduced: number | null
  averageBagWeightG: number | null
  bagsPerKg: number | null
}

export interface StoredDocumentResponse {
  documentId: string
  fileName: string
  contentType: string
  sizeBytes: number | null
  category: string | null
  storageLocation: string | null
  plantId: number | null
  uploadedBy: string | null
  uploadedAt: string | null
}

export interface DispatchItemRequest {
  allocationId?: number | null
  finishedBatchId: number
  quantity: number
}

export interface CreateDispatchRequest {
  orderId: number
  vehicleId?: number | null
  driverId?: number | null
  carrier?: string | null
  shippingMethod?: string | null
  trackingNumber?: string | null
  dispatchDate?: string | null
  expectedDeliveryDate?: string | null
  items: DispatchItemRequest[]
  autoDispatch?: boolean | null
}

export interface DispatchItemResponse {
  dispatchItemId: number
  allocationId: number | null
  finishedBatchId: number | null
  finishedBatchNo: string | null
  productCode: string | null
  productName: string | null
  quantity: number
  uom: string
}

export interface DispatchResponse {
  dispatchId: number
  dispatchNumber: string
  orderId: number | null
  orderNumber: string | null
  customerName: string | null
  vehicleId: number | null
  vehicleNumber: string | null
  driverId: number | null
  driverName: string | null
  driverPhone: string | null
  dispatchDate: string | null
  expectedDeliveryDate: string | null
  actualDeliveryDate: string | null
  status: string
  carrier: string | null
  shippingMethod: string | null
  trackingNumber: string | null
  createdByUserName: string | null
  createdAt: string | null
  items: DispatchItemResponse[]
}

export interface VehicleResponse {
  vehicleId: number
  vehicleNumber: string
  vehicleType: string | null
  capacity: number | null
  capacityUomCode: string | null
  isActive: boolean | null
}

export interface DriverResponse {
  driverId: number
  driverName: string
  licenseNumber: string | null
  licenseExpiry: string | null
  phone: string | null
  isActive: boolean | null
}
