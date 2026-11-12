import { useAtomValue, useStore } from 'jotai'
import { useEffect, useRef, type KeyboardEvent } from 'react'
import { useAuthEnv } from '@/components/account/auth/authEnv'
import type { GardenRecord } from '@/auth/backend'
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
    <input
      ref={ref}
      id="garden-rename-input"
      className="garden-rename"
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
    <li className={`garden-row${active ? ' is-active' : ''}`}>
      <div className="garden-info">
        {renaming ? <RenameInput garden={garden} /> : <b>{garden.name || 'Untitled'}</b>}
        <small>{meta}</small>
      </div>
      <div className="garden-acts">
        {confirming ? (
          <>
            <button
              type="button"
              className="g-btn danger"
              onClick={() => void actions.deleteGarden(garden.id)}
            >
              Delete
            </button>
            <button type="button" className="g-btn" onClick={() => actions.setConfirmDelete(null)}>
              Keep
            </button>
          </>
        ) : (
          <>
            {active ? (
              <span className="g-badge">Open</span>
            ) : (
              <button
                type="button"
                className="g-btn primary"
                onClick={() => void actions.openGarden(garden.id)}
              >
                Open
              </button>
            )}
            <button type="button" className="g-btn" onClick={() => actions.setRenaming(garden.id)}>
              Rename
            </button>
            {!active && (
              <button
                type="button"
                className="g-btn"
                onClick={() => actions.setConfirmDelete(garden.id)}
              >
                Delete
              </button>
            )}
          </>
        )}
      </div>
    </li>
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
    <div className="acct-card">
      <div className="acct-row">
        <h3 className="acct-h">My terrariums</h3>
        <span className="acct-muted">{`${n} saved`}</span>
      </div>
      <ul className="garden-list">
        {gardens.map((g) => (
          <GardenRow key={g.id} garden={g} active={g.id === activeId} />
        ))}
      </ul>
      <div className="acct-row gap">
        <button
          type="button"
          className="g-btn"
          disabled={busy}
          onClick={() => void startNew('falls', `Falls Lake ${n + 1}`)}
        >
          New Falls Lake build
        </button>
        <button
          type="button"
          className="g-btn"
          disabled={busy}
          onClick={() => void startNew('empty', `Terrarium ${n + 1}`)}
        >
          New empty tank
        </button>
      </div>
    </div>
  )
}
