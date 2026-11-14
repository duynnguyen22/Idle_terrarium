/** Drawing flags the engine reads each frame. The hook copies the device preferences in; nothing here is persisted. */
export interface ViewState {
  /** Planes, soft shadows, haze and glass. */
  depthOn: boolean
  /** Plain smoothing and graphics-card sprites. */
  fastDraw: boolean
  /** Fraction of the full backing-store resolution. */
  renderScale: number
}

export function createView(): ViewState {
  return { depthOn: true, fastDraw: true, renderScale: 1 }
}
