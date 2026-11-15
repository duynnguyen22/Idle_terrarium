import { AuthError } from '@/auth'
import { QUOTA_STATUS, QUOTA_TOAST, RESEND_WINDOW_MS } from './constants'
import type { AccountActions } from './contract'
import type { AccountContext } from './context'
import type { ViewData } from './state'

export function errorCode(e: unknown): string | undefined {
  if (typeof e !== 'object' || e === null || !('code' in e)) return undefined
  return typeof e.code === 'string' ? e.code : undefined
}

/** How failed actions report: auth forms through `run`, backend failures on the chip. */
export function actionErrorActions(
  ctx: AccountContext,
): Pick<AccountActions, 'run' | 'handleCloudError'> {
  const { deps, now, state, setAccount, actions } = ctx
  return {
    async run(fn) {
      if (state().busy) return
      setAccount((s) => ({ busy: true, viewData: { ...s.viewData, error: null, fieldErrors: {} } }))
      try {
        await fn()
      } catch (e) {
        if (e instanceof AuthError) {
          const patch: ViewData = e.field
            ? { fieldErrors: { [e.field]: e.message } }
            : { error: e.message }
          if (e.code === 'locked') patch.lockedUntil = e.until
          if (e.code === 'not_verified') {
            setAccount({ busy: false })
            actions.goView('verify', {
              email: e.email,
              resendAt: now() + RESEND_WINDOW_MS,
              notice: e.message,
            })
            return
          }
          actions.setViewData(patch)
        } else if (errorCode(e) === 'quota_exceeded') {
          actions.setViewData({ error: QUOTA_TOAST })
        } else {
          actions.setViewData({ error: 'Something went wrong. Try again.' })
          console.error(e)
        }
      }
      setAccount({ busy: false })
    },

    handleCloudError(e, o) {
      if (errorCode(e) === 'quota_exceeded') {
        // Background saves toast once on entering the storage-full state, not on every retry;
        // an action the person just took always says why it failed.
        const already = state().lastError === QUOTA_STATUS
        setAccount({ lastError: QUOTA_STATUS })
        if (o?.user || !already) deps.toast(QUOTA_TOAST)
      } else {
        setAccount({ lastError: 'Not saved yet, retrying' })
      }
    },
  }
}
