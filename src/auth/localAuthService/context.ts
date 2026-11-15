import type { PendingCode } from './records'

export interface LocalAuthOptions {
  local?: Storage
  session?: Storage
  now?: () => number
  random?: () => number
  latency?: () => Promise<void>
}

/**
 * The state one service instance shares across its flows. Every part reads and writes this one
 * object; `pending` in particular is mutated in place and never copied.
 */
export interface AuthContext {
  local: () => Storage
  sessionStore: () => Storage
  now: () => number
  random: () => number
  latency: () => Promise<void>
  signOutDelay: () => Promise<void>
  pending: Record<string, PendingCode>
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export function createAuthContext(opts: LocalAuthOptions): AuthContext {
  // Resolved on use: touching window.localStorage throws where storage is blocked, and that
  // must surface inside the try blocks below rather than when the module loads.
  const local = (): Storage => opts.local ?? localStorage
  const sessionStore = (): Storage => opts.session ?? sessionStorage
  const now = opts.now ?? Date.now
  const random = opts.random ?? Math.random
  const latency = opts.latency ?? (() => wait(450 + random() * 350))
  const signOutDelay = opts.latency ?? (() => wait(200))
  const pending: Record<string, PendingCode> = {}
  return { local, sessionStore, now, random, latency, signOutDelay, pending }
}
