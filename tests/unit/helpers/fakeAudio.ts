import type { AudioContextLike, AudioNodeLike, AudioParamLike } from '@/engine/audio/audioContext'

export interface FakeOsc {
  type: string
  started: boolean
  stopped: boolean
  disconnected: boolean
  onended: (() => void) | null
  frequency: AudioParamLike
  connect: (d: AudioNodeLike) => void
  disconnect: () => void
  start: () => void
  stop: () => void
}
export interface FakeGain {
  disconnected: boolean
  gain: AudioParamLike
  connect: (d: AudioNodeLike) => void
  disconnect: () => void
}

const param = (): AudioParamLike => ({
  setValueAtTime: () => {},
  exponentialRampToValueAtTime: () => {},
})

export function createFakeAudio() {
  const oscs: FakeOsc[] = []
  const gains: FakeGain[] = []
  const ctx: AudioContextLike & { resumed: number; state: string } = {
    currentTime: 1,
    state: 'suspended',
    resumed: 0,
    destination: { connect: () => {}, disconnect: () => {} },
    resume() {
      this.resumed++
      return Promise.resolve()
    },
    createOscillator() {
      const o: FakeOsc = {
        type: 'sine',
        started: false,
        stopped: false,
        disconnected: false,
        onended: null,
        frequency: param(),
        connect: () => {},
        disconnect() {
          o.disconnected = true
        },
        start() {
          o.started = true
        },
        stop() {
          o.stopped = true
        },
      }
      oscs.push(o)
      return o
    },
    createGain() {
      const g: FakeGain = {
        disconnected: false,
        gain: param(),
        connect: () => {},
        disconnect() {
          g.disconnected = true
        },
      }
      gains.push(g)
      return g
    },
  }
  return { ctx, oscs, gains }
}
