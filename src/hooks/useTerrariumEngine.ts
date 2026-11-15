import { useEffect, type RefObject } from 'react'
import { ALL_CATALOG_DEFS, type CatalogId } from '@/data/catalog'
import { commitWorld, unregisterWorld } from '@/engine/engineBridge'
import { flushEnvSeed, flushTelemetry } from '@/engine/simulation/telemetry'
import { warmSpriteCache } from '@/engine/sprites/spriteCache'
import type { EngineWorld } from '@/engine/world'
import { startCatchUp } from '@/hooks/engineCatchUp'
import { createFrameLoop } from '@/hooks/engineFrameLoop'
import { createEngineWorld, followWorldSnapshots } from '@/hooks/engineWorldSetup'
import { appStore, type AppStore } from '@/store/appStore'
import { lastSimulatedAtAtom } from '@/store/studio'

declare global {
  interface Window {
    /** Dev/e2e debug handle; only present when `import.meta.env.DEV` (Playwright runs the dev server). */
    __botanica?: {
      world: () => EngineWorld
      /** The app's jotai store (studio, telemetry, overlay and account atoms). */
      store: AppStore
    }
  }
}

/**
 * Owns the EngineWorld and the single rAF loop for `canvasRef`. The hot path reads the studio state
 * once per frame for rendering. It also owns the canvas backing store: at the top of each frame it sizes
 * it from the CSS size TerrariumCanvas records (`getCanvasCssSize`), the DPR (capped at 2) and, with
 * smooth drawing on, the adaptive `view.renderScale`. Setting width or height clears the canvas, so it
 * is only written when the size changes, and only here.
 */
export function useTerrariumEngine(canvasRef: RefObject<HTMLCanvasElement | null>): void {
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const world = createEngineWorld()
    const { catchUpWhenSettled, unsubscribeAccount, offRestored } = startCatchUp(world)
    if (import.meta.env.DEV)
      window.__botanica = {
        world: () => world,
        store: appStore,
      }
    warmSpriteCache([...ALL_CATALOG_DEFS.map((d) => d.id as CatalogId), 'bumblebee_millipede_curl'])

    const unsubscribe = followWorldSnapshots(world)

    const { start, stop } = createFrameLoop(canvas, ctx, world)
    const saveNow = () => {
      // Push the latest day count and cycle progress now, not up to 250 ms late.
      flushTelemetry(world, appStore)
      flushEnvSeed(world, appStore)
      commitWorld()
      appStore.set(lastSimulatedAtAtom, Date.now())
    }
    const onVisibility = () => {
      if (document.hidden) {
        stop()
        saveNow()
      } else {
        catchUpWhenSettled()
        start()
      }
    }

    document.addEventListener('visibilitychange', onVisibility)
    if (!document.hidden) start()

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      stop()
      saveNow()
      unsubscribe()
      unsubscribeAccount()
      offRestored()
      unregisterWorld()
      if (import.meta.env.DEV) delete window.__botanica
    }
  }, [canvasRef])
}
