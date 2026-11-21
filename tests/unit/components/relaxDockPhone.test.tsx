import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { RelaxDock } from '@/components/stage/RelaxDock'
import { appStore } from '@/store/appStore'
import { layoutModeAtom } from '@/store/layout'
import { relaxModeAtom } from '@/store/studio'

afterEach(() => {
  appStore.set(layoutModeAtom, 'desktop')
  appStore.set(relaxModeAtom, false)
})

function renderDock(mode: 'desktop' | 'phone' | 'land') {
  appStore.set(layoutModeAtom, mode)
  appStore.set(relaxModeAtom, true)
  render(<RelaxDock />)
  return document.getElementById('relax-dock') as HTMLElement
}

describe('relax dock on a phone', () => {
  it('phone dock hides the Sanctuary mark and wraps', () => {
    const dock = renderDock('phone')
    expect(screen.queryByText('Sanctuary')).not.toBeInTheDocument()
    expect(dock.className).toContain('flex-wrap')
    expect(dock.className).toContain('inset-x-2')
    expect(dock.className).toContain('rounded-[24px]')
    expect(dock.className).not.toContain('-translate-x-1/2')
  })

  it('phone dock has no dividers and no Esc hint, and a 40 px exit pill', () => {
    const dock = renderDock('phone')
    expect(dock.querySelector('[data-slot="separator"]')).toBeNull()
    expect(screen.queryByText('Esc')).not.toBeInTheDocument()
    const exit = screen.getByRole('button', { name: 'Exit relax mode' })
    expect(exit.textContent).toBe('Exit')
    expect(exit.className).toContain('h-10')
  })

  it('phone volume range is 104 px wide and the sound trigger is 44 px tall', () => {
    const dock = renderDock('phone')
    expect(dock.querySelector('[data-slot="slider"]')?.className).toContain('w-[104px]')
    expect(screen.getByRole('button', { name: /Sound/ }).className).toContain('min-h-11')
  })

  it('desktop keeps the single-row dock, mark, dividers and hint', () => {
    const dock = renderDock('desktop')
    expect(screen.getByText('Sanctuary')).toBeInTheDocument()
    expect(dock.className).not.toContain('flex-wrap')
    expect(dock.className).toContain('-translate-x-1/2')
    expect(dock.querySelector('[data-slot="separator"]')).not.toBeNull()
    expect(screen.getByText('Esc')).toBeInTheDocument()
    act(() => appStore.set(layoutModeAtom, 'land'))
    expect(screen.getByText('Sanctuary')).toBeInTheDocument()
  })
})
