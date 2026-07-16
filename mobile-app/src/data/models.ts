export interface UserModel {
  id: string
  name: string
  phone: string
  password: string
  paymentGateway?: string
  signature?: string
  registrationDate: string
}

export interface SlotModel {
  id: string
  userId: string
  category: string
  slotNumber: number
  balance: number
  status: 'active' | 'lien'
  hasWon: boolean
  dealClosed: boolean
  uniquePaymentCode?: string
  payoutCode?: string
  depositedToday: boolean
  consecutiveMissedSweeps: number
  registrationDate: string
  roundId?: string
  roundNumber?: number
}

export interface PaymentRecord {
  dayIndex: number
  date: string
  amount: number
  status: 'paid' | 'unpaid'
  transRef?: string
  method?: string
}

export interface SlotSchedule {
  slotId: string
  payments: PaymentRecord[]
}

export interface DrawRecordModel {
  round: number
  spinId: string
  timestamp: string
  winningSlot: number
  winnerName: string
  netPayout: number
  category: string
}

export interface SmsLogModel {
  id: string
  recipient: string
  type: string
  message: string
  timestamp: string
}

export interface PaymentLogModel {
  id: string
  userId: string
  userName: string
  amount: number
  status: 'paid' | 'unpaid'
  timestamp: string
  paymentGateway?: string
  transRef?: string
  slotId?: string
}

export interface SavingsAccount {
  balance: number
  totalDeposits: number
  totalWithdrawn: number
  deposits: Array<{ date: string; amount: number; transRef: string; method: string }>
  withdrawals: Array<{ date: string; amount: number; transRef: string; commission: number; netAmount: number }>
}

export interface AppSettings {
  isLocked: boolean
  lastUnlocked?: string
  language: 'en' | 'am'
  firstRunComplete: boolean
  apiToken?: string
  currentSessionUserId?: string
  currentSessionUserRole?: 'member' | 'admin'
  lockPassword?: string
  serverHost?: string
}

export type CollectionName = 'users' | 'slots' | 'schedules' | 'savings' | 'draws' | 'paymentLogs' | 'smsLogs' | 'settings'

export function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

export function generateId(): string {
  return `${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`
}

export function generateRef(): string {
  return `TXN${Date.now().toString(36).toUpperCase()}`
}

export function createUser(overrides?: Partial<UserModel>): UserModel {
  return {
    id: `MEM-${generateId().slice(0, 6)}`,
    name: '',
    phone: '',
    password: '',
    registrationDate: todayStr(),
    ...overrides,
  }
}

export function createSlot(overrides?: Partial<SlotModel>): SlotModel {
  return {
    id: `SLOT-${generateId().slice(0, 6)}`,
    userId: '',
    category: '500',
    slotNumber: 1,
    balance: 0,
    status: 'active',
    hasWon: false,
    dealClosed: false,
    depositedToday: false,
    consecutiveMissedSweeps: 0,
    registrationDate: todayStr(),
    ...overrides,
  }
}

export function createSavingsAccount(overrides?: Partial<SavingsAccount>): SavingsAccount {
  return {
    balance: 0,
    totalDeposits: 0,
    totalWithdrawn: 0,
    deposits: [],
    withdrawals: [],
    ...overrides,
  }
}

export function createSmsLog(recipient: string, type: string, message: string): SmsLogModel {
  return {
    id: `SMS-${generateId().slice(0, 6)}`,
    recipient,
    type,
    message,
    timestamp: new Date().toISOString(),
  }
}

export function createPaymentLog(overrides?: Partial<PaymentLogModel>): PaymentLogModel {
  return {
    id: `LOG-${generateId().slice(0, 6)}`,
    userId: '',
    userName: '',
    amount: 0,
    status: 'unpaid',
    timestamp: new Date().toISOString(),
    ...overrides,
  }
}

export function defaultSettings(): AppSettings {
  return {
    isLocked: false,
    language: 'en',
    firstRunComplete: false,
  }
}
