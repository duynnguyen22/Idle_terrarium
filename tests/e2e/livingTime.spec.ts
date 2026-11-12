import { expect, test } from '@playwright/test'
import { dismissWelcomePrompt } from './helpers'

test.beforeEach(({ page }) => dismissWelcomePrompt(page))

test('Growth button opens the growth board and Escape closes it', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Growth' }).click()
  const board = page.locator('aside#growth-board')
  await expect(board).toBeVisible()
  await expect(board).toContainText('How your tank is growing')
  await page.keyboard.press('Escape')
  await expect(board).toHaveCount(0)
})

test('previewing a one-day gap shows the away card and Got it closes it', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'More actions' }).click()
  await page.getByRole('menuitem', { name: 'Preview a gap of 1 day' }).click()
  const card = page.locator('section#away-card')
  await expect(card).toBeVisible()
  await expect(card).toContainText('Preview · 24 h later')
  await card.getByRole('button', { name: 'Got it' }).click()
  await expect(card).toHaveCount(0)
})

test('returning after a real gap shows the While you were away card', async ({ page }) => {
  await page.goto('/')
  // Rewrite the saved clock in an init script so it lands after the outgoing page's
  // visibility handler has stamped `lastSimulatedAt`; the flag keeps it to one rewrite.
  await page.addInitScript(() => {
    if (sessionStorage.getItem('gap_seeded')) return
    sessionStorage.setItem('gap_seeded', '1')
    const key = 'botanica_studio_v1'
    const raw = localStorage.getItem(key)
    const envelope = raw ? JSON.parse(raw) : { state: {}, version: 4 }
    envelope.state.lastSimulatedAt = Date.now() - 3 * 36e5
    localStorage.setItem(key, JSON.stringify(envelope))
  })
  await page.reload()
  await expect(page.locator('#away-card')).toContainText('While you were away')
})
