// Files that predate the size limits. Delete an entry when you fix its file. Never add one.
// Paths are relative to the repo root, one per line, sorted.

// Files longer than 300 lines.
export const LEGACY_LONG_FILES = [
  'src/components/stage/TerrariumCanvas.tsx',
  'src/store/studio.ts',
]

// Files that contain a function longer than 80 lines.
export const LEGACY_LONG_FUNCTIONS = [
  'src/components/stage/AwayCard.tsx',
  'src/components/stage/ItemInspector.tsx',
  'src/components/stage/RelaxDock.tsx',
  'src/components/stage/TerrariumCanvas.tsx',
  'src/hooks/useTerrariumEngine.ts',
]
