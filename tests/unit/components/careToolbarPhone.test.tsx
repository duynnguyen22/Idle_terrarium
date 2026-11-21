import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { CareToolbar } from '@/components/stage/CareToolbar'
import { appStore } from '@/store/appStore'
import { layoutModeAtom } from '@/store/layout'
import { activePourMaterialAtom, activeToolAtom } from '@/store/studio'

afterEach(() => {
  appStore.set(layoutModeAtom, 'desktop')
  appStore.set(activeToolAtom, 'select')
  appStore.set(activePourMaterialAtom, null)
})

describe('care toolbar on a phone', () => {
  it('care tools are icon buttons named by their label on a phone', () => {
    appStore.set(layoutModeAtom, 'phone')
    render(<CareToolbar />)
    const mist = screen.getByRole('button', { name: 'Mist Spray' })
    expect(mist).toHaveAttribute('title', 'Mist Spray')
    expect(mist.textContent).toBe('')
    expect(mist.className).toContain('size-11')
  })

  it('desktop keeps the visible labels', () => {
    render(<CareToolbar />)
    expect(screen.getByRole('button', { name: 'Mist Spray' }).textContent).toBe('Mist Spray')
  })

  it('the pour indicator keeps its text, cut off at 96 px', () => {
    appStore.set(layoutModeAtom, 'phone')
    appStore.set(activeToolAtom, 'pour')
    appStore.set(activePourMaterialAtom, 'water')
    render(<CareToolbar />)
    const pour = screen.getByRole('button', { name: 'Pouring: Lake Water' })
    expect(pour.textContent).toBe('Pouring: Lake Water')
    expect(pour.querySelector('span')?.className).toContain('max-w-[96px]')
    act(() => appStore.set(layoutModeAtom, 'desktop'))
    expect(
      screen.getByRole('button', { name: 'Pouring: Lake Water' }).querySelector('span')?.className,
    ).not.toContain('max-w-[96px]')
  })
})
