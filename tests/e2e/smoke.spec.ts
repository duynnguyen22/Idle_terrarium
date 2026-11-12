import { expect, test } from '@playwright/test'
import { dismissWelcomePrompt } from './helpers'

// The first-visit sign-up dialog is modal and hides the page from the accessibility tree.
test.beforeEach(({ page }) => dismissWelcomePrompt(page))

test('page has the Botanica title', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle('Botanica — Living Biosphere')
  await expect(page.getByRole('heading', { name: 'Botanica' })).toBeVisible()
})
