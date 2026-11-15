import { AuthError } from '../AuthError'
import { passwordStrength } from '../passwordStrength'
import type { AuthService, PublicUser } from '../types'
import { MSG, NAME_MAX } from './constants'
import type { AuthContext } from './context'
import { checkPassword, hash, newSalt } from './password'
import { publicUser } from './records'
import { clearSession } from './tokens'
import { findById, readUsers, writeUsers } from './userStore'

export async function updateProfile(
  ctx: AuthContext,
  userId: string,
  { name }: Parameters<AuthService['updateProfile']>[1],
): Promise<PublicUser> {
  await ctx.latency()
  const users = readUsers(ctx)
  const u = findById(users, userId)
  if (!u) throw new AuthError('no_account', MSG.notFound)
  if (!name.trim()) throw new AuthError('invalid_name', MSG.name, { field: 'name' })
  u.name = name.trim().slice(0, NAME_MAX)
  writeUsers(ctx, users)
  return publicUser(u)
}

export async function changePassword(
  ctx: AuthContext,
  userId: string,
  { current, next }: Parameters<AuthService['changePassword']>[1],
): Promise<void> {
  await ctx.latency()
  const before = findById(readUsers(ctx), userId)
  if (!before) throw new AuthError('no_account', MSG.notFound)
  if ((before.hash || before.demoPw) && !(await checkPassword(before, current))) {
    throw new AuthError('wrong_password', 'Your current password isn’t right.', {
      field: 'current',
    })
  }
  if (!passwordStrength(next).ok) {
    throw new AuthError('weak_password', MSG.weak, { field: 'next' })
  }
  const salt = newSalt(ctx)
  const hashed = await hash(salt, next)
  // Re-read after hashing so a parallel profile edit is not overwritten
  const users = readUsers(ctx)
  const u = findById(users, userId)
  if (!u) throw new AuthError('no_account', MSG.notFound)
  u.salt = salt
  u.hash = hashed
  delete u.demoPw
  writeUsers(ctx, users)
}

export async function deleteAccount(ctx: AuthContext, userId: string): Promise<void> {
  await ctx.latency()
  const users = readUsers(ctx)
  const key = Object.keys(users).find((k) => users[k].id === userId)
  if (key) {
    delete users[key]
    writeUsers(ctx, users)
  }
  clearSession(ctx)
}
