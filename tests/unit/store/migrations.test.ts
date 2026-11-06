import { describe, expect, it } from 'vitest'
import { migrate } from '@/store/migrations'

describe('migrate', () => {
  it('v0 to v1 keeps the persisted shape', () => {
    const old = { dayCount: 3, substrates: { sand: 1 } }
    expect(migrate(old, 0)).toEqual(old)
  })
})
