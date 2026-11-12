import { getDefaultStore, type Store } from 'jotai'
import { bindStudioStorage } from './studio'

export type AppStore = Store

/**
 * The app's one jotai store. It is jotai's default store, so components rendered without a
 * `<Provider>` read the same atoms the engine and hooks write through `appStore.get/set/sub`.
 * Importing this module loads the studio save from localStorage and keeps it written.
 */
export const appStore: AppStore = getDefaultStore()

bindStudioStorage(appStore, globalThis.localStorage)
