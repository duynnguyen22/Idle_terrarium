import { useEffect, type RefObject } from 'react'
import { ALL_CATALOG_DEFS, type CatalogId } from '@/data/catalog'
import { restoreWorld } from '@/engine/persistence'
import { computeVesselRect, renderFrame } from '@/engine/render/renderFrame'
import { tick } from '@/engine/simulation/tick'
import { warmSpriteCache } from '@/engine/sprites/spriteCache'
import { createWorld } from '@/engine/world'
import { useStudioStore } from '@/store/useStudioStore'

/** Longest simulated step; a backgrounded tab resumes with a clamped dt instead of a huge jump. */
const MAX_DT_MS = 100
const MAX_DPR = 2

/**
 * Owns the EngineWorld and the single rAF loop for `canvasRef`. The hot path reads the store via
 * `getState()` once per frame and never writes to it. The canvas backing size is owned by the component.
 */
export function useTerrariumEngine(canvasRef: RefObject<HTMLCanvasElement | null>): void {
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const world = createWorld()
    const initial = useStudioStore.getState().worldSnapshot
    if (initial) restoreWorld(world, initial)
    warmSpriteCache(ALL_CATALOG_DEFS.map((d) => d.id as CatalogId))

    // External snapshot changes (e.g. a preset load) replace the world's persistable parts.
    const unsubscribe = useStudioStore.subscribe((s, prev) => {
      if (s.worldSnapshot && s.worldSnapshot !== prev.worldSnapshot)
        restoreWorld(world, s.worldSnapshot)
    })

    let rafId = 0
    let last = 0

    const frame = (timestamp: number) => {
      rafId = requestAnimationFrame(frame)
      const dt = Math.min(timestamp - (last || timestamp), MAX_DT_MS)
      last = timestamp

      const state = useStudioStore.getState()
      tick(world, dt, timestamp)

      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
      const W = canvas.width / dpr
      const H = canvas.height / dpr
      if (W <= 0 || H <= 0) return

      ctx.save()
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      renderFrame(ctx, world, state, computeVesselRect(W, H, state.relaxMode), timestamp, {
        w: W,
        h: H,
      })
      ctx.restore()
    }

    const start = () => {
      if (rafId) return
      last = 0
      rafId = requestAnimationFrame(frame)
    }
    const stop = () => {
      if (!rafId) return
      cancelAnimationFrame(rafId)
      rafId = 0
    }
    const onVisibility = () => (document.hidden ? stop() : start())

    document.addEventListener('visibilitychange', onVisibility)
    if (!document.hidden) start()

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      stop()
      unsubscribe()
    }
  }, [canvasRef])
}
