import { Page, expect } from '@playwright/test'

/**
 * Helper to log in as a non-MFA seeded user (e.g. operator01 / operator123).
 */
export async function loginAsOperator(page: Page) {
  await page.goto('/login')
  await page.fill('#login-username', 'operator01')
  await page.fill('#login-password', 'operator123')
  await page.click('button[type="submit"]')

  // Wait for navigation past the login screen
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 })
  await expect(page.locator('#main-content')).toBeVisible()
}

/**
 * Helper to authenticate directly with mock session in localStorage
 * for isolated module smoke tests.
 */
export async function setupAuthenticatedSession(
  page: Page,
  roles: string[] = ['ADMIN', 'OPERATOR', 'PURCHASE_MANAGER', 'QUALITY_MANAGER', 'WAREHOUSE_EXECUTIVE'],
  userName = 'e2e_test_user'
) {
  await page.goto('/login')
  await page.evaluate(
    ({ roles, userName }) => {
      localStorage.setItem('accessToken', 'mock-e2e-jwt-token-header.payload.signature')
      localStorage.setItem('roles', JSON.stringify(roles))
      localStorage.setItem('userName', userName)
    },
    { roles, userName }
  )
}
