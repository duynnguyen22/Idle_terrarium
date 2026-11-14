import { activePings } from '../marks'
import { itemBox } from './specimens'
import type { RenderFn } from './metrics'

/** Dashed white rings for marked items and pulsing yellow rings for active pings. */
export const drawMarks: RenderFn = (ctx, world, _state, R, timestamp) => {
  const { rings } = world.marks
  const pings = activePings(world, timestamp)
  if (rings.length === 0 && pings.length === 0) return

  const ring = (uid: string, style: () => void) => {
    const item = world.items.find((i) => i.uid === uid)
    if (!item) return
    const box = itemBox(R, item, world.view)
    if (!box) return
    ctx.save()
    style()
    ctx.beginPath()
    ctx.arc(box.x, box.y, box.size * 0.55, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.restore()
  }

  rings.forEach((uid) =>
    ring(uid, () => {
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'
      ctx.lineWidth = 1.6
      ctx.setLineDash([4, 4])
    }),
  )

  const pulse = 0.5 + 0.5 * Math.sin(timestamp / 180)
  pings.forEach((uid) =>
    ring(uid, () => {
      ctx.strokeStyle = `rgba(250,204,21,${pulse})`
      ctx.lineWidth = 2.4
      ctx.setLineDash([])
    }),
  )
}
