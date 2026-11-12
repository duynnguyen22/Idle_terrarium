import { fireEvent } from '@testing-library/react'

/**
 * Moves a Radix slider thumb (role="slider") to `value` with the arrow keys, one step at a time
 * from where it is, the way a person would. Throws if the value is never reached.
 */
export function setSlider(thumb: HTMLElement, value: number): void {
  const now = () => Number(thumb.getAttribute('aria-valuenow'))
  for (let i = 0; now() !== value && i < 1000; i++) {
    const before = now()
    fireEvent.keyDown(thumb, { key: before < value ? 'ArrowRight' : 'ArrowLeft' })
    if (now() === before) break
  }
  if (now() !== value) throw new Error(`slider stopped at ${now()}, wanted ${value}`)
}
