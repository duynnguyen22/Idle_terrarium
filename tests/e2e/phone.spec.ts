import { expect, test, type Locator } from '@playwright/test'
import { dismissWelcomePrompt } from './helpers'

const GRAB = 'Resize this panel. Tap to change its height, drag down to close'
const TAB_BAR_PX = 58

/** Bottom edge of an element in CSS px, or -1 while it has no box. */
async function bottomOf(el: Locator) {
  const box = await el.boundingBox()
  return box ? box.y + box.height : -1
}

test.beforeEach(({ page }) => dismissWelcomePrompt(page))

test.describe('portrait phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })

  test('portrait shows the tab bar and opens Build as a sheet', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('#studio-root')).toHaveAttribute('data-layout', 'phone')
    const tabs = page.getByRole('navigation', { name: 'Sections' })
    await expect(tabs).toBeVisible()

    await tabs.getByRole('button', { name: 'Build' }).tap()
    const sheet = page.locator('#left-sidebar')
    await expect(sheet).toBeVisible()
    await expect.poll(async () => bottomOf(sheet)).toBeCloseTo(844 - TAB_BAR_PX, -0.5) // within 2 px
  })

  test('dragging the handle down closes the sheet', async ({ page }) => {
    await page.goto('/')
    await page
      .getByRole('navigation', { name: 'Sections' })
      .getByRole('button', { name: 'Build' })
      .tap()
    const sheet = page.locator('#left-sidebar')
    await expect(sheet).toBeVisible()

    // Let the slide and height transitions finish so the handle is where the pointer will land.
    await expect.poll(async () => (await sheet.boundingBox())?.height).toBeCloseTo(844 * 0.54, -0.5)
    const box = await page.getByRole('button', { name: GRAB }).boundingBox()
    if (!box) throw new Error('grab handle not found')
    const x = box.x + box.width / 2
    const y = box.y + box.height / 2
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x, y + 200, { steps: 8 })
    await page.mouse.move(x, y + 400, { steps: 8 })
    await page.mouse.up()

    await expect(sheet).toBeHidden()
    await expect(page.getByRole('navigation', { name: 'Sections' })).toBeVisible()
  })

  test('adding a plant peeks the sheet and keeps the canvas visible', async ({ page }) => {
    await page.goto('/')
    await page
      .getByRole('navigation', { name: 'Sections' })
      .getByRole('button', { name: 'Build' })
      .tap()
    const sheet = page.locator('#left-sidebar')
    await expect(sheet).toBeVisible()
    await expect.poll(async () => (await sheet.boundingBox())?.height).toBeCloseTo(844 * 0.54, -0.5)

    await page.getByRole('tab', { name: /Flora/ }).tap()
    await page.getByRole('button', { name: /Blue Peacock Fern/ }).tap()

    // Peek is 0.27 of the viewport: the sheet shrinks and the canvas stays in view above it.
    await expect.poll(async () => (await sheet.boundingBox())?.height).toBeCloseTo(844 * 0.27, -0.5)
    const peek = await sheet.boundingBox()
    await expect(page.locator('canvas')).toBeVisible()
    const canvas = await page.locator('canvas').boundingBox()
    expect(canvas?.height).toBeGreaterThan(300)
    expect(peek?.y).toBeGreaterThan(844 * 0.5)
  })
})

// Mobile emulation zooms the layout viewport out to fit the desktop first render, then shrinks it
// back with no resize event; the sheets must still size from the real 852 px height.
test.describe('mobile browser', () => {
  test.use({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true })

  for (const [tab, id] of [
    ['Build', '#left-sidebar'],
    ['Health', '#right-sidebar'],
    ['Growth', '#growth-board'],
  ] as const) {
    test(`${tab} opens as a half sheet that stays on screen`, async ({ page }) => {
      await page.goto('/')
      await page
        .getByRole('navigation', { name: 'Sections' })
        .getByRole('button', { name: tab })
        .tap()
      const sheet = page.locator(id)
      await expect
        .poll(async () => (await sheet.boundingBox())?.height)
        .toBeCloseTo(852 * 0.54, -0.5)
      expect((await sheet.boundingBox())?.y).toBeGreaterThan(0)
    })
  }
})

test.describe('short landscape', () => {
  test.use({ viewport: { width: 844, height: 390 }, hasTouch: true })

  test('short landscape uses the side rail', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('#studio-root')).toHaveAttribute('data-layout', 'land')
    await expect(page.locator('#top-nav')).toHaveCount(0)
    const rail = page.getByRole('navigation', { name: 'Sections' })
    await expect(rail).toBeVisible()

    await rail.getByRole('button', { name: 'More' }).tap()
    await expect(page.getByRole('menu')).toBeVisible()
    await expect(page.getByRole('menuitem', { name: /Save a snapshot picture/ })).toBeVisible()
  })
})

test.describe('desktop', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('desktop is unchanged', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('#studio-root')).toHaveAttribute('data-layout', 'desktop')
    await expect(page.getByRole('navigation', { name: 'Sections' })).toHaveCount(0)
    await expect(page.locator('#top-nav')).toBeVisible()
  })
})
