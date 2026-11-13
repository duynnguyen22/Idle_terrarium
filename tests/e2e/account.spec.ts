import { expect, test, type Page } from '@playwright/test'

/** From the first-visit sign-up prompt: sign in as the seeded demo account and finish onboarding. */
async function signInAsDemo(page: Page) {
  await page.goto('/')
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'Create your account' })).toBeVisible()
  await dialog.getByRole('button', { name: 'Sign in' }).click()
  await dialog.getByLabel('Email').fill('demo@botanica.app')
  await dialog.getByLabel('Password', { exact: true }).fill('terrarium1')
  await dialog.getByRole('button', { name: 'Sign in' }).click()
  await expect(dialog.getByRole('heading', { name: 'Welcome, Demo' })).toBeVisible()
  await dialog.getByRole('button', { name: 'Start growing' }).click()
  await expect(page.locator('[data-sonner-toast]')).toHaveText(
    'My terrarium is saved to your account',
  )
}

test('first visit prompts to create an account; demo sign-in reaches onboarding and saves a garden', async ({
  page,
}) => {
  await signInAsDemo(page)
  await expect(page.getByRole('button', { name: /Demo Gardener/ })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('button', { name: /Demo Gardener/ })).toBeVisible() // session kept, no dialog
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('+Day adds a journal entry visible in the Journal tab', async ({ page }) => {
  await signInAsDemo(page)
  const nav = page.locator('#top-nav')
  // Paused, the day only moves when +1 day is pressed, so the entry's day is the one the pill shows.
  await nav.getByRole('radio', { name: 'Pause' }).click()
  const pill = nav.getByText(/ · Day \d+$/)
  const before = Number((await pill.innerText()).match(/Day (\d+)$/)![1])
  const day = `Day ${before + 1}`
  await nav.getByRole('button', { name: '+1 day' }).click()
  await expect(pill).toHaveText(new RegExp(` · ${day}$`))

  await page.getByRole('button', { name: /Demo Gardener/ }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'Demo Gardener' })).toBeVisible()
  await dialog.getByRole('tab', { name: 'Journal' }).click()
  await expect(dialog.getByRole('tab', { name: 'Journal' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  const panel = dialog.getByRole('tabpanel')
  await expect(panel.getByRole('heading', { name: 'Growth journal · My terrarium' })).toBeVisible()
  await expect(panel.getByText(day, { exact: true })).toBeVisible()
  await expect(panel.getByText('No entries yet.')).toHaveCount(0)
})
