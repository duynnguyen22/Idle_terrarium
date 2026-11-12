import { Slider as RadixSlider } from 'radix-ui'

/**
 * Single-thumb slider on Radix Slider, styled like the old native range input (see `.slider` in index.css).
 * Name it with `aria-label`, or with `aria-labelledby` pointing at a visible label: both go on the thumb,
 * which is the element with role="slider".
 */
export function Slider({
  value,
  min,
  max,
  step = 1,
  disabled = false,
  onValueChange,
  className = '',
  title,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
  'aria-valuetext': ariaValuetext,
}: {
  value: number
  min: number
  max: number
  step?: number
  disabled?: boolean
  onValueChange: (value: number) => void
  className?: string
  title?: string
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-valuetext'?: string
}) {
  return (
    <RadixSlider.Root
      value={[value]}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      onValueChange={([v]) => {
        if (v !== undefined) onValueChange(v)
      }}
      title={title}
      className={`slider ${className}`.trim()}
    >
      <RadixSlider.Track className="slider-track">
        <RadixSlider.Range className="slider-range" />
      </RadixSlider.Track>
      <RadixSlider.Thumb
        className="slider-thumb"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledby}
        aria-valuetext={ariaValuetext}
      />
    </RadixSlider.Root>
  )
}
