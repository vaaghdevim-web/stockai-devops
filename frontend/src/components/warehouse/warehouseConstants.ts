export const MASTER_WAREHOUSES = [
  { id: 1, name: 'Unit 1 Raw Material Warehouse', type: 'Raw' },
  { id: 2, name: 'Unit 2 Extrusion & Weaving WIP Warehouse', type: 'Both' },
  { id: 3, name: 'Unit 3 Finished Goods Warehouse', type: 'FG' },
]

export const MASTER_BINS = [
  { id: 1, warehouseId: 1, code: 'BIN-U1-01', label: 'Unit 1 — Rack 01 / Shelf 01' },
  { id: 2, warehouseId: 1, code: 'BIN-U1-02', label: 'Unit 1 — Rack 01 / Shelf 02' },
  { id: 3, warehouseId: 1, code: 'BIN-U1-03', label: 'Unit 1 — Rack 01 / Shelf 02' },
  { id: 4, warehouseId: 1, code: 'BIN-U1-04', label: 'Unit 1 — Rack 01 / Shelf 02' },
  { id: 5, warehouseId: 3, code: 'BIN-U3-01', label: 'Unit 3 — Rack 03 / Shelf 01' },
  { id: 6, warehouseId: 3, code: 'BIN-U3-02', label: 'Unit 3 — Rack 03 / Shelf 01' },
  { id: 7, warehouseId: 3, code: 'BIN-U3-03', label: 'Unit 3 — Rack 03 / Shelf 02' },
]
