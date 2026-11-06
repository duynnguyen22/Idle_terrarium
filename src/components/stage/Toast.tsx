import { useToastStore } from '@/store/toastStore'

export function Toast() {
  const message = useToastStore((s) => s.message)
  const visible = useToastStore((s) => s.visible)
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
