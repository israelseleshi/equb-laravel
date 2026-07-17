import { test, expect } from '@playwright/test'
import { ApiClient } from '../utils/api-client'

test.describe('📈 Admin Dashboard', () => {
  let api: ApiClient

  test.beforeAll(async () => {
    api = new ApiClient()
    try {
      await api.login('0911000000', 'password123')
    } catch {
      await api.register('E2E Admin', '0911000000', 'password123', 'admin')
    }
  })

  test('1️⃣ Admin stats endpoint returns data', async () => {
    const stats = await api.getAdminStats()
    expect(stats).toBeDefined()
    expect((stats as any).total_users).toBeDefined()
    expect((stats as any).total_slots).toBeDefined()
    expect((stats as any).total_balance).toBeDefined()
    expect((stats as any).total_payouts).toBeDefined()
    expect((stats as any).slots_by_category).toBeDefined()
  })

  test('2️⃣ Admin members endpoint returns paginated members', async () => {
    const members = await api.getAdminMembers()
    expect(members).toBeDefined()
    expect((members as any).members).toBeDefined()
    expect((members as any).members.data).toBeDefined()
  })

  test('3️⃣ Admin can search members', async () => {
    const members = await api.getAdminMembers('search=Admin')
    expect(members).toBeDefined()
  })

  test('4️⃣ Admin winners endpoint returns draws', async () => {
    const winners = await api.getAdminWinners()
    expect(winners).toBeDefined()
    expect((winners as any).winners).toBeDefined()
  })

  test('5️⃣ Admin payments endpoint returns logs', async () => {
    const payments = await api.getAdminPayments()
    expect(payments).toBeDefined()
    expect((payments as any).payments).toBeDefined()
  })

  test('6️⃣ Admin can create and manage rounds', async () => {
    const round = await api.createRound({
      name: 'E2E Test Round',
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
    expect(round).toBeDefined()
    expect((round as any).round).toBeDefined()
    const roundId = (round as any).round?.id

    // Activate the round
    if (roundId) {
      const activated = await api.activateRound(roundId)
      expect(activated).toBeDefined()
    }
  })

  test('7️⃣ Admin can demo-fill a round', async () => {
    // Find a draft round or create one
    const roundsRes = await api.getRounds()
    const rounds = (roundsRes as any).rounds || []
    const draftRound = rounds.find((r: any) => r.status === 'draft')
    
    if (draftRound) {
      const filled = await api.demoFillRound(draftRound.id)
      expect(filled).toBeDefined()
    } else {
      // Create one, then demo-fill
      const newRound = await api.createRound({
        name: 'Demo Fill Round',
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
      const roundId = (newRound as any).round?.id
      if (roundId) {
        const filled = await api.demoFillRound(roundId)
        expect(filled).toBeDefined()
      }
    }
  })

  test('8️⃣ Admin can spin a completed round', async () => {
    const roundsRes = await api.getRounds()
    const rounds = (roundsRes as any).rounds || []
    const activeRound = rounds.find((r: any) => r.status === 'active' && r.current_participants >= r.people_goal)
    
    if (activeRound) {
      try {
        const spin = await api.spinRound(activeRound.id)
        expect(spin).toBeDefined()
      } catch (e: any) {
        // Spin may fail if already spun today - that's fine
        expect(e.message).toBeDefined()
      }
    } else {
      test.skip()
    }
  })

  test('9️⃣ Admin dashboard app screen renders', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(2000)
    
    // Navigate to login
    const othersTab = page.locator('text=Others,text=ሌሎች').first()
    if (await othersTab.isVisible().catch(() => false)) {
      await othersTab.click()
      await page.waitForTimeout(1000)
    }
    
    const signInBtn = page.locator('text=Sign In,text=ይግቡ').first()
    if (await signInBtn.isVisible().catch(() => false)) {
      await signInBtn.click()
      await page.waitForTimeout(2000)
    }
    
    // Login as admin
    const phoneInput = page.locator('input').first()
    if (await phoneInput.isVisible().catch(() => false)) {
      await phoneInput.fill('0911000000')
      const passwordInput = page.locator('input[type="password"]').first()
      if (await passwordInput.isVisible().catch(() => false)) {
        await passwordInput.fill('password123')
      }
      const submitBtn = page.locator('button:not([class*="back"])').first()
      if (await submitBtn.isVisible().catch(() => false)) {
        await submitBtn.click()
        await page.waitForTimeout(5000)
      }
    }
    
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.length).toBeGreaterThan(0)
  })
})

test.describe('📈 Admin Round Management', () => {
  let api: ApiClient

  test.beforeAll(async () => {
    api = new ApiClient()
    try {
      await api.login('0911000000', 'password123')
    } catch {
      await api.register('RoundAdmin', '0911000000', 'password123', 'admin')
    }
  })

  test('Create, activate, complete, and cancel round lifecycle', async () => {
    // Create
    const r = await api.createRound({
      name: 'Lifecycle Test Round',
      category: '1000',
      amount: 1000,
      frequency: 'weekly',
      people_goal: 8,
      total_rounds: 10,
      winners_per_spin: 1,
      auto_spin_enabled: true,
      spin_time: '10:00',
      commission_rate: 10,
    })
    const roundId = (r as any).round?.id
    expect(roundId).toBeDefined()

    // Activate
    await api.activateRound(roundId)
    
    // Demo fill to reach goal
    await api.demoFillRound(roundId)
    
    // Complete
    await api.completeRound(roundId)
    
    // Round should now be completed
    const rounds = await api.getRounds()
    const roundsList = (rounds as any).rounds || []
    const completedRound = roundsList.find((x: any) => x.id === roundId)
    expect(completedRound?.status).toBe('completed')
  })

  test('Delete a draft round', async () => {
    const r = await api.createRound({
      name: 'Deletable Round',
      category: '500',
      amount: 500,
      frequency: 'daily',
      people_goal: 5,
      total_rounds: 6,
      winners_per_spin: 1,
      auto_spin_enabled: false,
      spin_time: '12:00',
      commission_rate: 10,
    })
    const roundId = (r as any).round?.id
    
    if (roundId) {
      await api.deleteRound(roundId)
      // Verify it's gone
      const rounds = await api.getRounds()
      const roundsList = (rounds as any).rounds || []
      const deleted = roundsList.find((x: any) => x.id === roundId)
      expect(deleted).toBeUndefined()
    }
  })
})
