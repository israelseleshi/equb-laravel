import {
  type UserModel,
  type SlotModel,
  type DrawRecordModel,
  type SavingsAccount,
  type SlotSchedule,
  defaultSettings,
  generateRef,
} from '../data/models'
import {
  getAllUsers,
  createUser,
  getAllSlots,
  createSlot,
  getAllSchedules,
  saveSchedule,
  getAllDraws,
  createDraw,
  getAllSavings,
  saveSavings,
  isFirstRun,
  markFirstRunComplete,
  updateSettings,
} from './storage'
import { generateSchedule } from './scheduleService'

const DEMO_USER: UserModel = {
  id: 'MEM-001',
  name: 'Abebe Kebede',
  phone: '0907082821',
  password: '12345678',
  registrationDate: '2026-01-15',
}

const ADMIN_USER: UserModel = {
  id: 'ADMIN-001',
  name: 'Admin',
  phone: '0920190438',
  password: '87654321',
  registrationDate: '2026-01-01',
}

const DEMO_SLOTS: SlotModel[] = [
  { id: 'slot-1', userId: 'MEM-001', category: '500', slotNumber: 1, status: 'active', hasWon: false, dealClosed: false, registrationDate: '2026-01-15', balance: 0, depositedToday: false, consecutiveMissedSweeps: 0 },
]

const DEMO_SCHEDULES: SlotSchedule[] = [
  {
    slotId: 'slot-1',
    payments: [
      { dayIndex: 0, date: '2026-01-15', amount: 500, status: 'paid', transRef: 'TXN-001', method: 'USSD' },
      { dayIndex: 1, date: '2026-01-16', amount: 500, status: 'paid', transRef: 'TXN-002', method: 'USSD' },
      { dayIndex: 2, date: '2026-01-17', amount: 500, status: 'paid', transRef: 'TXN-003', method: 'USSD' },
      { dayIndex: 3, date: '2026-01-18', amount: 500, status: 'paid', transRef: 'TXN-004', method: 'Mobile' },
      { dayIndex: 4, date: '2026-01-19', amount: 500, status: 'paid', transRef: 'TXN-005', method: 'USSD' },
      { dayIndex: 5, date: '2026-01-20', amount: 500, status: 'paid', transRef: 'TXN-006', method: 'USSD' },
      { dayIndex: 6, date: '2026-01-21', amount: 500, status: 'paid', transRef: 'TXN-007', method: 'Mobile' },
      { dayIndex: 7, date: '2026-01-22', amount: 500, status: 'paid', transRef: 'TXN-008', method: 'USSD' },
    ],
  },
]

const DEMO_DRAWS: DrawRecordModel[] = [
  { round: 1, spinId: 's1', category: '500', winningSlot: 3, winnerName: 'Tigist Haile', netPayout: 4500, timestamp: '2026-06-15' },
]

const DEMO_SAVINGS: SavingsAccount = {
  balance: 2450,
  totalDeposits: 5000,
  totalWithdrawn: 2550,
  deposits: [
    { date: '2026-06-01', amount: 100, transRef: 'DEP-001', method: 'USSD' },
    { date: '2026-06-05', amount: 200, transRef: 'DEP-002', method: 'USSD' },
    { date: '2026-06-10', amount: 150, transRef: 'DEP-003', method: 'USSD' },
    { date: '2026-06-15', amount: 100, transRef: 'DEP-004', method: 'USSD' },
    { date: '2026-06-20', amount: 200, transRef: 'DEP-005', method: 'USSD' },
  ],
  withdrawals: [
    { date: '2026-06-25', amount: 1000, transRef: 'WTH-001', commission: 20, netAmount: 980 },
    { date: '2026-06-28', amount: 500, transRef: 'WTH-002', commission: 10, netAmount: 490 },
  ],
}

export async function seedIfFirstRun(): Promise<boolean> {
  try {
    const first = await isFirstRun()
    if (!first) return false

    const existingUsers = await getAllUsers()
    if (existingUsers.length > 0) return false

    await createUser(DEMO_USER)
    await createUser(ADMIN_USER)

    for (const slot of DEMO_SLOTS) {
      await createSlot(slot)
    }

    for (const schedule of DEMO_SCHEDULES) {
      const filled = generateSchedule(
        DEMO_SLOTS.find((s) => s.id === schedule.slotId)?.category ?? '500',
        DEMO_SLOTS.find((s) => s.id === schedule.slotId)?.registrationDate ?? '2026-01-15',
      )
      await saveSchedule({ slotId: schedule.slotId, payments: filled })
    }

    for (const draw of DEMO_DRAWS) {
      await createDraw(draw)
    }

    await saveSavings('slot-1', DEMO_SAVINGS)

    await markFirstRunComplete()

    return true
  } catch {
    return false
  }
}
