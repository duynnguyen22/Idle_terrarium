import { vesselMetrics, type RenderFn } from './metrics'

/** Below this condensation level the glass shows no droplets (only, above 0.05, a faint fog). */
export const DROPLET_THRESHOLD = 0.18
const FOG_THRESHOLD = 0.05
const DROP_COUNT = 110

interface GlassDrop {
  x: number
  y: number
  r: number
  o: number
}

/** mulberry32: small deterministic PRNG so droplets hold still between frames and under tests. */
function seeded(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Prototype state.glassDrops: 110 drops across the upper glass, generated once from a fixed seed. */
const GLASS_DROPS: readonly GlassDrop[] = (() => {
  const rng = seeded(0x5eed6)
  return Array.from({ length: DROP_COUNT }, () => ({
    x: 0.15 + rng() * 0.7,
    y: 0.09 + rng() * 0.62,
    r: 0.8 + rng() * 2.4,
    o: rng(),
  }))
})()

/**
 * Condensation on the inside of the glass (prototype animateLoop, inside the vessel clip): a white
 * fog wash scaled by `env.condensation`, plus droplets whose count and opacity scale with it.
 * The hanging globe never fogs. Must be called inside the vessel clip.
 */
export const drawCondensation: RenderFn = (ctx, world, state, R) => {
  const c = world.env.condensation
  if (!(c > FOG_THRESHOLD) || state.vessel === 'globe') return
  const { cx, cy, r } = vesselMetrics(R)
  ctx.save()
  ctx.fillStyle = `rgba(255, 255, 255, ${(0.1 * c).toFixed(3)})`
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2)
  if (c >= DROPLET_THRESHOLD) {
    const n = Math.floor(GLASS_DROPS.length * Math.min(1, c))
    for (let i = 0; i < n; i++) {
      const g = GLASS_DROPS[i]
      ctx.fillStyle = `rgba(240, 249, 255, ${((0.35 + g.o * 0.35) * c).toFixed(3)})`
      ctx.beginPath()
      ctx.arc(cx - r + g.x * 2 * r, cy - r + g.y * 2 * r, g.r * (r / 300), 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.restore()
}
