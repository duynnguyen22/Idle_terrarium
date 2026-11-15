import { AuthError } from '../AuthError'
import type { AuthService } from '../types'
import { NAME_MAX } from './constants'
import type { AuthContext } from './context'
import { norm, requireEmail } from './email'
import { publicUser } from './records'
import { issueCode, startSession } from './tokens'
import { readUsers, rid, writeUsers } from './userStore'

export async function sendMagicLink(ctx: AuthContext, email: string): Promise<void> {
  await ctx.latency()
  const key = norm(email)
  requireEmail(key, 'Enter your email first.')
  issueCode(ctx, key, 'magic')
}

export async function completeMagicLink(
  ctx: AuthContext,
  email: string,
): ReturnType<AuthService['completeMagicLink']> {
  await ctx.latency()
  const key = norm(email)
  const p = ctx.pending[key]
  if (!p || p.purpose !== 'magic' || ctx.now() > p.expiresAt) {
    throw new AuthError('code_expired', 'This link has expired. Send a new one.')
  }
  delete ctx.pending[key]
  const users = readUsers(ctx)
  let isNew = false
  if (!users[key]) {
    users[key] = {
      id: rid(ctx, 'usr'),
      name: key.split('@')[0],
      email: email.trim(),
      salt: '',
      hash: null,
      provider: 'email link',
      verified: true,
      createdAt: ctx.now(),
      sessionVersion: 1,
    }
    isNew = true
  }
  const u = users[key]
  u.verified = true
  writeUsers(ctx, users)
  return { session: startSession(ctx, u, true), user: publicUser(u), isNew }
}

export async function signInWithProvider(
  ctx: AuthContext,
  provider: string,
  { email, name }: Parameters<AuthService['signInWithProvider']>[1],
): ReturnType<AuthService['signInWithProvider']> {
  await ctx.latency()
  const key = norm(email)
  requireEmail(key)
  const users = readUsers(ctx)
  let isNew = false
  if (!users[key]) {
    users[key] = {
      id: rid(ctx, 'usr'),
      name: (name || key.split('@')[0]).trim().slice(0, NAME_MAX),
      email: email.trim(),
      salt: '',
      hash: null,
      provider,
      verified: true,
      createdAt: ctx.now(),
      sessionVersion: 1,
    }
    isNew = true
  }
  writeUsers(ctx, users)
  const u = users[key]
  return { session: startSession(ctx, u, true), user: publicUser(u), isNew }
}
