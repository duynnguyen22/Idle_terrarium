import { AuthError } from '../AuthError'
import { passwordStrength } from '../passwordStrength'
import type { AuthService, CodePurpose } from '../types'
import { MSG, NAME_MAX, RESEND_GAP } from './constants'
import type { AuthContext } from './context'
import { norm, requireEmail } from './email'
import { hash, newSalt } from './password'
import { publicUser } from './records'
import { issueCode, startSession } from './tokens'
import { readUsers, rid, writeUsers } from './userStore'

export async function signUp(
  ctx: AuthContext,
  { name, email, password }: Parameters<AuthService['signUp']>[0],
): ReturnType<AuthService['signUp']> {
  await ctx.latency()
  const key = norm(email)
  if (!name.trim()) throw new AuthError('invalid_name', MSG.name, { field: 'name' })
  requireEmail(key)
  if (!passwordStrength(password).ok) {
    throw new AuthError('weak_password', MSG.weak, { field: 'password' })
  }
  const users = readUsers(ctx)
  if (users[key]) {
    throw new AuthError('email_taken', 'An account with this email already exists.', {
      field: 'email',
    })
  }
  const salt = newSalt(ctx)
  const hashed = await hash(salt, password)
  // Re-read after hashing: a parallel sign-up may have taken the email meanwhile
  const fresh = readUsers(ctx)
  if (fresh[key]) {
    throw new AuthError('email_taken', 'An account with this email already exists.', {
      field: 'email',
    })
  }
  fresh[key] = {
    id: rid(ctx, 'usr'),
    name: name.trim().slice(0, NAME_MAX),
    email: email.trim(),
    salt,
    hash: hashed,
    verified: false,
    createdAt: ctx.now(),
    sessionVersion: 1,
  }
  writeUsers(ctx, fresh)
  issueCode(ctx, key, 'verify')
  return { email: fresh[key].email }
}

export async function verifyEmail(
  ctx: AuthContext,
  { email, code, remember }: Parameters<AuthService['verifyEmail']>[0],
): ReturnType<AuthService['verifyEmail']> {
  await ctx.latency()
  const key = norm(email)
  const p = ctx.pending[key]
  if (!p || p.purpose !== 'verify') throw new AuthError('bad_code', 'Request a new code.')
  if (ctx.now() > p.expiresAt) throw new AuthError('code_expired', MSG.codeExpired)
  if (p.code !== code) throw new AuthError('bad_code', MSG.badCode)
  delete ctx.pending[key]
  const users = readUsers(ctx)
  const u = users[key]
  if (!u) throw new AuthError('no_account', MSG.notFound)
  u.verified = true
  writeUsers(ctx, users)
  return { session: startSession(ctx, u, remember ?? true), user: publicUser(u), isNew: true }
}

export async function resendCode(
  ctx: AuthContext,
  email: string,
  purpose: CodePurpose = 'verify',
): Promise<void> {
  await ctx.latency()
  const key = norm(email)
  const p = ctx.pending[key]
  if (p && ctx.now() - p.sentAt < RESEND_GAP) {
    throw new AuthError('rate_limited', 'Wait a few seconds before asking again.')
  }
  issueCode(ctx, key, purpose)
}
