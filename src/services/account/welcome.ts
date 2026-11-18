import { relaxModeAtom } from '@/store/studio'
import { WELCOME_KEY, WELCOME_TEXT } from './constants'
import type { AccountContext } from './context'

/** How long after the visitor's first input the sign-up prompt opens. */
export const WELCOME_DELAY_MS = 2500

const INPUTS = ['pointerdown', 'keydown'] as const

/**
 * Opens the sign-up prompt WELCOME_DELAY_MS after the first pointer or key input (spec 5593-5607),
 * unless by then the visitor signed in, has the panel open, or turned relax mode on. With no window
 * (and no injected target) nothing is scheduled.
 */
export function deferWelcome(ctx: AccountContext): void {
  const { deps, state, store, actions } = ctx
  const target = deps.welcomeTarget ?? globalThis.window
  if (!target) return
  const later = () => {
    for (const type of INPUTS) target.removeEventListener(type, later, true)
    setTimeout(() => {
      const s = state()
      if (s.phase !== 'signedout' || s.panelOpen || store.get(relaxModeAtom)) return
      try {
        const storage = deps.welcomeStorage ?? globalThis.localStorage
        storage.setItem(WELCOME_KEY, '1')
      } catch {
        // storage unavailable
      }
      actions.openAuth('signup', { banner: { kind: 'info', text: WELCOME_TEXT } })
    }, WELCOME_DELAY_MS)
  }
  for (const type of INPUTS) target.addEventListener(type, later, true)
}
