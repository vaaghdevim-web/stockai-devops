import { test, expect } from '@playwright/test'

test.describe('Authentication & Access Flow', () => {
  test('TEST A: Login page loads and rejects invalid credentials', async ({ page }) => {
    await page.goto('/login')
    await page.evaluate(() => localStorage.clear())

    // Verify all core login UI elements are visible
    await expect(page.locator('#login-username')).toBeVisible()
    await expect(page.locator('#login-password')).toBeVisible()
    const submitButton = page.locator('button[type="submit"]')
    await expect(submitButton).toBeVisible()
    await expect(submitButton).toContainText(/sign in/i)

    // Attempt invalid credentials
    await page.fill('#login-username', 'invalid_user_999')
    await page.fill('#login-password', 'wrongpassword')

    const responsePromise = page.waitForResponse((res) => res.url().includes('/api/v1/auth/login'))
    await submitButton.click()
    await responsePromise

    // Verify error alert is displayed
    const errorAlert = page.locator('#login-error')
    await expect(errorAlert).toBeVisible({ timeout: 10000 })
    await expect(errorAlert).toContainText(/user not found|invalid username or password/i)

    // Verify no authenticated session was written to localStorage
    const accessToken = await page.evaluate(() => localStorage.getItem('accessToken'))
    expect(accessToken).toBeNull()
  })

  test('TEST B: Normal non-MFA role login succeeds and redirects to role landing', async ({ page }) => {
    await page.goto('/login')
    await page.evaluate(() => localStorage.clear())

    // Login with seeded non-MFA account (operator01 / operator123)
    await page.fill('#login-username', 'operator01')
    await page.fill('#login-password', 'operator123')

    const responsePromise = page.waitForResponse((res) => res.url().includes('/api/v1/auth/login'))
    await page.click('button[type="submit"]')
    await responsePromise

    // Wait for redirect to operator landing route (/production)
    await page.waitForURL((url) => url.pathname.includes('/production'), { timeout: 15000 })
    expect(page.url()).toContain('/production')

    // Verify session was stored
    const accessToken = await page.evaluate(() => localStorage.getItem('accessToken'))
    expect(accessToken).toBeTruthy()

    // Verify protected UI and sidebar are rendered
    await expect(page.locator('#main-content')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('TEST C: Admin account triggers MFA challenge, handles invalid TOTP code, and supports back navigation', async ({ page }) => {
    await page.goto('/login')
    await page.evaluate(() => localStorage.clear())

    // Intercept login to simulate MFA required flow
    await page.route('**/api/v1/auth/login', async (route) => {
      const postData = route.request().postDataJSON()
      if (!postData.totpCode) {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'MFA authentication is required for this account' }),
        })
      } else {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Invalid MFA TOTP authentication code' }),
        })
      }
    })

    // Submit admin credentials (seeded admin has MFA enabled)
    await page.fill('#login-username', 'admin')
    await page.fill('#login-password', 'admin123')

    const initialResponsePromise = page.waitForResponse((res) => res.url().includes('/api/v1/auth/login'))
    await page.click('button[type="submit"]')
    await initialResponsePromise

    // Verify Step 2 MFA screen appears
    const totpInput = page.locator('#login-totp')
    await expect(totpInput).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(/two-factor authentication/i)).toBeVisible()
    await expect(page.getByRole('heading', { name: /authentication code/i })).toBeVisible()

    // Verify no authenticated token is issued before MFA completion
    const initialToken = await page.evaluate(() => localStorage.getItem('accessToken'))
    expect(initialToken).toBeNull()

    // Test invalid 6-digit TOTP code
    await page.fill('#login-totp', '000000')
    const verifyResponsePromise = page.waitForResponse((res) => res.url().includes('/api/v1/auth/login'))
    await page.click('button[type="submit"]')
    await verifyResponsePromise

    // Verify error message appears and user remains on Step 2
    const mfaError = page.locator('#login-mfa-error')
    await expect(mfaError).toBeVisible({ timeout: 10000 })
    await expect(mfaError).toContainText(/invalid authentication code|invalid mfa totp/i)
    await expect(totpInput).toBeVisible()

    // Test "Back to Sign In" option returns to Step 1
    const backButton = page.getByRole('button', { name: /back to sign in/i })
    await expect(backButton).toBeVisible()
    await backButton.click()

    // Verify Step 1 username & password fields are back
    await expect(page.locator('#login-username')).toBeVisible()
    await expect(page.locator('#login-password')).toBeVisible()
    await expect(page.locator('#login-totp')).not.toBeVisible()
  })
})
