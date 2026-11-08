import type { Page } from '@playwright/test'

/**
 * Marks the first-visit sign-up prompt as already shown, so its dialog does not cover the studio.
 * Call before `page.goto`; the init script runs on every navigation of this page.
 */
export async function dismissWelcomePrompt(page: Page) {
  await page.addInitScript(() => localStorage.setItem('botanica_signin_prompt_seen_v1', '1'))
}
