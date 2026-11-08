import { expect, test } from '@playwright/test'
import { dismissWelcomePrompt } from './helpers'

interface Item {
  uid: string
  id: string
  x: number
  y: number
  scale: number
  zIndex: number
  parentUid?: string | null
}
interface Handle {
  world: () => { items: Item[] }
}
declare const window: Window & { __botanica?: Handle }

test.beforeEach(({ page }) => dismissWelcomePrompt(page))

// Runs against the dev server (playwright.config.ts), where `import.meta.env.DEV` exposes window.__botanica.
test('dragging a peacock fern onto a mount point parents it to the hardscape', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Falls Lake/ }).click()
  await page.getByRole('tab', { name: /Flora/ }).click()
  await page.getByRole('button', { name: /Blue Peacock Fern/ }).click()

  const plan = await page.evaluate(async () => {
    const catalogPath = '/src/data/catalog.ts'
    const { findCatalogDef } = (await import(/* @vite-ignore */ catalogPath)) as {
      findCatalogDef: (
        id: string,
      ) => { category: string; mountPoints?: { ox: number; oy: number }[] } | null
    }
    const w = window.__botanica!.world()
    const box = document.querySelector('canvas')!.getBoundingClientRect()
    const r = Math.min(box.width, box.height) * 0.43
    const toClient = (nx: number, ny: number) => ({
      x: box.left + box.width * 0.5 - r + nx * r * 2,
      y: box.top + box.height * 0.52 - r + ny * r * 2,
    })
    const fern = w.items[w.items.length - 1]
    fern.zIndex = 999
    const host = w.items.find((i) => {
      const d = findCatalogDef(i.id)
      return d?.category === 'hardscape' && !!d.mountPoints?.length
    })!
    const point = findCatalogDef(host.id)?.mountPoints?.[0] ?? { ox: 0, oy: 0 }
    const size = 0.18 * host.scale
    return {
      fernUid: fern.uid,
      hostUid: host.uid,
      from: toClient(fern.x, fern.y),
      to: toClient(host.x + point.ox * size, host.y + point.oy * size),
    }
  })

  await page.mouse.move(plan.from.x, plan.from.y)
  await page.mouse.down()
  await page.mouse.move(plan.to.x, plan.to.y, { steps: 10 })
  await page.mouse.up()

  const parent = await page.evaluate(
    (uid) => window.__botanica!.world().items.find((i) => i.uid === uid)?.parentUid ?? null,
    plan.fernUid,
  )
  expect(parent).toBe(plan.hostUid)
})
