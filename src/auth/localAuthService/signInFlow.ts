import { AuthError } from '../AuthError'
import type { AuthService, Session, SessionCheck } from '../types'
import { AUTH_SESSION_KEY, LOCKOUT, MAX_FAILED, MSG } from './constants'
import type { AuthContext } from './context'
import { norm, requireEmail } from './email'
import { checkPassword } from './password'
import { publicUser } from './records'
import { clearSession, issueCode, startSession } from './tokens'
import { ensureDemo, readUsers, writeUsers } from './userStore'

export function getSession(ctx: AuthContext): SessionCheck {
  ensureDemo(ctx)
  let s: Session | null = null
  try {
    s = JSON.parse(
      ctx.local().getItem(AUTH_SESSION_KEY) ||
        ctx.sessionStore().getItem(AUTH_SESSION_KEY) ||
        'null',
    ) as Session | null
  } catch {
    s = null
  }
  if (!s) return { session: null, user: null }
  const u = readUsers(ctx)[norm(s.email)]
  if (!u || u.id !== s.userId) return { session: null, user: null, ended: 'missing' }
  if (ctx.now() > s.expiresAt) {
    clearSession(ctx)
    return { session: null, user: null, ended: 'expired' }
  }
  if ((u.sessionVersion || 1) !== s.version) {
    clearSession(ctx)
    return { session: null, user: null, ended: 'revoked' }
  }
  return { session: s, user: publicUser(u) }
}

export async function signIn(
  ctx: AuthContext,
  { email, password, remember }: Parameters<AuthService['signIn']>[0],
): ReturnType<AuthService['signIn']> {
  await ctx.latency()
  const key = norm(email)
  requireEmail(key)
  const noAccount = () =>
    new AuthError('no_account', 'There’s no account with this email.', { field: 'email' })
  const lockedError = (until: number) => new AuthError('locked', MSG.locked, { until })
  const before = readUsers(ctx)[key]
  if (!before) throw noAccount()
  if (before.provider && before.provider !== 'password' && !before.hash && !before.demoPw) {
    throw new AuthError(
      'use_provider',
      `This account signs in with ${before.provider}. Use that button above.`,
    )
  }
  if (ctx.now() < (before.lockedUntil || 0)) throw lockedError(before.lockedUntil!)
  const passwordOk = await checkPassword(before, password)
  // Re-read after hashing: a parallel attempt may have counted a failure or set a lockout
  const users = readUsers(ctx)
  const u = users[key]
  if (!u) throw noAccount()
  if (ctx.now() < (u.lockedUntil || 0)) throw lockedError(u.lockedUntil!)
  if (!passwordOk) {
    u.failed = (u.failed || 0) + 1
    if (u.failed >= MAX_FAILED) {
      u.lockedUntil = ctx.now() + LOCKOUT
      u.failed = 0
      writeUsers(ctx, users)
      throw new AuthError('locked', MSG.locked, { until: u.lockedUntil })
    }
    writeUsers(ctx, users)
    const left = MAX_FAILED - u.failed
    throw new AuthError(
      'wrong_password',
      `That password isn’t right. ${left} ${left === 1 ? 'try' : 'tries'} left before a short lockout.`,
      { field: 'password' },
    )
  }
  u.failed = 0
  u.lockedUntil = 0
  writeUsers(ctx, users)
  if (!u.verified) {
    issueCode(ctx, key, 'verify')
    throw new AuthError('not_verified', 'Confirm your email first. We sent you a new code.', {
      email: u.email,
    })
  }
  return { session: startSession(ctx, u, remember), user: publicUser(u) }
}
