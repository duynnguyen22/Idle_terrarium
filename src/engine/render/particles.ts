import { normToPx, num, str, vesselMetrics, type RenderFn } from './metrics'

/**
 * Ambient spores and micro-droplets, plus night/twilight fireflies. Draw only: firefly drift
 * (position integration and edge bounce) belongs to the simulation tick.
 */
export const drawParticles: RenderFn = (ctx, world, state, R) => {
  const { cy, r: Rad } = vesselMetrics(R)

  world.ambientMotes.forEach((m) => {
    const mx = normToPx(R, num(m, 'x'))
    const my = cy - Rad + num(m, 'y') * (Rad * 2)
    ctx.fillStyle =
      str(m, 'type') === 'spore' ? 'rgba(163, 230, 53, 0.35)' : 'rgba(255, 255, 255, 0.35)'
    ctx.beginPath()
    ctx.arc(mx, my, num(m, 'r'), 0, Math.PI * 2)
    ctx.fill()
  })

  if (state.lighting === 'night' || state.lighting === 'twilight') {
    world.fireflies.forEach((f) => {
      const fx = normToPx(R, num(f, 'x'))
      const fy = cy - Rad + num(f, 'y') * (Rad * 2)
      const fg = ctx.createRadialGradient(fx, fy, 1, fx, fy, 9)
      fg.addColorStop(0, 'rgba(253, 224, 71, 0.85)')
      fg.addColorStop(1, 'rgba(253, 224, 71, 0)')
      ctx.fillStyle = fg
      ctx.beginPath()
      ctx.arc(fx, fy, 9, 0, Math.PI * 2)
      ctx.fill()
    })
  }
}
