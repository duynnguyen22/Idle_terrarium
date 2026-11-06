import type { SubstrateLayerDef } from '@/data/types'

/** SVG string builders ported from prototype getVesselPreviewSVG (1720-1767) and getContainerVectorSVG (1810-1834). */
export function getVesselPreviewSVG(vesselId: string, active: boolean): string {
  const strokeCol = active ? '#ffffff' : '#234c35'
  const glassFill = active ? 'rgba(255,255,255,0.14)' : 'rgba(59,122,87,0.08)'
  const soilCol = active ? '#d6b899' : '#7c5841'
  const mossCol = active ? '#a3e635' : '#65a30d'
  const lidCol = active ? '#fde68a' : '#a47551'
  const open = '<svg viewBox="0 0 64 64" class="w-11 h-11 shrink-0" aria-hidden="true">'

  switch (vesselId) {
    case 'paludarium_tank':
      return `${open}
        <path d="M32,2 L32,8 M22,4 L42,4" stroke="${strokeCol}" stroke-width="2.2" stroke-linecap="round"/>
        <rect x="11" y="10" width="42" height="46" rx="2" fill="${glassFill}" stroke="${strokeCol}" stroke-width="2.2"/>
        <path d="M12,14 Q32,18 52,13 L52,42 L12,42 Z" fill="${mossCol}" opacity="0.45"/>
        <rect x="12" y="42" width="40" height="13" fill="#38bdf8" opacity="0.55"/>
        <line x1="11" y1="41" x2="53" y2="41" stroke="${strokeCol}" stroke-width="2"/>
        <circle cx="15" cy="37" r="1.6" fill="${strokeCol}"/>
      </svg>`
    case 'wardian':
      return `${open}
        <path d="M26,8 L38,8 L44,22 L44,52 L20,52 L20,22 Z" fill="${glassFill}" stroke="${strokeCol}" stroke-width="2"/>
        <rect x="22" y="42" width="20" height="10" fill="${soilCol}"/>
        <path d="M22,42 Q32,38 42,42" fill="${mossCol}"/>
      </svg>`
    case 'globe':
      return `${open}
        <circle cx="32" cy="34" r="22" fill="${glassFill}" stroke="${strokeCol}" stroke-width="2"/>
        <path d="M14,46 Q32,56 50,46 A22 22 0 0 1 14,46" fill="${soilCol}"/>
        <path d="M14,46 Q32,40 50,46" fill="${mossCol}"/>
      </svg>`
    case 'cylinder':
      return `${open}
        <rect x="18" y="12" width="28" height="44" rx="2" fill="${glassFill}" stroke="${strokeCol}" stroke-width="2"/>
        <rect x="20" y="46" width="24" height="10" fill="${soilCol}"/>
        <rect x="22" y="8" width="20" height="4" rx="2" fill="${lidCol}"/>
      </svg>`
    case 'teardrop':
      return `${open}
        <path d="M26,12 L38,12 C44,26 52,38 50,48 C48,58 38,60 32,60 C26,60 16,58 14,48 C12,38 20,26 26,12 Z" fill="${glassFill}" stroke="${strokeCol}" stroke-width="2"/>
        <path d="M15,50 Q32,60 49,50 A18 18 0 0 1 15,50" fill="${soilCol}"/>
      </svg>`
    default:
      return `${open}
        <path d="M24,14 L40,14 C44,20 48,26 48,46 C48,56 42,58 32,58 C22,58 16,56 16,46 C16,26 20,20 24,14 Z" fill="${glassFill}" stroke="${strokeCol}" stroke-width="2"/>
        <rect x="18" y="46" width="28" height="12" fill="${soilCol}"/>
        <rect x="22" y="10" width="20" height="4" rx="2" fill="${lidCol}"/>
      </svg>`
  }
}

export function getContainerVectorSVG(
  layer: Pick<SubstrateLayerDef, 'id' | 'color' | 'secondaryColor'>,
  active: boolean,
): string {
  const stroke = active ? '#ffffff' : '#1b3b2b'
  const open = '<svg viewBox="0 0 44 44" class="w-9 h-9 shrink-0" aria-hidden="true">'
  if (layer.id === 'water') {
    return `${open}
      <path d="M12,10 L30,10 L28,34 C28,37 25,38 21,38 C17,38 14,37 14,34 Z" fill="rgba(56,189,248,0.25)" stroke="${stroke}" stroke-width="2"/>
      <path d="M14,20 Q21,22 28,20 L27,34 C27,36 24,37 21,37 C18,37 15,36 15,34 Z" fill="#38bdf8"/>
      <path d="M30,13 C36,13 37,24 30,26" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round"/>
      <path d="M12,10 L9,7" stroke="${stroke}" stroke-width="2" stroke-linecap="round"/>
    </svg>`
  }
  if (layer.id === 'siphon') {
    return `${open}
      <circle cx="22" cy="22" r="14" fill="rgba(244,63,94,0.16)" stroke="${stroke}" stroke-width="2"/>
      <path d="M16,22 L28,22 M22,16 L22,28" stroke="${stroke}" stroke-width="2" stroke-linecap="round" transform="rotate(45 22 22)"/>
    </svg>`
  }
  return `${open}
    <rect x="11" y="11" width="22" height="25" rx="4" fill="rgba(255,255,255,0.2)" stroke="${stroke}" stroke-width="2"/>
    <path d="M12,21 Q22,18 32,21 L32,33 C32,34.5 30.5,35 28,35 L16,35 C13.5,35 12,34.5 12,33 Z" fill="${layer.color}"/>
    <rect x="14" y="7" width="16" height="4" rx="1.5" fill="#9a6b46" stroke="${stroke}" stroke-width="1.5"/>
    <circle cx="18" cy="26" r="1.6" fill="${layer.secondaryColor}"/>
    <circle cx="25" cy="29" r="1.8" fill="${layer.secondaryColor}"/>
    <circle cx="22" cy="24" r="1.3" fill="rgba(255,255,255,0.4)"/>
  </svg>`
}
