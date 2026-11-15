import { cn } from 'cn'
import { CheckIcon, MailIcon } from './AuthIcons'

/** The round success (or mail) mark over a confirmation screen. */
export function DoneMark({ mail }: { mail?: boolean }) {
  return (
    <div
      className={cn(
        'flex size-13 items-center justify-center justify-self-center rounded-full [&_svg]:size-6.5 [&_svg]:stroke-[2.2]',
        mail ? 'bg-[#e6eff4] text-[#1d4a63]' : 'bg-secondary text-forest-mid',
      )}
    >
      {mail ? <MailIcon /> : <CheckIcon />}
    </div>
  )
}
