import { api, roundsApi, adminApi, memberApi, setToken, getToken, setServerHost } from '../../src/services/api'

// Mock global fetch using globalThis (compatible with all environments)
globalThis.fetch = jest.fn() as any

// Helper: tracks call count to handle resolveBase probe (first call always fails)
let fetchCallCount = 0

function mockFetchSuccess(data: any) {
  fetchCallCount = 0
  ;(globalThis.fetch as jest.Mock).mockImplementation(async (url: string) => {
    fetchCallCount++
    // First call: resolveBase probes production API - make it fail
    if (fetchCallCount === 1 && !url.includes('localhost')) {
      throw new Error('Network request failed')
    }
    // Subsequent calls: actual API
    return {
      ok: true,
      json: async () => data,
    }
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  setToken(null)
  setServerHost('')
  fetchCallCount = 0
})

describe('setToken / getToken', () => {
  it('setToken stores the token', () => {
    setToken('test-token-123')
    expect(getToken()).toBe('test-token-123')
  })

  it('setToken(null) clears token', () => {
    setToken('test-token')
    setToken(null)
    expect(getToken()).toBeNull()
  })
})

describe('HTTP Methods', () => {
  it('GET sends request to correct endpoint', async () => {
    mockFetchSuccess({ data: 'test' })
    await api.get('/test')
    const calls = (globalThis.fetch as jest.Mock).mock.calls
    // Last call should contain /test
    const lastCallUrl = calls[calls.length - 1][0]
    expect(lastCallUrl).toContain('/test')
  })

  it('GET includes Authorization header when token is set', async () => {
    setToken('bearer-token')
    mockFetchSuccess({ data: 'test' })
    await api.get('/secure')
    const calls = (globalThis.fetch as jest.Mock).mock.calls
    const lastCall = calls[calls.length - 1]
    expect(lastCall[1].headers['Authorization']).toBe('Bearer bearer-token')
  })

  it('POST sends JSON body', async () => {
    mockFetchSuccess({ data: 'test' })
    await api.post('/create', { name: 'Test' })
    const calls = (globalThis.fetch as jest.Mock).mock.calls
    const lastCall = calls[calls.length - 1]
    expect(lastCall[1].method).toBe('POST')
    expect(JSON.parse(lastCall[1].body)).toEqual({ name: 'Test' })
  })

  it('PUT sends method and body', async () => {
    mockFetchSuccess({ data: 'test' })
    await api.put('/update/1', { name: 'Updated' })
    const calls = (globalThis.fetch as jest.Mock).mock.calls
    const lastCall = calls[calls.length - 1]
    expect(lastCall[1].method).toBe('PUT')
  })

  it('DELETE sends method', async () => {
    mockFetchSuccess({ data: 'test' })
    await api.delete('/remove/1')
    const calls = (globalThis.fetch as jest.Mock).mock.calls
    const lastCall = calls[calls.length - 1]
    expect(lastCall[1].method).toBe('DELETE')
  })
})

describe('Error Handling', () => {
  it('throws error with message from response body', async () => {
    ;(globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'Custom error' }),
    })
    await expect(api.get('/error')).rejects.toThrow('Custom error')
  })

  it('throws generic message when no error body', async () => {
    ;(globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({}),
    })
    await expect(api.get('/error')).rejects.toThrow('Request failed')
  })
})

describe('adminApi', () => {
  it('stats returns admin stats', async () => {
    mockFetchSuccess({
      total_users: 10,
      total_slots: 20,
      active_slots: 18,
      lien_slots: 2,
      total_balance: 50000,
      total_payouts: 10000,
      delinquent_slots: 1,
      slots_by_category: [],
      active_rounds: 3,
      total_rounds: 5,
    })
    const stats = await adminApi.stats()
    expect(stats.total_users).toBe(10)
    expect(stats.total_slots).toBe(20)
  })

  it('members sends search params', async () => {
    mockFetchSuccess({ members: { data: [], current_page: 1, last_page: 1, total: 0 } })
    await adminApi.members({ search: 'abebe' })
    const calls = (globalThis.fetch as jest.Mock).mock.calls
    const lastUrl = calls[calls.length - 1][0]
    expect(lastUrl).toContain('/admin/members')
    expect(lastUrl).toContain('search=abebe')
  })

  it('winners returns paginated winners', async () => {
    mockFetchSuccess({ winners: { data: [], current_page: 1, last_page: 1, total: 0 } })
    const res = await adminApi.winners()
    expect(res.winners.data).toEqual([])
  })

  it('payments returns paginated payments', async () => {
    mockFetchSuccess({ payments: { data: [], current_page: 1, last_page: 1, total: 0 } })
    const res = await adminApi.payments()
    expect(res.payments.data).toEqual([])
  })

  it('payout sends draw_id and password', async () => {
    mockFetchSuccess({ message: 'Payout successful', draw: { id: 1 } })
    await adminApi.payout(1, '123456')
    const calls = (globalThis.fetch as jest.Mock).mock.calls
    const body = JSON.parse(calls[calls.length - 1][1].body)
    expect(body.draw_id).toBe(1)
    expect(body.password).toBe('123456')
  })

  it('runDraw sends category', async () => {
    mockFetchSuccess({ draw: { id: 1, category: '500' } })
    await adminApi.runDraw('500')
    const calls = (globalThis.fetch as jest.Mock).mock.calls
    const body = JSON.parse(calls[calls.length - 1][1].body)
    expect(body.category).toBe('500')
  })

  it('promos returns promo list', async () => {
    mockFetchSuccess({ promo_codes: [{ id: 1, code: 'TEST' }] })
    const res = await adminApi.promos()
    expect(res.promo_codes).toHaveLength(1)
  })

  it('promosStats returns stats object', async () => {
    mockFetchSuccess({ total_brokers: 5, active_brokers: 3, total_registrations: 50, total_paid_out: 10000, registrations_today: 2 })
    const stats = await adminApi.promosStats()
    expect(stats.total_brokers).toBe(5)
  })
})

describe('memberApi', () => {
  it('payments fetches schedule for slot', async () => {
    mockFetchSuccess({ payments: [{ id: 1, day_index: 0, date: '2026-06-01', amount: 500, status: 'unpaid' }], slot: {} })
    const res = await memberApi.payments(1)
    expect(res.payments).toHaveLength(1)
    expect(res.payments[0].amount).toBe(500)
  })

  it('payDay sends slot_id and day_index', async () => {
    mockFetchSuccess({ payment: { id: 1, status: 'paid' } })
    await memberApi.payDay(1, 5)
    const calls = (globalThis.fetch as jest.Mock).mock.calls
    const body = JSON.parse(calls[calls.length - 1][1].body)
    expect(body.slot_id).toBe(1)
    expect(body.day_index).toBe(5)
  })

  it('payMultiple sends slot_id and day_indices', async () => {
    mockFetchSuccess({ payments: [] })
    await memberApi.payMultiple(1, [1, 3, 5])
    const calls = (globalThis.fetch as jest.Mock).mock.calls
    const body = JSON.parse(calls[calls.length - 1][1].body)
    expect(body.day_indices).toEqual([1, 3, 5])
  })

  it('savings returns balance and transactions', async () => {
    mockFetchSuccess({ balance: 2500, total_deposits: 3000, total_withdrawn: 500, deposits: [], withdrawals: [] })
    const savings = await memberApi.savings(1)
    expect(savings.balance).toBe(2500)
  })

  it('deposit sends slot_id and amount', async () => {
    mockFetchSuccess({ transaction: { id: 1, amount: 500 } })
    await memberApi.deposit(1, 500)
    const calls = (globalThis.fetch as jest.Mock).mock.calls
    const body = JSON.parse(calls[calls.length - 1][1].body)
    expect(body.amount).toBe(500)
  })

  it('withdraw sends slot_id', async () => {
    mockFetchSuccess({ success: true, transaction: { id: 1 }, commission: 10, net_amount: 490 })
    await memberApi.withdraw(1)
    const calls = (globalThis.fetch as jest.Mock).mock.calls
    const body = JSON.parse(calls[calls.length - 1][1].body)
    expect(body.slot_id).toBe(1)
  })
})

describe('roundsApi', () => {
  it('list fetches rounds', async () => {
    mockFetchSuccess({ rounds: [{ id: 1 }] })
    const res = await roundsApi.list()
    expect(res.rounds).toHaveLength(1)
  })

  it('list with params builds query string', async () => {
    mockFetchSuccess({ rounds: [] })
    await roundsApi.list({ status: 'active' })
    const calls = (globalThis.fetch as jest.Mock).mock.calls
    const lastUrl = calls[calls.length - 1][0]
    expect(lastUrl).toContain('status=active')
  })

  it('create sends POST with round data', async () => {
    mockFetchSuccess({ round: { id: 1 } })
    await roundsApi.create({ name: 'Test', category: '500', amount: 500, frequency: 'daily', people_goal: 10, total_rounds: 12 })
    const calls = (globalThis.fetch as jest.Mock).mock.calls
    expect(calls[calls.length - 1][1].method).toBe('POST')
  })

  it('activate sends POST', async () => {
    mockFetchSuccess({ round: { id: 1, status: 'active' } })
    const res = await roundsApi.activate(1)
    expect(res.round.status).toBe('active')
  })

  it('spin sends POST', async () => {
    mockFetchSuccess({ draw: {}, round: { id: 1 } })
    const res = await roundsApi.spin(1)
    expect(res.round.id).toBe(1)
  })

  it('delete sends DELETE', async () => {
    mockFetchSuccess({ message: 'Deleted' })
    await roundsApi.delete(1)
    const calls = (globalThis.fetch as jest.Mock).mock.calls
    expect(calls[calls.length - 1][1].method).toBe('DELETE')
  })
})
