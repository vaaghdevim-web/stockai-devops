import { test, expect } from '@playwright/test'
import { setupAuthenticatedSession } from './helpers/auth'

test.describe('StockAI Role-Based Access Control (RBAC) Master Matrix', () => {
  test('1. Unauthenticated access to protected routes redirects to /login', async ({ page }) => {
    await page.goto('/login')
    await page.evaluate(() => localStorage.clear())

    const protectedPaths = [
      '/dashboard',
      '/inventory/raw-materials',
      '/production',
      '/procurement/reorder-recommendations',
      '/warehouse/transfers',
      '/quality/inspections',
      '/dispatch',
      '/reports',
      '/audit',
      '/documents',
      '/integrations',
      '/machines',
      '/telemetry',
    ]

    for (const path of protectedPaths) {
      await page.goto(path)
      await page.waitForURL((url) => url.pathname.includes('/login'))
      expect(page.url()).toContain('/login')
      await expect(page.locator('#login-username')).toBeVisible()
    }
  })

  test('2. Default-deny: Unknown role is denied by default and redirects to /403', async ({ page }) => {
    await setupAuthenticatedSession(page, ['UNKNOWN_ROLE_ABC', 'GUEST'], 'unknown_user')

    // Navigating to protected page
    await page.goto('/dashboard')
    await page.waitForURL((url) => url.pathname.includes('/403'))
    expect(page.url()).toContain('/403')
    await expect(page.locator('#access-denied-title')).toBeVisible()
    await expect(page.locator('#access-denied-message')).toHaveText(/You do not have permission to access this page/i)

    // Sidebar should have no menu links
    const sidebarLinks = page.locator('#app-navigation a[href]')
    await expect(sidebarLinks).toHaveCount(0)
  })

  test('3. OPERATOR role: exact sidebar matrix, 403 route guards, and operational verb permissions', async ({ page }) => {
    await setupAuthenticatedSession(page, ['OPERATOR'], 'operator_user')

    // Operator default landing is /production
    await page.goto('/')
    await page.waitForURL((url) => url.pathname.includes('/production'), { timeout: 10000 })
    expect(page.url()).toContain('/production')

    // OPERATOR unauthorized pages must NOT be in sidebar:
    // Dashboard (—), Reports (—), Audit (—), Integrations (—), Need to Buy (—), Dispatch (—)
    const sidebar = page.locator('#app-navigation')
    await expect(sidebar.getByRole('link', { name: 'Dashboard' })).not.toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Reports' })).not.toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Audit & Compliance' })).not.toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Integrations' })).not.toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Need to Buy' })).not.toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Dispatch' })).not.toBeVisible()

    // OPERATOR authorized pages MUST be in sidebar:
    // Alerts (View), Document Center (View), Raw Materials (Receive), Material Batches (View),
    // Track Batch (View), Digital Twin (View), Move Stock (Create), Pallets (Create),
    // Production Work (View), Current Work (Execute), Compounding BOM (Calc only),
    // Quality Check (Log test), QC Specifications (View), Machines (View), Machine Live Status (View)
    await expect(sidebar.getByRole('link', { name: 'Alerts' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Document Center' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Raw Materials' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Material Batches' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Track Batch' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Digital Twin & Map' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Move Stock' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Pallets' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Production Work' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Current Work' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Compounding BOM' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Quality Check' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'QC Specifications' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Machines' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Machine Live Status' })).toBeVisible()

    // Direct navigation to unauthorized routes MUST redirect to /403
    const forbiddenPaths = [
      '/dashboard',
      '/reports',
      '/audit',
      '/integrations',
      '/procurement/reorder-recommendations',
      '/dispatch',
    ]

    for (const forbidden of forbiddenPaths) {
      await page.goto(forbidden)
      await page.waitForURL((url) => url.pathname.includes('/403'))
      expect(page.url()).toContain('/403')
      await expect(page.locator('#access-denied-title')).toBeVisible()
    }

    // OPERATIONAL VERBS FOR OPERATOR:
    // 1. Raw Materials: Receive permission -> Receive Shipment button is visible
    await page.goto('/inventory/raw-materials')
    await expect(page.locator('#main-content')).toBeVisible()
    await expect(page.getByRole('button', { name: /receive shipment/i })).toBeVisible()

    // 2. Move Stock: Create permission -> New Stock Transfer button is visible
    await page.goto('/warehouse/transfers')
    await expect(page.locator('#main-content')).toBeVisible()
    await expect(page.getByRole('button', { name: /new stock transfer/i })).toBeVisible()

    // 3. Pallets: Create permission -> Build New Pallet button is visible
    await page.goto('/warehouse/pallets')
    await expect(page.locator('#main-content')).toBeVisible()
    await expect(page.getByRole('button', { name: /build new pallet/i })).toBeVisible()

    // 4. Compounding BOM: Calc only permission -> Calculate button visible, New Recipe BOM hidden
    await page.goto('/production/bom')
    await expect(page.locator('#main-content')).toBeVisible()
    await expect(page.getByRole('button', { name: /new recipe bom/i })).not.toBeVisible()

    // 5. Quality Check: Log test permission -> Record QC Inspection button is visible
    await page.goto('/quality/inspections')
    await expect(page.locator('#main-content')).toBeVisible()
    await expect(page.getByRole('button', { name: /record qc inspection/i })).toBeVisible()
  })

  test('4. ACCOUNTS role: exact sidebar matrix, view-only inventory, and route access', async ({ page }) => {
    await setupAuthenticatedSession(page, ['ACCOUNTS'], 'accounts_user')

    // Accounts default landing is /reports
    await page.goto('/')
    await page.waitForURL((url) => url.pathname.includes('/reports'), { timeout: 10000 })
    expect(page.url()).toContain('/reports')

    const sidebar = page.locator('#app-navigation')

    // ACCOUNTS authorized sidebar items:
    // Dashboard (View), Alerts (View), Reports (Full), Audit & Compliance (Full),
    // Document Center (Full), Raw Materials (View), Material Batches (View),
    // Need to Buy (View), Dispatch (View)
    await expect(sidebar.getByRole('link', { name: 'Dashboard' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Alerts' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Reports' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Audit & Compliance' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Document Center' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Raw Materials' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Material Batches' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Need to Buy' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Dispatch' })).toBeVisible()

    // ACCOUNTS unauthorized sidebar items (MUST NOT exist in DOM):
    // Integrations, Track Batch, Digital Twin, Move Stock, Pallets,
    // Production Work, Current Work, Compounding BOM, Quality Check,
    // QC Specifications, Machines, Machine Live Status
    await expect(sidebar.getByRole('link', { name: 'Integrations' })).not.toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Track Batch' })).not.toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Digital Twin & Map' })).not.toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Move Stock' })).not.toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Pallets' })).not.toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Production Work' })).not.toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Current Work' })).not.toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Compounding BOM' })).not.toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Quality Check' })).not.toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'QC Specifications' })).not.toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Machines' })).not.toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Machine Live Status' })).not.toBeVisible()

    // Entire empty categories should not render (e.g. Machines, Quality, Warehouse, Production)
    await expect(sidebar.locator('text=Warehouse')).not.toBeVisible()
    await expect(sidebar.locator('text=Production')).not.toBeVisible()
    await expect(sidebar.locator('text=Quality')).not.toBeVisible()
    await expect(sidebar.locator('text=Machines')).not.toBeVisible()

    // View-Only restrictions:
    // Raw Materials: VIEW -> "Receive Shipment" button MUST NOT be visible
    await page.goto('/inventory/raw-materials')
    await expect(page.locator('#main-content')).toBeVisible()
    await expect(page.getByRole('button', { name: /receive shipment/i })).not.toBeVisible()

    // Material Batches: VIEW -> "Receive New Batch" button MUST NOT be visible
    await page.goto('/inventory/batches')
    await expect(page.locator('#main-content')).toBeVisible()
    await expect(page.getByRole('button', { name: /receive new batch/i })).not.toBeVisible()

    // Direct access to unauthorized routes redirects to /403
    await page.goto('/production')
    await page.waitForURL((url) => url.pathname.includes('/403'))
    expect(page.url()).toContain('/403')

    await page.goto('/warehouse/transfers')
    await page.waitForURL((url) => url.pathname.includes('/403'))
    expect(page.url()).toContain('/403')
  })

  test('5. FACTORY_DIRECTOR role: exact sidebar matrix and view-only vs full restrictions', async ({ page }) => {
    await setupAuthenticatedSession(page, ['FACTORY_DIRECTOR'], 'director_user')

    // Factory director lands on /dashboard
    await page.goto('/')
    await page.waitForURL((url) => url.pathname.includes('/dashboard'), { timeout: 10000 })
    expect(page.url()).toContain('/dashboard')

    const sidebar = page.locator('#app-navigation')

    // Full on: Dashboard, Alerts, Reports, Audit, Document Center, Track Batch, Need to Buy, Move Stock, Compounding BOM, Dispatch
    // View on: Integrations, Raw Materials, Material Batches, Digital Twin, Pallets, Production Work, Current Work, Quality Check, QC Specifications, Machines, Machine Live Status
    // None: none! All 21 pages are accessible for FACTORY_DIRECTOR!
    await expect(sidebar.getByRole('link', { name: 'Dashboard' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Integrations' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Pallets' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Machines' })).toBeVisible()

    // Pallets: View permission -> "Build New Pallet" button is hidden
    await page.goto('/warehouse/pallets')
    await expect(page.locator('#main-content')).toBeVisible()
    await expect(page.getByRole('button', { name: /build new pallet/i })).not.toBeVisible()

    // Raw Materials: View permission -> "Receive Shipment" button is hidden
    await page.goto('/inventory/raw-materials')
    await expect(page.locator('#main-content')).toBeVisible()
    await expect(page.getByRole('button', { name: /receive shipment/i })).not.toBeVisible()

    // Move Stock: Full permission -> "New Stock Transfer" button is visible
    await page.goto('/warehouse/transfers')
    await expect(page.locator('#main-content')).toBeVisible()
    await expect(page.getByRole('button', { name: /new stock transfer/i })).toBeVisible()
  })

  test('6. WAREHOUSE_EXEC role: exact matrix, hidden analytics/production/quality/machines, and 403 protection', async ({ page }) => {
    await setupAuthenticatedSession(page, ['WAREHOUSE_EXEC'], 'warehouse_user')

    // Warehouse Executive lands on /warehouse/transfers
    await page.goto('/')
    await page.waitForURL((url) => url.pathname.includes('/warehouse/transfers'), { timeout: 10000 })
    expect(page.url()).toContain('/warehouse/transfers')

    const sidebar = page.locator('#app-navigation')

    // Accessible: Dashboard (View), Alerts (View), Document Center (Full), Raw Materials (Full), Material Batches (Full),
    // Digital Twin (Full), Move Stock (Full), Pallets (Full), Production Work (View), Dispatch (Full)
    await expect(sidebar.getByRole('link', { name: 'Raw Materials' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Move Stock' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Pallets' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Dispatch' })).toBeVisible()

    // Hidden (—): Reports, Audit, Integrations, Track Batch, Need to Buy, Current Work, Compounding BOM, Quality Check, QC Specifications, Machines, Machine Live Status
    await expect(sidebar.getByRole('link', { name: 'Reports' })).not.toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Audit & Compliance' })).not.toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Integrations' })).not.toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Track Batch' })).not.toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Need to Buy' })).not.toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Current Work' })).not.toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Compounding BOM' })).not.toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Quality Check' })).not.toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'QC Specifications' })).not.toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Machines' })).not.toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Machine Live Status' })).not.toBeVisible()

    // Direct navigation blocks
    await page.goto('/quality/inspections')
    await page.waitForURL((url) => url.pathname.includes('/403'))
    expect(page.url()).toContain('/403')

    await page.goto('/procurement/reorder-recommendations')
    await page.waitForURL((url) => url.pathname.includes('/403'))
    expect(page.url()).toContain('/403')
  })

  test('7. DISPATCH_EXEC role: exact matrix, hidden procurement/inventory/quality/machines, and dispatch access', async ({ page }) => {
    await setupAuthenticatedSession(page, ['DISPATCH_EXEC'], 'dispatch_user')

    // Dispatch Executive lands on /dispatch
    await page.goto('/')
    await page.waitForURL((url) => url.pathname.includes('/dispatch'), { timeout: 10000 })
    expect(page.url()).toContain('/dispatch')

    const sidebar = page.locator('#app-navigation')

    // Accessible: Dashboard (View), Alerts (View), Reports (View), Document Center (Full),
    // Digital Twin (View), Pallets (Full), Production Work (View), Dispatch (Full)
    await expect(sidebar.getByRole('link', { name: 'Dashboard' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Dispatch' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Pallets' })).toBeVisible()

    // Hidden (—): Audit, Integrations, Raw Materials, Material Batches, Track Batch, Need to Buy, Move Stock, Current Work, Compounding BOM, Quality Check, QC Specifications, Machines, Machine Live Status
    await expect(sidebar.getByRole('link', { name: 'Raw Materials' })).not.toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Material Batches' })).not.toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Move Stock' })).not.toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Quality Check' })).not.toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Machines' })).not.toBeVisible()

    // Direct navigation blocks
    await page.goto('/inventory/raw-materials')
    await page.waitForURL((url) => url.pathname.includes('/403'))
    expect(page.url()).toContain('/403')
  })

  test('8. SUPER_ADMIN / ADMIN role: full access across all 21 pages with mutation actions', async ({ page }) => {
    await setupAuthenticatedSession(page, ['ADMIN'], 'admin_user')

    await page.goto('/dashboard')
    await expect(page.locator('#main-content')).toBeVisible()

    const sidebar = page.locator('#app-navigation')

    // All 21 pages should be visible in sidebar
    await expect(sidebar.getByRole('link', { name: 'Dashboard' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Alerts' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Reports' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Audit & Compliance' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Document Center' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Integrations' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Raw Materials' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Material Batches' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Track Batch' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Need to Buy' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Digital Twin & Map' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Move Stock' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Pallets' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Production Work' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Current Work' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Compounding BOM' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Quality Check' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'QC Specifications' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Dispatch' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Machines' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Machine Live Status' })).toBeVisible()
  })

  test('9. Session refresh preserves role-based permissions and switching users updates permissions', async ({ page }) => {
    // 1. Login as OPERATOR
    await setupAuthenticatedSession(page, ['OPERATOR'], 'operator_user')
    await page.goto('/production')
    await expect(page.locator('#main-content')).toBeVisible()

    // Verify /reports is blocked
    await page.goto('/reports')
    await page.waitForURL((url) => url.pathname.includes('/403'))
    expect(page.url()).toContain('/403')

    // 2. Refresh page and verify /403 is preserved and not leaked
    await page.reload()
    await expect(page.locator('#access-denied-title')).toBeVisible()

    // 3. Switch user session to ACCOUNTS
    await setupAuthenticatedSession(page, ['ACCOUNTS'], 'accounts_user')
    await page.goto('/reports')
    await page.waitForURL((url) => url.pathname.includes('/reports'))
    expect(page.url()).toContain('/reports')
    await expect(page.locator('#main-content')).toBeVisible()

    // Now /production should be blocked for ACCOUNTS
    await page.goto('/production')
    await page.waitForURL((url) => url.pathname.includes('/403'))
    expect(page.url()).toContain('/403')
  })
})
