import { vesselKX } from '@/data/vessels'
import { commitWorld, tryGetWorld } from '@/engine/engineBridge'
import {
  createPerf,
  perfStep,
  perfSummary,
  sampleFrame,
  type PerfState,
} from '@/engine/render/perf'
import { computeVesselRect, renderFrame } from '@/engine/render/renderFrame'
import { tick } from '@/engine/simulation/tick'
import { updateCamera } from '@/engine/view'
import type { EngineWorld } from '@/engine/world'
import { getCanvasCssSize } from '@/lib/terrariumCanvas'
import { play } from '@/services/audio'
import { appStore } from '@/store/appStore'
import { studioStateAtom, type StudioState } from '@/store/studio'
import { showToast } from '@/store/toast'
import {
  depthOnAtom,
  perfHudAtom,
  perfTextAtom,
  smoothDrawingAtom,
  zoomPctAtom,
} from '@/store/view'

/** Longest simulated step; a backgrounded tab resumes with a clamped dt instead of a huge jump. */
const MAX_DT_MS = 100
const MAX_DPR = 2

/** The loop's mutable state, shared by the frame callback and start / stop. */
interface LoopState {
  rafId: number
  last: number
  perf: PerfState
  zoomPct: number
}

/** The rAF loop's start and stop. */
interface FrameLoop {
  start: () => void
  stop: () => void
}

/** The simulation half of a frame: view flags, perf sampling and the tick. Returns the state to render. */
function stepSimulation(world: EngineWorld, perf: PerfState, dt: number, timestamp: number) {
  world.view.fastDraw = appStore.get(smoothDrawingAtom)
  world.view.depthOn = appStore.get(depthOnAtom)
  if (sampleFrame(perf, timestamp) !== null) perfStep(perf, world.view, timestamp)

  // Read before tick: this frame renders the state the frame started with.
  const state = appStore.get(studioStateAtom)
  tick(world, dt, timestamp, { onCue: play, onToast: showToast, commit: commitWorld })
  if (world.pourSettled) {
    // Pointer-up committed before the last particles landed; commit once more outside the frame.
    world.pourSettled = false
    queueMicrotask(() => {
      if (tryGetWorld() === world) commitWorld()
    })
  }
  return state
}

/** Sizes the backing store for a W x H CSS canvas; writes width and height only when they change. */
function sizeBackingStore(canvas: HTMLCanvasElement, world: EngineWorld, W: number, H: number) {
  const scale =
    Math.min(window.devicePixelRatio || 1, MAX_DPR) *
    (world.view.fastDraw ? world.view.renderScale : 1)
  const bw = Math.floor(W * scale)
  const bh = Math.floor(H * scale)
  if (canvas.width !== bw || canvas.height !== bh) {
    canvas.width = bw
    canvas.height = bh
  }
  return scale
}

/** Every 20th frame with the HUD on, publishes the perf readout. */
function publishPerfText(canvas: HTMLCanvasElement, world: EngineWorld, perf: PerfState) {
  if (world.frame % 20 === 0 && appStore.get(perfHudAtom)) {
    const sum = perfSummary(perf)
    if (sum) {
      // The view's values, which this frame drew with, not the atoms.
      const smooth = world.view.fastDraw ? 'on' : 'off'
      const detail = Math.round(world.view.renderScale * 100)
      appStore.set(
        perfTextAtom,
        `${sum.fps} fps · slowest ${sum.slowest} ms · ${canvas.width}×${canvas.height} · detail ${detail}% · smooth ${smooth}`,
      )
    }
  }
}

/** The drawing half of a frame: backing store, camera, zoom readout, render and perf readout. */
function drawWorld(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  world: EngineWorld,
  loop: LoopState,
  state: StudioState,
  dt: number,
  timestamp: number,
) {
  // Until TerrariumCanvas records the element's CSS size, the canvas is the browser's 300 x 150
  // default: the camera's one-time phone start would latch a close-up on it.
  const css = getCanvasCssSize()
  if (!css || css.w <= 0 || css.h <= 0) return
  const W = css.w
  const H = css.h
  const scale = sizeBackingStore(canvas, world, W, H)

  const R = computeVesselRect(W, H, state.relaxMode, vesselKX(state.vessel))
  const pointerLive = world.pointerInCanvas && !document.body.classList.contains('relax-idle')
  updateCamera(world.view, world, state, R, { w: W, h: H }, dt, timestamp, pointerLive)
  const pct = Math.round(world.view.cam.z * 100)
  if (pct !== loop.zoomPct) {
    loop.zoomPct = pct
    appStore.set(zoomPctAtom, pct)
  }

  ctx.save()
  ctx.setTransform(scale, 0, 0, scale, 0, 0)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = world.view.fastDraw ? 'low' : 'high'
  renderFrame(ctx, world, state, R, timestamp, { w: W, h: H })
  ctx.restore()

  publishPerfText(canvas, world, loop.perf)
}

/** The single rAF loop for `world` on `canvas`. Publishes the starting zoom; the caller starts it. */
export function createFrameLoop(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  world: EngineWorld,
): FrameLoop {
  const loop: LoopState = {
    rafId: 0,
    last: 0,
    perf: createPerf(),
    zoomPct: Math.round(world.view.cam.z * 100),
  }
  appStore.set(zoomPctAtom, loop.zoomPct)

  const frame = (timestamp: number) => {
    loop.rafId = requestAnimationFrame(frame)
    const dt = Math.min(timestamp - (loop.last || timestamp), MAX_DT_MS)
    loop.last = timestamp
    const state = stepSimulation(world, loop.perf, dt, timestamp)
    drawWorld(canvas, ctx, world, loop, state, dt, timestamp)
  }

  const start = () => {
    if (loop.rafId) return
    loop.last = 0
    loop.perf.last = 0
    loop.rafId = requestAnimationFrame(frame)
  }
  const stop = () => {
    if (!loop.rafId) return
    cancelAnimationFrame(loop.rafId)
    loop.rafId = 0
  }
  return { start, stop }
}
