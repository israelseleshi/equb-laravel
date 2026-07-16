import { create } from 'zustand'
import { api } from '../services/api'
import { roundsApi, drawApi, type RoundData, type CategoryData, type ShakeInput, type ShakeResult } from '../services/api'

/* ─── Types ─── */

export interface StoreUser {
  id: string
  name: string
  phone: string
  joinedAt: string
}

export interface StoreSlot {
  id: string
  userId: string
  category: string
  slotNumber: number
  status: 'active' | 'lien'
  balance: number
  consecutiveMissedSweeps: number
  depositedToday: boolean
}

export interface StoreDraw {
  spinId: string
  category: string
  winningSlot: number
  winnerName?: string
  netPayout: number
  timestamp: string
  round: number
}

export interface StoreMetrics {
  totalPoolVolume: number
  totalActiveCapital: number
  totalPaidMembers: number
  totalRemainingMembers: number
  paymentCompletionRate: number
  activeRoundsCount: number
  totalMembers: number
  totalSlots: number
  activeSlots: number
  lienSlots: number
  delinquentSlots: number
  byCategory: Array<{ category: string; count: number; balance: number }>
}

/* ─── Mock Fallback Data ─── */

const FALLBACK_USERS: StoreUser[] = [
  { id: 'usr-1', name: 'Abebe Kebede', phone: '0911111111', joinedAt: '2026-01-15' },
  { id: 'usr-2', name: 'Almaz Tadesse', phone: '0922222222', joinedAt: '2026-01-20' },
  { id: 'usr-3', name: 'Lemma Hailu', phone: '0933333333', joinedAt: '2026-02-01' },
  { id: 'usr-4', name: 'Tigist Wondimu', phone: '0944444444', joinedAt: '2026-02-10' },
  { id: 'usr-5', name: 'Biruk Alemu', phone: '0955555555', joinedAt: '2026-03-01' },
  { id: 'usr-6', name: 'Meron Getachew', phone: '0966666666', joinedAt: '2026-03-15' },
  { id: 'usr-7', name: 'Henok Desta', phone: '0977777777', joinedAt: '2026-04-01' },
  { id: 'usr-8', name: 'Sara Tekle', phone: '0988888888', joinedAt: '2026-04-10' },
  { id: 'usr-9', name: 'Yonas Ayele', phone: '0999999999', joinedAt: '2026-05-01' },
  { id: 'usr-10', name: 'Hiwot Girma', phone: '0900000000', joinedAt: '2026-05-15' },
]

const FALLBACK_SLOTS: StoreSlot[] = [
  ...Array.from({ length: 8 }, (_, i) => ({ id: `s500-${i}`, userId: `usr-${(i % 10) + 1}`, category: '500', slotNumber: i + 1, status: 'active' as const, balance: 500, consecutiveMissedSweeps: 0, depositedToday: true })),
  ...Array.from({ length: 6 }, (_, i) => ({ id: `s1000-${i}`, userId: `usr-${((i + 3) % 10) + 1}`, category: '1000', slotNumber: i + 1, status: 'active' as const, balance: 2000, consecutiveMissedSweeps: 0, depositedToday: true })),
  ...Array.from({ length: 4 }, (_, i) => ({ id: `s2000-${i}`, userId: `usr-${((i + 6) % 10) + 1}`, category: '2000', slotNumber: i + 1, status: 'active' as const, balance: 4000, consecutiveMissedSweeps: i === 0 ? 2 : 0, depositedToday: i === 0 ? false : true })),
  ...Array.from({ length: 3 }, (_, i) => ({ id: `s5000-${i}`, userId: `usr-${((i + 9) % 10) + 1}`, category: '5000', slotNumber: i + 1, status: i === 1 ? 'lien' as const : 'active' as const, balance: 10000, consecutiveMissedSweeps: i === 1 ? 3 : 0, depositedToday: i !== 1 })),
]

const FALLBACK_DRAWS: StoreDraw[] = [
  { spinId: 'd1', category: '500', winningSlot: 3, winnerName: 'Almaz Tadesse', netPayout: 4500, timestamp: '2026-06-15', round: 1 },
  { spinId: 'd2', category: '500', winningSlot: 7, winnerName: 'Henok Desta', netPayout: 4500, timestamp: '2026-06-01', round: 1 },
  { spinId: 'd3', category: '1000', winningSlot: 2, winnerName: 'Sara Tekle', netPayout: 7000, timestamp: '2026-05-20', round: 1 },
  { spinId: 'd4', category: '2000', winningSlot: 1, winnerName: 'Yonas Ayele', netPayout: 10000, timestamp: '2026-05-10', round: 1 },
  { spinId: 'd5', category: '5000', winningSlot: 1, winnerName: 'Hiwot Girma', netPayout: 18000, timestamp: '2026-04-25', round: 1 },
]

const FALLBACK_ROUNDS: RoundData[] = [
  {
    id: 101, name: 'Morning Circle', category: '500', amount: 500, frequency: 'daily',
    people_goal: 10, current_participants: 7, total_rounds: 12, winners_per_spin: 2,
    current_round_number: 3, start_date: null, end_date: null, status: 'active',
    auto_spin_enabled: true, spin_time: '08:00', commission_rate: 10, metadata: null,
    last_auto_draw_at: new Date(Date.now() - 86400000).toISOString(),
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 102, name: 'Evening Savers', category: '1000', amount: 1000, frequency: 'daily',
    people_goal: 8, current_participants: 5, total_rounds: 10, winners_per_spin: 1,
    current_round_number: 2, start_date: null, end_date: null, status: 'active',
    auto_spin_enabled: true, spin_time: '20:00', commission_rate: 10, metadata: null,
    last_auto_draw_at: new Date(Date.now() - 86400000).toISOString(),
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 103, name: 'Big Players', category: '5000', amount: 5000, frequency: 'weekly',
    people_goal: 4, current_participants: 3, total_rounds: 8, winners_per_spin: 1,
    current_round_number: 1, start_date: null, end_date: null, status: 'active',
    auto_spin_enabled: false, spin_time: '12:00', commission_rate: 10, metadata: null,
    last_auto_draw_at: null,
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
  },
]

/* ─── Computed Metrics ─── */

function computeMetrics(
  users: StoreUser[],
  slots: StoreSlot[],
  rounds: RoundData[],
  draws: StoreDraw[],
): StoreMetrics {
  const totalMembers = users.length
  const totalSlots = slots.length
  const activeSlots = slots.filter(s => s.status === 'active').length
  const lienSlots = slots.filter(s => s.status !== 'active').length
  const totalBalance = slots.reduce((sum, s) => sum + s.balance, 0)
  const totalPayouts = draws.reduce((sum, d) => sum + d.netPayout, 0)
  const delinquentSlots = slots.filter(s => s.consecutiveMissedSweeps > 0).length
  const activeRoundsCount = rounds.filter(r => r.status === 'active').length

  const activeSlotsList = slots.filter(s => s.status === 'active')
  const totalPaidBalance = activeSlotsList.reduce((sum, s) => sum + s.balance, 0)
  const totalExpectedBalance = activeSlotsList.reduce((sum, s) => {
    const round = rounds.find(r => r.category === s.category && r.status === 'active')
    const perSlot = round ? (round.amount || parseInt(s.category)) * round.total_rounds : parseInt(s.category) * 30
    return sum + perSlot
  }, 0)

  const paymentCompletionRate = totalExpectedBalance > 0
    ? Math.round((totalPaidBalance / totalExpectedBalance) * 100)
    : 0

  const paidMembers = new Set(
    slots.filter(s => s.balance > 0).map(s => s.userId)
  ).size

  const categoryCounts: Record<string, { count: number; balance: number }> = {}
  for (const slot of slots) {
    if (!categoryCounts[slot.category]) {
      categoryCounts[slot.category] = { count: 0, balance: 0 }
    }
    categoryCounts[slot.category].count++
    categoryCounts[slot.category].balance += slot.balance
  }

  return {
    totalPoolVolume: totalBalance,
    totalActiveCapital: totalPaidBalance,
    totalPaidMembers: paidMembers,
    totalRemainingMembers: totalMembers - paidMembers,
    paymentCompletionRate,
    activeRoundsCount,
    totalMembers,
    totalSlots,
    activeSlots,
    lienSlots,
    delinquentSlots,
    byCategory: Object.entries(categoryCounts).map(([category, data]) => ({
      category,
      count: data.count,
      balance: data.balance,
    })),
  }
}

/* ─── Store Interface ─── */

interface EqubStore {
  rounds: RoundData[]
  categories: CategoryData[]
  users: StoreUser[]
  slots: StoreSlot[]
  draws: StoreDraw[]
  metrics: StoreMetrics
  isLoading: boolean
  error: string | null
  revision: number

  setRounds: (rounds: RoundData[]) => void
  setCategories: (categories: CategoryData[]) => void
  setUsers: (users: StoreUser[]) => void
  setSlots: (slots: StoreSlot[]) => void
  setDraws: (draws: StoreDraw[]) => void

  addRound: (round: RoundData) => void
  updateRound: (id: number, data: Partial<RoundData>) => void
  removeRound: (id: number) => void

  addCategory: (category: CategoryData) => void
  updateCategory: (id: number, data: Partial<CategoryData>) => void
  removeCategory: (id: number) => void

  addSlot: (slot: StoreSlot) => void
  updateSlot: (id: string, data: Partial<StoreSlot>) => void
  removeSlot: (id: string) => void

  recalculate: () => void

  fetchAll: () => Promise<void>
  fetchRounds: () => Promise<void>
  fetchCategories: () => Promise<void>

  demoFillRoundAction: (id: number) => Promise<void>

  createRoundAction: (input: { name: string; category: string; amount: number; frequency: string; people_goal: number; total_rounds: number }) => Promise<void>
  updateRoundAction: (id: number, data: Record<string, unknown>) => Promise<void>
  deleteRoundAction: (id: number) => Promise<void>
  activateRoundAction: (id: number) => Promise<void>
  completeRoundAction: (id: number) => Promise<void>
  cancelRoundAction: (id: number) => Promise<void>

  runShakeDrawAction: (input: ShakeInput) => Promise<ShakeResult>

  createCategoryAction: (input: Record<string, unknown>) => Promise<void>
  updateCategoryAction: (id: number, data: Record<string, unknown>) => Promise<void>
  cascadeCategoryAction: (id: number, data: Record<string, unknown>) => Promise<void>
  deleteCategoryAction: (id: number) => Promise<void>
}

export const useEqubStore = create<EqubStore>((set, get) => {
  const recalculate = () => {
    const state = get()
    const metrics = computeMetrics(state.users, state.slots, state.rounds, state.draws)
    set({ metrics, revision: state.revision + 1 })
  }

  return {
    rounds: FALLBACK_ROUNDS,
    categories: [],
    users: FALLBACK_USERS,
    slots: FALLBACK_SLOTS,
    draws: FALLBACK_DRAWS,
    metrics: computeMetrics(FALLBACK_USERS, FALLBACK_SLOTS, FALLBACK_ROUNDS, FALLBACK_DRAWS),
    isLoading: false,
    error: null,
    revision: 0,

    setRounds: (rounds) => { set({ rounds }); recalculate() },
    setCategories: (categories) => { set({ categories }); recalculate() },
    setUsers: (users) => { set({ users }); recalculate() },
    setSlots: (slots) => { set({ slots }); recalculate() },
    setDraws: (draws) => { set({ draws }); recalculate() },

    addRound: (round) => { set(st => ({ rounds: [...st.rounds, round] })); recalculate() },
    updateRound: (id, data) => {
      set(st => ({
        rounds: st.rounds.map(r => r.id === id ? { ...r, ...data } as RoundData : r),
      }))
      recalculate()
    },
    removeRound: (id) => { set(st => ({ rounds: st.rounds.filter(r => r.id !== id) })); recalculate() },

    addCategory: (category) => { set(st => ({ categories: [...st.categories, category] })); recalculate() },
    updateCategory: (id, data) => {
      set(st => ({
        categories: st.categories.map(c => c.id === id ? { ...c, ...data } as CategoryData : c),
      }))
      recalculate()
    },
    removeCategory: (id) => { set(st => ({ categories: st.categories.filter(c => c.id !== id) })); recalculate() },

    addSlot: (slot) => { set(st => ({ slots: [...st.slots, slot] })); recalculate() },
    updateSlot: (id, data) => {
      set(st => ({
        slots: st.slots.map(s => s.id === id ? { ...s, ...data } : s),
      }))
      recalculate()
    },
    removeSlot: (id) => { set(st => ({ slots: st.slots.filter(s => s.id !== id) })); recalculate() },

    recalculate,

    fetchAll: async () => {
      set({ isLoading: true, error: null })
      try {
        await Promise.all([
          get().fetchRounds(),
          get().fetchCategories(),
        ])
      } catch (e: any) {
        set({ error: e?.message || 'Failed to fetch data' })
      } finally {
        set({ isLoading: false })
      }
    },

    fetchRounds: async () => {
      try {
        const res = await roundsApi.list()
        if (res.rounds) {
          set({ rounds: res.rounds })
          recalculate()
        }
      } catch {
        // Keep fallback data
      }
    },

    fetchCategories: async () => {
      try {
        const res = await api.get<{ categories: CategoryData[] }>('/categories')
        if (res.categories) {
          set({ categories: res.categories })
          recalculate()
        }
      } catch {
        // Keep fallback data
      }
    },

    createRoundAction: async (input) => {
      set({ isLoading: true, error: null })
      try {
        const res = await roundsApi.create(input as any)
        if (res.round) {
          get().addRound(res.round)
        }
      } catch (e: any) {
        set({ error: e?.message || 'Failed to create round' })
        throw e
      } finally {
        set({ isLoading: false })
      }
    },

    updateRoundAction: async (id, data) => {
      set({ isLoading: true, error: null })
      try {
        const res = await roundsApi.update(id, data as any)
        if (res.round) {
          get().updateRound(id, res.round)
        }
      } catch (e: any) {
        set({ error: e?.message || 'Failed to update round' })
        throw e
      } finally {
        set({ isLoading: false })
      }
    },

    deleteRoundAction: async (id) => {
      set({ isLoading: true, error: null })
      try {
        await roundsApi.delete(id)
        get().removeRound(id)
      } catch (e: any) {
        set({ error: e?.message || 'Failed to delete round' })
        throw e
      } finally {
        set({ isLoading: false })
      }
    },

  demoFillRoundAction: async (id: number) => {
    set({ isLoading: true, error: null })
    try {
      const res = await roundsApi.demoFill(id)
      if (res.round) {
        get().updateRound(id, res.round)
      }
    } catch (e: any) {
      set({ error: e?.message || 'Failed to demo-fill round' })
      throw e
    } finally {
      set({ isLoading: false })
    }
  },

  activateRoundAction: async (id) => {
    try {
      const res = await roundsApi.activate(id)
        if (res.round) {
          get().updateRound(id, res.round)
        }
      } catch (e: any) {
        set({ error: e?.message || 'Failed to activate round' })
        throw e
      }
    },

    completeRoundAction: async (id) => {
      try {
        const res = await roundsApi.complete(id)
        if (res.round) {
          get().updateRound(id, res.round)
        }
      } catch (e: any) {
        set({ error: e?.message || 'Failed to complete round' })
        throw e
      }
    },

    cancelRoundAction: async (id) => {
      try {
        const res = await roundsApi.cancel(id)
        if (res.round) {
          get().updateRound(id, res.round)
        }
      } catch (e: any) {
        set({ error: e?.message || 'Failed to cancel round' })
        throw e
      }
    },

    runShakeDrawAction: async (input) => {
      set({ isLoading: true, error: null })
      try {
        const res = await drawApi.shake(input)
        recalculate()
        return res
      } catch (e: any) {
        set({ error: e?.message || 'Shake draw failed' })
        throw e
      } finally {
        set({ isLoading: false })
      }
    },

    createCategoryAction: async (input) => {
      set({ isLoading: true, error: null })
      try {
        const res = await api.post<{ category: CategoryData }>('/admin/categories', input)
        if (res.category) {
          get().addCategory(res.category)
        }
      } catch (e: any) {
        set({ error: e?.message || 'Failed to create category' })
        throw e
      } finally {
        set({ isLoading: false })
      }
    },

    updateCategoryAction: async (id, data) => {
      set({ isLoading: true, error: null })
      try {
        const res = await api.put<{ category: CategoryData }>(`/admin/categories/${id}`, data)
        if (res.category) {
          get().updateCategory(id, res.category)
        }
      } catch (e: any) {
        set({ error: e?.message || 'Failed to update category' })
        throw e
      } finally {
        set({ isLoading: false })
      }
    },

    cascadeCategoryAction: async (id, data) => {
      set({ isLoading: true, error: null })
      try {
        const res = await api.post<{ category: CategoryData }>(`/admin/categories/${id}/cascade`, data)
        if (res.category) {
          get().updateCategory(id, res.category)
          get().fetchRounds()
        }
      } catch (e: any) {
        set({ error: e?.message || 'Failed to cascade category update' })
        throw e
      } finally {
        set({ isLoading: false })
      }
    },

    deleteCategoryAction: async (id) => {
      set({ isLoading: true, error: null })
      try {
        await api.delete(`/admin/categories/${id}`)
        get().removeCategory(id)
      } catch (e: any) {
        set({ error: e?.message || 'Failed to delete category' })
        throw e
      } finally {
        set({ isLoading: false })
      }
    },
  }
})
