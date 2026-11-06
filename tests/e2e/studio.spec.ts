import { expect, test, type Page } from '@playwright/test'

/** Live item count via the dev-only `window.__botanica` handle (see useTerrariumEngine). */
const liveItemCount = (page: Page) =>
  page.evaluate(
    () =>
      (
        window as unknown as { __botanica?: { world: () => { items: unknown[] } } }
      ).__botanica?.world().items.length ?? 0,
  )

test('first run seeds the Falls Lake scene without clicking Biome', async ({ page }) => {
  await page.goto('/')
  await expect.poll(() => liveItemCount(page)).toBe(15)
  await expect
    .poll(() =>
      page.evaluate(() => {
        const raw = localStorage.getItem('botanica_studio_v1')
        return raw ? JSON.parse(raw).state.worldSnapshot?.items.length : -1
      }),
    )
    .toBe(15)
})

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

  const count = 15
  expect(await liveItemCount(page)).toBe(count)
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

test.describe('narrow viewport drawers', () => {
  test.use({ viewport: { width: 900, height: 700 } })

  test('toggles are on screen and the open drawer sits above the care toolbar', async ({
    page,
  }) => {
    await page.goto('/')
    const left = page.getByRole('button', { name: 'Toggle catalog panel' })
    const right = page.getByRole('button', { name: 'Toggle telemetry panel' })
    for (const btn of [left, right]) {
      await expect(btn).toBeVisible()
      const box = await btn.boundingBox()
      expect(box).not.toBeNull()
      expect(box!.x).toBeGreaterThanOrEqual(0)
      expect(box!.x + box!.width).toBeLessThanOrEqual(900)
      expect(box!.y + box!.height).toBeLessThanOrEqual(700)
    }

    await left.click()
    await expect(left).toHaveAttribute('aria-expanded', 'true')
    // Wait for the slide-in transition to finish before probing hit-testing.
    await expect
      .poll(() => page.locator('#left-sidebar').evaluate((el) => el.getBoundingClientRect().left))
      .toBe(0)
    const inside = await page.evaluate(() => {
      const drawer = document.getElementById('left-sidebar')
      const toolbar = document.getElementById('care-toolbar')
      if (!drawer || !toolbar) return null
      const d = drawer.getBoundingClientRect()
      const t = toolbar.getBoundingClientRect()
      // A point inside both the drawer and the care toolbar (toolbar is centred, drawer overlaps it at 900px).
      const x = Math.max(d.left, t.left) + 4
      const y = t.top + t.height / 2
      const overlap = x < Math.min(d.right, t.right)
      const top = document.elementFromPoint(x, y)
      return { overlap, inDrawer: !!top && drawer.contains(top) }
    })
    expect(inside).not.toBeNull()
    expect(inside).toMatchObject({ overlap: true, inDrawer: true })
  })
})
