import type { SoundPresetId } from './types'

export interface SoundPreset {
  id: SoundPresetId
  label: string
  /** A few words on what the preset sounds like, shown under its name in the sound menu. */
  hint: string
  /** `nature` presets are soundscapes; `music` presets play gentle melodies. */
  kind: 'nature' | 'music'
}

export const SOUND_PRESETS: readonly SoundPreset[] = [
  { id: 'stream', label: 'Waterfall Stream', hint: 'Bright, running water', kind: 'nature' },
  { id: 'rain', label: 'Rain on Leaves', hint: 'Light drops on the canopy', kind: 'nature' },
  { id: 'forest', label: 'Bamboo Breeze', hint: 'Hollow wooden chimes', kind: 'nature' },
  { id: 'night', label: 'Midnight Insects', hint: 'Crickets after dark', kind: 'nature' },
  { id: 'piano', label: 'Soft Piano', hint: 'Slow notes that wander', kind: 'music' },
  { id: 'musicbox', label: 'Music Box', hint: 'A small, turning lullaby', kind: 'music' },
  { id: 'bowls', label: 'Singing Bowls', hint: 'Low tones that ring out', kind: 'music' },
]

export const SOUND_PRESET_IDS: readonly SoundPresetId[] = SOUND_PRESETS.map((p) => p.id)
