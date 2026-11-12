import { useAtomValue } from 'jotai'
import { toastAtom } from '@/store/toast'

export function Toast() {
  const { message, visible } = useAtomValue(toastAtom)
  return (
    <div
      role="status"
      aria-live="polite"
      data-visible={visible}
      className={`pointer-events-none absolute left-1/2 top-16 z-40 -translate-x-1/2 rounded-full bg-forest-deep px-4 py-2 text-xs font-medium text-white shadow-lg transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      {message}
    </div>
  )
}
