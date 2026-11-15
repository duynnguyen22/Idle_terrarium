import { LineIcon } from '@/components/ui/LineIcon'
import { ToggleGroupItem } from '@/components/ui/toggle-group'
import type { BackdropId } from '@/data/types'

const IMG = 'block aspect-[3/2] w-full rounded-[7px] bg-cover bg-center'

/** One scene in the backdrop grid: its painted thumbnail, or the "Upload" tile for a missing photo. */
export function BackdropTile({
  id,
  name,
  thumb,
  upload,
}: {
  id: BackdropId
  name: string
  thumb: string
  upload: boolean
}) {
  return (
    <ToggleGroupItem
      value={id}
      aria-label={name}
      className="min-w-0 text-forest-ink hover:text-forest-ink"
    >
      {upload ? (
        <span
          className={`${IMG} flex flex-col items-center justify-center gap-0.5 bg-[#eef1ea] text-[10px] font-semibold text-[#2d5a43]`}
        >
          <LineIcon name="camera" />
          <span>Upload</span>
        </span>
      ) : (
        <span className={IMG} style={thumb ? { backgroundImage: `url('${thumb}')` } : undefined} />
      )}
      <span className="truncate px-0.5 pb-0.5 text-[10.5px] leading-tight font-semibold">
        {name}
      </span>
    </ToggleGroupItem>
  )
}
