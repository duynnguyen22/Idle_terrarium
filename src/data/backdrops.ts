import type { BackdropId } from './types'

/** Painted miniature landscapes for the back glass (prototype-v7 BACKDROPS), in grid order. */
export const BACKDROPS: { id: BackdropId; name: string }[] = [
  { id: 'none', name: 'Clear glass' },
  { id: 'karst', name: 'Ha Long karst' },
  { id: 'terraces', name: 'Rice terraces' },
  { id: 'pines', name: 'Misty pines' },
  { id: 'alpine', name: 'Alpine lake' },
  { id: 'falls', name: 'Jungle falls' },
  { id: 'mesa', name: 'Desert mesa' },
  { id: 'custom', name: 'Your photo' },
]
