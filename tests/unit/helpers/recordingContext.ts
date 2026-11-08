/** Recording 2D-context stub: every unknown method is a no-op that logs its name. */
export function makeRecordingContext(styleLog?: unknown[]) {
  const calls: string[] = []
  const state: Record<string, unknown> = {}
  const gradient = { addColorStop: () => undefined }
  const ctx = new Proxy(state, {
    get(target, prop: string) {
      if (prop in target) return target[prop]
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
        return () => {
          calls.push(prop)
          return gradient
        }
      }
      return (...args: unknown[]) => {
        void args
        calls.push(prop)
      }
    },
    set(target, prop: string, value) {
      if (styleLog && prop === 'fillStyle') styleLog.push(value)
      target[prop] = value
      return true
    },
  }) as unknown as CanvasRenderingContext2D
  return { ctx, calls }
}

/** Runs a draw function against a recording context; returns named calls and every fillStyle assigned. */
export function record(fn: (ctx: CanvasRenderingContext2D) => void) {
  const fillStyles: unknown[] = []
  const { ctx, calls } = makeRecordingContext(fillStyles)
  fn(ctx)
  return { calls: calls.map((name) => ({ name })), fillStyles }
}

/**
 * Like `makeRecordingContext`, but logs every call with its arguments and every property
 * assignment, so two traces can be compared for exact equality.
 */
export function makeTraceContext() {
  const trace: string[] = []
  const state: Record<string, unknown> = {}
  const gradient = (kind: string) => ({
    addColorStop: (...args: unknown[]) =>
      trace.push(`${kind}.addColorStop(${JSON.stringify(args)})`),
  })
  const ctx = new Proxy(state, {
    get(target, prop: string) {
      if (prop in target) return target[prop]
      return (...args: unknown[]) => {
        trace.push(`${prop}(${JSON.stringify(args)})`)
        if (prop === 'createLinearGradient' || prop === 'createRadialGradient')
          return gradient(prop)
        return undefined
      }
    },
    set(target, prop: string, value) {
      trace.push(`${prop}=${typeof value === 'object' ? 'gradient' : String(value)}`)
      target[prop] = value
      return true
    },
  }) as unknown as CanvasRenderingContext2D
  return { ctx, trace }
}
