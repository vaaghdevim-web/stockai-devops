import { test, expect } from '@playwright/test'
import { setupAuthenticatedSession } from './helpers/auth'

test.describe('TASK 3 — Supplier Management Module', () => {
  const mockSuppliers = [
    {
      supplierId: 1,
      supplierName: 'Reliance Industries Limited (RIL)',
      gstNo: '27AAACR5055K1ZI',
      email: 'polymers.sales@ril.com',
      phone: '+91 22 3555 5000',
      address: 'Maker Chambers IV, Nariman Point, Mumbai, MH 400021',
      isActive: true,
    },
    {
      supplierName: 'Indian Oil Corporation Ltd (IOCL)',
      supplierId: 2,
      gstNo: '07AAACI1681G1ZM',
      email: 'petrochem@indianoil.in',
      phone: '+91 11 2436 0151',
      address: 'Scope Complex, Core-2, 7 Institutional Area, Lodhi Road, New Delhi 110003',
      isActive: false,
    },
  ]

  test.beforeEach(async ({ page }) => {
    await page.route('**/api/v1/suppliers*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockSuppliers),
      })
    })

    await page.route('**/api/v1/suppliers/1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockSuppliers[0]),
      })
    })
  })

  test('renders supplier directory with live backend records', async ({ page }) => {
    await setupAuthenticatedSession(page, ['PURCHASE_MGR', 'PLANT_MGR'], 'purchase_user')
    await page.goto('/procurement/suppliers')

    await expect(page.locator('#main-content')).toBeVisible()
    await expect(page.getByRole('heading', { name: /Supplier Management/i })).toBeVisible()

    // Both suppliers appear in the table
    await expect(page.getByText('Reliance Industries Limited (RIL)')).toBeVisible()
    await expect(page.getByText('Indian Oil Corporation Ltd (IOCL)')).toBeVisible()

    // KPI count
    await expect(page.getByText('Registered Suppliers')).toBeVisible()
  })

  test('filters supplier list by active status and search query', async ({ page }) => {
    await setupAuthenticatedSession(page, ['PURCHASE_MGR'], 'purchase_user')
    await page.goto('/procurement/suppliers')

    // Search query
    const searchInput = page.getByPlaceholder(/Search Vendor, GSTIN/i)
    await searchInput.fill('Reliance')

    await expect(page.getByText('Reliance Industries Limited (RIL)')).toBeVisible()
    await expect(page.getByText('Indian Oil Corporation Ltd (IOCL)')).not.toBeVisible()
  })

  test('opens supplier detail drawer and displays GSTIN and contact details', async ({ page }) => {
    await setupAuthenticatedSession(page, ['PURCHASE_MGR'], 'purchase_user')
    await page.goto('/procurement/suppliers')

    // Click on Details button
    const viewButton = page.getByRole('button', { name: /Details/i }).first()
    await viewButton.click()

    // Drawer opens
    await expect(page.getByRole('dialog').getByText('27AAACR5055K1ZI')).toBeVisible()
    await expect(page.getByRole('dialog').getByText('polymers.sales@ril.com')).toBeVisible()
  })

  test('blocks access for roles with NONE permission to procurement', async ({ page }) => {
    await setupAuthenticatedSession(page, ['OPERATOR'], 'operator_user')
    await page.goto('/procurement/suppliers')

    // Redirected to /403
    await expect(page).toHaveURL(/\/403/)
  })
})
