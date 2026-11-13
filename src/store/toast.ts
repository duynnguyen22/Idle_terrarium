import { atom } from 'jotai'
import { toast } from 'sonner'
import { appStore } from './appStore'

export interface ToastState {
  message: string
  visible: boolean
}

/** Last toast shown. Rendering is done by the shadcn `<Toaster />` (sonner); the atom stays as the readable source of truth. */
export const toastAtom = atom<ToastState>({ message: '', visible: false })

/** One shared id: a newer toast replaces the current one instead of stacking. */
const TOAST_ID = 'app-toast'

let timer: ReturnType<typeof setTimeout> | undefined

/** Shows `msg` and hides it after `ms` (a newer toast restarts the timer). */
export function showToast(msg: string, ms = 2200): void {
  clearTimeout(timer)
  appStore.set(toastAtom, { message: msg, visible: true })
  toast(msg, { id: TOAST_ID, duration: ms })
  timer = setTimeout(() => appStore.set(toastAtom, (t) => ({ ...t, visible: false })), ms)
}
