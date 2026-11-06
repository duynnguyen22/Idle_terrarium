import { create } from 'zustand'

interface ToastState {
  message: string
  visible: boolean
}

export const useToastStore = create<ToastState>(() => ({ message: '', visible: false }))

let timer: ReturnType<typeof setTimeout> | undefined

/** Shows `msg` and hides it after `ms` (a newer toast restarts the timer). */
export function showToast(msg: string, ms = 2200): void {
  clearTimeout(timer)
  useToastStore.setState({ message: msg, visible: true })
  timer = setTimeout(() => useToastStore.setState({ visible: false }), ms)
}
