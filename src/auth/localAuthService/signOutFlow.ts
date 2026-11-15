import type { AuthContext } from './context'
import { clearSession } from './tokens'
import { findById, readUsers, writeUsers } from './userStore'

export async function signOut(ctx: AuthContext): Promise<void> {
  await ctx.signOutDelay()
  clearSession(ctx)
}

export async function signOutEverywhere(ctx: AuthContext, userId: string): Promise<void> {
  await ctx.latency()
  const users = readUsers(ctx)
  const u = findById(users, userId)
  if (u) {
    u.sessionVersion = (u.sessionVersion || 1) + 1
    writeUsers(ctx, users)
  }
  clearSession(ctx)
}
