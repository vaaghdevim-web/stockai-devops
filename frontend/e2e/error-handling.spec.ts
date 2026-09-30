import { test, expect } from '@playwright/test'
import { setupAuthenticatedSession } from './helpers/auth'

test.describe('Error State Interception Tests', () => {
  test('TEST L: Intercepted API failure displays readable error state and does not crash frontend', async ({
    page,
  }) => {
    // Authenticate session
    await setupAuthenticatedSession(page, ['SUPER_ADMIN'], 'error_test_user')

    // Intercept materials API request to simulate backend service failure (HTTP 500)
    await page.route('**/api/v1/inventory/raw-materials**', (route) => {
      return route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 500,
          error: 'Internal Server Error',
          message: 'Simulated downstream database timeout for E2E resilience test',
        }),
      })
    })

    // Navigate to raw materials page
    await page.goto('/inventory/raw-materials')

    // Verify main content loaded without a blank screen or unhandled JS crash
    await expect(page.locator('#main-content')).toBeVisible()

    // Verify user-friendly error message is displayed
    const errorContainer = page.locator('text=Unable to load raw material catalog')
      .or(page.locator('text=Simulated downstream database timeout'))
      .or(page.locator('[role="alert"]'))

    await expect(errorContainer.first()).toBeVisible({ timeout: 5000 })
  })
})
