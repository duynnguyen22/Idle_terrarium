import { expect, test, type Page } from '@playwright/test'

/** The water-quality score the telemetry gauge shows, e.g. 96 from "96 · Excellent". */
const waterGauge = async (page: Page) =>
  Number((await page.getByTestId('gauge-water').locator('span').nth(1).innerText()).split(' ')[0])

test('Room tab: switching to tap water lowers the water gauge and offers a dechlorinator fix', async ({
  page,
}) => {
  // Mark the first-visit sign-up prompt as seen so its dialog does not cover the studio.
  await page.addInitScript(() => localStorage.setItem('botanica_signin_prompt_seen_v1', '1'))
  await page.goto('/')
  await expect(page.getByRole('dialog')).toHaveCount(0)

  await page.getByRole('tab', { name: 'Room' }).click()
  const water = page.getByRole('radiogroup', { name: 'Water source' })
  await expect(water.getByRole('radio', { name: /Tap \+ dechlorinator/ })).toHaveAttribute(
    'aria-checked',
    'true',
  )
  const treated = await waterGauge(page)

  await water.getByRole('radio', { name: /^Tap water/ }).click()
  await expect(water.getByRole('radio', { name: /^Tap water/ })).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await expect.poll(() => waterGauge(page)).toBeLessThan(treated)
  await expect(page.getByText('Chlorine present')).toBeVisible()

  const fix = page.getByRole('button', { name: 'Add dechlorinator' })
  await expect(fix).toBeVisible()
  await fix.click()
  await expect(water.getByRole('radio', { name: /Tap \+ dechlorinator/ })).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await expect.poll(() => waterGauge(page)).toBe(treated)
  await expect(fix).toHaveCount(0)
})
