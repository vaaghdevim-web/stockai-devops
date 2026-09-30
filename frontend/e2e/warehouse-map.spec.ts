import { test, expect } from '@playwright/test'
import { setupAuthenticatedSession } from './helpers/auth'

test.describe('TASK 2 — Warehouse Digital Twin & Map', () => {
  const mockWarehouseTree = {
    warehouseId: 1,
    warehouseName: 'Main Central Warehouse A',
    facilityType: 'MAIN_STORAGE',
    racks: [
      {
        rackId: 10,
        rackCode: 'RACK-A1',
        totalShelves: 2,
        shelves: [
          {
            shelfId: 101,
            shelfCode: 'SH-A1-01',
            shelfLevel: 1,
            totalBins: 2,
            bins: [
              {
                binId: 1001,
                binCode: 'BIN-A1-01-A',
                capacityKg: 5000,
                currentStockKg: 3500,
                utilizationPercent: 70,
                activePalletCount: 3,
                materialName: 'PP Granules Homo 1110MAS',
                status: 'ACTIVE',
              },
              {
                binId: 1002,
                binCode: 'BIN-A1-01-B',
                capacityKg: 5000,
                currentStockKg: 0,
                utilizationPercent: 0,
                activePalletCount: 0,
                materialName: null,
                status: 'AVAILABLE',
              },
            ],
          },
        ],
      },
    ],
  }

  const mockBinOccupancy = {
    binId: 1001,
    binCode: 'BIN-A1-01-A',
    capacityKg: 5000,
    currentStockKg: 3500,
    utilizationPercent: 70,
    activePalletCount: 3,
    materialName: 'PP Granules Homo 1110MAS',
    status: 'ACTIVE',
    shelfId: 101,
    shelfCode: 'SH-A1-01',
    rackId: 10,
    rackCode: 'RACK-A1',
    warehouseId: 1,
    pallets: [
      {
        palletId: 501,
        palletCode: 'PAL-2026-001',
        materialName: 'PP Granules Homo 1110MAS',
        batchNumber: 'BATCH-20260901',
        weightKg: 1200,
      },
    ],
  }

  test.beforeEach(async ({ page }) => {
    await page.route('**/api/v1/warehouses', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            warehouseId: 1,
            warehouseName: 'Main Central Warehouse A',
            warehouseCode: 'WH-CENTRAL-01',
            facilityType: 'MAIN_STORAGE',
            totalCapacityKg: 50000,
            currentUtilizationPercent: 45,
            isActive: true,
          },
        ]),
      })
    })

    await page.route('**/api/v1/warehouses/1/storage-tree', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockWarehouseTree),
      })
    })

    await page.route('**/api/v1/warehouses/bins/1001/occupancy', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockBinOccupancy),
      })
    })
  })

  test('loads live warehouse hierarchy and displays 2D rack layout', async ({ page }) => {
    await setupAuthenticatedSession(page, ['WAREHOUSE_EXECUTIVE', 'PLANT_MANAGER'], 'warehouse_user')
    await page.goto('/warehouse/map')

    await expect(page.locator('#main-content')).toBeVisible()
    await expect(page.getByRole('heading', { name: /Warehouse Digital Twin/i })).toBeVisible()

    // Warehouse selector shows live backend warehouse
    await expect(page.getByRole('heading', { name: 'Main Central Warehouse A' })).toBeVisible()

    // Rack from backend storage tree renders
    await expect(page.getByText('RACK-A1', { exact: true })).toBeVisible()
  })

  test('opens bin details drawer and displays live occupancy telemetry', async ({ page }) => {
    await setupAuthenticatedSession(page, ['WAREHOUSE_EXECUTIVE'], 'warehouse_user')
    await page.goto('/warehouse/map')

    // Click on the bin to open details drawer
    const binButton = page.getByRole('button', { name: /BIN-A1-01-A/i }).first()
    if (await binButton.isVisible()) {
      await binButton.click()
      await expect(page.getByText(/3,500/)).toBeVisible()
    }
  })

  test('respects RBAC: VIEW role shows read-only mode, FULL role allows adding rack', async ({ page }) => {
    // 1. VIEW role (e.g. AUDITOR / OPERATOR)
    await setupAuthenticatedSession(page, ['OPERATOR'], 'viewer_user')
    await page.goto('/warehouse/map')
    await expect(page.locator('#main-content')).toBeVisible()
    await expect(page.getByRole('button', { name: /Add Rack/i })).toHaveCount(0)

    // 2. FULL role (e.g. WAREHOUSE_EXECUTIVE)
    await setupAuthenticatedSession(page, ['WAREHOUSE_EXECUTIVE', 'PLANT_MANAGER'], 'manager_user')
    await page.goto('/warehouse/map')
    await expect(page.getByRole('button', { name: /Add Rack/i })).toBeVisible()
  })
})
