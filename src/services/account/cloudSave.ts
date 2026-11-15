import type { GardenBackend } from '@/auth/backend'
import { gardenSummary, getGardenSnapshot } from '@/services/gardenSnapshot'
import { studioStateAtom } from '@/store/studio'
import { errorCode } from './actionErrors'
import { DEFAULT_GARDEN_NAME, RETRY_MIN_MS, RETRY_SPREAD_MS, SAVE_DEBOUNCE_MS } from './constants'
import type { AccountActions } from './contract'
import type { AccountContext } from './context'

export const clearRetryTimer = (ctx: AccountContext) => {
  if (ctx.retryTimer) clearTimeout(ctx.retryTimer)
  ctx.retryTimer = null
}

export const clearSaveTimer = (ctx: AccountContext) => {
  const t = ctx.state().saveTimer
  if (t) clearTimeout(t)
  ctx.setAccount({ saveTimer: null })
}

/** The open scene as a garden body: snapshot plus card summary. */
export const sceneBody = (
  ctx: AccountContext,
  name: string,
  createdAt: number,
  updatedAt: number,
) => {
  const s = ctx.store.get(studioStateAtom)
  const snapshot = getGardenSnapshot(s, ctx.deps.getWorld())
  const summary = gardenSummary(s, snapshot.worldSnapshot?.items ?? [])
  return { name, createdAt, updatedAt, summary, snapshot }
}

/** Writes one garden body and books the result; reports failures and retries `unavailable` ones. */
const writeGarden = async (
  ctx: AccountContext,
  id: string,
  backend: GardenBackend,
  body: ReturnType<typeof sceneBody>,
  at: number,
) => {
  const { state, setAccount, actions } = ctx
  try {
    await backend.saveGarden(id, body)
    // A session that ended during the write keeps its cleared state.
    if (state().backend === backend)
      setAccount((st) => ({
        gardens: st.gardens.some((x) => x.id === id)
          ? st.gardens.map((x) => (x.id === id ? { ...x, ...body } : x))
          : [{ id, ...body }, ...st.gardens],
        lastSaved: at,
        lastError: '',
      }))
  } catch (e) {
    // A write that fails after its session ended reports nothing and is not retried.
    if (state().backend === backend) {
      actions.handleCloudError(e)
      if (errorCode(e) === 'unavailable') {
        clearRetryTimer(ctx)
        ctx.retryTimer = setTimeout(
          () => {
            ctx.retryTimer = null
            actions.scheduleCloudSave()
          },
          RETRY_MIN_MS + Math.random() * RETRY_SPREAD_MS,
        )
      }
    }
  }
  setAccount({ writing: false })
  if (state().pending) {
    setAccount({ pending: false })
    actions.scheduleCloudSave()
  }
}

type CloudSaveActions = Pick<
  AccountActions,
  'scheduleCloudSave' | 'flushCloudSave' | 'detachActiveGarden' | 'attachActiveGarden'
>

/** The debounced save of the open terrarium, and closing or reopening it around a storage wipe. */
export function cloudSaveActions(ctx: AccountContext): CloudSaveActions {
  const { now, state, setAccount, actions } = ctx
  return {
    scheduleCloudSave() {
      const s = state()
      if (s.phase !== 'cloud' || !s.activeId) return
      if (s.saveTimer) clearTimeout(s.saveTimer)
      const timer = setTimeout(() => {
        setAccount({ saveTimer: null })
        void actions.flushCloudSave()
      }, SAVE_DEBOUNCE_MS)
      setAccount({ saveTimer: timer })
    },

    async flushCloudSave() {
      const s = state()
      const { activeId: id, backend } = s
      if (s.phase !== 'cloud' || !id || !backend) return
      if (s.writing) {
        setAccount({ pending: true })
        return
      }
      setAccount({ writing: true })
      const at = now()
      const g = s.gardens.find((x) => x.id === id)
      const body = sceneBody(ctx, g?.name || DEFAULT_GARDEN_NAME, g?.createdAt || at, at)
      const write = writeGarden(ctx, id, backend, body, at)
      ctx.inFlight = write
      await write
      if (ctx.inFlight === write) ctx.inFlight = null
    },

    async detachActiveGarden() {
      const prev = state().activeId
      // Cleared first so a write that finishes below does not schedule another save.
      setAccount({ activeId: null, pending: false })
      clearSaveTimer(ctx)
      clearRetryTimer(ctx)
      if (ctx.inFlight) await ctx.inFlight
      return prev
    },

    attachActiveGarden(id) {
      if (state().phase !== 'cloud' || !state().backend) return
      setAccount({ activeId: id })
    },
  }
}
