import { useAtomValue, useStore } from 'jotai'
import { useEffect, useRef, type KeyboardEvent } from 'react'
import { useAuthEnv } from '@/components/account/auth/authEnv'
import type { GardenRecord } from '@/auth/backend'
import { Input } from '@/components/ui/input'
import { VESSELS_BY_ID } from '@/data/vessels'
import {
  activeIdAtom,
  busyAtom,
  confirmDeleteAtom,
  gardensAtom,
  type GardenStart,
  renamingAtom,
  timeAgo,
} from '@/store/account'
import {
  ACCT_ACTIONS,
  ACCT_H,
  ACCT_MUTED,
  ACCT_ROW,
  AccountBadge,
  AccountButton,
  AccountCard,
  AccountRow,
  ROW_INFO,
  ROW_META,
  ROW_NAME,
} from './AccountPieces'

/** The inline name editor: Enter or leaving the field saves, Escape cancels. */
function RenameInput({ garden }: { garden: GardenRecord }) {
  const { account } = useAuthEnv()
  const store = useStore()
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => ref.current?.focus(), [])

  const done = () => {
    // Enter already saved and closed the editor; the blur that follows must not save again.
    if (store.get(renamingAtom) !== garden.id) return
    void account.renameGarden(garden.id, ref.current?.value ?? '')
  }
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') done()
    // Inside the dialog, Escape never gets here: the dialog's capture listener closes the panel and
    // closePanel() clears the rename. This covers the editor rendered outside the dialog.
    if (e.key === 'Escape') account.setRenaming(null)
  }

  return (
    <Input
      ref={ref}
      id="garden-rename-input"
      className="h-7 bg-white px-1.5 text-[12.5px] md:text-[12.5px]"
      defaultValue={garden.name}
      maxLength={60}
      aria-label="Terrarium name"
      onKeyDown={onKeyDown}
      onBlur={done}
    />
  )
}

function GardenRow({ garden, active }: { garden: GardenRecord; active: boolean }) {
  const { account } = useAuthEnv()
  const renaming = useAtomValue(renamingAtom) === garden.id
  const confirming = useAtomValue(confirmDeleteAtom) === garden.id
  const s = garden.summary
  const vessel = VESSELS_BY_ID[s.vessel]?.name ?? 'Terrarium'
  const meta = `${vessel} · day ${s.day || 1} · ${s.plants || 0} plants, ${s.animals || 0} animals · ${timeAgo(garden.updatedAt)}`
  const actions = account

  return (
    <AccountRow active={active}>
      <div className={ROW_INFO}>
        {renaming ? (
          <RenameInput garden={garden} />
        ) : (
          <b className={ROW_NAME}>{garden.name || 'Untitled'}</b>
        )}
        <small className={ROW_META}>{meta}</small>
      </div>
      <div className="flex shrink-0 flex-wrap justify-end gap-1">
        {confirming ? (
          <>
            <AccountButton tone="danger" onClick={() => void actions.deleteGarden(garden.id)}>
              Delete
            </AccountButton>
            <AccountButton onClick={() => actions.setConfirmDelete(null)}>Keep</AccountButton>
          </>
        ) : (
          <>
            {active ? (
              <AccountBadge>Open</AccountBadge>
            ) : (
              <AccountButton tone="primary" onClick={() => void actions.openGarden(garden.id)}>
                Open
              </AccountButton>
            )}
            <AccountButton onClick={() => actions.setRenaming(garden.id)}>Rename</AccountButton>
            {!active && (
              <AccountButton onClick={() => actions.setConfirmDelete(garden.id)}>
                Delete
              </AccountButton>
            )}
          </>
        )}
      </div>
    </AccountRow>
  )
}

/** The Terrariums tab: every saved terrarium with open, rename and delete, plus two ways to start one (spec gardensTab). */
export function GardensTab() {
  const { account, toast } = useAuthEnv()
  const store = useStore()
  const gardens = useAtomValue(gardensAtom)
  const activeId = useAtomValue(activeIdAtom)
  const busy = useAtomValue(busyAtom)
  const n = gardens.length

  const startNew = async (kind: GardenStart, name: string) => {
    // A second click while the first create is under way must not start another terrarium.
    if (store.get(busyAtom)) return
    store.set(busyAtom, true)
    try {
      await account.createGarden(kind, name)
      toast('New terrarium started')
    } catch (e) {
      account.handleCloudError(e, { user: true })
    } finally {
      store.set(busyAtom, false)
    }
  }

  return (
    <AccountCard>
      <div className={ACCT_ROW}>
        <h3 className={ACCT_H}>My terrariums</h3>
        <span className={ACCT_MUTED}>{`${n} saved`}</span>
      </div>
      <ul className="grid gap-1.5">
        {gardens.map((g) => (
          <GardenRow key={g.id} garden={g} active={g.id === activeId} />
        ))}
      </ul>
      <div className={ACCT_ACTIONS}>
        <AccountButton
          disabled={busy}
          onClick={() => void startNew('falls', `Falls Lake ${n + 1}`)}
        >
          New Falls Lake build
        </AccountButton>
        <AccountButton disabled={busy} onClick={() => void startNew('empty', `Terrarium ${n + 1}`)}>
          New empty tank
        </AccountButton>
      </div>
    </AccountCard>
  )
}
