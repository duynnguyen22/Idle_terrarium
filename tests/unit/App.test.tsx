import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'
import App from '@/App'
import { makeRecordingContext } from './helpers/recordingContext'

describe('App', () => {
  beforeEach(() => {
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
