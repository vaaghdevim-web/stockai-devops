import { test, expect } from '@playwright/test'
import { setupAuthenticatedSession } from './helpers/auth'

test.describe('Dispatch & Outbound Logistics Module', () => {
  const mockDispatchList = [
    {
      dispatchId: 101,
      dispatchNumber: 'DSP-20260928-TEST01',
      orderId: 1,
      orderNumber: 'ORD-2026-001',
      customerName: 'IFFCO Fertilizer Corp',
      vehicleId: 1,
      vehicleNumber: 'AP-16-TX-9874',
      driverId: 1,
      driverName: 'Ramesh Kumar',
      driverPhone: '+91 98765 43210',
      dispatchDate: '2026-09-28',
      expectedDeliveryDate: '2026-09-30',
      actualDeliveryDate: null,
      status: 'Prepared',
      carrier: 'VRL Logistics',
      shippingMethod: 'Road Freight',
      trackingNumber: 'VRL-99201',
      createdByUserName: 'dispatchexec',
      createdAt: '2026-09-28T10:00:00Z',
      items: [
        {
          dispatchItemId: 1,
          allocationId: 1,
          finishedBatchId: 1,
          finishedBatchNo: 'FB-20260901-001',
          productCode: 'PROD-PP-50KG',
          productName: '50KG PP Fertilizer Bag',
          quantity: 3000,
          uom: 'BAGS',
        },
      ],
    },
    {
      dispatchId: 102,
      dispatchNumber: 'DSP-20260928-TEST02',
      orderId: 2,
      orderNumber: 'ORD-2026-002',
      customerName: 'Kribhco Agro Ltd',
      vehicleId: 2,
      vehicleNumber: 'TS-09-UB-1234',
      driverId: 2,
      driverName: 'Suresh Rao',
      driverPhone: '+91 91234 56789',
      dispatchDate: '2026-09-28',
      expectedDeliveryDate: '2026-09-29',
      actualDeliveryDate: null,
      status: 'Dispatched',
      carrier: 'Internal Fleet',
      shippingMethod: 'Express Truckload',
      trackingNumber: 'TRK-2026-002',
      createdByUserName: 'dispatchexec',
      createdAt: '2026-09-28T11:00:00Z',
      items: [
        {
          dispatchItemId: 2,
          allocationId: null,
          finishedBatchId: 2,
          finishedBatchNo: 'FB-20260901-002',
          productCode: 'PROD-PP-25KG',
          productName: '25KG PP Woven Bag',
          quantity: 1500,
          uom: 'BAGS',
        },
      ],
    },
  ]

  const mockVehicles = [
    {
      vehicleId: 1,
      vehicleNumber: 'AP-16-TX-9874',
      vehicleType: 'Heavy Truck',
      capacity: 10000,
      capacityUomCode: 'KG',
      isActive: true,
    },
  ]

  const mockDrivers = [
    {
      driverId: 1,
      driverName: 'Ramesh Kumar',
      licenseNumber: 'DL-IND-88741',
      licenseExpiry: '2028-12-31',
      phone: '+91 98765 43210',
      isActive: true,
    },
  ]

  test.beforeEach(async ({ page }) => {
    // Intercept all master and supporting services
    await page.route('**/api/v1/vehicles**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockVehicles),
      })
    })

    await page.route('**/api/v1/drivers**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockDrivers),
      })
    })

    await page.route('**/api/v1/production-runs**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    })

    await page.route('**/api/v1/documents**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    })

    await page.route('**/api/v1/qc/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    })
  })

  test('1. DISPATCH_EXEC (FULL): Renders dispatch ledger, summary cards, and allows viewing details & create modal', async ({
    page,
  }) => {
    await page.route('**/api/v1/dispatches**', async (route) => {
      const url = route.request().url()
      if (url.includes('/api/v1/dispatches/101')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockDispatchList[0]),
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockDispatchList),
        })
      }
    })

    await setupAuthenticatedSession(page, ['DISPATCH_EXEC'], 'dispatch_operator')

    await page.goto('/dispatch')
    await expect(page.locator('#main-content')).toBeVisible()

    // Verify Page Header
    await expect(
      page.getByRole('heading', { name: /dispatch & outbound logistics/i, level: 1 }),
    ).toBeVisible()

    // Verify Industrial KPI Summary Cards
    await expect(page.getByText('Total Shipments')).toBeVisible()
    await expect(page.getByText('Prepared / Staging')).toBeVisible()
    await expect(page.getByText('In-Transit / Dispatched')).toBeVisible()
    await expect(page.getByRole('paragraph').filter({ hasText: 'Delivered' })).toBeVisible()

    // Verify FULL permission action: Create Dispatch button is visible
    const createBtn = page.getByRole('button', { name: /create dispatch/i })
    await expect(createBtn).toBeVisible()

    // Verify Ledger Table and filter tabs
    await expect(page.getByRole('heading', { name: /outbound dispatch ledger/i })).toBeVisible()
    await expect(page.getByRole('button', { name: 'All Dispatches' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Prepared' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Dispatched' })).toBeVisible()

    // Verify rows rendered
    await expect(page.getByText('DSP-20260928-TEST01')).toBeVisible()
    await expect(page.getByText('IFFCO Fertilizer Corp')).toBeVisible()

    // Open Create Dispatch Modal
    await createBtn.click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(
      page.getByRole('heading', { name: /create outbound dispatch shipment/i }),
    ).toBeVisible()
    await expect(page.locator('#form-order-id')).toBeVisible()
    await expect(page.getByRole('button', { name: /add item/i })).toBeVisible()

    // Close modal
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()

    // Open Details Drawer
    const detailsBtn = page.getByRole('button', { name: /details/i }).first()
    await detailsBtn.click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('dialog').getByRole('heading', { name: /item manifest/i })).toBeVisible()
    await expect(page.getByText('50KG PP Fertilizer Bag')).toBeVisible()

    // Close drawer
    await page.getByRole('dialog').getByRole('button', { name: /close/i }).last().click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  test('2. OPERATOR (NONE): Direct access to /dispatch is blocked and redirected to /403', async ({
    page,
  }) => {
    await setupAuthenticatedSession(page, ['OPERATOR'], 'plant_operator')

    await page.goto('/dispatch')
    await page.waitForURL((url) => url.pathname.includes('/403'), { timeout: 10000 })
    expect(page.url()).toContain('/403')
  })

  test('3. PURCHASE_MGR (VIEW): Accesses /dispatch as read-only (No Create button, No action mutations in table)', async ({
    page,
  }) => {
    await page.route('**/api/v1/dispatches**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockDispatchList),
      })
    })

    await setupAuthenticatedSession(page, ['PURCHASE_MGR'], 'purchase_executive')

    await page.goto('/dispatch')
    await expect(page.locator('#main-content')).toBeVisible()
    await expect(
      page.getByRole('heading', { name: /dispatch & outbound logistics/i, level: 1 }),
    ).toBeVisible()

    // Read-only user MUST NOT see the top "Create Dispatch" button
    await expect(page.getByRole('button', { name: /create dispatch/i })).not.toBeVisible()

    // In the dispatch table, read-only user MUST NOT see mutation action buttons like Dispatch or Delivered
    const table = page.locator('table').first()
    await expect(table.getByRole('button', { name: /^dispatch$/i })).not.toBeVisible()
    await expect(table.getByRole('button', { name: /^delivered$/i })).not.toBeVisible()

    // Read-only user CAN still view details
    await expect(table.getByRole('button', { name: /details/i }).first()).toBeVisible()
  })

  test('4. Real/Mocked Contract: Create dispatch and lifecycle actions with confirmation dialog', async ({
    page,
  }) => {
    await page.route('**/api/v1/dispatches**', async (route) => {
      const url = route.request().url()
      const method = route.request().method()
      if (url.includes('/api/v1/dispatches/101/dispatch')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ...mockDispatchList[0],
            status: 'Dispatched',
          }),
        })
      } else if (method === 'POST') {
        const payload = route.request().postDataJSON()
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            dispatchId: 103,
            dispatchNumber: 'DSP-20260928-NEW03',
            orderId: payload.orderId,
            orderNumber: 'ORD-2026-003',
            customerName: 'Tata Chemicals Ltd',
            vehicleId: payload.vehicleId || null,
            vehicleNumber: 'AP-16-TX-9874',
            driverId: payload.driverId || null,
            driverName: 'Ramesh Kumar',
            driverPhone: '+91 98765 43210',
            dispatchDate: payload.dispatchDate || '2026-09-28',
            expectedDeliveryDate: payload.expectedDeliveryDate || null,
            actualDeliveryDate: null,
            status: payload.autoDispatch ? 'Dispatched' : 'Prepared',
            carrier: payload.carrier || 'Internal Fleet',
            shippingMethod: payload.shippingMethod || 'Road Freight',
            trackingNumber: payload.trackingNumber || null,
            createdByUserName: 'admin_user',
            createdAt: '2026-09-28T12:00:00Z',
            items: [
              {
                dispatchItemId: 3,
                allocationId: null,
                finishedBatchId: payload.items[0].finishedBatchId,
                finishedBatchNo: 'FB-20260901-003',
                productCode: 'PROD-PP-50KG',
                productName: '50KG PP Fertilizer Bag',
                quantity: payload.items[0].quantity,
                uom: 'BAGS',
              },
            ],
          }),
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockDispatchList),
        })
      }
    })

    await setupAuthenticatedSession(page, ['ADMIN'], 'admin_user')
    await page.goto('/dispatch')

    // Confirm row rendered with DSP-20260928-TEST01
    await expect(page.getByText('DSP-20260928-TEST01')).toBeVisible()

    // Trigger "Dispatch" button
    const dispatchRowBtn = page.getByRole('button', { name: /^dispatch$/i }).first()
    await expect(dispatchRowBtn).toBeVisible()
    await dispatchRowBtn.click()

    // Verify confirmation modal appears with inventory deduction warning
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText(/inventory deduction warning/i)).toBeVisible()

    // Click confirm inside modal
    const confirmBtn = page.getByRole('button', { name: /confirm & dispatch stock/i })
    await expect(confirmBtn).toBeVisible()
    await confirmBtn.click()

    // Confirmation modal closes and success banner appears
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(page.getByText(/successfully marked as dispatched/i)).toBeVisible()
  })

  test('5. Error Handling: Displays error banner when backend API fails', async ({ page }) => {
    // Intercept with 500 error
    await page.route('**/api/v1/dispatches**', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Internal server error loading dispatches' }),
      })
    })

    await setupAuthenticatedSession(page, ['DISPATCH_EXEC'], 'dispatch_user')
    await page.goto('/dispatch')

    await expect(page.getByRole('heading', { name: /dispatch request failed/i })).toBeVisible()
    await expect(page.getByText(/internal server error loading dispatches/i)).toBeVisible()
  })

  test('6. Secondary 403 Tolerance: 403 on secondary Production/Quality/Documents APIs does not break /dispatch or show red banners', async ({
    page,
  }) => {
    // Intercept core dispatches with valid data
    await page.route('**/api/v1/dispatches**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockDispatchList),
      })
    })

    // Simulate 403 Forbidden on secondary endpoints
    await page.route('**/api/v1/production-runs**', async (route) => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Production data unavailable — Forbidden' }),
      })
    })

    await page.route('**/api/v1/documents**', async (route) => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Documents data unavailable — Forbidden' }),
      })
    })

    await page.route('**/api/v1/qc/**', async (route) => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Quality data unavailable — Forbidden' }),
      })
    })

    await setupAuthenticatedSession(page, ['DISPATCH_EXEC'], 'dispatchexec')
    await page.goto('/dispatch')

    await expect(page.locator('#main-content')).toBeVisible()

    // Verify core dispatch ledger and summary cards render cleanly
    await expect(
      page.getByRole('heading', { name: /dispatch & outbound logistics/i, level: 1 }),
    ).toBeVisible()
    await expect(page.getByText('DSP-20260928-TEST01')).toBeVisible()
    await expect(page.getByText('IFFCO Fertilizer Corp')).toBeVisible()

    // Assert that NO large red error banners are displayed
    await expect(page.getByText(/production data unavailable/i)).not.toBeVisible()
    await expect(page.getByText(/documents data unavailable/i)).not.toBeVisible()
    await expect(page.getByText(/quality data unavailable/i)).not.toBeVisible()
    await expect(page.getByText(/service unavailable/i)).not.toBeVisible()
  })

  test('5. TASK 4: Driver Management tab renders driver roster, licenses, and details drawer', async ({
    page,
  }) => {
    await setupAuthenticatedSession(page, ['DISPATCH_EXEC'], 'dispatchexec')
    await page.goto('/dispatch')

    // Click on Driver Management tab
    await page.getByRole('button', { name: /Driver Management/i }).click()

    await expect(page.getByText('Total Drivers')).toBeVisible()
    await expect(page.getByText('Ramesh Kumar')).toBeVisible()
    await expect(page.getByText('DL-IND-88741')).toBeVisible()

    // Open driver details drawer
    await page.getByRole('button', { name: /Details/i }).first().click()
    await expect(page.getByText('+91 98765 43210')).toBeVisible()
  })

  test('6. TASK 5: Vehicle Management tab renders fleet vehicles, capacities, and details drawer', async ({
    page,
  }) => {
    await setupAuthenticatedSession(page, ['DISPATCH_EXEC'], 'dispatchexec')
    await page.goto('/dispatch')

    // Click on Fleet & Vehicles tab
    await page.getByRole('button', { name: /Fleet & Vehicles/i }).click()

    await expect(page.getByText('Fleet Total')).toBeVisible()
    await expect(page.getByText('AP-16-TX-9874')).toBeVisible()
    await expect(page.getByText('10,000 KG')).toBeVisible()

    // Open vehicle details drawer
    await page.getByRole('button', { name: /Details/i }).first().click()
    await expect(page.getByText('Heavy Truck')).toBeVisible()
  })
})
