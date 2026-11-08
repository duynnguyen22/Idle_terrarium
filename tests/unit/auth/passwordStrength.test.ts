import { describe, expect, it } from 'vitest'
import { passwordStrength } from '@/auth/passwordStrength'

describe('passwordStrength', () => {
  // Spec 4006–4021: one point each for 8+ chars, 12+ chars, mixed case, a digit and a symbol,
  // capped at 4; below the bar the score is capped at 1, above it floored at 1.
  it.each([
    ['', 0, 'Too weak', false],
    ['abcdefg', 0, 'Too weak', false],
    ['abcdefgh', 1, 'Weak', false],
    ['abcdefg1', 2, 'Fair', true],
    ['Abcdefg1', 3, 'Good', true],
    ['Abcdefghijk1', 4, 'Strong', true],
    ['Abcdefghijk1!', 4, 'Strong', true],
  ])('%s → score %i %s ok=%s', (pw, score, label, ok) => {
    expect(passwordStrength(pw)).toMatchObject({ score, label, ok })
  })

  it('reports each requirement separately', () => {
    expect(passwordStrength('12345678').checks).toEqual({
      length: true,
      letter: false,
      number: true,
    })
    expect(passwordStrength('ab1').checks).toEqual({ length: false, letter: true, number: true })
  })
})
