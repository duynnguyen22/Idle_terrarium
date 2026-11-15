import { type ReactNode } from 'react'
import { Separator } from '@/components/ui/separator'

export function Divider({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 text-[11.5px] text-stone-light">
      <Separator className="flex-1" />
      <span>{children}</span>
      <Separator className="flex-1" />
    </div>
  )
}
