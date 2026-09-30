export type BinStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'QUARANTINE' | 'NEAR_FULL'

export interface StorageHierarchyPath {
  plantName: string
  warehouseName: string
  warehouseType: 'Raw' | 'FG' | 'Both' | 'WIP'
  rackCode: string
  shelfCode: string
  binCode: string
}

// Backend DTOs
export interface WarehouseResponse {
  warehouseId: number
  plantId?: number | null
  plantName?: string | null
  warehouseName: string
  type: 'Raw' | 'FG' | 'Both'
  isActive?: boolean
}

export interface BinStorageResponse {
  binId: number
  binCode: string
  capacityKg: number
  maxPallets?: number | null
  maxBags?: number | null
  currentStockKg: number
  availableCapacityKg?: number
  utilizationPct?: number
  activePalletCount?: number
  isOverCapacity?: boolean
  isActive?: boolean
}

export interface ShelfStorageResponse {
  shelfId: number
  shelfCode: string
  shelfLevel?: number
  totalCapacityKg?: number
  totalCurrentStockKg?: number
  totalAvailableCapacityKg?: number
  utilizationPct?: number
  totalBins: number
  isActive?: boolean
  bins: BinStorageResponse[]
}

export interface RackStorageResponse {
  rackId: number
  rackCode: string
  totalCapacityKg?: number
  totalCurrentStockKg?: number
  totalAvailableCapacityKg?: number
  utilizationPct?: number
  totalShelves: number
  totalBins: number
  isActive?: boolean
  shelves: ShelfStorageResponse[]
}

export interface WarehouseStorageHierarchyResponse {
  warehouseId: number
  plantId?: number | null
  plantName?: string | null
  warehouseName: string
  type: string
  totalCapacityKg?: number
  totalCurrentStockKg?: number
  totalAvailableCapacityKg?: number
  overallUtilizationPct?: number
  totalRacks: number
  totalShelves: number
  totalBins: number
  isActive?: boolean
  racks: RackStorageResponse[]
}

export interface BinOccupancyResponse {
  binId: number
  binCode: string
  shelfId: number
  shelfCode: string
  rackId: number
  rackCode: string
  warehouseId: number
  warehouseName: string
  capacityKg: number
  maxPallets?: number | null
  maxBags?: number | null
  currentStockKg: number
  availableCapacityKg?: number
  utilizationPct?: number
  activePalletCount?: number
  isOverCapacity?: boolean
  isActive?: boolean
}

export interface CreateWarehouseRequest {
  plantId: number
  warehouseName: string
  type: 'Raw' | 'FG' | 'Both'
}

export interface CreateRackRequest {
  rackCode: string
  numberOfShelves?: number
  binsPerShelf?: number
  defaultBinCapacityKg?: number
  defaultMaxPallets?: number
  defaultMaxBags?: number
}

export interface CreateShelfRequest {
  shelfCode: string
  shelfLevel?: number
  numberOfBins?: number
  defaultBinCapacityKg?: number
  defaultMaxPallets?: number
  defaultMaxBags?: number
}

export interface CreateBinRequest {
  binCode: string
  capacityKg: number
  maxPallets?: number
  maxBags?: number
}

export interface LocationRackResponse {
  rackId: number
  warehouseId?: number
  warehouseName?: string
  rackCode: string
  numberOfShelves: number
  isActive?: boolean
}

export interface LocationShelfResponse {
  shelfId: number
  rackId?: number
  rackCode?: string
  shelfCode: string
  shelfLevel?: number
  numberOfBins: number
  isActive?: boolean
}

export interface LocationBinResponse {
  binId: number
  warehouseId?: number
  warehouseName?: string
  shelfId?: number
  shelfCode?: string
  rackCode?: string
  binCode: string
  capacityKg: number
  maxPallets?: number
  maxBags?: number
  isActive?: boolean
}

// Visual layout models for canvas & tree
export interface LocationBinNode {
  binId: number
  binCode: string
  rackCode: string
  shelfCode: string
  status: BinStatus
  capacityKg: number
  currentKg: number
  availableCapacityKg?: number
  utilizationPct?: number
  activePalletCount?: number
  isOverCapacity?: boolean
  isActive?: boolean
  currentBags?: number
  materialCode?: string
  materialName?: string
  batchNo?: string
  qualityStatus?: 'APPROVED' | 'QUARANTINED' | 'UNDER_INSPECTION' | 'HOLD'
  agingDays?: number
  lastInspectionDate?: string
  x?: number
  y?: number
  width?: number
  height?: number
}

export interface LocationShelfNode {
  shelfId: number
  shelfCode: string
  tierLevel: number
  totalCapacityKg?: number
  totalCurrentStockKg?: number
  utilizationPct?: number
  isActive?: boolean
  bins: LocationBinNode[]
}

export interface LocationRackNode {
  rackId: number
  rackCode: string
  aisle?: string
  orientation?: 'horizontal' | 'vertical'
  totalCapacityKg?: number
  totalCurrentStockKg?: number
  utilizationPct?: number
  isActive?: boolean
  x?: number
  y?: number
  width?: number
  height?: number
  shelves: LocationShelfNode[]
}

export interface WarehouseZone {
  id: string
  name: string
  type: 'DOCK' | 'WEIGHBRIDGE' | 'QUARANTINE' | 'SILO' | 'CORRIDOR' | 'DISPATCH' | 'PALLETIZER'
  x: number
  y: number
  width: number
  height: number
  icon?: string
  description?: string
}

export interface WarehouseFacility {
  plantId: number
  plantName: string
  warehouseId: number
  warehouseName: string
  type: 'Raw' | 'FG' | 'Both' | 'WIP'
  totalCapacityKg?: number
  totalCurrentStockKg?: number
  totalAvailableCapacityKg?: number
  overallUtilizationPct?: number
  isActive?: boolean
  dimensions?: {
    width: number
    height: number
  }
  racks: LocationRackNode[]
  zones?: WarehouseZone[]
}
