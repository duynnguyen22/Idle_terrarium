import { Button } from '@/components/ui/button'

const PHOTO_LINK = 'p-0 text-[11px] font-semibold'

/** "Change photo" and "Remove photo", shown once a custom backdrop photo exists. */
export function BackdropPhotoLinks({
  onChange,
  onRemove,
}: {
  onChange: () => void
  onRemove: () => void
}) {
  return (
    <span className="flex shrink-0 items-center gap-2.5">
      <Button
        variant="link"
        size="auto"
        onClick={onChange}
        className={`${PHOTO_LINK} text-forest-mid`}
      >
        Change photo
      </Button>
      <Button
        variant="link"
        size="auto"
        onClick={onRemove}
        className={`${PHOTO_LINK} text-stone hover:text-ink-soft`}
      >
        Remove photo
      </Button>
    </span>
  )
}
