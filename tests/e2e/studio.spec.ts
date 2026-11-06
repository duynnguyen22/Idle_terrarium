import { expect, test, type Page } from '@playwright/test'

/** Live item count via the dev-only `window.__botanica` handle (see useTerrariumEngine). */
const liveItemCount = (page: Page) =>
  page.evaluate(
    () =>
      (
        window as unknown as { __botanica?: { world: () => { items: unknown[] } } }
      ).__botanica?.world().items.length ?? 0,
  )

test('studio journey: biome, 5x, relax, persistence', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Botanica' })).toBeVisible()

  await page.getByRole('button', { name: /Biome/ }).click()
  await expect.poll(() => liveItemCount(page)).toBeGreaterThan(0)

  const fiveX = page.getByRole('button', { name: /5×/ })
  await fiveX.click()
  await expect(fiveX).toHaveAttribute('aria-pressed', 'true')

  await page.keyboard.press('r')
  await expect(page.locator('body')).toHaveClass(/relax-active/)
  await page.keyboard.press('Escape')
  await expect(page.locator('body')).not.toHaveClass(/relax-active/)

  await page.screenshot({ path: 'test-results/studio-journey.png' })

  const count = await liveItemCount(page)
  await expect
    .poll(() =>
      page.evaluate(() => {
        const raw = localStorage.getItem('botanica_studio_v1')
        return raw ? JSON.parse(raw).state.worldSnapshot.items.length : -1
      }),
    )
    .toBe(count)

  await page.reload()
  const persisted = await page.evaluate(() => {
    const raw = localStorage.getItem('botanica_studio_v1')
    return raw ? JSON.parse(raw).state.worldSnapshot.items.length : -1
  })
  expect(persisted).toBe(count)
  await expect.poll(() => liveItemCount(page)).toBe(count)
})
