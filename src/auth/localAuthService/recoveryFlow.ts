import { AuthError } from '../AuthError'
import { passwordStrength } from '../passwordStrength'
import type { AuthService } from '../types'
import { MSG } from './constants'
import type { AuthContext } from './context'
import { norm, requireEmail } from './email'
import { hash, newSalt } from './password'
import { issueCode } from './tokens'
import { readUsers, writeUsers } from './userStore'

export async function requestPasswordReset(ctx: AuthContext, email: string): Promise<void> {
  await ctx.latency()
  const key = norm(email)
  requireEmail(key)
  // Same answer whether or not the account exists, as a real service would give
  if (readUsers(ctx)[key]) issueCode(ctx, key, 'reset')
}

export async function resetPassword(
  ctx: AuthContext,
  { email, code, password }: Parameters<AuthService['resetPassword']>[0],
): Promise<void> {
  await ctx.latency()
  const key = norm(email)
  const p = ctx.pending[key]
  if (!p || p.purpose !== 'reset' || p.code !== code) {
    throw new AuthError('bad_code', MSG.badCode, { field: 'code' })
  }
  if (ctx.now() > p.expiresAt) throw new AuthError('code_expired', MSG.codeExpired)
  if (!passwordStrength(password).ok) {
    throw new AuthError('weak_password', MSG.weak, { field: 'password' })
  }
  const salt = newSalt(ctx)
  const hashed = await hash(salt, password)
  // Re-check after hashing: a parallel reset may have used the code
  if (ctx.pending[key] !== p) throw new AuthError('bad_code', MSG.badCode, { field: 'code' })
  const users = readUsers(ctx)
  const u = users[key]
  if (!u) throw new AuthError('no_account', MSG.notFound)
  u.salt = salt
  u.hash = hashed
  delete u.demoPw
  u.verified = true
  u.failed = 0
  u.lockedUntil = 0
  u.sessionVersion = (u.sessionVersion || 1) + 1 // a reset signs out every device
  writeUsers(ctx, users)
  delete ctx.pending[key]
}
