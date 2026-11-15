export type Rnd = () => number
export type Painter = (g: CanvasRenderingContext2D, w: number, h: number, rnd: Rnd) => void
