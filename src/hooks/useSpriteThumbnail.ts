import { useMemo } from 'react'
import type { CatalogId } from '@/data/catalog'
import { getSpriteDataUrl } from '@/engine/sprites/spriteCache'

/** Memoized PNG data URL of a catalog sprite, for catalog cards. */
export function useSpriteThumbnail(id: CatalogId): string {
  return useMemo(() => getSpriteDataUrl(id), [id])
}
