import { test, expect } from '@playwright/test'
import { setupAuthenticatedSession } from './helpers/auth'

test.describe('Factory Operations Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Setup authenticated session with full business privileges for read-only navigation smoke tests
    await setupAuthenticatedSession(
      page,
      [
        'SUPER_ADMIN',
        'PLANT_MANAGER',
        'STORE_MANAGER',
        'PURCHASE_MANAGER',
        'PRODUCTION_MANAGER',
        'QUALITY_MANAGER',
        'WAREHOUSE_EXECUTIVE',
      ],
      'supervisor_user'
    )
  })

  test('TEST E: Dashboard renders core operational summary and pillar cards without crashing', async ({ page }) => {
    await page.goto('/dashboard')

    await expect(page.locator('#main-content')).toBeVisible()
    await expect(page.getByRole('heading', { name: /factory operations overview/i })).toBeVisible()

    // Verify primary pillars cards
    await expect(page.getByRole('heading', { name: 'Raw Materials', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Production Work', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Quality Check', exact: true })).toBeVisible()

    // Verify refresh button is functional
    const refreshBtn = page.getByRole('button', { name: /refresh all/i })
    await expect(refreshBtn).toBeVisible()
    await refreshBtn.click()
  })

  test('TEST F: Inventory Raw Materials page renders material catalog and controls', async ({ page }) => {
    await page.goto('/inventory/raw-materials')

    await expect(page.locator('#main-content')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    // Verify catalog table or empty state renders without uncaught exceptions
    const content = page.locator('#main-content')
    await expect(content).toBeVisible()
  })

  test('TEST G: Production Work and WIP pages render manufacturing queues safely', async ({ page }) => {
    await page.goto('/production')

    await expect(page.locator('#main-content')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // Navigate to Current Work (WIP)
    await page.goto('/production/wip')
    await expect(page.locator('#main-content')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('TEST H: Quality Inspections ledger renders testing records', async ({ page }) => {
    await page.goto('/quality/inspections')

    await expect(page.locator('#main-content')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('TEST I: Warehouse Transfers and Digital Twin map render correctly', async ({ page }) => {
    await page.goto('/warehouse/transfers')

    await expect(page.locator('#main-content')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // Digital Twin Map route
    await page.goto('/warehouse/map')
    await expect(page.locator('#main-content')).toBeVisible()
  })

  test('TEST J: Procurement Reorder Recommendations page renders replenishment triggers', async ({ page }) => {
    await page.goto('/procurement/reorder-recommendations')

    await expect(page.locator('#main-content')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('TEST K: Dispatch & Outbound Logistics page renders outbound ledger and controls', async ({ page }) => {
    await page.goto('/dispatch')

    await expect(page.locator('#main-content')).toBeVisible()
    await expect(page.getByRole('heading', { name: /dispatch & outbound logistics/i, level: 1 })).toBeVisible()
  })
})
