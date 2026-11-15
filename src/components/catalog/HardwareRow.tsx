import { useId, type ReactNode } from 'react'
import { cn } from 'cn'
import { Switch } from '@/components/ui/switch'
import { ICON_BASE } from './hardwareRowStyles'

export function Glyph({ d }: { d: string }) {
  return (
    <svg
      className="size-[17px]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  )
}

export function HwText({ label, sub, subId }: { label: string; sub: string; subId?: string }) {
  return (
    <span className="flex min-w-0 flex-1 flex-col">
      <span className="text-[12.5px] font-semibold text-forest-ink">{label}</span>
      <span id={subId} className="text-[11px] leading-snug text-stone">
        {sub}
      </span>
    </span>
  )
}

/** A hardware row: the whole row is the click target for its shadcn Switch. */
export function SwitchRow({
  label,
  sub,
  checked,
  iconClass,
  icon,
  onToggle,
}: {
  label: string
  sub: string
  checked: boolean
  iconClass: string
  icon: ReactNode
  onToggle: () => void
}) {
  const subId = useId()
  return (
    <label className="flex w-full cursor-pointer items-center gap-2.5 rounded-[10px] px-2.5 py-[9px] transition-colors hover:bg-[#f1f4ef]">
      <span className={cn(ICON_BASE, iconClass)}>{icon}</span>
      <HwText label={label} sub={sub} subId={subId} />
      <Switch
        checked={checked}
        aria-label={label}
        aria-describedby={subId}
        onCheckedChange={onToggle}
      />
    </label>
  )
}
