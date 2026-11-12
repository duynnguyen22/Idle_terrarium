import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RelaxDock } from '@/components/stage/RelaxDock'
import { UtilityActions } from '@/components/nav/UtilityActions'
import { setAudioContextFactory } from '@/engine/audio/audioContext'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { play, stopAudio, useAudio } from '@/hooks/useAudio'
import { RELAX_IDLE_MS, useRelaxMode } from '@/hooks/useRelaxMode'
import { createDefaultState, useStudioStore } from '@/store/useStudioStore'
import { createFakeAudio } from '../helpers/fakeAudio'
import { setSlider } from '../helpers/slider'

function Harness() {
  useRelaxMode()
  useAudio()
  return <RelaxDock />
}

// Stops the module-level ambient loop a handler-started test leaves behind (no useAudio mounted to do it).
const cleanupAmbient = () => stopAudio()

beforeEach(() => {
  vi.useFakeTimers()
  useStudioStore.setState(createDefaultState())
})
afterEach(() => {
  vi.useRealTimers()
  setAudioContextFactory()
  document.body.className = ''
})

describe('useRelaxMode', () => {
  it('toggles relax-active, turns audio on, idles after 2600 ms and clears on pointer move', () => {
    render(<Harness />)
    expect(document.body.classList.contains('relax-active')).toBe(false)
    expect(screen.queryByLabelText('Exit relax mode')).toBeNull()

    act(() => useStudioStore.getState().setRelaxMode(true))
    expect(document.body.classList.contains('relax-active')).toBe(true)
    expect(useStudioStore.getState().audioEnabled).toBe(true)
    expect(screen.getByLabelText('Exit relax mode')).toBeTruthy()

    act(() => void fireEvent.pointerMove(window))
    act(() => void vi.advanceTimersByTime(RELAX_IDLE_MS - 1))
    expect(document.body.classList.contains('relax-idle')).toBe(false)
    act(() => void vi.advanceTimersByTime(1))
    expect(document.body.classList.contains('relax-idle')).toBe(true)

    act(() => void fireEvent.pointerMove(window))
    expect(document.body.classList.contains('relax-idle')).toBe(false)

    act(() => void vi.advanceTimersByTime(RELAX_IDLE_MS))
    act(() => useStudioStore.getState().setRelaxMode(false))
    expect(document.body.className).toBe('')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('dock buttons set sound preset, lighting (auto-sync off) and exit', () => {
    render(<Harness />)
    act(() => useStudioStore.getState().setRelaxMode(true))
    fireEvent.click(screen.getByRole('button', { name: /Sound/ }))
    fireEvent.click(screen.getByText('Rain on Leaves'))
    expect(useStudioStore.getState().soundPreset).toBe('rain')
    fireEvent.click(screen.getByLabelText('Moonlight'))
    expect(useStudioStore.getState().lighting).toBe('night')
    expect(useStudioStore.getState().autoLightSync).toBe(false)
    fireEvent.click(screen.getByLabelText('Follow my clock'))
    expect(useStudioStore.getState().autoLightSync).toBe(true)
    fireEvent.click(screen.getByLabelText('Exit relax mode'))
    expect(useStudioStore.getState().relaxMode).toBe(false)
  })

  it('offers music presets and a volume slider', () => {
    render(<Harness />)
    act(() => useStudioStore.getState().setRelaxMode(true))
    fireEvent.click(screen.getByRole('button', { name: /Sound/ }))
    fireEvent.click(screen.getByText('Soft Piano'))
    expect(useStudioStore.getState().soundPreset).toBe('piano')
    const [slider] = screen.getAllByRole('slider', { name: 'Music volume' })
    setSlider(slider!, 80)
    expect(useStudioStore.getState().musicVolume).toBe(0.8)
    fireEvent.click(screen.getByLabelText('Mute music'))
    expect(useStudioStore.getState().musicVolume).toBe(0)
    fireEvent.click(screen.getByLabelText('Unmute music'))
    expect(useStudioStore.getState().musicVolume).toBe(0.8)
  })

  it('Escape closes the open sound menu without leaving relax mode', () => {
    function Keys() {
      useKeyboardShortcuts()
      return null
    }
    render(
      <>
        <Harness />
        <Keys />
      </>,
    )
    act(() => useStudioStore.getState().setRelaxMode(true))
    const trigger = screen.getByRole('button', { name: /Sound/ })
    fireEvent.click(trigger)
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(useStudioStore.getState().relaxMode).toBe(true)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(useStudioStore.getState().relaxMode).toBe(false)
  })

  it('a volume change reaches the running ambient loop', () => {
    const { ctx, gains } = createFakeAudio()
    setAudioContextFactory(() => ctx)
    useStudioStore.setState({ audioEnabled: true })
    render(<Harness />)
    fireEvent.pointerDown(window)
    const values: number[] = []
    gains[0].gain.setValueAtTime = (v: number) => void values.push(v)
    act(() => useStudioStore.getState().setMusicVolume(0.25))
    expect(values).toEqual([0.5])
  })
})

describe('useAudio', () => {
  it('toggle button creates the context and starts ambient; play() is gated by audioEnabled', () => {
    const { ctx, oscs } = createFakeAudio()
    const factory = vi.fn(() => ctx)
    setAudioContextFactory(factory)
    render(
      <>
        <Harness />
        <UtilityActions />
      </>,
    )
    play('chime')
    expect(factory).not.toHaveBeenCalled()

    fireEvent.pointerDown(screen.getByLabelText('Ambient sound'))
    fireEvent.click(screen.getByLabelText('Ambient sound'))
    expect(useStudioStore.getState().audioEnabled).toBe(true)
    expect(factory).toHaveBeenCalledTimes(1)
    act(() => void vi.advanceTimersByTime(520))
    expect(oscs.length).toBeGreaterThanOrEqual(2)

    const n = oscs.length
    play('chime')
    expect(oscs.length).toBe(n + 1)

    fireEvent.click(screen.getByLabelText('Ambient sound'))
    expect(useStudioStore.getState().audioEnabled).toBe(false)
    const after = oscs.length
    act(() => void vi.advanceTimersByTime(1000))
    expect(oscs.length).toBe(after)
  })

  it('persisted audioEnabled does not start ambient before a user gesture', () => {
    const { ctx } = createFakeAudio()
    const factory = vi.fn(() => ctx)
    setAudioContextFactory(factory)
    useStudioStore.setState({ audioEnabled: true })
    render(<Harness />)
    expect(factory).not.toHaveBeenCalled()
    fireEvent.pointerDown(window)
    expect(factory).toHaveBeenCalledTimes(1)
  })

  it('toggling audio off does not create an AudioContext', () => {
    const { ctx } = createFakeAudio()
    const factory = vi.fn(() => ctx)
    setAudioContextFactory(factory)
    useStudioStore.setState({ audioEnabled: true })
    render(<UtilityActions />)
    fireEvent.click(screen.getByLabelText('Ambient sound'))
    expect(useStudioStore.getState().audioEnabled).toBe(false)
    expect(factory).not.toHaveBeenCalled()
  })

  it('the Relax button starts ambient inside the click, without any effect or prior gesture', () => {
    const { ctx, oscs } = createFakeAudio()
    const factory = vi.fn(() => ctx)
    setAudioContextFactory(factory)
    // No useAudio mounted: only the click handler can have started the context and the loop.
    render(<UtilityActions />)
    fireEvent.click(screen.getByText('Relax'))
    expect(factory).toHaveBeenCalledTimes(1)
    act(() => void vi.advanceTimersByTime(520))
    expect(oscs.length).toBeGreaterThanOrEqual(2)
    cleanupAmbient()
  })

  it('the R shortcut starts ambient inside the keydown handler', () => {
    const { ctx, oscs } = createFakeAudio()
    const factory = vi.fn(() => ctx)
    setAudioContextFactory(factory)
    function Keys() {
      useKeyboardShortcuts()
      return null
    }
    render(<Keys />)
    fireEvent.keyDown(window, { key: 'r' })
    expect(factory).toHaveBeenCalledTimes(1)
    act(() => void vi.advanceTimersByTime(520))
    expect(oscs.length).toBeGreaterThanOrEqual(2)
    cleanupAmbient()
  })
})
