import type { ComponentProps } from 'react'
import { cn } from 'cn'

/** Tab icon paths from the prototype's #m-tabs (24 px viewBox, stroked). */
const ICONS = {
  build:
    'M12 20V10M12 10c0-3.5 2.5-6 6.5-6c0 4-2.5 6-6.5 6zM12 13c0-2.6-2-4.5-5.5-4.5c0 3 2 4.5 5.5 4.5zM5 20h14',
  health: 'M3 12h4l2-6l4 12l2-6h6',
  growth: 'M4 20h16M7 20v-5M12 20V9M17 20v-8',
  relax: 'M5 19c0-8 5-14 15-15c0 10-6 15-14 15zM5 19l7-7',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
} as const

type TabButtonProps = Omit<ComponentProps<'button'>, 'children'> & {
  icon: keyof typeof ICONS
  label: string
  pressed?: boolean
  land: boolean
}

/** One handheld section tab. Extra props reach the button, so it can be a Radix trigger (asChild). */
export function TabButton({ icon, label, pressed, land, className, ...rest }: TabButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      {...rest}
      className={cn(
        'group flex min-h-11 min-w-0 flex-col items-center justify-center font-semibold text-stone focus-visible:outline-2 focus-visible:-outline-offset-[3px] focus-visible:outline-forest-mid aria-pressed:text-forest-ink',
        land ? 'gap-px text-[10px]' : 'gap-[3px] text-[11px]',
        className,
      )}
    >
      <span
        className={cn(
          'inline-flex items-center justify-center rounded-full transition-colors duration-[180ms] group-active:bg-sand-track group-aria-pressed:bg-forest-deep group-aria-pressed:text-white motion-reduce:transition-none',
          land ? 'h-[26px] w-10' : 'h-7 w-[52px]',
        )}
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="size-[21px] fill-none stroke-current stroke-[1.8] [stroke-linecap:round] [stroke-linejoin:round]"
        >
          <path d={ICONS[icon]} />
        </svg>
      </span>
      {label}
    </button>
  )
}
