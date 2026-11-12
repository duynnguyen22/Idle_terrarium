import { useAuthEnv } from './authEnv'
import { CheckIcon } from './AuthPieces'

/** Confirms the new password and sends the person back to sign in (spec Screens.resetDone). */
export function ResetDoneScreen() {
  const { account } = useAuthEnv()
  return (
    <div className="auth-screen">
      <div className="auth-done">
        <CheckIcon />
      </div>
      <h2 id="acct-title" className="auth-title">
        Password updated
      </h2>
      <p className="auth-sub center">
        For your security we signed you out on every device. Sign in with your new password.
      </p>
      <button
        type="button"
        className="auth-btn primary"
        data-autofocus="1"
        onClick={() => account.goView('signin', { password: '', banner: null })}
      >
        Sign in
      </button>
    </div>
  )
}
