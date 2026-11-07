import { expect, test } from '@playwright/test'

test('pool width, cycling and the next-step action', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /^Arid/ }).click()
  await expect(page.getByText('Arid: open top, sand, no fogger')).toBeVisible()
  // Both the hardware pump status and the EcoStats water-cycle row say this with no pool.
  await expect(page.getByText('No pool in this build').first()).toBeVisible()
  await expect(page.getByLabel('Pool width')).toHaveValue('0')

  await page.getByLabel('Pool width').fill('30')
  await expect(
    page.getByText('New pool: it cycles for about 3 weeks before fish and shrimp are safe'),
  ).toBeVisible()
  await expect(page.getByText(/Cycling, day 1 of ~21/)).toBeVisible()

  const nextDay = page.getByRole('button', { name: '+1 day' })
  for (let i = 0; i < 21; i++) await nextDay.click()
  await expect(page.getByText(/Cycled · ammonia 0 ppm/)).toBeVisible()

  await page.reload()
  await expect(page.getByLabel('Pool width')).toHaveValue('30')
  await expect(page.getByText(/Cycled · ammonia 0 ppm/)).toBeVisible()
})
