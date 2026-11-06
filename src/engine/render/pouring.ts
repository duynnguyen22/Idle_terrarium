import { SUBSTRATE_LAYERS } from '@/data/substrates'
import { num, str, vesselMetrics, type RenderFn } from './metrics'

/**
 * Draw-only half of prototype drawInteractivePouringContainerAndParticles: falling stream particles and
 * the tilted pour container cursor. Particle spawning, gravity and landing belong to the simulation tick.
 */
export const drawPouring: RenderFn = (ctx, world, state, R) => {
  const { cx, cy, r: Rad } = vesselMetrics(R)

  for (const p of world.fallingStreams) {
    const px = cx - Rad + num(p, 'x') * (Rad * 2)
    const py = cy - Rad + num(p, 'y') * (Rad * 2)

    ctx.save()
    if (p.materialId === 'water') {
      ctx.strokeStyle = 'rgba(125, 211, 252, 0.82)'
      ctx.lineWidth = 2.8
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(px, py - 7)
      ctx.lineTo(px + num(p, 'vx') * 180, py + 4)
      ctx.stroke()
    } else {
      ctx.fillStyle = str(p, 'color')
      ctx.beginPath()
      ctx.ellipse(px, py, num(p, 'r'), num(p, 'r') * 0.78, num(p, 'rot'), 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }

  // Floating tilted container/pitcher cursor inside the enclosure while the Pour tool is active
  if (state.activeTool === 'pour' && state.activePourMaterial && !state.relaxMode) {
    const layer = SUBSTRATE_LAYERS.find((l) => l.id === state.activePourMaterial)
    if (!layer) return
    const px = cx - Rad + world.pointerNorm.x * (Rad * 2)
    const py = cy - Rad + world.pointerNorm.y * (Rad * 2)

    ctx.save()
    ctx.translate(px, py)
    const tiltAngle = world.isPouring ? -0.68 : -0.22
    ctx.rotate(tiltAngle)

    if (layer.id === 'water') {
      // Glass water pitcher
      ctx.fillStyle = 'rgba(224, 242, 254, 0.78)'
      ctx.strokeStyle = '#0284c7'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.roundRect(-16, -20, 32, 38, 6)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = 'rgba(56, 189, 248, 0.75)'
      ctx.fillRect(-14, -4, 28, 20)
      // Pitcher handle
      ctx.beginPath()
      ctx.arc(16, -2, 9, -Math.PI * 0.5, Math.PI * 0.5)
      ctx.stroke()
    } else if (layer.id === 'siphon') {
      // Scoop / siphon tool
      ctx.fillStyle = 'rgba(254, 226, 226, 0.9)'
      ctx.strokeStyle = '#be123c'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(0, 0, 16, 0, Math.PI)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    } else {
      // Material shaker jar / scoop container
      ctx.fillStyle = 'rgba(255, 255, 255, 0.82)'
      ctx.strokeStyle = '#1b3b2b'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.roundRect(-15, -18, 30, 36, 6)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = layer.color
      ctx.beginPath()
      ctx.roundRect(-13, -4, 26, 20, 4)
      ctx.fill()
    }
    ctx.restore()
  }
}
