import type { CodePurpose, Session } from '../types'
import { AUTH_SESSION_KEY, CODE_TTL, TTL_REMEMBER, TTL_SESSION } from './constants'
import type { AuthContext } from './context'
import { deviceLabel } from './deviceLabel'
import { norm } from './email'
import type { StoredUser } from './records'

export function issueCode(ctx: AuthContext, email: string, purpose: CodePurpose): string {
  const code = String(Math.floor(100000 + ctx.random() * 900000))
  ctx.pending[norm(email)] = { code, purpose, expiresAt: ctx.now() + CODE_TTL, sentAt: ctx.now() }
  return code
}

export function clear(ctx: AuthContext) {
  try {
    ctx.local().removeItem(AUTH_SESSION_KEY)
    ctx.sessionStore().removeItem(AUTH_SESSION_KEY)
  } catch {
    /* ignore */
  }
}

export function startSession(ctx: AuthContext, u: StoredUser, remember: boolean): Session {
  const ttl = remember ? TTL_REMEMBER : TTL_SESSION
  const session: Session = {
    userId: u.id,
    email: u.email,
    version: u.sessionVersion || 1,
    remember: !!remember,
    createdAt: ctx.now(),
    expiresAt: ctx.now() + ttl,
    device: deviceLabel(),
  }
  try {
    ctx.local().removeItem(AUTH_SESSION_KEY)
    ctx.sessionStore().removeItem(AUTH_SESSION_KEY)
    ;(remember ? ctx.local() : ctx.sessionStore()).setItem(
      AUTH_SESSION_KEY,
      JSON.stringify(session),
    )
  } catch {
    /* storage unavailable: the session lives only in memory for this page */
  }
  return session
}
