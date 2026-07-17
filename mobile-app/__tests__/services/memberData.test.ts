import {
  generateSchedule,
  getPaymentStats,
  requestWithdrawal,
  depositToSavings,
  payDay,
  payMultiple,
  getCategoryDaily,
  todayStr,
  formatDate,
  toLocale,
  MOCK_USER,
  MOCK_DRAWS,
} from '../../src/services/memberData'

describe('memberData', () => {
  describe('getCategoryDaily', () => {
    it('returns correct daily amounts', () => {
      expect(getCategoryDaily('500')).toBe(500)
      expect(getCategoryDaily('1000')).toBe(1000)
      expect(getCategoryDaily('2000')).toBe(2000)
      expect(getCategoryDaily('5000')).toBe(5000)
      expect(getCategoryDaily('savings')).toBe(0)
    })

    it('defaults to 500 for unknown', () => {
      expect(getCategoryDaily('250')).toBe(500)
    })
  })

  describe('todayStr', () => {
    it('returns ISO date string', () => {
      expect(todayStr()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })

  describe('formatDate', () => {
    it('formats date in English', () => {
      const result = formatDate('2026-06-15', 'en')
      expect(result).toContain('Jun')
      expect(result).toContain('15')
    })

    it('formats date in Amharic', () => {
      const result = formatDate('2026-06-15', 'am')
      expect(result).toContain('ጁን')
      expect(result).toContain('15')
    })

    it('returns dash for empty date', () => {
      expect(formatDate('', 'en')).toBe('-')
    })

    it('returns dash for invalid date', () => {
      expect(formatDate('not-a-date', 'en')).toBe('-')
    })
  })

  describe('toLocale', () => {
    it('formats numbers with commas', () => {
      expect(toLocale(1000)).toBe('1,000')
    })

    it('handles zero', () => {
      expect(toLocale(0)).toBe('0')
    })

    it('handles null/undefined', () => {
      expect(toLocale(null as any)).toBe('0')
      expect(toLocale(undefined as any)).toBe('0')
    })
  })

  describe('generateSchedule', () => {
    it('generates 30 payment records for equb categories', () => {
      const schedule = generateSchedule('500', '2026-06-01')
      expect(schedule).toHaveLength(30)
    })

    it('includes correct amount per category', () => {
      const schedule = generateSchedule('2000', '2026-06-01')
      expect(schedule[0].amount).toBe(2000)
    })

    it('returns empty array for savings', () => {
      const schedule = generateSchedule('savings', '2026-06-01')
      expect(schedule).toHaveLength(0)
    })

    it('returns empty array for missing regDate', () => {
      const schedule = generateSchedule('500', '')
      expect(schedule).toHaveLength(0)
    })

    it('generates sequential dayIndices', () => {
      const schedule = generateSchedule('500', '2026-06-01')
      expect(schedule[0].dayIndex).toBe(0)
      expect(schedule[15].dayIndex).toBe(15)
    })
  })

  describe('getPaymentStats', () => {
    it('calculates stats correctly', () => {
      const schedule = [
        { dayIndex: 0, date: '2026-06-01', amount: 500, status: 'paid' as const },
        { dayIndex: 1, date: '2026-06-02', amount: 500, status: 'unpaid' as const },
      ]
      const stats = getPaymentStats(schedule)
      expect(stats.total).toBe(2)
      expect(stats.completed).toBe(1)
      expect(stats.paidAmount).toBe(500)
      expect(stats.remaining).toBe(500)
    })

    it('returns zeros for empty schedule', () => {
      const stats = getPaymentStats([])
      expect(stats.total).toBe(0)
      expect(stats.completed).toBe(0)
      expect(stats.paidAmount).toBe(0)
      expect(stats.remaining).toBe(0)
    })
  })

  describe('requestWithdrawal', () => {
    const baseSavings = {
      balance: 5000,
      totalDeposits: 10000,
      totalWithdrawn: 5000,
      deposits: [],
      withdrawals: [],
    }

    it('returns success when balance is sufficient', () => {
      const result = requestWithdrawal('slot-1', baseSavings)
      expect(result.success).toBe(true)
      expect(result.withdrawal).toBeDefined()
      expect(result.withdrawal!.amount).toBeGreaterThan(0)
    })

    it('charges 2% commission', () => {
      const result = requestWithdrawal('slot-1', baseSavings)
      expect(result.commission).toBe(Math.round(result.withdrawal!.amount * 0.02))
    })

    it('fails when balance is below 100', () => {
      const lowSavings = { ...baseSavings, balance: 50 }
      const result = requestWithdrawal('slot-1', lowSavings)
      expect(result.success).toBe(false)
      expect(result.error).toContain('Insufficient')
    })

    it('limits withdrawal to 80% of balance', () => {
      const result = requestWithdrawal('slot-1', baseSavings)
      expect(result.withdrawal!.amount).toBeLessThanOrEqual(baseSavings.balance * 0.8)
    })
  })

  describe('depositToSavings', () => {
    const baseSavings = {
      balance: 1000,
      totalDeposits: 1000,
      totalWithdrawn: 0,
      deposits: [],
      withdrawals: [],
    }

    it('increases balance', () => {
      const updated = depositToSavings(baseSavings, 500)
      expect(updated.balance).toBe(1500)
    })

    it('increases total deposits', () => {
      const updated = depositToSavings(baseSavings, 500)
      expect(updated.totalDeposits).toBe(1500)
    })

    it('adds a deposit record', () => {
      const updated = depositToSavings(baseSavings, 500)
      expect(updated.deposits).toHaveLength(1)
      expect(updated.deposits[0].amount).toBe(500)
    })
  })

  describe('payDay', () => {
    it('marks the specific day as paid', () => {
      const schedule = [
        { dayIndex: 0, date: '2026-06-01', amount: 500, status: 'unpaid' as const },
        { dayIndex: 1, date: '2026-06-02', amount: 500, status: 'unpaid' as const },
      ]
      const updated = payDay('slot-1', 1, schedule)
      expect(updated[1].status).toBe('paid')
      expect(updated[0].status).toBe('unpaid')
    })

    it('adds transaction reference', () => {
      const schedule = [
        { dayIndex: 0, date: '2026-06-01', amount: 500, status: 'unpaid' as const },
      ]
      const updated = payDay('slot-1', 0, schedule)
      expect(updated[0].transRef).toBeDefined()
    })
  })

  describe('payMultiple', () => {
    it('marks multiple days as paid', () => {
      const schedule = Array.from({ length: 5 }, (_, i) => ({
        dayIndex: i,
        date: `2026-06-${String(i + 1).padStart(2, '0')}`,
        amount: 500,
        status: 'unpaid' as const,
      }))
      const updated = payMultiple('slot-1', [0, 2, 4], schedule)
      expect(updated[0].status).toBe('paid')
      expect(updated[2].status).toBe('paid')
      expect(updated[4].status).toBe('paid')
      expect(updated[1].status).toBe('unpaid')
      expect(updated[3].status).toBe('unpaid')
    })
  })

  describe('Mock data exports', () => {
    it('exports MOCK_USER with expected shape', () => {
      expect(MOCK_USER.id).toBe('MEM-001')
      expect(MOCK_USER.name).toBe('Abebe Kebede')
      expect(MOCK_USER.phone).toBe('0907082821')
    })

    it('exports MOCK_DRAWS with expected shape', () => {
      expect(MOCK_DRAWS).toHaveLength(1)
      expect(MOCK_DRAWS[0].winnerName).toBe('Tigist Haile')
      expect(MOCK_DRAWS[0].netPayout).toBe(4500)
    })
  })
})
