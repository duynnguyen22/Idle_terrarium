import type { AuthContext } from './context'
import type { StoredUser } from './records'

/** SHA-256 of `salt:pw` as hex; an FNV-1a digest where WebCrypto is unavailable. */
export async function hash(salt: string, pw: string): Promise<string> {
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + ':' + pw))
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  } catch {
    let h = 2166136261
    for (const ch of salt + pw) {
      h ^= ch.charCodeAt(0)
      h = Math.imul(h, 16777619)
    }
    return 'f' + (h >>> 0).toString(16)
  }
}

export const newSalt = (ctx: AuthContext) => ctx.random().toString(36).slice(2, 12)

export async function checkPassword(u: StoredUser, pw: string): Promise<boolean> {
  if (u.demoPw) return pw === u.demoPw
  return u.hash === (await hash(u.salt, pw))
}
