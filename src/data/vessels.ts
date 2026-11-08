import type { VesselDef } from './types'

export const VESSELS = [
  {
    id: 'paludarium_tank',
    name: 'Paludarium Tank',
    desc: 'Frameless glass cube + water dam',
    evapMultiplier: 0.65,
  },
  {
    id: 'apothecary',
    name: 'Apothecary Jar',
    desc: 'Classic domed botanical jar',
    evapMultiplier: 0.45,
  },
  {
    id: 'wardian',
    name: 'Wardian Case',
    desc: 'Victorian faceted glasshouse',
    evapMultiplier: 0.55,
  },
  { id: 'globe', name: 'Hanging Sphere', desc: 'Curved suspended terrarium', evapMultiplier: 0.7 },
  { id: 'cylinder', name: 'Zen Cylinder', desc: 'Tall gallery glass column', evapMultiplier: 0.6 },
  {
    id: 'teardrop',
    name: 'Teardrop Flask',
    desc: 'Tapered condensation vessel',
    evapMultiplier: 0.5,
  },
  {
    id: 'vivarium_front',
    name: 'Front-Opening Vivarium',
    desc: '60 × 45 cm, hinged doors',
    evapMultiplier: 0.6,
    kx: 1.55,
    rect: true,
    doors: true,
  },
  {
    id: 'rimless_landscape',
    name: 'Rimless Landscape',
    desc: '90 × 45 cm aquascape',
    evapMultiplier: 0.65,
    kx: 2.0,
    rect: true,
  },
  {
    id: 'riparium_long',
    name: 'Long Riparium',
    desc: '120 × 40 cm shoreline',
    evapMultiplier: 0.7,
    kx: 2.6,
    rect: true,
    low: true,
  },
] as const satisfies readonly VesselDef[]

export type VesselId = (typeof VESSELS)[number]['id']

export const VESSELS_BY_ID: Readonly<Record<VesselId, VesselDef>> = Object.fromEntries(
  VESSELS.map((v) => [v.id, v]),
) as Record<VesselId, VesselDef>

export function vesselKX(id: string): number {
  return (VESSELS_BY_ID as Readonly<Record<string, VesselDef | undefined>>)[id]?.kx ?? 1
}

export function isRectTank(id: string): boolean {
  const def = (VESSELS_BY_ID as Readonly<Record<string, VesselDef | undefined>>)[id]
  return id === 'paludarium_tank' || !!def?.rect
}

const pickerRank = (v: { id: string }) => (isRectTank(v.id) ? 1 : 0)

/** Rectangular tanks first (spec 2370), otherwise in table order. */
export const VESSELS_FOR_PICKER: readonly (typeof VESSELS)[number][] = [...VESSELS].sort(
  (a, b) => pickerRank(b) - pickerRank(a),
)
