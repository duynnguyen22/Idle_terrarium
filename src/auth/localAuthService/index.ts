/**
 * The prototype AuthService (spec prototype-v7.html 4023–4240): accounts live in this
 * browser's storage and verification codes are shown on screen, because there is no
 * mail server. Swap `authService` in ../index for a real provider in production.
 */
import type { AuthService } from '../types'
import { createAuthContext, type LocalAuthOptions } from './context'
import { norm } from './email'
import { completeMagicLink, sendMagicLink, signInWithProvider } from './passwordlessFlow'
import { changePassword, deleteAccount, updateProfile } from './profileFlow'
import { requestPasswordReset, resetPassword } from './recoveryFlow'
import { getSession, signIn } from './signInFlow'
import { signOut, signOutEverywhere } from './signOutFlow'
import { resendCode, signUp, verifyEmail } from './signUpFlow'

export { AUTH_SESSION_KEY, AUTH_USERS_KEY, EMAIL_RE } from './constants'
export type { LocalAuthOptions } from './context'
export { deviceLabel } from './deviceLabel'

export function createLocalAuthService(opts: LocalAuthOptions = {}): AuthService {
  // One context per service: every flow reads and writes the same storage, clock and pending codes
  const ctx = createAuthContext(opts)

  return {
    devCode: (email) => ctx.pending[norm(email)]?.code ?? null,
    getSession: () => getSession(ctx),
    signIn: (i) => signIn(ctx, i),
    signUp: (i) => signUp(ctx, i),
    verifyEmail: (i) => verifyEmail(ctx, i),
    resendCode: (email, purpose) => resendCode(ctx, email, purpose),
    requestPasswordReset: (email) => requestPasswordReset(ctx, email),
    resetPassword: (i) => resetPassword(ctx, i),
    sendMagicLink: (email) => sendMagicLink(ctx, email),
    completeMagicLink: (email) => completeMagicLink(ctx, email),
    signInWithProvider: (provider, i) => signInWithProvider(ctx, provider, i),
    updateProfile: (userId, i) => updateProfile(ctx, userId, i),
    changePassword: (userId, i) => changePassword(ctx, userId, i),
    signOut: () => signOut(ctx),
    signOutEverywhere: (userId) => signOutEverywhere(ctx, userId),
    deleteAccount: (userId) => deleteAccount(ctx, userId),
  }
}
