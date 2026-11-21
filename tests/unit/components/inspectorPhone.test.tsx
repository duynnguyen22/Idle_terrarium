import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { TransformButtons } from '@/components/stage/ItemInspectorControls'
import { appStore } from '@/store/appStore'
import { layoutModeAtom } from '@/store/layout'

afterEach(() => appStore.set(layoutModeAtom, 'desktop'))

describe('inspector buttons', () => {
  it('are 40 px on handheld and unchanged on desktop', () => {
    const { rerender } = render(<TransformButtons uid="a" apply={() => {}} />)
    expect(screen.getByRole('button', { name: 'Smaller' }).className).not.toContain('size-10')
    appStore.set(layoutModeAtom, 'land')
    rerender(<TransformButtons uid="a" apply={() => {}} />)
    expect(screen.getByRole('button', { name: 'Smaller' }).className).toContain('size-10')
  })
})
