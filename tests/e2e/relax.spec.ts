import { expect, test } from '@playwright/test'
import { dismissWelcomePrompt } from './helpers'

test.beforeEach(({ page }) => dismissWelcomePrompt(page))

test('Relax Mode hides the chrome, shows the dock, idles, and exits', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Relax/ }).click()
  const body = page.locator('body')
  await expect(body).toHaveClass(/relax-active/)
  await expect(page.locator('#top-nav')).toBeHidden()
  await expect(page.locator('#left-sidebar')).toBeHidden()
  const dock = page.locator('#relax-dock')
  await expect(dock).toBeVisible()

  await page.mouse.move(300, 300)
  await page.mouse.move(320, 320)
  await expect(body).toHaveClass(/relax-idle/, { timeout: 5000 })
  await page.mouse.move(340, 340)
  await expect(body).not.toHaveClass(/relax-idle/)

  await page.keyboard.press('Escape')
  await expect(body).not.toHaveClass(/relax-active/)
  await expect(dock).toHaveCount(0)
  await expect(page.locator('#top-nav')).toBeVisible()
})
