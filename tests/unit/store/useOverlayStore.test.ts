import { beforeEach, describe, expect, it } from 'vitest'
import { useOverlayStore } from '@/store/useOverlayStore'

const reset = () =>
  useOverlayStore.setState({ growthBoardOpen: false, awayIndex: null, tour: null })

beforeEach(reset)

describe('useOverlayStore', () => {
  it('starts closed', () => {
    expect(useOverlayStore.getState()).toMatchObject({
      growthBoardOpen: false,
      awayIndex: null,
      tour: null,
    })
  })

  it('openAway closes the growth board and openGrowthBoard closes the away card', () => {
    const s = useOverlayStore.getState()
    s.openGrowthBoard()
    expect(useOverlayStore.getState().growthBoardOpen).toBe(true)
    s.openAway()
    expect(useOverlayStore.getState()).toMatchObject({ growthBoardOpen: false, awayIndex: 0 })
    s.openAway(2)
    expect(useOverlayStore.getState().awayIndex).toBe(2)
    s.openGrowthBoard()
    expect(useOverlayStore.getState()).toMatchObject({ growthBoardOpen: true, awayIndex: null })
    s.closeGrowthBoard()
    expect(useOverlayStore.getState().growthBoardOpen).toBe(false)
  })

  it('setAwayIndex and closeAway', () => {
    const s = useOverlayStore.getState()
    s.openAway()
    s.setAwayIndex(3)
    expect(useOverlayStore.getState().awayIndex).toBe(3)
    s.closeAway()
    expect(useOverlayStore.getState().awayIndex).toBeNull()
  })

  it('walks a tour and ends it past the last step', () => {
    const s = useOverlayStore.getState()
    s.startTour([
      { uid: 'a', text: 'one' },
      { uid: 'b', text: 'two' },
    ])
    expect(useOverlayStore.getState().tour?.i).toBe(0)
    s.nextTour()
    expect(useOverlayStore.getState().tour?.i).toBe(1)
    s.nextTour()
    expect(useOverlayStore.getState().tour).toBeNull()
  })

  it('does not start an empty tour, and endTour clears one', () => {
    const s = useOverlayStore.getState()
    s.startTour([])
    expect(useOverlayStore.getState().tour).toBeNull()
    s.startTour([{ uid: 'a', text: 'one' }])
    s.endTour()
    expect(useOverlayStore.getState().tour).toBeNull()
  })
})
