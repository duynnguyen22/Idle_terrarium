import { BIOME_PRESETS } from '@/data/presets'
import { mutateWorld } from '@/engine/engineBridge'
import { applyPreset } from '@/engine/presets'
import { showToast } from '@/store/toastStore'
import { useStudioStore } from '@/store/useStudioStore'

export function BiomeRecipes() {
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {BIOME_PRESETS.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => {
            mutateWorld((w) => applyPreset(w, p.id, useStudioStore.getState()))
            if (p.id === 'falls') showToast('🌊 Semi-Aquatic Waterfall & Lake crafted!')
          }}
          className={`whitespace-nowrap rounded-xl px-2 py-2 text-xs font-semibold transition ${
            p.id === 'falls'
              ? 'bg-forest-deep text-white shadow-2xs hover:opacity-95'
              : 'border border-sand-border bg-white text-forest-deep hover:bg-linen'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}
