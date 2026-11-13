import { useAuthEnv } from './authEnv'
import { Button } from '@/components/ui/button'
import { AUTH_PRIMARY, AUTH_SCREEN, AuthSub, AuthTitle, DoneMark } from './AuthPieces'

/** Confirms the new password and sends the person back to sign in (spec Screens.resetDone). */
export function ResetDoneScreen() {
  const { account } = useAuthEnv()
  return (
    <div className={AUTH_SCREEN}>
      <DoneMark />
      <AuthTitle>Password updated</AuthTitle>
      <AuthSub center>
        For your security we signed you out on every device. Sign in with your new password.
      </AuthSub>
      <Button
        type="button"
        size="lg"
        className={AUTH_PRIMARY}
        data-autofocus="1"
        onClick={() => account.goView('signin', { password: '', banner: null })}
      >
        Sign in
      </Button>
    </div>
  )
}
