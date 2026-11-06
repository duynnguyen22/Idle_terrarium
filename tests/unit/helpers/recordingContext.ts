/** Recording 2D-context stub: every unknown method is a no-op that logs its name. */
export function makeRecordingContext() {
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
      target[prop] = value
      return true
    },
  }) as unknown as CanvasRenderingContext2D
  return { ctx, calls }
}
