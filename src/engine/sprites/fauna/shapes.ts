export type DrawFn = (ctx: CanvasRenderingContext2D) => void
export type Ctx = CanvasRenderingContext2D

export function fillShape(ctx: Ctx, color: string, build: () => void) {
  ctx.fillStyle = color
  ctx.beginPath()
  build()
  ctx.fill()
}
export function strokeShape(ctx: Ctx, color: string, width: number, build: () => void) {
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  build()
  ctx.stroke()
}
