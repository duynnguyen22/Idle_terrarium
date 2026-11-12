import { atom } from 'jotai'
import { appStore } from './appStore'

export interface ToastState {
  message: string
  visible: boolean
}

export const toastAtom = atom<ToastState>({ message: '', visible: false })

let timer: ReturnType<typeof setTimeout> | undefined

/** Shows `msg` and hides it after `ms` (a newer toast restarts the timer). */
export function showToast(msg: string, ms = 2200): void {
  clearTimeout(timer)
  appStore.set(toastAtom, { message: msg, visible: true })
  timer = setTimeout(() => appStore.set(toastAtom, (t) => ({ ...t, visible: false })), ms)
}
