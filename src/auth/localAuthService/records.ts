import type { CodePurpose, PublicUser } from '../types'

/** The stored account record. `demoPw` is the seeded demo account's plain password. */
export interface StoredUser {
  id: string
  name: string
  email: string
  salt: string
  hash: string | null
  demoPw?: string
  provider?: string
  verified: boolean
  createdAt: number
  sessionVersion: number
  failed?: number
  lockedUntil?: number
}

export type Users = Record<string, StoredUser>

export interface PendingCode {
  code: string
  purpose: CodePurpose
  expiresAt: number
  sentAt: number
}

export const publicUser = (u: StoredUser): PublicUser => ({
  id: u.id,
  name: u.name,
  email: u.email,
  verified: !!u.verified,
  provider: u.provider || 'password',
  createdAt: u.createdAt,
})
