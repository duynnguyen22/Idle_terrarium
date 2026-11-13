import * as React from 'react'
import { cn } from 'cn'
import { Slider as SliderPrimitive } from 'radix-ui'

type ThumbAria = Pick<
  React.ComponentProps<typeof SliderPrimitive.Thumb>,
  'aria-label' | 'aria-labelledby' | 'aria-valuetext'
>

/**
 * shadcn Slider, themed to the botanical palette.
 *
 * Accessible name: `aria-label` / `aria-labelledby` / `aria-valuetext` are forwarded to the
 * thumb(s), which carry role="slider" — on the Root they would name nothing.
 * `size="sm"` gives the thinner track used in the relax dock.
 */
function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  size = 'default',
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
  'aria-valuetext': ariaValuetext,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root> & ThumbAria & { size?: 'default' | 'sm' }) {
  const _values = React.useMemo(
    () => (Array.isArray(value) ? value : Array.isArray(defaultValue) ? defaultValue : [min, max]),
    [value, defaultValue, min, max],
  )

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      data-size={size}
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        'group/slider relative flex h-4 w-full cursor-pointer touch-none items-center select-none data-disabled:cursor-default data-disabled:opacity-45 data-vertical:h-full data-vertical:min-h-40 data-vertical:w-auto data-vertical:flex-col',
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className="relative grow overflow-hidden rounded-full bg-input data-horizontal:h-1.5 data-horizontal:w-full data-vertical:h-full data-vertical:w-1.5 group-data-[size=sm]/slider:data-horizontal:h-1"
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className="absolute select-none data-horizontal:h-full data-vertical:w-full"
        />
      </SliderPrimitive.Track>
      {Array.from({ length: _values.length }, (_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledby}
          aria-valuetext={ariaValuetext}
          className="block size-4 shrink-0 cursor-pointer rounded-full border-2 border-white bg-primary shadow-[0_1px_4px_rgba(0,0,0,0.25)] transition-transform duration-150 select-none hover:scale-115 group-data-disabled/slider:cursor-default group-data-disabled/slider:hover:scale-100"
        />
      ))}
    </SliderPrimitive.Root>
  )
}

export { Slider }
