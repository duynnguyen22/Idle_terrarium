import type { Rect } from '@/data/types'
import { LAND_LAYER_IDS, SUBSTRATE_LAYERS } from '@/data/substrates'
import type { StudioState } from '@/store/useStudioStore'
import type { EngineWorld } from '../world'
import {
  getPoolBedNormY,
  getSoilSurfaceNormalizedY,
  hasPool,
  MM_TO_NORM,
  sampleContour,
} from '../geometry'
import { num, str } from './metrics'
import { bankGeometry, drawWater, terrainOf, type BankGeometry } from './water'

export type SubstratePhase = 'soil' | 'water'

/** Land strata, clipped along the carved bank when there is a pool; mesh barrier above the drainage layer. */
function drawLandStrata(
  ctx: CanvasRenderingContext2D,
  world: EngineWorld,
  state: StudioState,
  g: BankGeometry,
  pool: boolean,
): void {
  const { cx, cy, r, bottomY, bankTop, bankBottom } = g
  const mmPx = MM_TO_NORM * 2 * r
  const contour = world.terrainContour
  const contourMm = (nx: number) => (Array.isArray(contour) ? sampleContour(contour, nx) : 0)

  ctx.save()
  if (pool) {
    ctx.beginPath()
    ctx.moveTo(bankBottom.x, bankBottom.y)
    ctx.lineTo(bankTop.x, bankTop.y)
    ctx.lineTo(bankTop.x, cy - r)
    ctx.lineTo(cx + r, cy - r)
    ctx.lineTo(cx + r, bankBottom.y)
    ctx.closePath()
    ctx.clip()
  }

  const active = LAND_LAYER_IDS.flatMap((id) => {
    const layer = SUBSTRATE_LAYERS.find((l) => l.id === id)
    const mm = state.substrates[id] || 0
    return layer && mm > 0.2 ? [{ layer, mm }] : []
  })
  let currentY = bottomY
  active.forEach(({ layer, mm }, layerIdx) => {
    const hPx = mm * mmPx
    const nextY = currentY - hPx
    const isTop = layerIdx === active.length - 1

    const grad = ctx.createLinearGradient(0, nextY - 12, 0, currentY)
    grad.addColorStop(0, layer.color)
    grad.addColorStop(1, layer.secondaryColor)
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.moveTo(cx - r, nextY)
    for (let x = cx - r; x <= cx + r + 18; x += 18) {
      const normX = 0.5 + (x - cx) / (r * 2)
      const contourPx = isTop ? contourMm(normX) * mmPx : 0
      ctx.lineTo(x, nextY + Math.sin(x * 0.03 + layerIdx) * 1.4 - contourPx)
    }
    ctx.lineTo(cx + r, currentY + 6)
    ctx.lineTo(cx - r, currentY + 6)
    ctx.closePath()
    ctx.fill()

    world.substrateGrains.slice(layerIdx * 30, (layerIdx + 1) * 30).forEach((gr) => {
      const gx = cx - r * 0.8 + num(gr, 'rx') * (r * 1.6)
      const gy = nextY + 3 + num(gr, 'ry') * Math.max(2, hPx - 5)
      const shade = num(gr, 'shade')
      ctx.beginPath()
      if (layer.id === 'leaflitter') {
        ctx.fillStyle = shade > 0.66 ? '#b5853f' : shade > 0.33 ? '#9a6b35' : '#6f4620'
        const lift = isTop ? contourMm(0.5 + (gx - cx) / (2 * r)) * mmPx : 0
        ctx.ellipse(
          gx,
          nextY + 2 + num(gr, 'ry') * Math.max(2, hPx - 2) - lift,
          num(gr, 'r') * 1.5,
          num(gr, 'r') * 0.6,
          num(gr, 'angle'),
          0,
          Math.PI * 2,
        )
      } else {
        ctx.fillStyle = shade > 0.5 ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.22)'
        ctx.ellipse(gx, gy, num(gr, 'r'), num(gr, 'r') * 0.7, num(gr, 'angle'), 0, Math.PI * 2)
      }
      ctx.fill()
    })

    if (layer.id === 'pebbles') {
      // Fibreglass mesh barrier above the drainage layer
      ctx.save()
      ctx.strokeStyle = 'rgba(15, 23, 20, 0.6)'
      ctx.lineWidth = 1.4
      ctx.setLineDash([4, 2])
      ctx.beginPath()
      ctx.moveTo(cx - r, nextY)
      ctx.lineTo(cx + r, nextY)
      ctx.stroke()
      ctx.restore()
    }
    currentY = nextY
  })
  ctx.restore()
}

/** River-gravel pool bed left of the bank, then the carved foam divider. */
function drawPoolBed(
  ctx: CanvasRenderingContext2D,
  world: EngineWorld,
  state: StudioState,
  g: BankGeometry,
): void {
  const { cx, r, bottomY, toPy, bankTop, bankBottom, bankXAt } = g
  const bedY = toPy(getPoolBedNormY(state.substrates))
  const gravel = SUBSTRATE_LAYERS.find((l) => l.id === 'rivergravel')
  const gravelColor = gravel?.color ?? '#d4a359'
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(cx - r, bedY)
  ctx.lineTo(bankXAt(bedY), bedY)
  ctx.lineTo(bankBottom.x, bankBottom.y)
  ctx.lineTo(cx - r, bankBottom.y)
  ctx.closePath()
  ctx.fillStyle = gravel?.secondaryColor ?? '#a67633'
  ctx.fill()
  ctx.clip()
  world.substrateGrains.slice(0, 80).forEach((gr) => {
    const gx = cx - r + num(gr, 'rx') * (bankXAt(bedY) - (cx - r) + 10)
    const gy = bedY + 2 + num(gr, 'ry') * Math.max(3, bottomY - bedY - 2)
    ctx.fillStyle = num(gr, 'shade') > 0.5 ? gravelColor : '#b98a46'
    ctx.beginPath()
    ctx.ellipse(gx, gy, num(gr, 'r') * 1.1, num(gr, 'r') * 0.75, num(gr, 'angle'), 0, Math.PI * 2)
    ctx.fill()
  })
  ctx.restore()

  // Carved foam divider between land and pool
  ctx.save()
  ctx.strokeStyle = '#5a4330'
  ctx.lineWidth = 3.5
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(bankXAt(bottomY), bottomY)
  ctx.lineTo(bankTop.x, bankTop.y)
  ctx.stroke()
  ctx.restore()
}

/** Surface grains, moss carpet (land only) and mold patches riding the soil surface. */
function drawSurfaceLife(
  ctx: CanvasRenderingContext2D,
  world: EngineWorld,
  state: StudioState,
  g: BankGeometry,
  pool: boolean,
): void {
  const { r, toPx, toPy, divider } = g
  const t = terrainOf(world, state)
  const surfaceY = (nx: number) => getSoilSurfaceNormalizedY(t, nx)

  if (world.surfaceGrains.length > 0) {
    ctx.save()
    world.surfaceGrains.forEach((sg) => {
      const sx = num(sg, 'x')
      ctx.fillStyle = str(sg, 'color')
      ctx.beginPath()
      ctx.ellipse(
        toPx(sx),
        toPy(surfaceY(sx) + num(sg, 'yOffset')),
        num(sg, 'rx') * (r / 240),
        num(sg, 'ry') * (r / 240),
        num(sg, 'rot'),
        0,
        Math.PI * 2,
      )
      ctx.fill()
    })
    ctx.restore()
  }

  if (world.mossCarpet.length > 0) {
    ctx.save()
    ctx.fillStyle = '#4d7c0f'
    world.mossCarpet.forEach((m) => {
      const mx = num(m, 'x')
      if (pool && mx < divider + 0.01) return
      const spread = num(m, 'spread')
      ctx.beginPath()
      ctx.ellipse(
        toPx(mx),
        toPy(surfaceY(mx)),
        spread * (r / 220),
        spread * 0.32 * (r / 220),
        0,
        0,
        Math.PI * 2,
      )
      ctx.fill()
    })
    ctx.restore()
  }

  if (world.moldPatches.length > 0) {
    ctx.save()
    world.moldPatches.forEach((mp) => {
      const mx = toPx(num(mp, 'x'))
      const my = toPy(surfaceY(num(mp, 'x'))) - 2
      const rad = (num(mp, 'size') || 12) * (r / 240)
      const mGrad = ctx.createRadialGradient(mx, my, 1, mx, my, rad)
      mGrad.addColorStop(0, 'rgba(241, 245, 249, 0.92)')
      mGrad.addColorStop(0.6, 'rgba(203, 213, 225, 0.6)')
      mGrad.addColorStop(1, 'rgba(148, 163, 184, 0)')
      ctx.fillStyle = mGrad
      ctx.beginPath()
      ctx.arc(mx, my, rad, 0, Math.PI * 2)
      ctx.fill()
    })
    ctx.restore()
  }
}

/**
 * Prototype drawSubstratesAndLake. The 'soil' phase (before specimens) paints the land strata cut at
 * the bank, the pool gravel bed and foam divider, surface grains, moss and mold. The 'water' phase
 * (after specimens) paints the pool water, and nothing at all when there is no pool.
 */
export function drawSubstrates(
  ctx: CanvasRenderingContext2D,
  world: EngineWorld,
  state: StudioState,
  R: Rect,
  timestamp: number,
  phase: SubstratePhase,
): void {
  if (phase === 'water') {
    drawWater(ctx, world, state, R, timestamp)
    return
  }
  const pool = hasPool(state.waterSplit)
  const g = bankGeometry(terrainOf(world, state), R)
  drawLandStrata(ctx, world, state, g, pool)
  if (pool) drawPoolBed(ctx, world, state, g)
  drawSurfaceLife(ctx, world, state, g, pool)
}
