import { expect, test, type Page } from '@playwright/test'
import { dismissWelcomePrompt } from './helpers'

/** Live item count via the dev-only `window.__botanica` handle (see useTerrariumEngine). */
const liveItemCount = (page: Page) =>
  page.evaluate(
    () =>
      (
        window as unknown as { __botanica?: { world: () => { items: unknown[] } } }
      ).__botanica?.world().items.length ?? 0,
  )

/** Items in the v6 Falls Lake scene: moss wall, falls, boulders, 9 flora, 5 fauna. */
const FALLS_ITEM_COUNT = 17

test.beforeEach(({ page }) => dismissWelcomePrompt(page))

test('first run seeds the Falls Lake scene without clicking Biome', async ({ page }) => {
  await page.goto('/')
  await expect.poll(() => liveItemCount(page)).toBe(FALLS_ITEM_COUNT)
  await expect
    .poll(() =>
      page.evaluate(() => {
        const raw = localStorage.getItem('botanica_studio_v1')
        return raw ? JSON.parse(raw).state.worldSnapshot?.items.length : -1
      }),
    )
    .toBe(FALLS_ITEM_COUNT)
})

test('studio journey: biome, 5x, relax, persistence', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Botanica' })).toBeVisible()

  await page.getByRole('button', { name: 'More actions' }).click()
  await page.getByRole('menuitem', { name: /Rebuild the Falls Lake/ }).click()
  await expect.poll(() => liveItemCount(page)).toBeGreaterThan(0)

  const fiveX = page.getByRole('button', { name: /5×/ })
  await fiveX.click()
  await expect(fiveX).toHaveAttribute('aria-pressed', 'true')

  await page.keyboard.press('r')
  await expect(page.locator('body')).toHaveClass(/relax-active/)
  await page.keyboard.press('Escape')
  await expect(page.locator('body')).not.toHaveClass(/relax-active/)

  await page.screenshot({ path: 'test-results/studio-journey.png' })

  // Falls Lake ships a 32 % pool on gentle flow; switch the pump to strong before reloading.
  const pump = page.getByRole('radiogroup', { name: 'Waterfall pump' })
  await pump.getByRole('radio', { name: 'Strong' }).click()
  await expect(pump.getByRole('radio', { name: 'Strong' })).toBeChecked()
  await expect(page.getByLabel('Pool width')).toHaveValue('32')
  await expect
    .poll(() =>
      page.evaluate(() => {
        const raw = localStorage.getItem('botanica_studio_v1')
        return raw ? JSON.parse(raw).state.pumpFlow : null
      }),
    )
    .toBe('strong')

  const count = FALLS_ITEM_COUNT
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
    if (!raw) return null
    const { version, state } = JSON.parse(raw)
    return {
      version,
      items: state.worldSnapshot.items.length,
      pumpFlow: state.pumpFlow,
      waterSplit: state.waterSplit,
    }
  })
  // STUDIO_VERSION in src/store/useStudioStore.ts; importing it here would run the store, which needs localStorage.
  expect(persisted).toEqual({ version: 4, items: count, pumpFlow: 'strong', waterSplit: 0.32 })
  await expect.poll(() => liveItemCount(page)).toBe(count)
  await expect(
    page.getByRole('radiogroup', { name: 'Waterfall pump' }).getByRole('radio', { name: 'Strong' }),
  ).toBeChecked()
  await expect(page.getByLabel('Pool width')).toHaveValue('32')
})

test('a wide rectangular tank renders without page errors', async ({ page }) => {
  const errors: Error[] = []
  page.on('pageerror', (e) => errors.push(e))
  await page.goto('/')
  await page.getByRole('tab', { name: 'Vessel' }).click()
  const riparium = page.getByRole('button', { name: /Long Riparium/ })
  await riparium.click()
  await expect(riparium).toHaveAttribute('aria-pressed', 'true')
  // Let a couple of frames render the new tank before checking for page errors.
  await page.evaluate(
    () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
  )
  expect(errors).toEqual([])
})

for (const size of [
  { width: 900, height: 700 },
  { width: 1280, height: 800 },
]) {
  test(`every top-nav control is inside the viewport at ${size.width}x${size.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(size)
    await page.goto('/')
    const nav = page.locator('#top-nav')
    for (const n of [/More actions/, /Snapshot/, /Ambient sound/, /Relax/, /\+1 day/])
      await expect(nav.getByRole('button', { name: n })).toBeVisible()
    // Every rendered control (speed pills, utilities; lighting sits on the canvas); drawer toggles are display:none from lg up.
    const buttons = await nav.getByRole('button').filter({ visible: true }).all()
    expect(buttons.length).toBeGreaterThanOrEqual(9)
    for (const btn of buttons) {
      const box = await btn.boundingBox()
      expect(box, await btn.innerText()).not.toBeNull()
      expect(box!.x).toBeGreaterThanOrEqual(0)
      expect(box!.x + box!.width).toBeLessThanOrEqual(size.width)
    }
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
  })
}

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

    const stageTop = await page.evaluate(() => {
      const main = document.querySelector('main')!.getBoundingClientRect()
      const el = document.elementFromPoint(main.left + main.width / 2, main.top + main.height / 2)
      return el?.getAttribute('data-testid') ?? null
    })
    expect(stageTop).toBe('drawer-scrim')
  })
})
