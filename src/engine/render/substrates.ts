import { SUBSTRATE_LAYERS } from '@/data/substrates'
import type { SubstrateDepths } from '@/data/types'
import { getSoilSurfaceNormalizedY } from '../geometry'
import { num, str, vesselMetrics, type RenderFn } from './metrics'

/**
 * Substrate layers with the sculpted contour on the top layer, plus grain texture. The prototype's
 * drawSubstratesAndLake runs this un-gated in both of its phases, so it is drawn a second time (over the
 * specimens) by drawWater.
 */
export const drawSubstrateLayers: RenderFn = (ctx, world, state, R) => {
  const { cx, cy, r: Rad } = vesselMetrics(R)
  const bottomY = cy + Rad * 0.84
  let currentY = bottomY
  const scaleFactor = (Rad * 0.84) / 200

  const activeSolidLayers = SUBSTRATE_LAYERS.filter(
    (l) =>
      l.id !== 'water' &&
      l.id !== 'siphon' &&
      (state.substrates[l.id as keyof SubstrateDepths] || 0) > 0.2,
  )
  const contour = world.terrainContour

  activeSolidLayers.forEach((layer, layerIdx) => {
    const mm = state.substrates[layer.id as keyof SubstrateDepths] || 0
    const hPx = mm * scaleFactor * 1.65
    const nextY = currentY - hPx
    const isTopLayer = layerIdx === activeSolidLayers.length - 1

    const grad = ctx.createLinearGradient(0, nextY - 12, 0, currentY)
    grad.addColorStop(0, layer.color)
    grad.addColorStop(1, layer.secondaryColor)
    ctx.fillStyle = grad

    ctx.beginPath()
    ctx.moveTo(cx - Rad, nextY)
    for (let x = cx - Rad; x <= cx + Rad; x += 18) {
      const normX = 0.5 + (x - cx) / (Rad * 2)
      let contourPx = 0
      if (isTopLayer && Array.isArray(contour)) {
        const clampedX = Math.max(0.15, Math.min(0.85, normX))
        const idxFloat = ((clampedX - 0.15) / 0.7) * (contour.length - 1)
        const i0 = Math.floor(idxFloat)
        const i1 = Math.min(contour.length - 1, i0 + 1)
        const frac = idxFloat - i0
        const hMm = (contour[i0] || 0) * (1 - frac) + (contour[i1] || 0) * frac
        contourPx = hMm * scaleFactor * 1.65
      }
      const wave = Math.sin(x * 0.03 + layerIdx) * 2.0 - contourPx
      ctx.lineTo(x, nextY + wave)
    }
    ctx.lineTo(cx + Rad, currentY + 6)
    ctx.lineTo(cx - Rad, currentY + 6)
    ctx.closePath()
    ctx.fill()

    // Procedural pebbles & golden river gravel texture
    ctx.save()
    world.substrateGrains.slice(layerIdx * 30, (layerIdx + 1) * 30).forEach((g) => {
      const gx = cx - Rad * 0.8 + num(g, 'rx') * (Rad * 1.6)
      const gy = nextY + 3 + num(g, 'ry') * Math.max(2, hPx - 5)
      ctx.fillStyle = num(g, 'shade') > 0.5 ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.22)'
      ctx.beginPath()
      ctx.ellipse(
        gx,
        gy,
        num(g, 'r') * (layer.id === 'rivergravel' ? 1.35 : 1),
        num(g, 'r') * 0.7,
        num(g, 'angle'),
        0,
        Math.PI * 2,
      )
      ctx.fill()
    })
    ctx.restore()

    currentY = nextY
  })
}

/** Soil phase of prototype drawSubstratesAndLake: layers, then surface grains, moss carpet and mold patches. */
export const drawSubstrates: RenderFn = (ctx, world, state, R, timestamp) => {
  drawSubstrateLayers(ctx, world, state, R, timestamp)
  const { cx, cy, r: Rad } = vesselMetrics(R)
  const contour = world.terrainContour
  const surfaceY = (nx: number) => getSoilSurfaceNormalizedY(state.substrates, contour, nx)

  // Custom user-scattered surface pebbles, sand & gravel grains
  if (world.surfaceGrains.length > 0) {
    ctx.save()
    world.surfaceGrains.forEach((sg) => {
      const sx = num(sg, 'x')
      const gx = cx - Rad + sx * (Rad * 2)
      const gy = cy - Rad + (surfaceY(sx) + num(sg, 'yOffset')) * (Rad * 2)
      ctx.fillStyle = str(sg, 'color')
      ctx.beginPath()
      ctx.ellipse(
        gx,
        gy,
        num(sg, 'rx') * (Rad / 240),
        num(sg, 'ry') * (Rad / 240),
        num(sg, 'rot'),
        0,
        Math.PI * 2,
      )
      ctx.fill()
    })
    ctx.restore()
  }

  // Spreading moss carpet on soil top
  if (world.mossCarpet.length > 0) {
    ctx.save()
    ctx.fillStyle = '#4d7c0f'
    world.mossCarpet.forEach((m) => {
      const mx = cx - Rad + num(m, 'x') * (Rad * 2)
      const surfY = cy - Rad + surfaceY(num(m, 'x')) * (Rad * 2)
      ctx.beginPath()
      ctx.ellipse(
        mx,
        surfY,
        num(m, 'spread') * (Rad / 220),
        num(m, 'spread') * 0.32 * (Rad / 220),
        0,
        0,
        Math.PI * 2,
      )
      ctx.fill()
    })
    ctx.restore()
  }

  // Active fungal mold spores on soil surface (Scrub Mold tool & Cleanup Crew)
  if (world.moldPatches.length > 0) {
    ctx.save()
    world.moldPatches.forEach((mp) => {
      const mx = cx - Rad + num(mp, 'x') * (Rad * 2)
      const my = cy - Rad + surfaceY(num(mp, 'x')) * (Rad * 2) - 2
      const rad = (num(mp, 'size') || 12) * (Rad / 240)
      const mGrad = ctx.createRadialGradient(mx, my, 1, mx, my, rad)
      mGrad.addColorStop(0, 'rgba(226, 232, 240, 0.9)')
      mGrad.addColorStop(0.6, 'rgba(148, 163, 184, 0.65)')
      mGrad.addColorStop(1, 'rgba(100, 116, 139, 0)')
      ctx.fillStyle = mGrad
      ctx.beginPath()
      ctx.arc(mx, my, rad, 0, Math.PI * 2)
      ctx.fill()
    })
    ctx.restore()
  }
}
