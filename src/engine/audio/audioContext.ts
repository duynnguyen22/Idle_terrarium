/**
 * Minimal structural subset of the Web Audio API used by the ASMR and ambient synths. A real AudioContext
 * satisfies it; tests inject a fake. Prototype 1601-1609.
 */
export interface AudioParamLike {
  setValueAtTime(value: number, time: number): unknown
  exponentialRampToValueAtTime(value: number, time: number): unknown
}

export interface AudioNodeLike {
  connect(destination: AudioNodeLike): unknown
  disconnect(): void
}

export interface OscillatorLike extends AudioNodeLike {
  type: string
  frequency: AudioParamLike
  onended: ((ev?: unknown) => void) | null
  start(when?: number): void
  stop(when?: number): void
}

export interface GainLike extends AudioNodeLike {
  gain: AudioParamLike
}

export interface AudioContextLike {
  readonly currentTime: number
  readonly state: string
  readonly destination: AudioNodeLike
  resume(): Promise<void>
  createOscillator(): OscillatorLike
  createGain(): GainLike
}

type Factory = () => AudioContextLike | null

const defaultFactory: Factory = () => {
  const w = window as unknown as {
    AudioContext?: new () => AudioContextLike
    webkitAudioContext?: new () => AudioContextLike
  }
  const Ctor = w.AudioContext ?? w.webkitAudioContext
  return Ctor ? new Ctor() : null
}

let factory: Factory = defaultFactory
let ctx: AudioContextLike | null = null
let visibilityBound = false

const onVisible = () => {
  if (document.visibilityState === 'visible' && ctx && ctx.state === 'suspended') void ctx.resume()
}

/**
 * Lazy singleton. Call only from a user-gesture path (toggle click, first pointer/key, a tool click); creates the
 * context on first use and resumes it when suspended (prototype ensureAudioContext).
 */
export function ensureAudioContext(): AudioContextLike | null {
  if (!ctx) {
    ctx = factory()
    if (ctx && !visibilityBound) {
      document.addEventListener('visibilitychange', onVisible)
      visibilityBound = true
    }
  }
  if (ctx && ctx.state === 'suspended') void ctx.resume()
  return ctx
}

/** Test seam: replace the context factory and drop any existing singleton. Pass no argument to restore defaults. */
export function setAudioContextFactory(f?: Factory): void {
  factory = f ?? defaultFactory
  ctx = null
  if (visibilityBound) {
    document.removeEventListener('visibilitychange', onVisible)
    visibilityBound = false
  }
}
