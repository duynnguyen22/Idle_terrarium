import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BackdropSection } from '@/components/catalog/BackdropSection'
import { VesselTab } from '@/components/catalog/VesselTab'
import { clearCustomBackdrop, setCustomBackdropFromFile } from '@/lib/backdropPhoto'
import { setSlider } from '../helpers/slider'
import { appStore } from '@/store/appStore'
import { backdropAtom, backdropHazeAtom, createDefaultState, patchStudioAtom } from '@/store/studio'
import { toastAtom } from '@/store/toast'

beforeEach(() => {
  appStore.set(patchStudioAtom, createDefaultState())
  // jsdom has no canvas: thumbnails must cope with a missing 2D context
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
})
afterEach(() => {
  clearCustomBackdrop()
  vi.restoreAllMocks()
})

/** Publishes a photo through the real module; the decode is faked since jsdom never loads images. */
async function uploadPhoto() {
  class FakeImage {
    width = 800
    height = 600
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    set src(_v: string) {
      setTimeout(() => this.onload?.(), 0)
    }
  }
  vi.stubGlobal('Image', FakeImage)
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage: () => undefined,
  } as unknown as CanvasRenderingContext2D)
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/jpeg;base64,AAAA')
  await setCustomBackdropFromFile(new File(['png'], 'tank.png', { type: 'image/png' }))
  vi.unstubAllGlobals()
  // Back to the no-canvas jsdom the component tests run under
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
}

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
    expect(appStore.get(backdropAtom)).toBe('karst')
    expect(screen.getByRole('slider', { name: 'Depth haze' })).toHaveAttribute(
      'aria-valuenow',
      '35',
    )
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
    appStore.set(patchStudioAtom, { backdrop: 'pines' })
    render(<BackdropSection />)
    const slider = screen.getByRole('slider', { name: 'Depth haze' })
    expect(slider).toHaveAttribute('aria-valuemin', '0')
    expect(slider).toHaveAttribute('aria-valuemax', '80')
    setSlider(slider, 60)
    expect(appStore.get(backdropHazeAtom)).toBe(60)
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
    expect(appStore.get(backdropAtom)).toBe('none')
  })

  it('Remove photo forgets the photo, falls back to Clear glass and says so', async () => {
    await uploadPhoto()
    appStore.set(patchStudioAtom, { backdrop: 'custom' })
    const user = userEvent.setup()
    render(<BackdropSection />)
    expect(screen.getByRole('button', { name: 'Change photo' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Remove photo' }))
    expect(appStore.get(backdropAtom)).toBe('none')
    expect(appStore.get(toastAtom).message).toBe('Photo removed')
    expect(localStorage.getItem('botanica_backdrop_photo_v1')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Remove photo' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Change photo' })).toBeNull()
    expect(
      within(screen.getByRole('radio', { name: 'Your photo' })).getByText('Upload'),
    ).toBeInTheDocument()
  })

  it('Remove photo keeps a painted scene that is already selected', async () => {
    await uploadPhoto()
    appStore.set(patchStudioAtom, { backdrop: 'karst' })
    const user = userEvent.setup()
    render(<BackdropSection />)
    await user.click(screen.getByRole('button', { name: 'Remove photo' }))
    expect(appStore.get(backdropAtom)).toBe('karst')
  })

  it('a non-image upload shows the rejection toast and keeps the backdrop', async () => {
    const user = userEvent.setup({ applyAccept: false })
    const { container } = render(<BackdropSection />)
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!
    await user.upload(input, new File(['x'], 'notes.txt', { type: 'text/plain' }))
    await vi.waitFor(() =>
      expect(appStore.get(toastAtom).message).toBe('Choose an image file (JPG, PNG or WebP)'),
    )
    expect(appStore.get(backdropAtom)).toBe('none')
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
