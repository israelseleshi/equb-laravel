import { useEqubStore } from '../../src/store/equbStore'
import { roundsApi } from '../../src/services/api'

// Mock the roundsApi
jest.mock('../../src/services/api', () => ({
  roundsApi: {
    list: jest.fn(),
    stats: jest.fn(),
    get: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    activate: jest.fn(),
    complete: jest.fn(),
    cancel: jest.fn(),
    demoFill: jest.fn(),
    spin: jest.fn(),
    enroll: jest.fn(),
    unenroll: jest.fn(),
  },
  drawApi: {
    shake: jest.fn(),
  },
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}))

describe('equbStore', () => {
  beforeEach(() => {
    // Reset the store to initial state
    useEqubStore.setState({
      rounds: [],
      categories: [],
      users: [],
      slots: [],
      draws: [],
      isLoading: false,
      error: null,
      revision: 0,
    })
    jest.clearAllMocks()
  })

  describe('Initial State', () => {
    it('has empty arrays and zero revision', () => {
      const state = useEqubStore.getState()
      expect(state.rounds).toEqual([])
      expect(state.categories).toEqual([])
      expect(state.revision).toBe(0)
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
    })
  })

  describe('Round Actions', () => {
    const mockRound = {
      id: 1,
      name: 'Test Round',
      category: '500',
      amount: 500,
      frequency: 'daily' as const,
      people_goal: 10,
      current_participants: 0,
      total_rounds: 12,
      winners_per_spin: 2,
      current_round_number: 1,
      start_date: null,
      end_date: null,
      status: 'draft' as const,
      auto_spin_enabled: true,
      spin_time: '08:00',
      commission_rate: 10,
      metadata: null,
      last_auto_draw_at: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    }

    it('setRounds updates rounds and increments revision', () => {
      useEqubStore.getState().setRounds([mockRound])
      const state = useEqubStore.getState()
      expect(state.rounds).toHaveLength(1)
      expect(state.revision).toBeGreaterThan(0)
    })

    it('addRound adds a round', () => {
      useEqubStore.getState().addRound(mockRound)
      expect(useEqubStore.getState().rounds).toHaveLength(1)
    })

    it('updateRound updates specific round fields', () => {
      useEqubStore.getState().addRound(mockRound)
      useEqubStore.getState().updateRound(1, { status: 'active' })
      const updated = useEqubStore.getState().rounds[0]
      expect(updated.status).toBe('active')
    })

    it('removeRound removes a round by id', () => {
      useEqubStore.getState().addRound(mockRound)
      useEqubStore.getState().removeRound(1)
      expect(useEqubStore.getState().rounds).toHaveLength(0)
    })

    it('activateRoundAction calls API and updates store', async () => {
      (roundsApi.activate as jest.Mock).mockResolvedValue({ round: { ...mockRound, status: 'active' } })
      useEqubStore.getState().setRounds([mockRound])
      await useEqubStore.getState().activateRoundAction(1)
      expect(roundsApi.activate).toHaveBeenCalledWith(1)
      const state = useEqubStore.getState()
      expect(state.rounds[0].status).toBe('active')
    })

    it('activateRoundAction sets error on failure', async () => {
      (roundsApi.activate as jest.Mock).mockRejectedValue(new Error('API Error'))
      await expect(useEqubStore.getState().activateRoundAction(1)).rejects.toThrow('API Error')
      expect(useEqubStore.getState().error).toBe('API Error')
    })
  })

  describe('Category Actions', () => {
    const mockCategory = {
      id: 1,
      code: '500',
      label_en: '500 ETB',
      label_am: '500 ብር',
      amount: 500,
      frequency: 'daily',
      max_members: 10,
      min_deposit: 500,
      total_rounds: 12,
      collateral_type: null,
      license_type: null,
      requires_license: false,
      penalty_clause_en: null,
      penalty_clause_am: null,
      is_active: true,
      sort_order: 1,
      metadata: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    }

    it('setCategories updates categories', () => {
      useEqubStore.getState().setCategories([mockCategory])
      expect(useEqubStore.getState().categories).toHaveLength(1)
    })
  })

  describe('Metrics/Recalculation', () => {
    it('recalculate recomputes metrics', () => {
      useEqubStore.setState({
        users: [{ id: 'usr-1', name: 'Test', phone: '0911111111', joinedAt: '2026-01-01' }],
        slots: [{
          id: 's-1', userId: 'usr-1', category: '500', slotNumber: 1,
          status: 'active' as const, balance: 500, consecutiveMissedSweeps: 0, depositedToday: true,
        }],
        draws: [{ spinId: 'd-1', category: '500', winningSlot: 1, winnerName: 'Test', netPayout: 4500, timestamp: '2026-06-01', round: 1 }],
      })
      const store = useEqubStore.getState()
      store.recalculate()
      const metrics = useEqubStore.getState().metrics
      expect(metrics.totalMembers).toBe(1)
      expect(metrics.totalSlots).toBe(1)
      expect(metrics.activeSlots).toBe(1)
    })
  })

  describe('Fetch Actions', () => {
    it('fetchRounds fetches from API and updates store', async () => {
      const mockRounds = [{ id: 1, name: 'Round 1', category: '500', status: 'active' }]
      ;(roundsApi.list as jest.Mock).mockResolvedValue({ rounds: mockRounds })
      await useEqubStore.getState().fetchRounds()
      expect(roundsApi.list).toHaveBeenCalled()
      expect(useEqubStore.getState().rounds).toEqual(mockRounds)
    })

    it('fetchRounds keeps fallback on API failure', async () => {
      ;(roundsApi.list as jest.Mock).mockRejectedValue(new Error('Network error'))
      await useEqubStore.getState().fetchRounds()
      // Should not throw - keeps existing state
      expect(useEqubStore.getState().rounds).toEqual([])
    })
  })

  describe('createRoundAction', () => {
    it('calls API and adds round on success', async () => {
      const newRound = { id: 2, name: 'New Round', category: '500', amount: 500, frequency: 'daily' as const, people_goal: 10, total_rounds: 12 }
      ;(roundsApi.create as jest.Mock).mockResolvedValue({ round: { ...newRound, status: 'draft', winners_per_spin: 1, current_round_number: 1, start_date: null, end_date: null, auto_spin_enabled: false, spin_time: '08:00', commission_rate: 10, metadata: null, last_auto_draw_at: null, created_at: '', updated_at: '' } })
      await useEqubStore.getState().createRoundAction(newRound as any)
      expect(roundsApi.create).toHaveBeenCalledWith(newRound)
      expect(useEqubStore.getState().rounds).toHaveLength(1)
    })
  })

  describe('deleteRoundAction', () => {
    it('calls API and removes round', async () => {
      useEqubStore.setState({ rounds: [{ id: 1, name: 'Test', category: '500', status: 'draft' } as any] })
      ;(roundsApi.delete as jest.Mock).mockResolvedValue({ message: 'Deleted' })
      await useEqubStore.getState().deleteRoundAction(1)
      expect(roundsApi.delete).toHaveBeenCalledWith(1)
      expect(useEqubStore.getState().rounds).toHaveLength(0)
    })
  })
})
