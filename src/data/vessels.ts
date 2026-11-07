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
] as const satisfies readonly VesselDef[]

export type VesselId = (typeof VESSELS)[number]['id']

export const VESSELS_BY_ID: Readonly<Record<VesselId, VesselDef>> = Object.fromEntries(
  VESSELS.map((v) => [v.id, v]),
) as Record<VesselId, VesselDef>
