import type { AccountState } from './state'

/** The account chip in the header (spec setAccountStatus). */
export function chipStatus(
  s: AccountState,
  now: number,
): { signedIn: boolean; name: string; text: string; q: 'idle' | 'err' | 'busy' | 'ok' } {
  const signedIn = s.phase === 'cloud' || s.phase === 'onboarding'
  if (!signedIn) {
    const checking = s.phase === 'checking'
    return {
      signedIn,
      name: checking ? 'One moment' : 'Sign in',
      text: checking ? '' : 'to save your work',
      q: 'idle',
    }
  }
  const name = s.user?.name ?? ''
  if (s.lastError) return { signedIn, name, text: s.lastError, q: 'err' }
  if (s.writing || s.saveTimer) return { signedIn, name, text: 'Saving…', q: 'busy' }
  return {
    signedIn,
    name,
    text: s.lastSaved ? `Saved ${timeAgo(s.lastSaved, now)}` : 'Synced',
    q: 'ok',
  }
}

export function timeAgo(ts: number, now: number = Date.now()): string {
  if (!ts) return 'not saved yet'
  const s = Math.round((now - ts) / 1000)
  if (s < 10) return 'just now'
  if (s < 60) return `${s} s ago`
  if (s < 3600) return `${Math.round(s / 60)} min ago`
  if (s < 86400) return `${Math.round(s / 3600)} h ago`
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function initialsOf(name: string): string {
  const parts = String(name || '?')
    .trim()
    .split(/\s+/)
  const first = (parts[0] || '?')[0] ?? '?'
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return (first + last).toUpperCase()
}

const AVATAR_COLORS = [
  '#2d6a4f',
  '#40704f',
  '#5b6f3a',
  '#2b6777',
  '#7a5c3e',
  '#6a4c7a',
  '#7a3e4e',
  '#3e5a7a',
] as const

export function avatarColor(id: string): string {
  let h = 0
  for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length] ?? AVATAR_COLORS[0]
}
