import type { EngineWorld } from '../world'

/** Per-frame simulation step. Filled in by the simulation task; a no-op until then. */
export function tick(world: EngineWorld, dtMs: number, timestamp: number): void {
  void world
  void dtMs
  void timestamp
}
