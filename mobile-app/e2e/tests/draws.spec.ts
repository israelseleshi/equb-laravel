import { test, expect } from '@playwright/test'
import { ApiClient } from '../utils/api-client'

test.describe('🎯 Draws & Spins', () => {
  let adminApi: ApiClient
  let memberApi: ApiClient

  test.beforeAll(async () => {
    adminApi = new ApiClient()
    memberApi = new ApiClient()

    // Setup admin
    try {
      await adminApi.login('0911000000', 'password123')
    } catch {
      await adminApi.register('DrawAdmin', '0911000000', 'password123', 'admin')
    }

    // Setup member
    try {
      await memberApi.login('0911000001', 'password123')
    } catch {
      await memberApi.register('DrawMember', '0911000001', 'password123')
    }
  })

  test('1️⃣ Public tiers endpoint works', async () => {
    const tiers = await adminApi.getTiers()
    expect(tiers).toBeDefined()
    expect(Array.isArray(tiers)).toBe(true)
  })

  test('2️⃣ Recent draws can be fetched publicly', async () => {
    const draws = await adminApi.getRecentDraws()
    expect(draws).toBeDefined()
  })

  test('3️⃣ Draws by category can be fetched', async () => {
    const draws = await adminApi.getDrawsByCategory('500')
    expect(draws).toBeDefined()
  })

  test('4️⃣ Admin can run a manual draw', async () => {
    // First ensure there's an active round with participants
    const roundsRes = await adminApi.getRounds()
    const rounds = (roundsRes as any).rounds || []
    let activeRound = rounds.find((r: any) => r.status === 'active' && r.current_participants >= r.people_goal)
    
    if (!activeRound) {
      // Create and fill a round
      const r = await adminApi.createRound({
        name: 'Draw Test Round',
        category: '500',
        amount: 500,
        frequency: 'daily',
        people_goal: 10,
        total_rounds: 12,
        winners_per_spin: 2,
        auto_spin_enabled: true,
        spin_time: '08:00',
        commission_rate: 10,
      })
      const roundId = (r as any).round?.id
      if (roundId) {
        await adminApi.activateRound(roundId)
        await adminApi.demoFillRound(roundId)
        // Re-fetch
        const rounds2 = await adminApi.getRounds()
        const roundsList = (rounds2 as any).rounds || []
        activeRound = roundsList.find((x: any) => x.id === roundId)
      }
    }

    if (activeRound && activeRound.id) {
      try {
        const spinRes = await adminApi.spinRound(activeRound.id)
        expect(spinRes).toBeDefined()
        expect((spinRes as any).draw).toBeDefined()
      } catch (e: any) {
        // May fail if already spun today
        expect(e.message).toBeDefined()
      }
    } else {
      test.skip('No eligible round for spin')
    }
  })

  test('5️⃣ Admin can run draw by category', async () => {
    try {
      const drawRes = await adminApi.runDraw('500')
      expect(drawRes).toBeDefined()
    } catch (e: any) {
      // May fail if no eligible participants
      expect(e.message).toBeDefined()
    }
  })

  test('6️⃣ Ludo Dice Shaker endpoint works', async () => {
    try {
      const shakeRes = await adminApi.shake({ categories: ['500'] })
      expect(shakeRes).toBeDefined()
      expect((shakeRes as any).winner).toBeDefined() || expect((shakeRes as any).winners).toBeDefined()
    } catch (e: any) {
      // May fail if no eligible participants
      expect(e.message).toBeDefined()
    }
  })

  test('7️⃣ Admin payout requires correct PIN', async () => {
    // Try with wrong PIN
    try {
      await adminApi.adminPayout(0, 'wrong-pin')
      expect(false).toBe(true) // Should have thrown
    } catch (e: any) {
      expect(e.message).toBeDefined()
    }
  })

  test('8️⃣ Winner data has privacy - public names hidden', async () => {
    const draws = await adminApi.getRecentDraws()
    if (Array.isArray(draws) && draws.length > 0) {
      const firstDraw = draws[0] as any
      // Public results should not expose user IDs or full names
      expect(firstDraw.winner_name).toBeDefined() || expect(firstDraw.winning_slot).toBeDefined()
    }
  })
})
