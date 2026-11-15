import { mutateWorld } from '@/engine/engineBridge'
import { hasPool } from '@/engine/geometry'
import { restoreWorld, snapshotWorld } from '@/engine/persistence'
import { applyPreset } from '@/engine/presets'
import { createWorld, type EngineWorld } from '@/engine/world'
import { applyGardenSnapshot, getGardenSnapshot } from '@/services/gardenSnapshot'
import {
  dayCountAtom,
  patchStudioAtom,
  studioStateAtom,
  waterSplitAtom,
  worldSnapshotAtom,
} from '@/store/studio'
import { clearSaveTimer, sceneBody } from './cloudSave'
import { DEFAULT_GARDEN_NAME, MAX_GARDEN_NAME } from './constants'
import type { AccountActions } from './contract'
import type { AccountContext } from './context'
import type { GardenStart } from './state'

/** Runs a scene edit on the live world, or on a scratch world built from the stored snapshot. */
const editScene = (ctx: AccountContext, fn: (world: EngineWorld) => void) => {
  const { store, deps } = ctx
  if (deps.getWorld()) {
    mutateWorld(fn)
    return
  }
  const scratch = createWorld()
  const saved = store.get(worldSnapshotAtom)
  if (saved) restoreWorld(scratch, saved, store.get(dayCountAtom))
  fn(scratch)
  store.set(patchStudioAtom, { worldSnapshot: snapshotWorld(scratch) })
}

async function createGarden(ctx: AccountContext, kind: GardenStart, name: string) {
  const { store, deps, now, state, setAccount, actions } = ctx
  const { backend, phase } = state()
  if (!backend) throw new Error('No account session')
  if (phase === 'cloud') {
    clearSaveTimer(ctx)
    await actions.flushCloudSave()
  }
  // Close the open terrarium first, so no save can write the new scene over it, and keep its
  // scene so a failed create can put both back.
  const openId = await actions.detachActiveGarden()
  const prev = getGardenSnapshot(store.get(studioStateAtom), deps.getWorld())
  const id = backend.newGardenId()
  let saved = false
  let body: ReturnType<typeof sceneBody>
  let at: number
  try {
    if (kind === 'empty') {
      editScene(ctx, (world) => {
        const cycleProgress = hasPool(store.get(waterSplitAtom)) ? 0 : 1
        world.items = []
        world.mossTufts = []
        world.moldPatches = []
        world.surfaceGrains = []
        // Tank time restarts with the day counter (flushTelemetry derives dayCount from ecoTime).
        world.ecoTime = 0
        world.breed = {}
        // The env flush is one-way (world -> store), so the live gauge is reset too.
        world.env.cycleProgress = cycleProgress
        store.set(patchStudioAtom, {
          dayCount: 1,
          setupDay: 1,
          cycleProgress,
          selectedId: null,
        })
      })
    } else if (kind === 'falls') {
      editScene(ctx, (world) => {
        world.ecoTime = 0
        world.breed = {}
        world.mossTufts = []
        store.set(patchStudioAtom, { dayCount: 1, selectedId: null })
        applyPreset(world, 'falls', store)
      })
    }
    at = now()
    body = sceneBody(ctx, name.trim().slice(0, MAX_GARDEN_NAME) || DEFAULT_GARDEN_NAME, at, at)
    await backend.saveGarden(id, body)
    saved = true
    await backend.setProfile({ activeGardenId: id })
  } catch (e) {
    // Best effort: a half-made terrarium should not linger in the list.
    if (saved) await backend.deleteGarden(id).catch(() => undefined)
    if (kind !== 'current') applyGardenSnapshot(prev, store)
    actions.attachActiveGarden(openId)
    throw e
  }
  setAccount({ activeId: id, lastSaved: at, phase: 'cloud' })
  await actions.refreshGardens()
  await actions.refreshJournal()
  return { id, ...body }
}

type GardenListActions = Pick<
  AccountActions,
  'createGarden' | 'openGarden' | 'renameGarden' | 'deleteGarden' | 'refreshGardens'
>

/** The signed-in person's terrariums: create, open, rename, delete and reload the list. */
export function gardenListActions(ctx: AccountContext): GardenListActions {
  const { store, deps, state, setAccount, actions } = ctx
  return {
    createGarden: (kind, name) => createGarden(ctx, kind, name),

    async openGarden(id) {
      if (id === state().activeId) return
      clearSaveTimer(ctx)
      await actions.flushCloudSave()
      const { backend, gardens } = state()
      const g = gardens.find((x) => x.id === id)
      if (!g || !backend) return
      setAccount({ activeId: id })
      if (g.snapshot) applyGardenSnapshot(g.snapshot, store)
      try {
        await backend.setProfile({ activeGardenId: id })
      } catch (e) {
        actions.handleCloudError(e, { user: true })
      }
      await actions.refreshJournal()
      deps.toast(`Opened ${g.name}`)
    },

    async renameGarden(id, name) {
      setAccount({ renaming: null })
      const { backend, gardens } = state()
      const g = gardens.find((x) => x.id === id)
      const next = name.trim().slice(0, MAX_GARDEN_NAME)
      if (!backend || !g || !next || next === g.name) return
      setAccount((s) => ({
        gardens: s.gardens.map((x) => (x.id === id ? { ...x, name: next } : x)),
      }))
      try {
        await backend.renameGarden(id, next)
      } catch (e) {
        actions.handleCloudError(e, { user: true })
      }
    },

    async deleteGarden(id) {
      setAccount({ confirmDelete: null })
      const { backend, activeId } = state()
      // The open terrarium cannot be deleted (spec: no Delete button on the active row).
      if (!backend || id === activeId) return
      try {
        await backend.deleteGarden(id)
        await actions.refreshGardens()
        deps.toast('Terrarium deleted')
      } catch (e) {
        actions.handleCloudError(e, { user: true })
      }
    },

    async refreshGardens() {
      const { backend } = state()
      if (!backend) return
      try {
        const gardens = await backend.listGardens()
        if (state().backend === backend) setAccount({ gardens })
      } catch (e) {
        actions.handleCloudError(e)
      }
    },
  }
}
