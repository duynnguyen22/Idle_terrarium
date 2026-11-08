import '@testing-library/jest-dom/vitest'

// jsdom has no canvas backend: getContext and toDataURL log "Not implemented". Answer quietly
// instead (no 2D context; an empty-canvas data URL). Tests that need a 2D context spy on these.
HTMLCanvasElement.prototype.getContext = (() =>
  null) as typeof HTMLCanvasElement.prototype.getContext
HTMLCanvasElement.prototype.toDataURL = () => 'data:,'
