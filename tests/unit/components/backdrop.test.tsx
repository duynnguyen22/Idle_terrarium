import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BackdropSection } from '@/components/catalog/BackdropSection'
import { VesselTab } from '@/components/catalog/VesselTab'
import { useToastStore } from '@/store/toastStore'
import { createDefaultState, useStudioStore } from '@/store/useStudioStore'

beforeEach(() => {
  useStudioStore.setState(createDefaultState())
  // jsdom has no canvas: thumbnails must cope with a missing 2D context
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
})
afterEach(() => vi.restoreAllMocks())

describe('BackdropSection', () => {
  it('lists eight backdrops as radios with Clear glass checked', () => {
    render(<BackdropSection />)
    const group = screen.getByRole('radiogroup', { name: 'Backdrop' })
    expect(within(group).getAllByRole('radio')).toHaveLength(8)
    expect(screen.getByRole('radio', { name: 'Clear glass' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(
      screen.getByRole('heading', { name: 'Miniature landscape backdrop' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Change photo' })).toBeNull()
  })

  it('selecting a tile sets the backdrop and reveals the haze slider', async () => {
    const user = userEvent.setup()
    render(<BackdropSection />)
    expect(screen.queryByLabelText('Depth haze')).toBeNull()
    await user.click(screen.getByRole('radio', { name: 'Ha Long karst' }))
    expect(useStudioStore.getState().backdrop).toBe('karst')
    expect(screen.getByLabelText('Depth haze')).toHaveValue('35')
    expect(screen.getByRole('radio', { name: 'Ha Long karst' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(screen.getByText('35%')).toBeInTheDocument()
    expect(
      screen.getByText('More haze pushes the scene further back behind your plants.'),
    ).toBeInTheDocument()
  })

  it('the haze slider writes through the store', () => {
    useStudioStore.setState({ backdrop: 'pines' })
    render(<BackdropSection />)
    const slider = screen.getByLabelText('Depth haze')
    expect(slider).toHaveAttribute('min', '0')
    expect(slider).toHaveAttribute('max', '80')
    fireEvent.change(slider, { target: { value: '60' } })
    expect(useStudioStore.getState().backdropHaze).toBe(60)
    expect(screen.getByText('60%')).toBeInTheDocument()
  })

  it('the custom tile without a photo opens the file input', async () => {
    const user = userEvent.setup()
    const { container } = render(<BackdropSection />)
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!
    expect(input).toHaveAttribute('accept', 'image/*')
    const click = vi.spyOn(input, 'click').mockImplementation(() => undefined)
    await user.click(screen.getByRole('radio', { name: 'Your photo' }))
    expect(click).toHaveBeenCalledTimes(1)
    expect(useStudioStore.getState().backdrop).toBe('none')
  })

  it('a non-image upload shows the rejection toast and keeps the backdrop', async () => {
    const user = userEvent.setup({ applyAccept: false })
    const { container } = render(<BackdropSection />)
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!
    await user.upload(input, new File(['x'], 'notes.txt', { type: 'text/plain' }))
    await vi.waitFor(() =>
      expect(useToastStore.getState().message).toBe('Choose an image file (JPG, PNG or WebP)'),
    )
    expect(useStudioStore.getState().backdrop).toBe('none')
  })
})

describe('VesselTab', () => {
  it('places the backdrop section between Enclosure and Build recipes', () => {
    render(<VesselTab />)
    const headings = screen.getAllByRole('heading').map((h) => h.textContent)
    const i = headings.indexOf('Miniature landscape backdrop')
    expect(headings[i - 1]).toBe('Enclosure')
    expect(headings[i + 1]).toBe('Build recipes')
  })
})
