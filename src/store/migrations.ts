/** Persisted-state migration. Version 0 (unversioned) shares the v1 shape. */
export function migrate(persisted: unknown, version: number): unknown {
  if (version === 0) return persisted
  return persisted
}
