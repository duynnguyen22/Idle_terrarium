import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from 'cn'
import { Toggle as TogglePrimitive } from 'radix-ui'

const toggleVariants = cva(
  "group/toggle inline-flex items-center justify-center gap-1 rounded-lg text-sm font-medium whitespace-nowrap transition-all outline-none hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 aria-pressed:bg-muted data-[state=on]:bg-muted dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'bg-transparent',
        outline: 'border border-input bg-transparent hover:bg-muted',
        // Botanical tones: `solid` fills with forest when on, `raised` lifts to a white chip.
        solid:
          'bg-transparent text-ink-brown hover:bg-white/60 aria-pressed:bg-primary aria-pressed:text-primary-foreground data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:hover:bg-primary data-[state=on]:hover:text-primary-foreground aria-pressed:hover:bg-primary aria-pressed:hover:text-primary-foreground',
        raised:
          'bg-transparent text-ink-umber hover:bg-white/70 aria-pressed:bg-white aria-pressed:text-forest-deep aria-pressed:shadow-sm data-[state=on]:bg-white data-[state=on]:text-forest-deep data-[state=on]:shadow-sm data-[state=on]:hover:bg-white data-[state=on]:hover:text-forest-deep',
        mint: 'bg-transparent text-ink-umber hover:bg-white/70 aria-pressed:bg-mint-step aria-pressed:text-forest-deep data-[state=on]:bg-mint-step data-[state=on]:text-forest-deep data-[state=on]:hover:bg-mint-step data-[state=on]:hover:text-forest-deep',
        // Option rows inside a list (room sources): mint wash when chosen. Pair with size="auto".
        choice:
          'items-start justify-start gap-2.5 rounded-[10px] px-2.5 py-2 text-left font-normal text-forest-ink hover:bg-mint-mist hover:text-forest-ink data-[state=on]:bg-mint-pale data-[state=on]:hover:bg-mint-pale',
        // Picture tiles (backdrops): white card, forest outline when chosen. Pair with size="auto".
        tile: 'flex-col items-stretch justify-start gap-1 rounded-[10px] border border-card-line bg-white p-[3px] text-left hover:bg-mint-mist data-[state=on]:border-forest-deep data-[state=on]:bg-white data-[state=on]:shadow-[inset_0_0_0_1px_var(--color-forest-deep)] data-[state=on]:hover:bg-mint-mist',
        // Picker cards (vessels, pour containers): fill forest when chosen. Pair with size="auto".
        card: 'justify-start gap-2 rounded-2xl border border-sand-border bg-white p-2 text-left font-normal text-ink-deep hover:bg-sand-warm hover:text-ink-deep aria-pressed:border-forest-deep aria-pressed:bg-forest-deep aria-pressed:text-white aria-pressed:shadow-sm aria-pressed:hover:bg-forest-deep aria-pressed:hover:text-white data-[state=on]:border-forest-deep data-[state=on]:bg-forest-deep data-[state=on]:text-white data-[state=on]:hover:bg-forest-deep data-[state=on]:hover:text-white',
      },
      size: {
        default:
          'h-8 min-w-8 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
        sm: "h-7 min-w-7 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: 'h-9 min-w-9 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
        // Content-sized: the variant sets padding, text may wrap.
        auto: 'h-auto min-w-0 whitespace-normal',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Toggle({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> & VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Toggle, toggleVariants }
