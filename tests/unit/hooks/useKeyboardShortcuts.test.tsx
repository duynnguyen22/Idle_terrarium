import { fireEvent, render } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { appStore } from '@/store/appStore'
import { patchStudioAtom, relaxModeAtom, selectedIdAtom } from '@/store/studio'

function Harness() {
  useKeyboardShortcuts()
  return <input data-testid="field" />
}

beforeEach(() => appStore.set(patchStudioAtom, { relaxMode: false, selectedId: null }))

describe('useKeyboardShortcuts', () => {
  it('R toggles relax mode', () => {
    render(<Harness />)
    fireEvent.keyDown(window, { key: 'r' })
    expect(appStore.get(relaxModeAtom)).toBe(true)
    fireEvent.keyDown(window, { key: 'R' })
    expect(appStore.get(relaxModeAtom)).toBe(false)
  })

  it('Escape exits relax first, then clears selection', () => {
    render(<Harness />)
    appStore.set(patchStudioAtom, { relaxMode: true, selectedId: 'a' })
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(appStore.get(relaxModeAtom)).toBe(false)
    expect(appStore.get(selectedIdAtom)).toBe('a')
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(appStore.get(selectedIdAtom)).toBeNull()
  })

  it('ignores keys typed in inputs and modified keys', () => {
    const { getByTestId } = render(<Harness />)
    fireEvent.keyDown(getByTestId('field'), { key: 'r' })
    expect(appStore.get(relaxModeAtom)).toBe(false)
    fireEvent.keyDown(window, { key: 'r', metaKey: true })
    expect(appStore.get(relaxModeAtom)).toBe(false)
  })
})
