import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  getAllUsers,
  getUserById,
  getUserByPhone,
  createUser,
  updateUser,
  deleteUser,
  getAllSlots,
  getSlotsByUser,
  createSlot,
  deleteSlot,
  getAllSchedules,
  saveSchedule,
  getSavings,
  saveSavings,
  getSettings,
  updateSettings,
} from '../../src/services/storage'
import { createUser as createUserFactory, createSlot as createSlotFactory, createSavingsAccount, todayStr } from '../../src/data/models'

describe('storage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear()
  })

  describe('User CRUD', () => {
    const mockUser = {
      id: 'MEM-001',
      name: 'Abebe Kebede',
      phone: '0911111111',
      password: 'password123',
      registrationDate: '2026-06-01',
    }

    it('creates a user', async () => {
      const created = await createUser(mockUser)
      expect(created).toEqual(mockUser)
    })

    it('retrieves all users', async () => {
      await createUser(mockUser)
      await createUser({ ...mockUser, id: 'MEM-002', phone: '0922222222' })
      const users = await getAllUsers()
      expect(users).toHaveLength(2)
    })

    it('gets user by ID', async () => {
      await createUser(mockUser)
      const found = await getUserById('MEM-001')
      expect(found).not.toBeNull()
      expect(found!.name).toBe('Abebe Kebede')
    })

    it('returns null for non-existent user ID', async () => {
      const found = await getUserById('NON-EXISTENT')
      expect(found).toBeNull()
    })

    it('gets user by phone', async () => {
      await createUser(mockUser)
      const found = await getUserByPhone('0911111111')
      expect(found).not.toBeNull()
      expect(found!.id).toBe('MEM-001')
    })

    it('returns null for non-existent phone', async () => {
      const found = await getUserByPhone('0000000000')
      expect(found).toBeNull()
    })

    it('updates a user', async () => {
      await createUser(mockUser)
      const updated = await updateUser('MEM-001', { name: 'Abebe New Name' })
      expect(updated).not.toBeNull()
      expect(updated!.name).toBe('Abebe New Name')
    })

    it('returns null when updating non-existent user', async () => {
      const result = await updateUser('NON-EXISTENT', { name: 'Test' })
      expect(result).toBeNull()
    })

    it('deletes a user', async () => {
      await createUser(mockUser)
      const deleted = await deleteUser('MEM-001')
      expect(deleted).toBe(true)
      const users = await getAllUsers()
      expect(users).toHaveLength(0)
    })

    it('returns false when deleting non-existent user', async () => {
      const result = await deleteUser('NON-EXISTENT')
      expect(result).toBe(false)
    })
  })

  describe('Slot CRUD', () => {
    const mockSlot = {
      id: 'SLOT-001',
      userId: 'MEM-001',
      category: '500',
      slotNumber: 1,
      balance: 0,
      status: 'active' as const,
      hasWon: false,
      dealClosed: false,
      depositedToday: false,
      consecutiveMissedSweeps: 0,
      registrationDate: '2026-06-01',
    }

    it('creates a slot', async () => {
      const created = await createSlot(mockSlot)
      expect(created).toEqual(mockSlot)
    })

    it('retrieves all slots', async () => {
      await createSlot(mockSlot)
      await createSlot({ ...mockSlot, id: 'SLOT-002', slotNumber: 2 })
      const slots = await getAllSlots()
      expect(slots).toHaveLength(2)
    })

    it('gets slots by user ID', async () => {
      await createSlot(mockSlot)
      await createSlot({ ...mockSlot, id: 'SLOT-003', userId: 'MEM-002' })
      const userSlots = await getSlotsByUser('MEM-001')
      expect(userSlots).toHaveLength(1)
      expect(userSlots[0].id).toBe('SLOT-001')
    })

    it('deletes a slot', async () => {
      await createSlot(mockSlot)
      const deleted = await deleteSlot('SLOT-001')
      expect(deleted).toBe(true)
      const slots = await getAllSlots()
      expect(slots).toHaveLength(0)
    })
  })

  describe('Schedule CRUD', () => {
    it('saves and retrieves schedule', async () => {
      const schedule = {
        slotId: 'SLOT-001',
        payments: [
          { dayIndex: 0, date: '2026-06-01', amount: 500, status: 'paid' as const, transRef: 'TXN-001' },
          { dayIndex: 1, date: '2026-06-02', amount: 500, status: 'unpaid' as const },
        ],
      }
      await saveSchedule(schedule)
      const allSchedules = await getAllSchedules()
      expect(allSchedules).toHaveLength(1)
      expect(allSchedules[0].slotId).toBe('SLOT-001')
      expect(allSchedules[0].payments).toHaveLength(2)
    })
  })

  describe('Savings CRUD', () => {
    it('saves and retrieves savings', async () => {
      const savings = {
        balance: 1000,
        totalDeposits: 1000,
        totalWithdrawn: 0,
        deposits: [{ date: '2026-06-01', amount: 500, transRef: 'DEP-001', method: 'USSD' }],
        withdrawals: [],
      }
      await saveSavings('SLOT-001', savings)
      const retrieved = await getSavings('SLOT-001')
      expect(retrieved).not.toBeNull()
      expect(retrieved!.balance).toBe(1000)
    })

    it('returns null for non-existent savings', async () => {
      const retrieved = await getSavings('NON-EXISTENT')
      expect(retrieved).toBeNull()
    })
  })

  describe('Settings', () => {
    it('saves and retrieves settings', async () => {
      await updateSettings({ language: 'am', isLocked: true })
      const settings = await getSettings()
      expect(settings.language).toBe('am')
      expect(settings.isLocked).toBe(true)
    })

    it('merges settings with defaults', async () => {
      await updateSettings({ language: 'am' })
      const settings = await getSettings()
      expect(settings.language).toBe('am')
      expect(settings.firstRunComplete).toBeDefined()
    })
  })
})
