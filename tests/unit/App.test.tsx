import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'
import App from '@/App'
import { makeRecordingContext } from './helpers/recordingContext'
import { WELCOME_KEY } from '@/store/useAccountStore'

describe('App', () => {
  beforeEach(() => {
    // Skip the first-visit sign-up prompt: Radix's modal dialog hides the page behind it.
    localStorage.setItem(WELCOME_KEY, '1')
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    )
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      makeRecordingContext().ctx as unknown as ReturnType<HTMLCanvasElement['getContext']>,
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('renders the brand heading', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /botanica/i })).toBeInTheDocument()
  })

  it('exposes the stage canvas as a labelled application region', () => {
    render(<App />)
    expect(screen.getByRole('application', { name: 'Terrarium canvas' })).toBeInTheDocument()
  })
})
