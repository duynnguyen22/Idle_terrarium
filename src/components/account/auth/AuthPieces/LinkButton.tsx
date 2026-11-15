import { cn } from 'cn'
import { type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

export function LinkButton({
  children,
  onClick,
  className,
}: {
  children: ReactNode
  onClick: () => void
  className?: string
}) {
  return (
    <Button
      type="button"
      variant="link"
      size="auto"
      className={cn(
        'p-0 text-[12.5px] font-semibold text-forest-mid underline decoration-forest-mid/35 underline-offset-3 hover:decoration-current',
        className,
      )}
      onClick={onClick}
    >
      {children}
    </Button>
  )
}
