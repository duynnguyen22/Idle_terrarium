import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HardwarePanel } from '@/components/catalog/HardwarePanel'
import { appStore } from '@/store/appStore'
import { hasGrowLampAtom, lampColorAtom } from '@/store/studio'
import { toastAtom } from '@/store/toast'

const click = (el: HTMLElement) => act(() => void fireEvent.click(el))
const toast = () => appStore.get(toastAtom).message
const group = () => screen.getByRole('radiogroup', { name: 'Lamp light colour' })

beforeEach(() => {
  vi.useFakeTimers()
  act(() => {
    appStore.set(lampColorAtom, 'white')
    appStore.set(hasGrowLampAtom, true)
    appStore.set(toastAtom, { message: '', visible: false })
  })
})
afterEach(() => vi.useRealTimers())

describe('lamp colour control', () => {
  it('lamp colour is a two-option radio group', () => {
    render(<HardwarePanel />)
    const radios = within(group()).getAllByRole('radio')
    expect(radios).toHaveLength(2)
    expect(within(group()).getByRole('radio', { name: 'White 6500 K' })).toBeChecked()
    expect(within(group()).getByRole('radio', { name: 'Warm 3000 K' })).not.toBeChecked()
  })

  it('choosing warm saves it and explains the cost', () => {
    render(<HardwarePanel />)
    click(within(group()).getByRole('radio', { name: 'Warm 3000 K' }))
    expect(appStore.get(lampColorAtom)).toBe('warm')
    expect(toast()).toBe('Warm light, 3000 K: a cosy glow. Plants grow about 10% slower.')
  })

  it('choosing white again toasts the white copy', () => {
    render(<HardwarePanel />)
    click(within(group()).getByRole('radio', { name: 'Warm 3000 K' }))
    click(within(group()).getByRole('radio', { name: 'White 6500 K' }))
    expect(appStore.get(lampColorAtom)).toBe('white')
    expect(toast()).toBe('White light, 6500 K: best for growth.')
  })

  it('choosing the current colour does nothing', () => {
    render(<HardwarePanel />)
    click(within(group()).getByRole('radio', { name: 'White 6500 K' }))
    expect(toast()).toBe('')
    expect(appStore.get(lampColorAtom)).toBe('white')
  })

  it('without a grow lamp the colour buttons are disabled', () => {
    act(() => appStore.set(hasGrowLampAtom, false))
    render(<HardwarePanel />)
    for (const radio of within(group()).getAllByRole('radio')) expect(radio).toBeDisabled()
  })
})
