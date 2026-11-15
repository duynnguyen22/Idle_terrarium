// Files that predate the size limits. Delete an entry when you fix its file. Never add one.
// Paths are relative to the repo root, one per line, sorted.

// Files longer than 300 lines.
export const LEGACY_LONG_FILES = [
  'src/auth/localAuthService.ts',
  'src/components/account/auth/AuthPieces.tsx',
  'src/components/growth/GrowthBoard.tsx',
  'src/components/stage/TerrariumCanvas.tsx',
  'src/data/catalog.ts',
  'src/engine/care.ts',
  'src/engine/render/backdropPainters.ts',
  'src/engine/sprites/fauna.ts',
  'src/engine/sprites/faunaExtra.ts',
  'src/store/account.ts',
  'src/store/studio.ts',
]

// Files that contain a function longer than 80 lines.
export const LEGACY_LONG_FUNCTIONS = [
  'src/auth/backend.ts',
  'src/auth/localAuthService.ts',
  'src/components/account/auth/OtpInput.tsx',
  'src/components/account/auth/SignInScreen.tsx',
  'src/components/account/auth/SignUpScreen.tsx',
  'src/components/catalog/BackdropSection.tsx',
  'src/components/catalog/HardwarePanel.tsx',
  'src/components/catalog/RoomTab.tsx',
  'src/components/growth/GrowthBoard.tsx',
  'src/components/layout/RightTelemetry.tsx',
  'src/components/nav/UtilityActions.tsx',
  'src/components/stage/AwayCard.tsx',
  'src/components/stage/ItemInspector.tsx',
  'src/components/stage/RelaxDock.tsx',
  'src/components/stage/TerrariumCanvas.tsx',
  'src/engine/care.ts',
  'src/engine/geometry.ts',
  'src/engine/render/backdropPainters.ts',
  'src/engine/render/frame.ts',
  'src/engine/render/mist.ts',
  'src/engine/render/specimens.ts',
  'src/engine/render/substrates.ts',
  'src/engine/simulation/fauna.ts',
  'src/engine/simulation/pouring.ts',
  'src/hooks/useTerrariumEngine.ts',
  'src/store/account.ts',
]
