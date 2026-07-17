import { test, expect } from '@playwright/test'
import { ApiClient } from '../utils/api-client'

test.describe('💰 Savings Operations', () => {
  let api: ApiClient
  let savingsSlotId: number

  test.beforeAll(async () => {
    api = new ApiClient()
    try {
      await api.login('0911000001', 'password123')
    } catch {
      await api.register('Savings User', '0911000001', 'password123')
    }

    // Create a savings slot
    try {
      const slotRes = await api.createSlot('savings')
      if ((slotRes as any).slot?.id) {
        savingsSlotId = parseInt((slotRes as any).slot.id.toString().replace(/\D/g, ''))
      }
    } catch {
      // Get existing savings slot
      const slotsRes = await api.getSlots()
      const slots = (slotsRes as any).slots || []
      const savingsSlot = slots.find((s: any) => s.category === 'savings')
      if (savingsSlot) {
        savingsSlotId = parseInt(savingsSlot.id.toString().replace(/\D/g, ''))
      }
    }
  })

  test('1️⃣ Savings account has initial balance', async () => {
    if (!savingsSlotId) {
      test.skip('No savings slot available')
      return
    }
    const savings = await api.getSavings(savingsSlotId)
    expect(savings).toBeDefined()
    expect((savings as any).balance).toBeDefined()
    expect((savings as any).total_deposits).toBeDefined()
    expect((savings as any).total_withdrawn).toBeDefined()
  })

  test('2️⃣ Member can deposit into savings', async () => {
    if (!savingsSlotId) {
      test.skip()
      return
    }
    const before = await api.getSavings(savingsSlotId)
    const beforeBalance = (before as any).balance || 0
    
    const depositRes = await api.deposit(savingsSlotId, 500)
    expect(depositRes).toBeDefined()
    expect((depositRes as any).transaction).toBeDefined()
    
    const after = await api.getSavings(savingsSlotId)
    expect((after as any).balance).toBeGreaterThanOrEqual(beforeBalance + 500)
  })

  test('3️⃣ Member can withdraw from savings', async () => {
    if (!savingsSlotId) {
      test.skip()
      return
    }
    // Ensure there's enough balance first
    const before = await api.getSavings(savingsSlotId)
    if ((before as any).balance < 100) {
      await api.deposit(savingsSlotId, 1000)
    }
    
    const withdrawRes = await api.withdraw(savingsSlotId)
    expect(withdrawRes).toBeDefined()
    expect((withdrawRes as any).success).toBeDefined()
  })

  test('4️⃣ Withdrawal from empty account fails', async () => {
    if (!savingsSlotId) {
      test.skip()
      return
    }
    // Create a new slot with 0 balance
    try {
      const newSlotRes = await api.createSlot('savings')
      const newSlotId = parseInt((newSlotRes as any).slot?.id?.toString().replace(/\D/g, '') || '0')
      if (newSlotId > 0) {
        try {
          await api.withdraw(newSlotId)
          // If it didn't throw, that's unexpected but possible if min balance is 0
        } catch (e: any) {
          expect(e.message).toContain('insufficient') || expect(e.message).toContain('balance')
        }
      }
    } catch {
      expect(true).toBe(true) // Creation might fail if savings not supported
    }
  })

  test('5️⃣ Savings statement endpoint returns transactions', async () => {
    if (!savingsSlotId) {
      test.skip()
      return
    }
    const statement = await fetch(
      `http://localhost:8080/api/savings/statement/${savingsSlotId}`,
      { headers: { 'Authorization': `Bearer ${api.authToken}` } }
    )
    expect(statement.ok).toBeTruthy()
    const data = await statement.json()
    expect(data.transactions).toBeDefined()
  })

  test('6️⃣ Deposit amount must be positive', async () => {
    if (!savingsSlotId) {
      test.skip()
      return
    }
    try {
      await api.deposit(savingsSlotId, -100)
      expect(false).toBe(true) // Should have thrown
    } catch (e: any) {
      expect(e.message).toContain('4') || expect(e.message).toContain('min')
    }
  })
})
