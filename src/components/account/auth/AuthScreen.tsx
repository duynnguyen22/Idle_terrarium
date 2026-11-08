import type { AuthView } from '@/store/useAccountStore'
import { ForgotScreen } from './ForgotScreen'
import { MagicSentScreen } from './MagicSentScreen'
import { ProviderScreen } from './ProviderScreen'
import { ResetDoneScreen } from './ResetDoneScreen'
import { ResetScreen } from './ResetScreen'
import { SignInScreen } from './SignInScreen'
import { SignUpScreen } from './SignUpScreen'
import { VerifyScreen } from './VerifyScreen'

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
 * The dialog body's view switch. Tasks 12-14 add the onboarding and account views; until then
 * those render nothing.
 */
export function AuthScreen({ view }: { view: AuthView }) {
  switch (view) {
    case 'checking':
      return <Checking />
    case 'signin':
      return <SignInScreen />
    case 'signup':
      return <SignUpScreen />
    case 'verify':
      return <VerifyScreen />
    case 'forgot':
      return <ForgotScreen />
    case 'reset':
      return <ResetScreen />
    case 'resetDone':
      return <ResetDoneScreen />
    case 'magicSent':
      return <MagicSentScreen />
    case 'provider':
      return <ProviderScreen />
    default:
      return null
  }
}
