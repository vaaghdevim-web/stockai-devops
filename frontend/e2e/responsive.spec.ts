import { test, expect } from '@playwright/test'
import { setupAuthenticatedSession } from './helpers/auth'

test.describe('Responsive Layout & Viewport Tests', () => {
  const viewports = [
    { name: 'Mobile (375px)', width: 375, height: 667 },
    { name: 'Tablet (768px)', width: 768, height: 1024 },
    { name: 'Desktop (1440px)', width: 1440, height: 900 },
  ]

  for (const vp of viewports) {
    test(`TEST K: Responsive verification on ${vp.name} - Dashboard has no horizontal page overflow`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await setupAuthenticatedSession(page, ['SUPER_ADMIN'], 'responsive_tester')

      await page.goto('/dashboard')
      await expect(page.locator('#main-content')).toBeVisible()

      // Verify no page-level horizontal overflow
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth
      })
      expect(hasHorizontalScroll).toBeFalsy()

      // Verify primary heading or mobile trigger is accessible
      if (vp.width < 1024) {
        // Mobile header or toggle should be visible
        const mobileToggle = page.getByRole('button', { name: /open navigation|toggle navigation|menu/i }).first()
        await expect(mobileToggle).toBeVisible()
      } else {
        // Desktop sidebar should be present
        await expect(page.getByRole('heading', { name: /factory operations overview/i })).toBeVisible()
      }
    })

    test(`TEST K: Responsive verification on ${vp.name} - Login page fits without horizontal scroll`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await page.goto('/login')

      await expect(page.locator('#login-username')).toBeVisible()

      // Verify no horizontal overflow
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth
      })
      expect(hasHorizontalScroll).toBeFalsy()
    })
  }
})
