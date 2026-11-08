import type { MistBead, SprayParticle } from '../simulation/mist'
import { vesselMetrics, type RenderFn } from './metrics'

/**
 * Draw-only half of the artifact's drawMistSpray: spray droplets (fine mist puffs and falling drops),
 * glistening beads on leaves and soil, and the spray-bottle cursor while the Mist tool is active.
 * Spawning, motion and landing belong to the simulation tick.
 */
export const drawMist: RenderFn = (ctx, world, state, R) => {
  const { cy, r: Rad } = vesselMetrics(R)
  const toPx = (nx: number) => R.x + nx * R.w
  const toPy = (ny: number) => cy - Rad + ny * 2 * Rad
  const spray = world.sprayParticles as unknown as SprayParticle[]
  const beads = world.mistBeads as unknown as MistBead[]

  ctx.save()
  for (const p of spray) {
    if (p.fine) {
      ctx.fillStyle = `rgba(236, 246, 255, ${(0.22 * p.life).toFixed(3)})`
      ctx.beginPath()
      ctx.arc(
        toPx(p.x),
        toPy(p.y),
        Math.max(0, (p.r + 3 * (1 - p.life)) * (Rad / 220)),
        0,
        Math.PI * 2,
      )
      ctx.fill()
    } else {
      ctx.fillStyle = `rgba(214, 238, 255, ${(0.85 * p.life).toFixed(3)})`
      ctx.beginPath()
      ctx.ellipse(
        toPx(p.x),
        toPy(p.y),
        p.r * (Rad / 260),
        p.r * 1.4 * (Rad / 260),
        0,
        0,
        Math.PI * 2,
      )
      ctx.fill()
    }
  }

  for (const b of beads) {
    const bx = toPx(b.x)
    const by = toPy(b.y)
    const br = b.r * (Rad / 240)
    ctx.fillStyle = `rgba(200, 232, 255, ${(0.7 * b.life).toFixed(3)})`
    ctx.beginPath()
    ctx.arc(bx, by, br, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = `rgba(255, 255, 255, ${(0.9 * b.life).toFixed(3)})`
    ctx.beginPath()
    ctx.arc(bx - br * 0.35, by - br * 0.35, br * 0.35, 0, Math.PI * 2)
    ctx.fill()
  }

  // Spray bottle that follows the pointer
  if (state.activeTool === 'mist' && !state.relaxMode && world.pointerInCanvas) {
    const bx = toPx(world.pointerNorm.x)
    const by = toPy(world.pointerNorm.y)
    const s = Math.max(0.8, Rad / 300)
    ctx.save()
    ctx.translate(bx, by)
    ctx.scale(s, s)
    ctx.rotate(-0.35)
    const squeeze = world.isMisting ? 3 : 0
    // Bottle body and water level
    ctx.fillStyle = '#e6f4ea'
    ctx.strokeStyle = '#1b3b2b'
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.roundRect(-30, -12, 22, 36, 6)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = 'rgba(56, 189, 248, 0.45)'
    ctx.beginPath()
    ctx.roundRect(-28.5, 4, 19, 18.5, 4)
    ctx.fill()
    // Neck, head and nozzle
    ctx.fillStyle = '#2d5a43'
    ctx.beginPath()
    ctx.roundRect(-26, -20, 14, 9, 2)
    ctx.fill()
    ctx.beginPath()
    ctx.roundRect(-30, -28, 26, 9, 3)
    ctx.fill()
    ctx.fillRect(-4, -26, 6, 5)
    // Trigger, pulled back while spraying
    ctx.strokeStyle = '#2d5a43'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(-8, -19)
    ctx.quadraticCurveTo(-4 - squeeze, -12, -6 - squeeze, -5)
    ctx.stroke()
    ctx.restore()
    if (!world.isMisting) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
      ctx.font = '600 11px Inter, sans-serif'
      ctx.fillText('Hold to mist', bx + 14 * s, by + 30 * s)
    }
  }
  ctx.restore()
}
