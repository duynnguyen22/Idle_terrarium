import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BackendError, type JournalEntry } from '@/auth/backend'
import { useAccount } from '@/components/account/auth/authEnv'
import { AuthScreen } from '@/components/account/auth/AuthScreen'
import { demoSession, demoUser, makeEnv, renderIn, type Harness } from '../auth/authHarness'

function CurrentScreen() {
  const view = useAccount((s) => s.view)
  return <AuthScreen view={view} />
}

const DRAFT = 'botanica_journal_draft'

/** Signed in (phase cloud) with Alpha open, on the Journal tab. */
async function signedIn(): Promise<Harness> {
  const env = makeEnv('account')
  await env.backend.saveGarden('g_a', {
    name: 'Alpha',
    createdAt: 1,
    updatedAt: Date.now(),
    summary: { vessel: 'globe', day: 3, plants: 2, animals: 1 },
    snapshot: null,
  })
  await env.backend.setProfile({ activeGardenId: 'g_a' })
  await act(() => env.store.getState().beginSession(demoUser, demoSession, { isNew: false }))
  act(() => env.store.setState({ tab: 'journal' }))
  renderIn(env, <CurrentScreen />)
  return env
}

const entry = (over: Partial<Omit<JournalEntry, 'id'>> = {}): Omit<JournalEntry, 'id'> => ({
  at: new Date(2026, 10, 8, 9, 30).getTime(),
  day: 5,
  auto: true,
  note: '',
  metrics: { humidity: 84, temp: 22.5, moisture: 60, nutrients: 70, water: 85, air: 55 },
  summary: { vessel: 'globe', day: 5, plants: 3, animals: 1 },
  issues: [],
  ...over,
})

beforeEach(() => sessionStorage.clear())
afterEach(() => vi.restoreAllMocks())

describe('JournalTab', () => {
  it('shows the heading with the open terrarium, the note and the empty state', async () => {
    await signedIn()
    expect(screen.getByRole('heading', { name: 'Growth journal · Alpha' })).toHaveClass('acct-h')
    expect(
      screen.getByText(
        'An entry is added each time you press “+1 day”. Add notes about what you see.',
      ),
    ).toBeInTheDocument()
    const ta = screen.getByRole('textbox', { name: 'Journal note' })
    expect(ta).toHaveAttribute('maxlength', '600')
    expect(ta).toHaveAttribute(
      'placeholder',
      'New fern frond unfurling, springtails busy near the waterfall…',
    )
    expect(screen.getByText('No entries yet.')).toBeInTheDocument()
  })

  it('Log today adds an entry with the note, clears the draft and toasts', async () => {
    const env = await signedIn()
    const u = userEvent.setup()
    const ta = screen.getByRole('textbox', { name: 'Journal note' })
    await u.type(ta, 'New frond unfurling')
    expect(sessionStorage.getItem(DRAFT)).toBe('New frond unfurling')
    await u.click(screen.getByRole('button', { name: 'Log today' }))
    await vi.waitFor(() => expect(env.toast).toHaveBeenCalledWith('Logged in your growth journal'))
    const saved = await env.backend.listJournal('g_a')
    expect(saved).toHaveLength(1)
    expect(saved[0]).toMatchObject({ note: 'New frond unfurling', auto: false })
    expect(ta).toHaveValue('')
    expect(sessionStorage.getItem(DRAFT)).toBeNull()
    expect(await screen.findByText('New frond unfurling')).toHaveClass('journal-note')
    expect(screen.queryByText('No entries yet.')).toBeNull()
    expect(env.toast).toHaveBeenCalledTimes(1)
  })

  it('Log today keeps the note and the draft when the entry is not stored', async () => {
    const env = await signedIn()
    const u = userEvent.setup()
    const ta = screen.getByRole('textbox', { name: 'Journal note' })
    await u.type(ta, 'Keep me')

    // No terrarium open: addJournalEntry stores nothing.
    act(() => env.store.setState({ activeId: null }))
    const add = vi.spyOn(env.store.getState(), 'addJournalEntry')
    await u.click(screen.getByRole('button', { name: 'Log today' }))
    await vi.waitFor(() => expect(add).toHaveBeenCalledTimes(1))
    await expect(add.mock.results[0]?.value).resolves.toBe(false)
    expect(ta).toHaveValue('Keep me')
    expect(sessionStorage.getItem(DRAFT)).toBe('Keep me')

    // A failed write keeps it too.
    act(() => env.store.setState({ activeId: 'g_a' }))
    vi.spyOn(env.backend, 'addJournal').mockRejectedValueOnce(new Error('offline'))
    await u.click(screen.getByRole('button', { name: 'Log today' }))
    await vi.waitFor(() => expect(add).toHaveBeenCalledTimes(2))
    await expect(add.mock.results[1]?.value).resolves.toBe(false)
    expect(ta).toHaveValue('Keep me')
    expect(sessionStorage.getItem(DRAFT)).toBe('Keep me')
    expect(env.toast).not.toHaveBeenCalledWith('Logged in your growth journal')
  })

  it('a failed Log today shows the storage-full message even when storage was already full', async () => {
    const env = await signedIn()
    act(() => env.store.setState({ lastError: 'Storage is full' }))
    vi.spyOn(env.backend, 'addJournal').mockRejectedValue(new BackendError('quota_exceeded'))
    const u = userEvent.setup()
    await u.type(screen.getByRole('textbox', { name: 'Journal note' }), 'No room')
    await u.click(screen.getByRole('button', { name: 'Log today' }))
    await vi.waitFor(() =>
      expect(env.toast).toHaveBeenCalledWith(
        'Your storage is full. Delete an old terrarium or journal entries.',
      ),
    )
    await u.click(screen.getByRole('button', { name: 'Log today' }))
    await vi.waitFor(() => expect(env.toast).toHaveBeenCalledTimes(2))
    expect(screen.getByRole('textbox', { name: 'Journal note' })).toHaveValue('No room')
  })

  it('entries show day, chips with quality tiers and warn issues', async () => {
    const env = await signedIn()
    const first = entry()
    await env.backend.addJournal(
      'g_a',
      entry({
        at: first.at + 86_400_000,
        day: 6,
        auto: false,
        note: 'Springtails busy',
        metrics: { humidity: 70, temp: 19, moisture: 50, nutrients: 40, water: 62, air: 90 },
        summary: { vessel: 'globe', day: 6, plants: 4, animals: 1 },
        issues: ['Fern prefers 70–90% humidity; the air is at 60%.', 'The soil is drying out.'],
      }),
    )
    await env.backend.addJournal('g_a', first)
    await act(() => env.store.getState().refreshJournal())

    const items = document.querySelectorAll('.journal-item')
    expect(items).toHaveLength(2)
    const latest = within(items[0] as HTMLElement)
    expect(latest.getByText('Day 6').tagName).toBe('B')
    const when = new Date(first.at + 86_400_000).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
    expect(latest.getByText(when)).toHaveClass('acct-muted')
    expect(latest.getByText('Springtails busy')).toHaveClass('journal-note')
    const chips = [...items[0].querySelectorAll('.j-chip')].map((c) => [
      c.textContent,
      c.getAttribute('data-q'),
    ])
    expect(chips).toEqual([
      ['70% RH', null],
      ['19 °C', null],
      ['Water 62', 'fair'],
      ['Air 90', 'good'],
      ['4 plants', null],
    ])
    expect(latest.getByText('Fern prefers 70–90% humidity; the air is at 60%.')).toHaveClass(
      'journal-issue',
    )
    expect(latest.getByText('The soil is drying out.')).toHaveClass('journal-issue')

    const older = items[1] as HTMLElement
    expect(within(older).getByText('Day 5')).toBeInTheDocument()
    expect(older.querySelector('.journal-note')).toBeNull()
    expect(older.querySelector('.journal-issue')).toBeNull()
    expect([...older.querySelectorAll('.j-chip')].map((c) => c.getAttribute('data-q'))).toEqual([
      null,
      null,
      'good',
      'bad',
      null,
    ])
    expect(screen.queryByText('No entries yet.')).toBeNull()
  })

  it('the draft survives a re-render through sessionStorage', async () => {
    await signedIn()
    const u = userEvent.setup()
    await u.type(screen.getByRole('textbox', { name: 'Journal note' }), 'Half a thought')
    expect(sessionStorage.getItem(DRAFT)).toBe('Half a thought')
    await u.click(screen.getByRole('tab', { name: 'Terrariums' }))
    expect(screen.queryByRole('textbox', { name: 'Journal note' })).toBeNull()
    await u.click(screen.getByRole('tab', { name: 'Journal' }))
    expect(screen.getByRole('textbox', { name: 'Journal note' })).toHaveValue('Half a thought')
  })

  it('a blocked sessionStorage does not break typing or logging', async () => {
    const blocked = () => {
      throw new Error('SecurityError')
    }
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(blocked)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(blocked)
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(blocked)
    const env = await signedIn()
    const u = userEvent.setup()
    const ta = screen.getByRole('textbox', { name: 'Journal note' })
    expect(ta).toHaveValue('')
    await u.type(ta, 'Still works')
    expect(ta).toHaveValue('Still works')
    await u.click(screen.getByRole('button', { name: 'Log today' }))
    await vi.waitFor(() => expect(env.toast).toHaveBeenCalledWith('Logged in your growth journal'))
    expect(ta).toHaveValue('')
  })
})
