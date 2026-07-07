/* ─── Types ─── */

export interface UserModel {
  id: string
  name: string
  phone: string
  password: string
  registrationDate: string
}

export interface SlotModel {
  id: string
  userId: string
  category: string
  slotNumber: number
  status: 'active' | 'lien'
  hasWon: boolean
  dealClosed: boolean
  registrationDate: string
  balance: number
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

export interface DrawRecord {
  round: number
  spinId: string
  timestamp: string
  winningSlot: number
  winnerName: string
  netPayout: number
  category: string
}

export interface SavingsAccount {
  balance: number
  totalDeposits: number
  totalWithdrawn: number
  deposits: Array<{ date: string; amount: number; transRef: string; method: string }>
  withdrawals: Array<{ date: string; amount: number; transRef: string; commission: number; netAmount: number }>
}

export interface PaymentStats {
  total: number
  completed: number
  paidAmount: number
  remaining: number
}

/* ─── Mock Constants ─── */

const USSD_PASSWORD = '123456'

/* ─── Helpers ─── */

export function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

export function generateRef(): string {
  return `TXN${Date.now().toString(36).toUpperCase()}`
}

export function getCategoryDaily(category: string): number {
  const map: Record<string, number> = { '500': 500, '1000': 1000, '2000': 2000, '5000': 5000, 'savings': 0 }
  return map[category] || 500
}

export function formatDate(dateStr: string, lang: 'en' | 'am' = 'en'): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr + 'T00:00:00')
  if (isNaN(d.getTime())) return '-'
  const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const monthsAm = ['ጃን', 'ፌብ', 'ማር', 'ኤፕ', 'ሜይ', 'ጁን', 'ጁላይ', 'ኦገ', 'ሴፕ', 'ኦክቶ', 'ኖቬ', 'ዲሴ']
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const m = lang === 'am' ? monthsAm[d.getMonth()] : monthsEn[d.getMonth()]
  return `${days[d.getDay()]}, ${m} ${d.getDate()}, ${d.getFullYear()}`
}

export function toLocale(n: number): string {
  return (n || 0).toLocaleString()
}

/* ─── Schedule Generation ─── */

export function generateSchedule(category: string, regDate: string): PaymentRecord[] {
  const daily = getCategoryDaily(category)
  if (!regDate) return []
  const start = new Date(regDate + 'T00:00:00')
  if (isNaN(start.getTime())) return []
  const daysInCycle = 30
  const records: PaymentRecord[] = []

  for (let i = 0; i < daysInCycle; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    const dateStr = d.toISOString().split('T')[0]
    const isPast = dateStr < todayStr()
    const isToday = dateStr === todayStr()
    const shouldBePaid = isPast || isToday
    records.push({
      dayIndex: i,
      date: dateStr,
      amount: daily,
      status: shouldBePaid && Math.random() > 0.3 ? 'paid' : 'unpaid',
      transRef: shouldBePaid && Math.random() > 0.3 ? generateRef() : undefined,
      method: shouldBePaid && Math.random() > 0.3 ? 'USSD' : undefined,
    })
  }

  return records
}

export function getPaymentStats(schedule: PaymentRecord[]): PaymentStats {
  const total = schedule.length
  const paid = schedule.filter((p) => p.status === 'paid')
  const completed = paid.length
  const paidAmount = paid.reduce((s, p) => s + p.amount, 0)
  const totalAmount = schedule.reduce((s, p) => s + p.amount, 0)
  return { total, completed, paidAmount, remaining: totalAmount - paidAmount }
}

/* ─── Mock Data ─── */

export const MOCK_USER: UserModel = {
  id: 'MEM-001',
  name: 'Abebe Kebede',
  phone: '0907082821',
  password: '12345678',
  registrationDate: '2026-01-15',
}

export const MOCK_SLOTS: SlotModel[] = [
  { id: 'slot-1', userId: 'MEM-001', category: '500', slotNumber: 1, status: 'active', hasWon: false, dealClosed: false, registrationDate: '2026-01-15', balance: 0 },
]

export const MOCK_SAVINGS: SavingsAccount = {
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

export const MOCK_DRAWS: DrawRecord[] = [
  { round: 1, spinId: 's1', category: '500', winningSlot: 3, winnerName: 'Tigist Haile', netPayout: 4500, timestamp: '2026-06-15' },
]

/* ─── Payment Functions (Mock) ─── */

export function requestWithdrawal(slotId: string, savings: SavingsAccount): { success: boolean; withdrawal?: SavingsAccount['withdrawals'][0]; commission?: number; netAmount?: number; error?: string } {
  if (savings.balance < 100) {
    return { success: false, error: 'Insufficient balance. Minimum withdrawal is 100 ETB.' }
  }

  const maxWithdrawal = savings.balance * 0.8
  if (maxWithdrawal < 100) {
    return { success: false, error: '30-day lock period in effect. Limited withdrawal available.' }
  }

  const amount = Math.min(maxWithdrawal, savings.balance)
  const commission = Math.round(amount * 0.02)
  const netAmount = amount - commission

  return {
    success: true,
    withdrawal: { date: todayStr(), amount, transRef: generateRef(), commission, netAmount },
    commission,
    netAmount,
  }
}

export function payDay(slotId: string, dayIndex: number, schedule: PaymentRecord[]): PaymentRecord[] {
  return schedule.map((p) =>
    p.dayIndex === dayIndex
      ? { ...p, status: 'paid' as const, transRef: generateRef(), method: 'USSD' }
      : p
  )
}

export function payMultiple(slotId: string, dayIndices: number[], schedule: PaymentRecord[]): PaymentRecord[] {
  return schedule.map((p) =>
    dayIndices.includes(p.dayIndex)
      ? { ...p, status: 'paid' as const, transRef: generateRef(), method: 'USSD' }
      : p
  )
}

export function depositToSavings(savings: SavingsAccount, amount: number): SavingsAccount {
  return {
    ...savings,
    balance: savings.balance + amount,
    totalDeposits: savings.totalDeposits + amount,
    deposits: [...savings.deposits, { date: todayStr(), amount, transRef: generateRef(), method: 'USSD' }],
  }
}

export function getUssdPassword(): string {
  return USSD_PASSWORD
}
