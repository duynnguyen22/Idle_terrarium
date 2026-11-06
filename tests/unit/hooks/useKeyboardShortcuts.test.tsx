import { fireEvent, render } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useStudioStore } from '@/store/useStudioStore'

function Harness() {
  useKeyboardShortcuts()
  return <input data-testid="field" />
}

beforeEach(() => useStudioStore.setState({ relaxMode: false, selectedId: null }))

describe('useKeyboardShortcuts', () => {
  it('R toggles relax mode', () => {
    render(<Harness />)
    fireEvent.keyDown(window, { key: 'r' })
    expect(useStudioStore.getState().relaxMode).toBe(true)
    fireEvent.keyDown(window, { key: 'R' })
    expect(useStudioStore.getState().relaxMode).toBe(false)
  })

  it('Escape exits relax first, then clears selection', () => {
    render(<Harness />)
    useStudioStore.setState({ relaxMode: true, selectedId: 'a' })
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(useStudioStore.getState().relaxMode).toBe(false)
    expect(useStudioStore.getState().selectedId).toBe('a')
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(useStudioStore.getState().selectedId).toBeNull()
  })

  it('ignores keys typed in inputs and modified keys', () => {
    const { getByTestId } = render(<Harness />)
    fireEvent.keyDown(getByTestId('field'), { key: 'r' })
    expect(useStudioStore.getState().relaxMode).toBe(false)
    fireEvent.keyDown(window, { key: 'r', metaKey: true })
    expect(useStudioStore.getState().relaxMode).toBe(false)
  })
})
