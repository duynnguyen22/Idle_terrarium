import type { PublicUser, Session } from '@/auth'
import { applyGardenSnapshot } from '@/services/gardenSnapshot'
import { clearRetryTimer, clearSaveTimer } from './cloudSave'
import { EXPIRED_TEXT, REVOKED_TEXT, WELCOME_KEY } from './constants'
import type { AccountActions } from './contract'
import type { AccountContext } from './context'
import type { ViewData } from './state'
import { deferWelcome } from './welcome'

const endedBanner = (ended: string | undefined): ViewData['banner'] => ({
  kind: 'info',
  text: ended === 'expired' ? EXPIRED_TEXT : REVOKED_TEXT,
})

async function beginSession(
  ctx: AccountContext,
  user: PublicUser,
  session: Session,
  { isNew }: { isNew: boolean },
) {
  const { store, deps, state, setAccount, actions } = ctx
  const backend = deps.createBackend(user.id)
  setAccount({ user, session, backend, lastError: '' })
  try {
    const [profile, gardens] = await Promise.all([backend.getProfile(), backend.listGardens()])
    setAccount({ gardens })
    const target = gardens.find((g) => g.id === profile.activeGardenId) ?? gardens[0]
    if (isNew || !target) {
      setAccount({ phase: 'onboarding' })
      actions.openAuth('onboarding')
      return
    }
    // Applying the snapshot runs the restored-world catch-up, which only records its report (and schedules
    // the cloud save) once the phase is 'cloud', so a sign-in from the panel enters it first. The startup
    // check ('checking') stays put: the engine defers its catch-up until the phase settles, after the apply.
    const settling = state().phase === 'checking'
    setAccount({
      activeId: target.id,
      lastSaved: target.updatedAt || 0,
      ...(settling ? {} : { phase: 'cloud' as const }),
    })
    if (target.snapshot) applyGardenSnapshot(target.snapshot, store)
    setAccount({ phase: 'cloud' })
    await actions.refreshJournal()
  } catch (e) {
    actions.handleCloudError(e)
    setAccount({ phase: 'cloud' })
  }
}

type SessionActions = Pick<
  AccountActions,
  'initAccount' | 'beginSession' | 'endSession' | 'watchSession'
>

/** Who is signed in: the startup check, starting and ending a session, and noticing it ended. */
export function sessionActions(ctx: AccountContext): SessionActions {
  const { deps, state, setAccount, actions } = ctx
  return {
    async initAccount() {
      const { session, user, ended } = deps.auth.getSession()
      if (session && user) {
        await actions.beginSession(user, session, { isNew: false })
        return
      }
      setAccount({ phase: 'signedout' })
      if (ended === 'expired' || ended === 'revoked') {
        actions.openAuth('signin', { banner: endedBanner(ended) })
        return
      }
      let seen = true
      try {
        seen = (deps.welcomeStorage ?? globalThis.localStorage).getItem(WELCOME_KEY) === '1'
      } catch {
        seen = true
      }
      if (!seen) deferWelcome(ctx)
    },

    beginSession: (user, session, o) => beginSession(ctx, user, session, o),

    async endSession(message) {
      clearSaveTimer(ctx)
      clearRetryTimer(ctx)
      // The write starts synchronously, so the state can be cleared before it settles.
      const flushed = actions.flushCloudSave()
      setAccount({
        phase: 'signedout',
        user: null,
        session: null,
        backend: null,
        gardens: [],
        activeId: null,
        journal: [],
        pending: false,
        lastSaved: 0,
        lastError: '',
      })
      await flushed
      if (message) deps.toast(message)
    },

    watchSession() {
      const { phase } = state()
      if (phase !== 'cloud' && phase !== 'onboarding') return
      const { session, ended } = deps.auth.getSession()
      if (session) return
      void actions.endSession()
      actions.openAuth('signin', { banner: endedBanner(ended) })
    },
  }
}
