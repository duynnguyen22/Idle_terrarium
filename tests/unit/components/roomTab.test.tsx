import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { RoomTab } from '@/components/catalog/RoomTab'
import { LeftSidebar } from '@/components/layout/LeftSidebar'
import { createDefaultState, useStudioStore } from '@/store/useStudioStore'

const room = () => useStudioStore.getState().room

beforeEach(() => {
  useStudioStore.setState(createDefaultState())
})

describe('RoomTab', () => {
  it('lists five water sources and five air sources as radios', () => {
    render(<RoomTab />)
    const water = screen.getByRole('radiogroup', { name: 'Water source' })
    const air = screen.getByRole('radiogroup', { name: 'Room air' })
    expect(within(water).getAllByRole('radio')).toHaveLength(5)
    expect(within(air).getAllByRole('radio')).toHaveLength(5)
  })

  it('marks the stored source as checked and writes a new choice to the store', async () => {
    const user = userEvent.setup()
    render(<RoomTab />)
    expect(screen.getByRole('radio', { name: /Tap \+ dechlorinator/ })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    await user.click(screen.getByRole('radio', { name: /Cooking or incense smoke/ }))
    expect(room().air).toBe('smoke')
    expect(screen.getByRole('radio', { name: /Cooking or incense smoke/ })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })

  it('choosing RO disables the sliders and shows the fixed note', async () => {
    const user = userEvent.setup()
    render(<RoomTab />)
    expect(screen.getByLabelText('Hardness (TDS)')).toBeEnabled()
    expect(screen.getByText('Read them from a TDS pen and pH strip.')).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: /RO or distilled/ }))
    expect(screen.getByLabelText('Hardness (TDS)')).toBeDisabled()
    expect(screen.getByLabelText('pH')).toBeDisabled()
    expect(screen.getByText('RO or distilled sets these for you.')).toBeInTheDocument()
    expect(room().water).toBe('ro')
  })

  it('the sliders write tds and pH in tenths, and the value text follows', () => {
    render(<RoomTab />)
    const tds = screen.getByLabelText('Hardness (TDS)') as HTMLInputElement
    const ph = screen.getByLabelText('pH') as HTMLInputElement
    expect(ph.value).toBe('72')
    expect(screen.getByText('180 ppm')).toBeInTheDocument()
    expect(screen.getByText('pH 7.2')).toBeInTheDocument()
    fireChange(tds, '400')
    fireChange(ph, '80')
    expect(room().tds).toBe(400)
    expect(room().ph).toBeCloseTo(8.0)
    expect(screen.getByText('400 ppm · hard')).toBeInTheDocument()
    expect(screen.getByText('pH 8.0')).toBeInTheDocument()
    fireChange(tds, '60')
    expect(screen.getByText('60 ppm · very soft')).toBeInTheDocument()
  })

  it('the purifier switch toggles and reads HEPA + carbon, running', async () => {
    const user = userEvent.setup()
    render(<RoomTab />)
    const sw = screen.getByRole('switch', { name: 'Air purifier' })
    expect(sw).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByText('Off')).toBeInTheDocument()
    await user.click(sw)
    expect(sw).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText('HEPA + carbon, running')).toBeInTheDocument()
    expect(room().purifier).toBe(true)
  })

  it('scores read value · word', () => {
    render(<RoomTab />)
    expect(screen.getAllByText('100 · Good')).toHaveLength(2)
    expect(screen.getByText('Safe for misting and the pool')).toBeInTheDocument()
    expect(screen.getByText('Sealed lid halves what reaches the tank')).toBeInTheDocument()
  })

  it('notes the open top when the lid is off, and chlorine for tap water', async () => {
    const user = userEvent.setup()
    useStudioStore.setState({ hasLid: false })
    render(<RoomTab />)
    expect(screen.getByText('Open top: the tank breathes room air')).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: /Tap water/ }))
    expect(screen.getByText('Chlorine present')).toBeInTheDocument()
  })
})

describe('LeftSidebar room tab', () => {
  it('the Room tab appears in the sidebar after Fauna and opens the panel', async () => {
    const user = userEvent.setup()
    render(<LeftSidebar />)
    const names = screen.getAllByRole('tab').map((t) => t.textContent)
    expect(names.slice(-2)).toEqual(['Fauna', 'Room'])
    await user.click(screen.getByRole('tab', { name: /Room/ }))
    expect(screen.getByText('Water you use')).toBeInTheDocument()
  })
})

function fireChange(el: HTMLInputElement, value: string) {
  fireEvent.change(el, { target: { value } })
}
