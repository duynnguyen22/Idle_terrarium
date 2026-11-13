import { AccountScreen } from '@/components/account/AccountScreen'
import { AUTH_SCREEN, AuthSub, AuthTitle } from './AuthPieces'
import type { AuthView } from '@/store/account'
import { ForgotScreen } from './ForgotScreen'
import { MagicSentScreen } from './MagicSentScreen'
import { OnboardingScreen } from './OnboardingScreen'
import { ProviderScreen } from './ProviderScreen'
import { ResetDoneScreen } from './ResetDoneScreen'
import { ResetScreen } from './ResetScreen'
import { SignInScreen } from './SignInScreen'
import { SignUpScreen } from './SignUpScreen'
import { VerifyScreen } from './VerifyScreen'

/** The first card shown while the stored session is being read (spec Screens.checking). */
function Checking() {
  return (
    <div className={AUTH_SCREEN}>
      <div className="grid justify-items-center gap-2 text-center">
        <AuthTitle>One moment</AuthTitle>
        <AuthSub>Checking your session…</AuthSub>
      </div>
    </div>
  )
}

/** The dialog body's view switch. */
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
    case 'onboarding':
      return <OnboardingScreen />
    case 'account':
      return <AccountScreen />
  }
}
