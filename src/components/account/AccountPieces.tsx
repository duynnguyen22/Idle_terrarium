import type { ComponentProps } from 'react'
import { cn } from 'cn'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

// The acct-*, g-btn, garden-* and journal-* classes below carry no CSS; they name the parts for tests.

/** A white section card in the account tabs. */
export function AccountCard({ className, ...props }: ComponentProps<typeof Card>) {
  return (
    <Card
      className={cn('acct-card gap-2.5 rounded-[14px] bg-white p-3.5 ring-card-line', className)}
      {...props}
    />
  )
}

export const ACCT_H = 'acct-h text-[13px] font-semibold text-forest-ink'
export const ACCT_NOTE = 'acct-note text-xs leading-normal text-ink-soft'
export const ACCT_MUTED = 'acct-muted text-[11px] text-muted-foreground'
/** Heading on the left, detail on the right. */
export const ACCT_ROW = 'flex flex-wrap items-center justify-between gap-2'
/** A row of actions from the left. */
export const ACCT_ACTIONS = 'flex flex-wrap items-center gap-2'
export const ACCT_OK = 'acct-ok text-xs font-semibold text-forest-mid'

type Tone = 'plain' | 'primary' | 'danger' | 'danger-outline'

const TONE: Record<Tone, Pick<ComponentProps<typeof Button>, 'variant' | 'className'>> = {
  plain: { variant: 'outline', className: 'bg-white text-forest-deep hover:bg-linen' },
  primary: { variant: 'default', className: 'primary' },
  danger: {
    variant: 'destructive',
    className: 'danger bg-destructive text-white hover:bg-destructive/90',
  },
  'danger-outline': { variant: 'destructive', className: 'danger-outline border-destructive/20' },
}

/** The small button used across the account tabs. */
export function AccountButton({
  tone = 'plain',
  className,
  ...props
}: Omit<ComponentProps<typeof Button>, 'variant' | 'size'> & { tone?: Tone }) {
  const t = TONE[tone]
  return (
    <Button
      type="button"
      size="sm"
      variant={t.variant}
      className={cn('g-btn h-7 px-2.5 text-[11.5px] font-semibold', t.className, className)}
      {...props}
    />
  )
}

/** A status tag the same height as AccountButton ("Open", "Current"). */
export function AccountBadge({ className, ...props }: ComponentProps<typeof Badge>) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        'g-badge h-7 rounded-lg bg-[#cfe3d5] px-2.5 text-[11px] font-semibold text-forest-mid',
        className,
      )}
      {...props}
    />
  )
}

/** The "Verified" pill next to an email address. */
export function VerifiedBadge() {
  return (
    <Badge
      variant="secondary"
      className="acct-verified h-auto px-2 text-[10.5px] font-semibold text-forest-mid"
    >
      Verified
    </Badge>
  )
}

/** One terrarium or session in a list: name, a detail line, and actions on the right. */
export function AccountRow({
  active,
  className,
  ...props
}: ComponentProps<'li'> & { active?: boolean }) {
  return (
    <li
      className={cn(
        'garden-row flex items-center gap-2.5 rounded-[10px] bg-[#f3f5f1] p-2.5',
        active && 'is-active bg-[#e2ede5]',
        className,
      )}
      {...props}
    />
  )
}

export const ROW_INFO = 'flex min-w-0 flex-1 flex-col'
export const ROW_NAME = 'truncate text-[12.5px] font-semibold text-forest-ink'
export const ROW_META = 'text-[10.5px] leading-snug text-stone'
