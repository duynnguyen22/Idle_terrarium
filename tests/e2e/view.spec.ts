import { expect, type Locator, type Page, test } from '@playwright/test'
import { dismissWelcomePrompt } from './helpers'

interface Cam {
  z: number
  u: number
  v: number
}
interface Item {
  uid: string
  id: string
  x: number
  y: number
  zIndex: number
  parentUid?: string | null
}
interface Handle {
  store: { get: (atom: never) => unknown }
  world: () => {
    items: Item[]
    draggingId: string | null
    view: { cam: Cam; camT: Cam; size: { w: number; h: number } | null }
  }
}
declare const window: Window & { __botanica?: Handle }

test.beforeEach(({ page }) => dismissWelcomePrompt(page))

// Runs against the dev server (playwright.config.ts), where `import.meta.env.DEV` exposes window.__botanica.

const zoomButton = (page: Page) => page.getByTitle('Show the whole tank (0)')

/** The zoom readout as a number, e.g. "246%" -> 246. */
async function zoomPercent(page: Page): Promise<number> {
  return Number.parseInt((await zoomButton(page).textContent()) ?? '', 10)
}

/** Waits for the engine to measure the canvas, so the camera and pointer maths are live. */
async function waitForEngine(page: Page) {
  await page.waitForFunction(() => !!window.__botanica?.world().view.size)
}

/** Waits until the eased camera has caught up with its target (the engine snaps within 0.002 of zoom). */
async function waitForCameraToSettle(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(() => {
        const { cam, camT } = window.__botanica!.world().view
        return Math.max(
          Math.abs(cam.z - camT.z),
          Math.abs(cam.u - camT.u) * 2,
          Math.abs(cam.v - camT.v) * 2,
        )
      }),
    )
    .toBeLessThan(0.003)
}

async function canvasCentre(page: Page) {
  const box = await page.locator('canvas').first().boundingBox()
  if (!box) throw new Error('canvas has no box')
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

/**
 * Where a plant sits on screen (client px) under the current camera: the item's normalized position
 * mapped through the vessel rect the app itself uses (studio mode), then through the camera.
 */
function plantScreen(page: Page, uid: string): Promise<{ x: number; y: number }> {
  return page.evaluate(async (id) => {
    const paths = {
      vessels: '/src/data/vessels.ts',
      studio: '/src/store/studio.ts',
      frame: '/src/engine/render/renderFrame.ts',
    }
    const { vesselKX } = (await import(/* @vite-ignore */ paths.vessels)) as {
      vesselKX: (v: string) => number
    }
    const { vesselAtom } = (await import(/* @vite-ignore */ paths.studio)) as {
      vesselAtom: never
    }
    const { computeVesselRect } = (await import(/* @vite-ignore */ paths.frame)) as {
      computeVesselRect: (
        w: number,
        h: number,
        relax: boolean,
        kx: number,
      ) => { x: number; y: number; w: number; h: number }
    }
    const handle = window.__botanica!
    const w = handle.world()
    const { cam, size } = w.view
    const item = w.items.find((i) => i.uid === id)!
    const canvas = document.querySelector('canvas')!.getBoundingClientRect()
    const W = size!.w
    const H = size!.h
    const R = computeVesselRect(W, H, false, vesselKX(handle.store.get(vesselAtom) as string))
    const bx = R.x + item.x * R.w
    const by = R.y + item.y * R.h
    return {
      x: canvas.left + (bx - cam.u * W) * cam.z + W / 2,
      y: canvas.top + (by - cam.v * H) * cam.z + H / 2,
    }
  }, uid)
}

/** A loose plant that cannot snap onto a rock, brought to the front so nothing else takes a grab. */
function pickLoosePlant(page: Page): Promise<string> {
  return page.evaluate(async () => {
    const catalogPath = '/src/data/catalog.ts'
    const { findCatalogDef } = (await import(/* @vite-ignore */ catalogPath)) as {
      findCatalogDef: (id: string) => { category: string; canMountOnRock?: boolean } | null
    }
    const w = window.__botanica!.world()
    const plant = w.items.find((i) => {
      const d = findCatalogDef(i.id)
      return d?.category === 'flora' && !d.canMountOnRock && !i.parentUid
    })
    if (!plant) throw new Error('no loose plant in the starting tank')
    plant.zIndex = 999
    return plant.uid
  })
}

function rectsIntersect(a: { x: number; y: number; width: number; height: number }, b: typeof a) {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
}

async function boxOf(locator: Locator) {
  const box = await locator.boundingBox()
  if (!box) throw new Error('element has no box')
  return box
}

test('wheel zoom raises the percent and 0 returns to 100 %', async ({ page }) => {
  await page.goto('/')
  await waitForEngine(page)
  await expect(zoomButton(page)).toHaveText('100%')

  const c = await canvasCentre(page)
  await page.mouse.move(c.x, c.y)
  await page.mouse.wheel(0, -600)
  await expect.poll(() => zoomPercent(page)).toBeGreaterThan(150)
  await waitForCameraToSettle(page)

  await page.keyboard.press('0')
  await expect(zoomButton(page)).toHaveText('100%')
  await waitForCameraToSettle(page)
})

test('drags a plant at 200 % zoom and it ends under the pointer', async ({ page }) => {
  await page.goto('/')
  await waitForEngine(page)
  const uid = await pickLoosePlant(page)

  // Zoom in about the plant so it stays under the cursor, until the readout passes 200 %.
  const at100 = await plantScreen(page, uid)
  await page.mouse.move(at100.x, at100.y)
  await page.mouse.wheel(0, -480)
  await expect.poll(() => zoomPercent(page)).toBeGreaterThanOrEqual(200)
  await waitForCameraToSettle(page)

  const from = await plantScreen(page, uid)
  const y0 = await page.evaluate(
    (id) => window.__botanica!.world().items.find((i) => i.uid === id)!.y,
    uid,
  )
  const canvasBox = await boxOf(page.locator('canvas').first())
  expect(from.x).toBeGreaterThan(canvasBox.x)
  expect(from.x).toBeLessThan(canvasBox.x + canvasBox.width)
  expect(from.y).toBeGreaterThan(canvasBox.y)
  expect(from.y).toBeLessThan(canvasBox.y + canvasBox.height)

  // Drag 90 screen px right and 40 up. With the camera ignored the plant would move 45 or 180 px.
  const dx = 90
  const dy = -40
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await expect.poll(() => page.evaluate(() => window.__botanica!.world().draggingId)).toBe(uid)
  await page.mouse.move(from.x + dx / 2, from.y + dy / 2, { steps: 6 })
  await page.mouse.move(from.x + dx, from.y + dy, { steps: 6 })
  await expect
    .poll(async () => {
      const now = await plantScreen(page, uid)
      return Math.hypot(now.x - (from.x + dx), now.y - (from.y + dy))
    })
    .toBeLessThan(4)
  await page.mouse.up()

  // Released: draggingId clears, and the plant is not parented or snapped anywhere. Its x stays under the
  // release point at the same 200 % camera (a drop that ignored the camera, snapped or clamped would not).
  await expect.poll(() => page.evaluate(() => window.__botanica!.world().draggingId)).toBeNull()
  await expect
    .poll(async () => Math.abs((await plantScreen(page, uid)).x - (from.x + dx)))
    .toBeLessThan(4)
  // A released plant settles back onto the soil by itself (the simulation eases its y down), so its y
  // ends at the soil line it was lifted from. That is the app's behaviour, not a camera effect: it is
  // checked in normalized units, and it must never end above where the pointer released it.
  await expect
    .poll(() =>
      page.evaluate((id) => window.__botanica!.world().items.find((i) => i.uid === id)!.y, uid),
    )
    .toBeCloseTo(y0, 2)
  const end = await plantScreen(page, uid)
  expect(Math.abs(end.x - (from.x + dx))).toBeLessThan(4)
  expect(end.y).toBeGreaterThanOrEqual(from.y + dy - 4)
  expect(
    await page.evaluate(
      (id) => window.__botanica!.world().items.find((i) => i.uid === id)?.parentUid,
      uid,
    ),
  ).toBeFalsy()
})

test('double-click on a plant centres it; double-click on empty space goes home', async ({
  page,
}) => {
  await page.goto('/')
  await waitForEngine(page)
  await expect(zoomButton(page)).toHaveText('100%')

  const uid = await pickLoosePlant(page)
  const p = await plantScreen(page, uid)
  await page.mouse.dblclick(p.x, p.y)

  // It zooms to at least 240 %, and the plant ends in the middle of the canvas.
  await expect.poll(() => zoomPercent(page)).toBeGreaterThanOrEqual(240)
  await waitForCameraToSettle(page)
  const canvasBox = await boxOf(page.locator('canvas').first())
  const now = await plantScreen(page, uid)
  expect(Math.abs(now.x - (canvasBox.x + canvasBox.width / 2))).toBeLessThan(canvasBox.width * 0.05)
  expect(Math.abs(now.y - (canvasBox.y + canvasBox.height / 2))).toBeLessThan(
    canvasBox.height * 0.08,
  )

  // The top-left corner of the zoomed view is open air: a double-click there returns to the whole tank.
  await page.mouse.dblclick(canvasBox.x + 14, canvasBox.y + 14)
  await expect(zoomButton(page)).toHaveText('100%')
  await waitForCameraToSettle(page)
})

test('the Depth toggle survives a reload', async ({ page }) => {
  await page.goto('/')
  const depth = page.getByRole('button', { name: 'Depth effects' })
  await expect(depth).toHaveAttribute('aria-pressed', 'true')
  await depth.click()
  await expect(depth).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByText('Depth effects off: flat view')).toBeVisible()

  await page.reload()
  await expect(page.getByRole('button', { name: 'Depth effects' })).toHaveAttribute(
    'aria-pressed',
    'false',
  )
  const saved = await page.evaluate(() => localStorage.getItem('botanica_view_v1'))
  expect(JSON.parse(saved ?? '{}')).toMatchObject({ depth: false })
})

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('at 390×844 the tank opens framed (zoom > 100 %) and the controls do not overlap the care toolbar', async ({
    page,
  }) => {
    await page.goto('/')
    await waitForEngine(page)
    await expect.poll(() => zoomPercent(page)).toBeGreaterThan(100)

    const controls = page.locator('#view-ctl')
    const toolbar = page.locator('#care-toolbar')
    await expect(controls).toBeVisible()
    await expect(toolbar).toBeVisible()
    const a = await boxOf(controls)
    const b = await boxOf(toolbar)
    expect(rectsIntersect(a, b)).toBe(false)
    // The controls stay on screen.
    expect(a.x).toBeGreaterThanOrEqual(0)
    expect(a.x + a.width).toBeLessThanOrEqual(390)
  })
})

test('in relax mode the view controls sit top right and hide when idle', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Relax/ }).click()
  const body = page.locator('body')
  await expect(body).toHaveClass(/relax-active/)

  const controls = page.locator('#view-ctl')
  await expect(controls).toBeVisible()
  const box = await boxOf(controls)
  const viewport = page.viewportSize()!
  expect(box.y).toBeLessThan(viewport.height * 0.15)
  expect(box.x + box.width).toBeGreaterThan(viewport.width * 0.85)
  expect(box.x).toBeGreaterThan(viewport.width / 2)

  await page.mouse.move(300, 300)
  await page.mouse.move(320, 320)
  await expect(body).toHaveClass(/relax-idle/, { timeout: 5000 })
  await expect(controls).toHaveCSS('opacity', '0')
  await page.mouse.move(340, 340)
  await expect(body).not.toHaveClass(/relax-idle/)
  await expect(controls).toHaveCSS('opacity', '1')
})

test('Show frame rate shows a readout that contains "fps"', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('#perf-hud')).toHaveCount(0)
  await page.getByRole('button', { name: 'More actions' }).click()
  await page.getByRole('menuitemcheckbox', { name: 'Show frame rate' }).click()
  await page.keyboard.press('Escape')
  // The engine writes the text every 20th frame.
  await expect(page.locator('#perf-hud')).toContainText(/\d+ fps · slowest \d+/)
  await expect(page.locator('#perf-hud')).toContainText('fps')
})

test('an evening visit moves the camera and Skip restores it', async ({ page }) => {
  await page.goto('/')
  await waitForEngine(page)
  await expect(zoomButton(page)).toHaveText('100%')

  // A non-default view first: zoom in twice, then pan by dragging empty air.
  await page.getByRole('button', { name: 'Zoom in' }).click()
  await page.getByRole('button', { name: 'Zoom in' }).click()
  await expect.poll(() => zoomPercent(page)).toBeGreaterThan(170)
  await waitForCameraToSettle(page)
  const canvasBox = await boxOf(page.locator('canvas').first())
  const sx = canvasBox.x + 14
  const sy = canvasBox.y + 14
  await page.mouse.move(sx, sy)
  await page.mouse.down()
  await page.mouse.move(sx + 70, sy + 50, { steps: 8 })
  await page.mouse.up()
  await waitForCameraToSettle(page)
  const before = await page.evaluate(() => ({ ...window.__botanica!.world().view.cam }))
  const percentBefore = await zoomPercent(page)
  expect(before.z).toBeGreaterThan(1.7)
  expect(Math.abs(before.u - 0.5)).toBeGreaterThan(0.01)
  expect(Math.abs(before.v - 0.5)).toBeGreaterThan(0.01)

  await page.getByRole('button', { name: 'More actions' }).click()
  await page.getByRole('menuitem', { name: 'Preview a gap of 1 day' }).click()
  const card = page.locator('section#away-card')
  await expect(card).toBeVisible()
  await card.getByRole('button', { name: 'Start the evening visit' }).click()

  await expect(page.locator('#tour-caption')).toBeVisible()
  // The camera moves off the saved view toward the first item: the target zoom is at least 2.
  await expect
    .poll(() =>
      page.evaluate((b) => {
        const { cam } = window.__botanica!.world().view
        return Math.max(Math.abs(cam.z - b.z), Math.abs(cam.u - b.u) * 2, Math.abs(cam.v - b.v) * 2)
      }, before),
    )
    .toBeGreaterThan(0.05)
  expect(await page.evaluate(() => window.__botanica!.world().view.camT.z)).toBeGreaterThanOrEqual(
    2,
  )

  await page.locator('#tour-caption').getByRole('button', { name: 'Skip' }).click()
  await expect(page.locator('#tour-caption')).toHaveCount(0)
  // It returns to the view recorded before the visit, not to home.
  await expect
    .poll(() =>
      page.evaluate((b) => {
        const { cam } = window.__botanica!.world().view
        return Math.max(Math.abs(cam.z - b.z), Math.abs(cam.u - b.u) * 2, Math.abs(cam.v - b.v) * 2)
      }, before),
    )
    .toBeLessThan(0.01)
  await expect.poll(() => zoomPercent(page)).toBe(percentBefore)
  expect(percentBefore).toBeGreaterThan(100)
})
