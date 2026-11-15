import { AuthError } from '../AuthError'
import { AUTH_USERS_KEY, MSG } from './constants'
import type { AuthContext } from './context'
import type { Users } from './records'

/**
 * The stored accounts, or {} when storage is unreadable or holds anything but a plain
 * object. Callers that await (hashing) must call this again afterwards and mutate the
 * fresh copy, so parallel calls don't overwrite each other's writes.
 */
export const readUsers = (ctx: AuthContext): Users => {
  try {
    const parsed: unknown = JSON.parse(ctx.local().getItem(AUTH_USERS_KEY) || '{}')
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Users) : {}
  } catch {
    return {}
  }
}
export const writeUsers = (ctx: AuthContext, users: Users) => {
  try {
    ctx.local().setItem(AUTH_USERS_KEY, JSON.stringify(users))
  } catch {
    throw new AuthError('storage', MSG.storage)
  }
}
export const findById = (users: Users, userId: string) =>
  Object.values(users).find((x) => x.id === userId)
export const rid = (ctx: AuthContext, prefix: string) =>
  prefix + '_' + ctx.random().toString(36).slice(2, 10) + ctx.now().toString(36).slice(-4)

export function ensureDemo(ctx: AuthContext) {
  const users = readUsers(ctx)
  if (users['demo@botanica.app']) return
  users['demo@botanica.app'] = {
    id: 'usr_demo',
    name: 'Demo Gardener',
    email: 'demo@botanica.app',
    salt: 'demo',
    hash: null,
    demoPw: 'terrarium1',
    verified: true,
    createdAt: ctx.now(),
    sessionVersion: 1,
  }
  try {
    writeUsers(ctx, users)
  } catch {
    /* blocked storage: getSession must still answer "signed out" */
  }
}
