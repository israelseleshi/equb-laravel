const API_BASE = 'http://localhost:8080/api'

export class ApiClient {
  private token: string | null = null
  private role: string | null = null
  private userId: number | null = null

  constructor() {}

  get authToken() { return this.token }
  get userRole() { return this.role }
  get userIdentifier() { return this.userId }

  async register(name: string, phone: string, password: string, role?: string) {
    const res = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        phone,
        password,
        password_confirmation: password,
        ...(role ? { role } : {}),
      }),
    })
    if (res.ok) {
      const data = await res.json()
      this.token = data.token
      this.role = data.role || role || 'member'
      return data
    }
    throw new Error(`Register failed: ${res.status} ${await res.text()}`)
  }

  async login(phone: string, password: string) {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password }),
    })
    if (res.ok) {
      const data = await res.json()
      this.token = data.token
      this.role = data.role || 'member'
      this.userId = data.user?.id
      return data
    }
    throw new Error(`Login failed: ${res.status} ${await res.text()}`)
  }

  async registerAndLoginAsAdmin() {
    try {
      const loginRes = await this.login('0911000000', 'password123')
      if (loginRes) return loginRes
    } catch {
      const regRes = await this.register('Admin User', '0911000000', 'password123', 'admin')
      return regRes
    }
  }

  async registerAndLoginAsMember(phone = '0911000001', name = 'Test Member') {
    try {
      const loginRes = await this.login(phone, 'password123')
      if (loginRes) return loginRes
    } catch {
      const regRes = await this.register(name, phone, 'password123')
      return regRes
    }
  }

  private async authFetch(endpoint: string, options: RequestInit = {}) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }
    const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`API ${endpoint} failed: ${res.status} ${body}`)
    }
    return res.json()
  }

  // ─── Auth ───
  async getMe() { return this.authFetch('/me') }
  async logout() { return this.authFetch('/logout', { method: 'POST' }) }
  async updateProfile(data: Record<string, unknown>) { return this.authFetch('/profile', { method: 'PUT', body: JSON.stringify(data) }) }

  // ─── Slots ───
  async getSlots() { return this.authFetch('/slots') }
  async createSlot(category: string) { return this.authFetch('/slots', { method: 'POST', body: JSON.stringify({ category }) }) }

  // ─── Payments ───
  async getPayments(slotId: number) { return this.authFetch(`/payments/${slotId}`) }
  async payDay(slotId: number, dayIndex: number) { return this.authFetch('/payments/pay', { method: 'POST', body: JSON.stringify({ slot_id: slotId, day_index: dayIndex }) }) }
  async payMultiple(slotId: number, dayIndices: number[]) { return this.authFetch('/payments/pay-multiple', { method: 'POST', body: JSON.stringify({ slot_id: slotId, day_indices: dayIndices }) }) }

  // ─── Savings ───
  async getSavings(slotId: number) { return this.authFetch(`/savings/${slotId}`) }
  async deposit(slotId: number, amount: number) { return this.authFetch('/savings/deposit', { method: 'POST', body: JSON.stringify({ slot_id: slotId, amount }) }) }
  async withdraw(slotId: number) { return this.authFetch('/savings/withdraw', { method: 'POST', body: JSON.stringify({ slot_id: slotId }) }) }

  // ─── Rounds ───
  async getRounds(params?: Record<string, string>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : ''
    return this.authFetch(`/rounds${query}`)
  }
  async createRound(data: Record<string, unknown>) { return this.authFetch('/admin/rounds', { method: 'POST', body: JSON.stringify(data) }) }
  async activateRound(id: number) { return this.authFetch(`/admin/rounds/${id}/activate`, { method: 'POST' }) }
  async completeRound(id: number) { return this.authFetch(`/admin/rounds/${id}/complete`, { method: 'POST' }) }
  async cancelRound(id: number) { return this.authFetch(`/admin/rounds/${id}/cancel`, { method: 'POST' }) }
  async deleteRound(id: number) { return this.authFetch(`/admin/rounds/${id}`, { method: 'DELETE' }) }
  async demoFillRound(id: number) { return this.authFetch(`/admin/rounds/${id}/demo-fill`, { method: 'POST' }) }
  async enrollInRound(id: number) { return this.authFetch(`/rounds/${id}/enroll`, { method: 'POST', body: JSON.stringify({ user_id: this.userId }) }) }
  async spinRound(id: number) { return this.authFetch(`/admin/rounds/${id}/spin`, { method: 'POST' }) }

  // ─── Draws ───
  async getTiers() { return fetch(`${API_BASE}/tiers`).then(r => r.json()) }
  async getRecentDraws() { return fetch(`${API_BASE}/draws/recent`).then(r => r.json()) }
  async getDrawsByCategory(category: string) { return fetch(`${API_BASE}/draws/${category}`).then(r => r.json()) }
  async runDraw(category: string) { return this.authFetch('/admin/draw', { method: 'POST', body: JSON.stringify({ category }) }) }
  async shake(input: Record<string, unknown>) { return this.authFetch('/admin/draw/shake', { method: 'POST', body: JSON.stringify(input) }) }

  // ─── Promo ───
  async getPromos() { return this.authFetch('/admin/promos') }
  async createPromo(data: Record<string, unknown>) { return this.authFetch('/admin/promos', { method: 'POST', body: JSON.stringify(data) }) }
  async validatePromo(code: string) { return fetch(`${API_BASE}/promo/validate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) }).then(r => r.json()) }

  // ─── Admin ───
  async getAdminStats() { return this.authFetch('/admin/stats') }
  async getAdminMembers(params?: string) { return this.authFetch(`/admin/members${params ? '?' + params : ''}`) }
  async getAdminWinners(params?: string) { return this.authFetch(`/admin/winners${params ? '?' + params : ''}`) }
  async getAdminPayments(params?: string) { return this.authFetch(`/admin/payments${params ? '?' + params : ''}`) }
  async adminPayout(drawId: number, password: string) { return this.authFetch('/admin/payout', { method: 'POST', body: JSON.stringify({ draw_id: drawId, password }) }) }

  // ─── Categories ───
  async getCategories() { return fetch(`${API_BASE}/categories`).then(r => r.json()) }
  async createCategory(data: Record<string, unknown>) { return this.authFetch('/admin/categories', { method: 'POST', body: JSON.stringify(data) }) }
}

/** Helper to create an authenticated page context for Playwright */
export async function setAuthCookies(page: any, token: string) {
  await page.evaluate((t: string) => {
    window.localStorage.setItem('auth_token', t)
    window.localStorage.setItem('token', t)
  }, token)
}
