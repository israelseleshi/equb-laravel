import { type PaymentRecord, type SlotModel, todayStr, generateRef } from '../data/models'

export function generateSchedule(category: string, regDate: string, existingPaidDays?: PaymentRecord[]): PaymentRecord[] {
  const daily = getCategoryDaily(category)
  if (daily === 0) return []

  const start = regDate ? new Date(regDate + 'T00:00:00') : new Date()
  if (isNaN(start.getTime())) return []
  const daysInCycle = 30
  const paidMap = new Map<string, PaymentRecord>()

  if (existingPaidDays) {
    for (const p of existingPaidDays) {
      if (p.status === 'paid') {
        paidMap.set(p.date, p)
      }
    }
  }

  const records: PaymentRecord[] = []

  for (let i = 0; i < daysInCycle; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    const dateStr = d.toISOString().split('T')[0]

    const existing = paidMap.get(dateStr)
    if (existing) {
      records.push({ ...existing })
      continue
    }

    const isPast = dateStr < todayStr()
    const isToday = dateStr === todayStr()

    records.push({
      dayIndex: i,
      date: dateStr,
      amount: daily,
      status: isPast ? 'unpaid' : 'unpaid',
    })
  }

  return records
}

export function payDay(dayIndex: number, schedule: PaymentRecord[]): PaymentRecord[] {
  return schedule.map((p) =>
    p.dayIndex === dayIndex
      ? { ...p, status: 'paid' as const, transRef: p.transRef || generateRef(), method: p.method || 'USSD' }
      : p,
  )
}

export function payMultiple(dayIndices: number[], schedule: PaymentRecord[]): PaymentRecord[] {
  const indices = new Set(dayIndices)
  return schedule.map((p) =>
    indices.has(p.dayIndex)
      ? { ...p, status: 'paid' as const, transRef: p.transRef || generateRef(), method: p.method || 'USSD' }
      : p,
  )
}

export interface PaymentStats {
  total: number
  completed: number
  paidAmount: number
  remaining: number
}

export function getPaymentStats(schedule: PaymentRecord[]): PaymentStats {
  const total = schedule.length
  const paid = schedule.filter((p) => p.status === 'paid')
  const completed = paid.length
  const paidAmount = paid.reduce((s, p) => s + p.amount, 0)
  const totalAmount = schedule.reduce((s, p) => s + p.amount, 0)
  return { total, completed, paidAmount, remaining: totalAmount - paidAmount }
}

export function getDaysRemaining(schedule: PaymentRecord[]): number {
  return schedule.filter((p) => p.status === 'unpaid').length
}

export function getCategoryDaily(category: string): number {
  const map: Record<string, number> = { '500': 500, '1000': 1000, '2000': 2000, '5000': 5000, 'savings': 0 }
  return map[category] ?? 500
}
