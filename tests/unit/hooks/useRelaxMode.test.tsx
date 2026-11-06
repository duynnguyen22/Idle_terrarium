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
    expect(screen.queryByText('Exit (Esc)')).toBeNull()

    act(() => useStudioStore.getState().setRelaxMode(true))
    expect(document.body.classList.contains('relax-active')).toBe(true)
    expect(useStudioStore.getState().audioEnabled).toBe(true)
    expect(screen.getByText('Exit (Esc)')).toBeTruthy()

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
    fireEvent.click(screen.getByText('🌧️ Rain on Leaves'))
    expect(useStudioStore.getState().soundPreset).toBe('rain')
    fireEvent.click(screen.getByText('🌙 Moonlight'))
    expect(useStudioStore.getState().lighting).toBe('night')
    expect(useStudioStore.getState().autoLightSync).toBe(false)
    fireEvent.click(screen.getByText('Exit (Esc)'))
    expect(useStudioStore.getState().relaxMode).toBe(false)
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

    fireEvent.pointerDown(screen.getByLabelText('Toggle Ambient Soundscape'))
    fireEvent.click(screen.getByLabelText('Toggle Ambient Soundscape'))
    expect(useStudioStore.getState().audioEnabled).toBe(true)
    expect(factory).toHaveBeenCalledTimes(1)
    act(() => void vi.advanceTimersByTime(520))
    expect(oscs.length).toBeGreaterThanOrEqual(2)

    const n = oscs.length
    play('chime')
    expect(oscs.length).toBe(n + 1)

    fireEvent.click(screen.getByLabelText('Toggle Ambient Soundscape'))
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
    fireEvent.click(screen.getByLabelText('Toggle Ambient Soundscape'))
    expect(useStudioStore.getState().audioEnabled).toBe(false)
    expect(factory).not.toHaveBeenCalled()
  })

  it('the Relax button starts ambient inside the click, without any effect or prior gesture', () => {
    const { ctx, oscs } = createFakeAudio()
    const factory = vi.fn(() => ctx)
    setAudioContextFactory(factory)
    // No useAudio mounted: only the click handler can have started the context and the loop.
    render(<UtilityActions />)
    fireEvent.click(screen.getByText('Relax Mode'))
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
