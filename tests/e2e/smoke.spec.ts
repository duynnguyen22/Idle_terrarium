import { expect, test } from '@playwright/test'

test('page has the Botanica title', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle('Botanica — Living Biosphere')
  await expect(page.getByRole('heading', { name: 'Botanica' })).toBeVisible()
})
