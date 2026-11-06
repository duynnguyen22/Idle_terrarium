import { vesselMetrics, type RenderFn } from './metrics'

/** Paludarium black silicone frame, front water-dam bar and glass door knob. */
export const drawPaludariumFrontFrame: RenderFn = (ctx, _world, state, R) => {
  if (state.vessel !== 'paludarium_tank') return
  const { cx, cy, r: Rad } = vesselMetrics(R)
  ctx.save()
  const leftX = cx - Rad * 0.72
  const topY = cy - Rad * 0.84
  const bottomY = cy + Rad * 0.84
  const damY = bottomY - Rad * 0.34

  // Black silicone structural edges
  ctx.strokeStyle = '#111827'
  ctx.lineWidth = 4.5
  ctx.strokeRect(leftX, topY, Rad * 1.44, Rad * 1.68)

  // Front water-dam horizontal divider bar
  ctx.fillStyle = '#0f172a'
  ctx.fillRect(leftX, damY, Rad * 1.44, 5.5)

  // Front glass door metallic handle knob
  const knobX = leftX + Rad * 0.11
  const knobY = damY - Rad * 0.08
  ctx.fillStyle = '#334155'
  ctx.beginPath()
  ctx.arc(knobX, knobY, 6.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#94a3b8'
  ctx.beginPath()
  ctx.arc(knobX - 1.5, knobY - 1.5, 2.5, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}

/** Cork lid for classic jars (not the paludarium tank or the hanging globe). */
export const drawLid: RenderFn = (ctx, _world, state, R) => {
  if (!state.hasLid || state.vessel === 'paludarium_tank' || state.vessel === 'globe') return
  const { cx, cy, r: Rad } = vesselMetrics(R)
  ctx.fillStyle = '#9a6b46'
  ctx.strokeStyle = '#5c3d24'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.roundRect(cx - Rad * 0.34, cy - Rad * 0.89, Rad * 0.68, Rad * 0.06, 6)
  ctx.fill()
  ctx.stroke()
}
