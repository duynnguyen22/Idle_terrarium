import type { AuthView } from '@/store/useAccountStore'

/** The first card shown while the stored session is being read (spec Screens.checking). */
function Checking() {
  return (
    <div className="auth-screen">
      <div className="auth-head">
        <h2 id="acct-title" className="auth-title">
          One moment
        </h2>
        <p className="auth-sub">Checking your session…</p>
      </div>
    </div>
  )
}

/**
 * The dialog body's view switch. Tasks 10-14 add the sign-in, sign-up, verify, reset, provider,
 * onboarding and account views; until then those render nothing.
 */
export function AuthScreen({ view }: { view: AuthView }) {
  switch (view) {
    case 'checking':
      return <Checking />
    default:
      return null
  }
}
