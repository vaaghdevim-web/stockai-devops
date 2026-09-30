import type {
  BinStatus,
  LocationBinNode,
  LocationRackNode,
  LocationShelfNode,
  StorageHierarchyPath,
  WarehouseFacility,
  WarehouseStorageHierarchyResponse,
} from '../types/warehouseMap'

export const WAREHOUSE_FACILITIES: WarehouseFacility[] = [
  // 1. UNIT 1: RAW MATERIALS WAREHOUSE
  {
    plantId: 1,
    plantName: 'Sri Vidha Polymers - Unit 1',
    warehouseId: 1,
    warehouseName: 'Unit 1 Raw Material Warehouse',
    type: 'Raw',
    dimensions: { width: 1000, height: 650 },
    zones: [],
    racks: [
      // AISLE A (RACK-U1-01) - Seeded in backend
      {
        rackId: 1,
        rackCode: 'RACK-U1-01',
        aisle: 'Aisle A (Prime Polymers)',
        orientation: 'vertical',
        x: 280,
        y: 60,
        width: 190,
        height: 460,
        shelves: [
          {
            shelfId: 101,
            shelfCode: 'SHELF-U1-01',
            tierLevel: 1,
            bins: [
              {
                binId: 1,
                binCode: 'BIN-U1-01',
                rackCode: 'RACK-U1-01',
                shelfCode: 'SHELF-U1-01',
                status: 'OCCUPIED',
                capacityKg: 5000,
                currentKg: 5000,
                currentBags: 200,
                materialCode: 'RM-PP-1030RG-I',
                materialName: 'PP Homo-polymer Raffia 1030RG',
                batchNo: 'BATCH-TEST-156948',
                qualityStatus: 'APPROVED',
                agingDays: 4,
                lastInspectionDate: '2026-09-21',
              },
              {
                binId: 2,
                binCode: 'BIN-U1-02',
                rackCode: 'RACK-U1-01',
                shelfCode: 'SHELF-U1-01',
                status: 'OCCUPIED',
                capacityKg: 5000,
                currentKg: 2500,
                currentBags: 100,
                materialCode: 'RM-PP-1030RG-M',
                materialName: 'PP Raffia Grade MRPL HP010',
                batchNo: 'BATCH-TEST-098234',
                qualityStatus: 'APPROVED',
                agingDays: 7,
                lastInspectionDate: '2026-09-20',
              },
            ],
          },
          {
            shelfId: 102,
            shelfCode: 'SHELF-U1-02',
            tierLevel: 2,
            bins: [
              {
                binId: 3,
                binCode: 'BIN-U1-03',
                rackCode: 'RACK-U1-01',
                shelfCode: 'SHELF-U1-02',
                status: 'AVAILABLE',
                capacityKg: 5000,
                currentKg: 0,
                currentBags: 0,
              },
              {
                binId: 4,
                binCode: 'BIN-U1-04',
                rackCode: 'RACK-U1-01',
                shelfCode: 'SHELF-U1-02',
                status: 'RESERVED',
                capacityKg: 5000,
                currentKg: 4000,
                currentBags: 160,
                materialCode: 'RM-PP-INJ-001',
                materialName: 'PP Injection Molding Grade M110',
                batchNo: 'BATCH-TRF-RES-01',
                qualityStatus: 'APPROVED',
                agingDays: 2,
              },
            ],
          },
        ],
      },

      // AISLE B (RACK-U1-02)
      {
        rackId: 2,
        rackCode: 'RACK-U1-02',
        aisle: 'Aisle B (Masterbatches & Additives)',
        orientation: 'vertical',
        x: 520,
        y: 60,
        width: 190,
        height: 460,
        shelves: [
          {
            shelfId: 103,
            shelfCode: 'SHELF-U1-03',
            tierLevel: 1,
            bins: [
              {
                binId: 5,
                binCode: 'BIN-U1-05',
                rackCode: 'RACK-U1-02',
                shelfCode: 'SHELF-U1-03',
                status: 'OCCUPIED',
                capacityKg: 2500,
                currentKg: 2500,
                currentBags: 100,
                materialCode: 'RM-MB-WHT-001',
                materialName: 'Titanium White Masterbatch 70%',
                batchNo: 'BATCH-MB-2026-44',
                qualityStatus: 'APPROVED',
                agingDays: 12,
              },
              {
                binId: 6,
                binCode: 'BIN-U1-06',
                rackCode: 'RACK-U1-02',
                shelfCode: 'SHELF-U1-03',
                status: 'AVAILABLE',
                capacityKg: 2500,
                currentKg: 0,
                currentBags: 0,
              },
            ],
          },
          {
            shelfId: 104,
            shelfCode: 'SHELF-U1-04',
            tierLevel: 2,
            bins: [
              {
                binId: 7,
                binCode: 'BIN-U1-07',
                rackCode: 'RACK-U1-02',
                shelfCode: 'SHELF-U1-04',
                status: 'QUARANTINE',
                capacityKg: 2500,
                currentKg: 1500,
                currentBags: 60,
                materialCode: 'RM-UV-STB-001',
                materialName: 'HALS UV Stabilizer Granules',
                batchNo: 'BATCH-QC-HOLD-99',
                qualityStatus: 'QUARANTINED',
                agingDays: 1,
                lastInspectionDate: '2026-09-22',
              },
              {
                binId: 8,
                binCode: 'BIN-U1-08',
                rackCode: 'RACK-U1-02',
                shelfCode: 'SHELF-U1-04',
                status: 'OCCUPIED',
                capacityKg: 2500,
                currentKg: 2400,
                currentBags: 96,
                materialCode: 'RM-MB-BLU-001',
                materialName: 'Phthalo Blue Masterbatch 40%',
                batchNo: 'BATCH-MB-BLU-08',
                qualityStatus: 'APPROVED',
                agingDays: 15,
              },
            ],
          },
        ],
      },

      // AISLE C (RACK-U1-03)
      {
        rackId: 3,
        rackCode: 'RACK-U1-03',
        aisle: 'Aisle C (Mineral Fillers & CaCO3)',
        orientation: 'vertical',
        x: 760,
        y: 60,
        width: 190,
        height: 460,
        shelves: [
          {
            shelfId: 105,
            shelfCode: 'SHELF-U1-05',
            tierLevel: 1,
            bins: [
              {
                binId: 9,
                binCode: 'BIN-U1-09',
                rackCode: 'RACK-U1-03',
                shelfCode: 'SHELF-U1-05',
                status: 'NEAR_FULL',
                capacityKg: 10000,
                currentKg: 9800,
                currentBags: 392,
                materialCode: 'RM-FIL-CA-001',
                materialName: 'Calcium Carbonate Masterbatch 80%',
                batchNo: 'BATCH-CA-2026-112',
                qualityStatus: 'APPROVED',
                agingDays: 18,
              },
              {
                binId: 10,
                binCode: 'BIN-U1-10',
                rackCode: 'RACK-U1-03',
                shelfCode: 'SHELF-U1-05',
                status: 'AVAILABLE',
                capacityKg: 10000,
                currentKg: 0,
                currentBags: 0,
              },
            ],
          },
          {
            shelfId: 106,
            shelfCode: 'SHELF-U1-06',
            tierLevel: 2,
            bins: [
              {
                binId: 11,
                binCode: 'BIN-U1-11',
                rackCode: 'RACK-U1-03',
                shelfCode: 'SHELF-U1-06',
                status: 'AVAILABLE',
                capacityKg: 10000,
                currentKg: 0,
                currentBags: 0,
              },
              {
                binId: 12,
                binCode: 'BIN-U1-12',
                rackCode: 'RACK-U1-03',
                shelfCode: 'SHELF-U1-06',
                status: 'OCCUPIED',
                capacityKg: 10000,
                currentKg: 5000,
                currentBags: 200,
                materialCode: 'RM-FIL-CA-002',
                materialName: 'Ultra-Fine Coated CaCO3 85%',
                batchNo: 'BATCH-CA-FINE-04',
                qualityStatus: 'APPROVED',
                agingDays: 6,
              },
            ],
          },
        ],
      },
    ],
  },

  // 2. UNIT 2: EXTRUSION & WEAVING WIP WAREHOUSE
  {
    plantId: 1,
    plantName: 'Sri Vidha Polymers - Unit 1',
    warehouseId: 2,
    warehouseName: 'Unit 2 Extrusion & Weaving WIP Warehouse',
    type: 'Both',
    dimensions: { width: 1000, height: 650 },
    zones: [],
    racks: [
      {
        rackId: 201,
        rackCode: 'RACK-U2-01',
        aisle: 'Aisle WIP-1 (Tape Bobbins)',
        orientation: 'vertical',
        x: 340,
        y: 60,
        width: 260,
        height: 380,
        shelves: [
          {
            shelfId: 2011,
            shelfCode: 'SHELF-U2-01',
            tierLevel: 1,
            bins: [
              {
                binId: 21,
                binCode: 'BIN-U2-01',
                rackCode: 'RACK-U2-01',
                shelfCode: 'SHELF-U2-01',
                status: 'OCCUPIED',
                capacityKg: 3000,
                currentKg: 2400,
                materialCode: 'WIP-TAPE-800D',
                materialName: '800 Denier PP Flat Tape Bobbins (600 Pcs)',
                batchNo: 'WIP-BOB-2026-08',
                qualityStatus: 'APPROVED',
                agingDays: 2,
              },
              {
                binId: 22,
                binCode: 'BIN-U2-02',
                rackCode: 'RACK-U2-01',
                shelfCode: 'SHELF-U2-01',
                status: 'AVAILABLE',
                capacityKg: 3000,
                currentKg: 0,
              },
            ],
          },
        ],
      },
      {
        rackId: 202,
        rackCode: 'RACK-U2-02',
        aisle: 'Aisle WIP-2 (Woven Rolls)',
        orientation: 'vertical',
        x: 680,
        y: 60,
        width: 260,
        height: 380,
        shelves: [
          {
            shelfId: 2021,
            shelfCode: 'SHELF-U2-02',
            tierLevel: 1,
            bins: [
              {
                binId: 23,
                binCode: 'BIN-U2-03',
                rackCode: 'RACK-U2-02',
                shelfCode: 'SHELF-U2-02',
                status: 'OCCUPIED',
                capacityKg: 4000,
                currentKg: 3600,
                materialCode: 'WIP-ROLL-52CM',
                materialName: 'Circular Woven PP Fabric Roll 52cm (70 GSM)',
                batchNo: 'WIP-ROLL-2026-21',
                qualityStatus: 'APPROVED',
                agingDays: 3,
              },
              {
                binId: 24,
                binCode: 'BIN-U2-04',
                rackCode: 'RACK-U2-02',
                shelfCode: 'SHELF-U2-02',
                status: 'AVAILABLE',
                capacityKg: 4000,
                currentKg: 0,
              },
            ],
          },
        ],
      },
    ],
  },

  // 3. UNIT 3: FINISHED GOODS WAREHOUSE
  {
    plantId: 1,
    plantName: 'Sri Vidha Polymers - Unit 1',
    warehouseId: 3,
    warehouseName: 'Unit 3 Finished Goods Warehouse',
    type: 'FG',
    dimensions: { width: 1000, height: 650 },
    zones: [],
    racks: [
      // AISLE FG-1 (RACK-U3-01) - Seeded in backend
      {
        rackId: 301,
        rackCode: 'RACK-U3-01',
        aisle: 'Aisle FG-1 (Fertilizer Bags)',
        orientation: 'vertical',
        x: 300,
        y: 50,
        width: 200,
        height: 480,
        shelves: [
          {
            shelfId: 3011,
            shelfCode: 'SHELF-U3-01',
            tierLevel: 1,
            bins: [
              {
                binId: 3,
                binCode: 'BIN-U3-01',
                rackCode: 'RACK-U3-01',
                shelfCode: 'SHELF-U3-01',
                status: 'OCCUPIED',
                capacityKg: 25000,
                currentKg: 25000,
                currentBags: 500,
                materialCode: 'FG-BAG-50KG',
                materialName: '50KG PP Woven Fertilizer Bag (Laminated)',
                batchNo: 'FB-2026-BAG-01',
                qualityStatus: 'APPROVED',
                agingDays: 1,
                lastInspectionDate: '2026-09-22',
              },
              {
                binId: 31,
                binCode: 'BIN-U3-02',
                rackCode: 'RACK-U3-01',
                shelfCode: 'SHELF-U3-01',
                status: 'OCCUPIED',
                capacityKg: 25000,
                currentKg: 20000,
                currentBags: 400,
                materialCode: 'FG-BAG-50KG',
                materialName: '50KG PP Fertilizer Sacks - Batch 02',
                batchNo: 'FB-2026-BAG-02',
                qualityStatus: 'APPROVED',
                agingDays: 2,
              },
            ],
          },
          {
            shelfId: 3012,
            shelfCode: 'SHELF-U3-02',
            tierLevel: 2,
            bins: [
              {
                binId: 32,
                binCode: 'BIN-U3-03',
                rackCode: 'RACK-U3-01',
                shelfCode: 'SHELF-U3-02',
                status: 'AVAILABLE',
                capacityKg: 25000,
                currentKg: 0,
                currentBags: 0,
              },
              {
                binId: 33,
                binCode: 'BIN-U3-04',
                rackCode: 'RACK-U3-01',
                shelfCode: 'SHELF-U3-02',
                status: 'RESERVED',
                capacityKg: 25000,
                currentKg: 15000,
                currentBags: 300,
                materialCode: 'FG-SUGAR-50KG',
                materialName: 'Food Grade 50KG Sugar Bags',
                batchNo: 'FB-SUG-2026-90',
                qualityStatus: 'APPROVED',
                agingDays: 5,
              },
            ],
          },
        ],
      },

      // AISLE FG-2 (RACK-U3-02)
      {
        rackId: 302,
        rackCode: 'RACK-U3-02',
        aisle: 'Aisle FG-2 (Cement & Mineral Sacks)',
        orientation: 'vertical',
        x: 540,
        y: 50,
        width: 200,
        height: 480,
        shelves: [
          {
            shelfId: 3021,
            shelfCode: 'SHELF-U3-03',
            tierLevel: 1,
            bins: [
              {
                binId: 34,
                binCode: 'BIN-U3-05',
                rackCode: 'RACK-U3-02',
                shelfCode: 'SHELF-U3-03',
                status: 'OCCUPIED',
                capacityKg: 25000,
                currentKg: 25000,
                currentBags: 500,
                materialCode: 'FG-CEM-50KG',
                materialName: 'Block Bottom Valve Cement Bags',
                batchNo: 'FB-CEM-2026-14',
                qualityStatus: 'APPROVED',
                agingDays: 3,
              },
              {
                binId: 35,
                binCode: 'BIN-U3-06',
                rackCode: 'RACK-U3-02',
                shelfCode: 'SHELF-U3-03',
                status: 'AVAILABLE',
                capacityKg: 25000,
                currentKg: 0,
              },
            ],
          },
        ],
      },

      // AISLE FG-3 (RACK-U3-03)
      {
        rackId: 303,
        rackCode: 'RACK-U3-03',
        aisle: 'Aisle FG-3 (BOPP Laminated Bags)',
        orientation: 'vertical',
        x: 770,
        y: 50,
        width: 200,
        height: 480,
        shelves: [
          {
            shelfId: 3031,
            shelfCode: 'SHELF-U3-04',
            tierLevel: 1,
            bins: [
              {
                binId: 36,
                binCode: 'BIN-U3-07',
                rackCode: 'RACK-U3-03',
                shelfCode: 'SHELF-U3-04',
                status: 'OCCUPIED',
                capacityKg: 20000,
                currentKg: 18000,
                currentBags: 360,
                materialCode: 'FG-BOPP-PCC',
                materialName: 'Multicolor BOPP Rice Sacks (25KG)',
                batchNo: 'FB-BOPP-2026-05',
                qualityStatus: 'APPROVED',
                agingDays: 4,
              },
              {
                binId: 37,
                binCode: 'BIN-U3-08',
                rackCode: 'RACK-U3-03',
                shelfCode: 'SHELF-U3-04',
                status: 'AVAILABLE',
                capacityKg: 20000,
                currentKg: 0,
              },
            ],
          },
        ],
      },
    ],
  },
]

export function getFacilityById(warehouseId: number): WarehouseFacility {
  return (
    WAREHOUSE_FACILITIES.find((w) => w.warehouseId === warehouseId) ||
    WAREHOUSE_FACILITIES[0]
  )
}

export function getAllBins(facility: WarehouseFacility): LocationBinNode[] {
  const bins: LocationBinNode[] = []
  facility.racks.forEach((rack) => {
    rack.shelves.forEach((shelf) => {
      shelf.bins.forEach((bin) => {
        bins.push(bin)
      })
    })
  })
  return bins
}

export function calculateFacilityMetrics(facility: WarehouseFacility) {
  const allBins = getAllBins(facility)
  const totalBins = allBins.length
  const occupiedBins = allBins.filter((b) => b.status === 'OCCUPIED').length
  const availableBins = allBins.filter((b) => b.status === 'AVAILABLE').length
  const reservedBins = allBins.filter((b) => b.status === 'RESERVED').length
  const quarantineBins = allBins.filter((b) => b.status === 'QUARANTINE').length
  const nearFullBins = allBins.filter(
    (b) => b.status === 'NEAR_FULL' || (b.capacityKg > 0 && b.currentKg / b.capacityKg >= 0.9 && b.status !== 'QUARANTINE' && b.status !== 'RESERVED')
  ).length

  const totalCapacityKg = allBins.reduce((acc, b) => acc + b.capacityKg, 0)
  const currentTotalKg = allBins.reduce((acc, b) => acc + b.currentKg, 0)
  const utilizationPercent = totalCapacityKg > 0 ? Math.round((currentTotalKg / totalCapacityKg) * 100) : 0

  return {
    totalBins,
    occupiedBins,
    availableBins,
    reservedBins,
    quarantineBins,
    nearFullBins,
    totalCapacityKg,
    currentTotalKg,
    utilizationPercent,
  }
}

export const computeWarehouseMetrics = calculateFacilityMetrics

export function searchWarehouseBins(
  facility: WarehouseFacility,
  query: string
): LocationBinNode[] {
  if (!query.trim()) return []
  const q = query.trim().toLowerCase()
  const allBins = getAllBins(facility)

  return allBins.filter((b) => {
    return (
      b.binCode.toLowerCase().includes(q) ||
      b.rackCode.toLowerCase().includes(q) ||
      b.shelfCode.toLowerCase().includes(q) ||
      b.materialCode?.toLowerCase().includes(q) ||
      b.materialName?.toLowerCase().includes(q) ||
      b.batchNo?.toLowerCase().includes(q)
    )
  })
}

export function get5TierPath(
  facility: WarehouseFacility,
  bin: LocationBinNode
): StorageHierarchyPath {
  return {
    plantName: facility.plantName,
    warehouseName: facility.warehouseName,
    warehouseType: facility.type,
    rackCode: bin.rackCode,
    shelfCode: bin.shelfCode,
    binCode: bin.binCode,
  }
}

/**
 * Transforms live backend WarehouseStorageHierarchyResponse into WarehouseFacility UI model.
 * Preserves rack, shelf, and bin hierarchy while deriving accurate operational status.
 */
export function transformHierarchyToFacility(
  hierarchy: WarehouseStorageHierarchyResponse
): WarehouseFacility {
  const racks: LocationRackNode[] = (hierarchy.racks || []).map((r, rIdx) => {
    const rackCode = r.rackCode || `RACK-${r.rackId}`
    const shelves: LocationShelfNode[] = (r.shelves || []).map((s, sIdx) => {
      const tierLevel = s.shelfLevel ?? sIdx + 1
      const shelfCode = s.shelfCode || `${rackCode}-T${tierLevel}`
      const bins: LocationBinNode[] = (s.bins || []).map((b) => {
        let status: BinStatus = 'AVAILABLE'
        if (b.isActive === false) {
          status = 'QUARANTINE'
        } else if (b.isOverCapacity || (b.utilizationPct != null && b.utilizationPct >= 90)) {
          status = 'NEAR_FULL'
        } else if (
          (b.currentStockKg != null && b.currentStockKg > 0) ||
          (b.activePalletCount != null && b.activePalletCount > 0) ||
          (b.utilizationPct != null && b.utilizationPct > 0)
        ) {
          status = 'OCCUPIED'
        }

        return {
          binId: b.binId,
          binCode: b.binCode,
          rackCode,
          shelfCode,
          status,
          capacityKg: b.capacityKg || 5000,
          currentKg: b.currentStockKg || 0,
          availableCapacityKg: b.availableCapacityKg,
          utilizationPct: b.utilizationPct,
          activePalletCount: b.activePalletCount ?? 0,
          isOverCapacity: b.isOverCapacity,
          isActive: b.isActive,
          currentBags: b.maxBags != null && b.currentStockKg > 0 ? Math.round((b.currentStockKg / (b.capacityKg || 5000)) * b.maxBags) : undefined,
        }
      })

      return {
        shelfId: s.shelfId,
        shelfCode,
        tierLevel,
        totalCapacityKg: s.totalCapacityKg,
        totalCurrentStockKg: s.totalCurrentStockKg,
        utilizationPct: s.utilizationPct,
        isActive: s.isActive,
        bins,
      }
    })

    return {
      rackId: r.rackId,
      rackCode,
      aisle: `Aisle ${rackCode.replace(/RACK-U\d+-/, '') || String.fromCharCode(65 + (rIdx % 26))}`,
      totalCapacityKg: r.totalCapacityKg,
      totalCurrentStockKg: r.totalCurrentStockKg,
      utilizationPct: r.utilizationPct,
      isActive: r.isActive,
      shelves,
    }
  })

  return {
    plantId: hierarchy.plantId || 1,
    plantName: hierarchy.plantName || 'Plant Facility',
    warehouseId: hierarchy.warehouseId,
    warehouseName: hierarchy.warehouseName || `Warehouse #${hierarchy.warehouseId}`,
    type: (hierarchy.type as 'Raw' | 'FG' | 'Both' | 'WIP') || 'Raw',
    totalCapacityKg: hierarchy.totalCapacityKg,
    totalCurrentStockKg: hierarchy.totalCurrentStockKg,
    totalAvailableCapacityKg: hierarchy.totalAvailableCapacityKg,
    overallUtilizationPct: hierarchy.overallUtilizationPct,
    isActive: hierarchy.isActive,
    dimensions: { width: 1000, height: 650 },
    zones: [],
    racks,
  }
}
