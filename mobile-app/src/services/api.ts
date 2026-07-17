import { Platform } from 'react-native'
import Constants from 'expo-constants'
import { getSettings } from './storage'

const PORT = 8080

/* ── TEMPORARY OFFLINE MODE ───────────────────────────────────────────────
   This workspace has no Laravel `backend/`, so every network call fails with
   "Cannot connect to server". While ON, the app runs entirely on the local
   mock data below and never touches the network. SET TO false once the
   backend is running (php artisan serve in backend/). ──────────────────── */
const OFFLINE_MODE = false

// Production API endpoint (Laravel backend on cPanel).
const PROD_API_URL = 'https://api.charismahand.com/api'

const OFFLINE_ROUNDS: RoundData[] = [
  { id: 101, name: 'Morning Circle', category: '500', amount: 500, frequency: 'daily', people_goal: 10, current_participants: 10, total_rounds: 12, winners_per_spin: 2, current_round_number: 3, start_date: null, end_date: null, status: 'active', auto_spin_enabled: true, spin_time: '08:00', commission_rate: 10, metadata: null, last_auto_draw_at: new Date(Date.now() - 86400000).toISOString(), created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 102, name: 'Evening Savers', category: '1000', amount: 1000, frequency: 'daily', people_goal: 8, current_participants: 8, total_rounds: 10, winners_per_spin: 1, current_round_number: 2, start_date: null, end_date: null, status: 'active', auto_spin_enabled: true, spin_time: '20:00', commission_rate: 10, metadata: null, last_auto_draw_at: new Date(Date.now() - 86400000).toISOString(), created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 103, name: 'Big Players', category: '5000', amount: 5000, frequency: 'weekly', people_goal: 4, current_participants: 4, total_rounds: 8, winners_per_spin: 1, current_round_number: 1, start_date: null, end_date: null, status: 'active', auto_spin_enabled: false, spin_time: '12:00', commission_rate: 10, metadata: null, last_auto_draw_at: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
]

const OFFLINE_STATS: RoundStats = {
  total_rounds: 3,
  active_rounds: 3,
  draft_rounds: 0,
  completed_rounds: 0,
  total_payouts: 0,
  total_draws: 0,
  by_category: [
    { category: '500', total: 1, participants: 10 },
    { category: '1000', total: 1, participants: 8 },
    { category: '5000', total: 1, participants: 4 },
  ],
}

function offlineMock<T>(endpoint: string, options: RequestInit): T {
  if (endpoint === '/login' || endpoint === '/register') {
    return {
      success: true,
      token: 'demo-token',
      role: 'admin',
      user: { id: 'usr-admin', name: 'Demo Admin', phone: '0900000000', registration_date: '2026-01-01' },
      slot: { id: 's-demo', user_id: 'usr-admin', category: '500', slot_number: 1, balance: 500, status: 'active', has_won: false, deal_closed: false, deposited_today: true, consecutive_missed_sweeps: 0, registration_date: '2026-01-01' },
    } as unknown as T
  }
  if (endpoint === '/me') {
    return { user: { id: 'usr-admin', name: 'Demo Admin', phone: '0900000000', registration_date: '2026-01-01' }, slots: [], role: 'admin' } as unknown as T
  }
  if (endpoint === '/logout') return {} as T
  if (endpoint.startsWith('/rounds/stats') || endpoint.startsWith('/admin/rounds/stats')) return OFFLINE_STATS as unknown as T
  if (endpoint.startsWith('/rounds') || endpoint.startsWith('/admin/rounds')) return { rounds: OFFLINE_ROUNDS } as unknown as T
  if (endpoint === '/categories' || endpoint === '/admin/categories') return { categories: [] } as unknown as T
  if (endpoint === '/tiers') return [] as unknown as T
  return {} as T
}

let workingBase = ''
let authToken: string | null = null
let userSetHost: string | null = null

export function setToken(token: string | null) {
  authToken = token
}

export function getToken(): string | null {
  return authToken
}

export function setServerHost(host: string) {
  userSetHost = host
  workingBase = ''
}

async function resolveBase(): Promise<string> {
  if (OFFLINE_MODE) return 'http://offline.local/api'
  if (workingBase) return workingBase

  // Production API is the primary target; verify it answers, else fall back to LAN detect.
  try {
    const res = await fetch(`${PROD_API_URL}/tiers`, { method: 'GET' })
    if (res.ok || res.status === 401 || res.status === 404) {
      workingBase = PROD_API_URL
      return workingBase
    }
  } catch {}

  const hosts: string[] = []

  // 1. User-set host from settings (permanent fix)
  if (!userSetHost) {
    try {
      const settings = await getSettings()
      if (settings.serverHost) {
        userSetHost = settings.serverHost
      }
    } catch {}
  }
  if (userSetHost) hosts.push(userSetHost)

  // 2. Auto-detect from Expo connection URL (LAN mode)
  try {
    const expUrl = Constants.experienceUrl
    if (expUrl) {
      const h = new URL(expUrl).hostname
      if (h && h !== 'localhost' && h !== '127.0.0.1') hosts.push(h)
    }
  } catch {}

  // 3. Android emulator
  if (Platform.OS === 'android') hosts.push('10.0.2.2')

  // 4. Fallbacks
  hosts.push('localhost', '127.0.0.1')

  const uniqueHosts = [...new Set(hosts)]

  for (const host of uniqueHosts) {
    const base = `http://${host}:${PORT}/api`
    try {
      const res = await fetch(`${base}/tiers`, { method: 'GET' })
      if (res.ok || res.status === 404 || res.status === 401) {
        workingBase = base
        return base
      }
    } catch {}
  }

  workingBase = `http://${uniqueHosts[0] || 'localhost'}:${PORT}/api`
  return workingBase
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  if (OFFLINE_MODE) return offlineMock<T>(endpoint, options)

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  }

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`
  }

  const isFormData = options.body instanceof FormData
  if (!isFormData && options.method !== 'GET' && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  const base = await resolveBase()

  try {
    const res = await fetch(`${base}${endpoint}`, { ...options, headers })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.message || data.error || 'Request failed')
    }
    return await res.json()
  } catch (e: any) {
    const msg = e?.message?.toLowerCase() || ''
    if (msg.includes('failed to fetch') || msg.includes('network request')) {
      // Server might have changed IP — reset cache and retry once
      workingBase = ''
      const newBase = await resolveBase()
      if (newBase !== base) {
        const res = await fetch(`${newBase}${endpoint}`, { ...options, headers })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.message || data.error || 'Request failed')
        }
        return await res.json()
      }
      throw new Error(
        `Cannot connect to server.\n\n` +
        `If on a real device: open Settings → tap "Server IP" and enter your computer's IP.\n` +
        `If on emulator: run \`php artisan serve --host=0.0.0.0 --port=${PORT}\` in backend/`
      )
    }
    throw e
  }
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint),
  post: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),
  put: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: 'DELETE' }),
  postForm: <T>(endpoint: string, data: Record<string, string>) =>
    request<T>(endpoint, {
      method: 'POST',
      body: new URLSearchParams(data).toString(),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      } as Record<string, string>,
    }),
}

/* ─── Category API ─── */

export interface CategoryData {
  id: number
  code: string
  label_en: string
  label_am: string
  amount: number
  frequency: string
  max_members: number
  min_deposit: number
  total_rounds: number
  collateral_type: string | null
  license_type: string | null
  requires_license: boolean
  penalty_clause_en: string | null
  penalty_clause_am: string | null
  is_active: boolean
  sort_order: number
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

/* ─── Round API ─── */

export interface RoundData {
  id: number
  name: string
  category: string
  amount: number
  frequency: 'daily' | 'weekly' | 'monthly' | '2_month'
  people_goal: number
  current_participants: number
  total_rounds: number
  winners_per_spin: number
  current_round_number: number
  start_date: string | null
  end_date: string | null
  status: 'draft' | 'active' | 'completed' | 'cancelled'
  auto_spin_enabled: boolean
  spin_time: string
  commission_rate: number
  metadata: Record<string, unknown> | null
  last_auto_draw_at: string | null
  created_at: string
  updated_at: string
}

export interface RoundStats {
  total_rounds: number
  active_rounds: number
  draft_rounds: number
  completed_rounds: number
  total_payouts: number
  total_draws: number
  by_category: Array<{ category: string; total: number; participants: number }>
}

export interface CreateRoundInput {
  name: string
  category: string
  amount: number
  frequency: 'daily' | 'weekly' | 'monthly' | '2_month'
  people_goal: number
  total_rounds: number
  winners_per_spin?: number
  start_date?: string
  end_date?: string
  auto_spin_enabled?: boolean
  spin_time?: string
  commission_rate?: number
}

export const roundsApi = {
  list: async (params?: { status?: string; category?: string }) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : ''
    try {
      return await api.get<{ rounds: RoundData[] }>(`/rounds${query}`)
    } catch {
      return await api.get<{ rounds: RoundData[] }>(`/admin/rounds${query}`)
    }
  },

  get: async (id: number) => {
    try {
      return await api.get<{ round: RoundData & { slots: unknown[]; draws: unknown[] } }>(`/rounds/${id}`)
    } catch {
      return await api.get<{ round: RoundData & { slots: unknown[]; draws: unknown[] } }>(`/admin/rounds/${id}`)
    }
  },

  stats: async () => {
    try {
      return await api.get<RoundStats>('/admin/rounds/stats')
    } catch {
      return await api.get<RoundStats>('/rounds/stats')
    }
  },

  create: (data: CreateRoundInput) =>
    api.post<{ round: RoundData }>('/admin/rounds', data),

  update: async (id: number, data: Partial<CreateRoundInput & { status: string }>) => {
    try {
      return await api.put<{ round: RoundData }>(`/admin/rounds/${id}`, data)
    } catch {
      return await api.put<{ round: RoundData }>(`/rounds/${id}`, data)
    }
  },

  delete: async (id: number) => {
    try {
      return await api.delete<{ message: string }>(`/admin/rounds/${id}`)
    } catch {
      return await api.delete<{ message: string }>(`/rounds/${id}`)
    }
  },

  activate: (id: number) =>
    api.post<{ round: RoundData }>(`/admin/rounds/${id}/activate`),

  demoFill: (id: number) =>
    api.post<{ round: RoundData }>(`/admin/rounds/${id}/demo-fill`),

  complete: (id: number) =>
    api.post<{ round: RoundData }>(`/admin/rounds/${id}/complete`),

  cancel: (id: number) =>
    api.post<{ round: RoundData }>(`/admin/rounds/${id}/cancel`),

  enroll: async (id: number, userId: number) => {
    try {
      return await api.post<{ slot: unknown; round: RoundData }>(`/rounds/${id}/enroll`, { user_id: userId })
    } catch {
      return await api.post<{ slot: unknown; round: RoundData }>(`/admin/rounds/${id}/enroll`, { user_id: userId })
    }
  },

  unenroll: (id: number, slotId: number) =>
    api.post<{ message: string; round: RoundData }>(`/admin/rounds/${id}/unenroll`, { slot_id: slotId }),

  spin: (id: number) =>
    api.post<{ draw: unknown; round: RoundData }>(`/admin/rounds/${id}/spin`),
}

/* ─── Draw (Ludo Dice Shaker) API ─── */

export interface ShakeInput {
  categories?: string[]
  round_id?: number
  /** Default true — draw from the unified global jar (all active pools). */
  is_all?: boolean
}

/**
 * Privacy-first winner token. Names are intentionally excluded from the
 * public draw response; only the category, slot and round are exposed.
 */
export interface ShakeWinnerToken {
  slot_id: number
  slot_number: number
  category: string
  round_id: number | null
  user_id: number
  round_number: number
  /** Present only on admin calls, for payout/audit. */
  user_name?: string
}

export interface ShakeResult {
  draw: unknown
  winner: ShakeWinnerToken
  winners?: ShakeWinnerToken[]
  total_eligible: number
}

export const drawApi = {
  shake: (input: ShakeInput) =>
    api.post<ShakeResult>('/admin/draw/shake', input),
}

/* ─── Admin API ─── */

export interface AdminMember {
  id: number
  name: string
  phone: string
  email: string | null
  role: string
  status: string
  registration_date: string
  created_at: string
  slots?: AdminSlot[]
}

export interface AdminSlot {
  id: number
  user_id: number
  round_id: number | null
  category: string
  slot_number: number
  status: 'active' | 'lien'
  balance: number
  consecutive_missed_sweeps: number
  deposited_today: boolean
  has_won: boolean
  unique_payment_code: string | null
  payout_code: string | null
  registration_date: string
}

export interface AdminDraw {
  id: number
  spin_id: string
  round: string
  round_id: number | null
  category: string
  winning_slot: number
  winner_name: string
  net_payout: number
  commission_amount: number
  total_collected: number
  draw_date: string
  is_auto: boolean
  created_at: string
}

export interface AdminPaymentLog {
  id: number
  user_id: number
  user_name: string
  amount: number
  status: 'success' | 'failed'
  payment_gateway: string | null
  trans_ref: string | null
  created_at: string
  user?: { name: string; phone: string }
}

export interface AdminStats {
  total_users: number
  total_slots: number
  active_slots: number
  lien_slots: number
  total_balance: number
  total_payouts: number
  delinquent_slots: number
  slots_by_category: Array<{ category: string; total: number; balance: number }>
  active_rounds: number
  total_rounds: number
}

export interface AdminPromoCode {
  id: number
  code: string
  broker_name: string
  broker_phone: string
  commission_rate: number
  total_registrations: number
  total_earned: number
  status: string
  created_at: string
}

export interface AdminPromoStats {
  total_brokers: number
  active_brokers: number
  total_registrations: number
  total_paid_out: number
  registrations_today: number
}

export interface MemberDetail {
  id: number
  name: string
  phone: string
  email: string | null
  role: string
  status: string
  registration_date: string
  created_at: string
  slots: AdminSlot[]
}

export const adminApi = {
  stats: () =>
    api.get<AdminStats>('/admin/stats'),

  members: (params?: { search?: string; category?: string; page?: number }) => {
    const query = params ? '?' + Object.entries(params)
      .filter(([_, v]) => v !== undefined && v !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&') : ''
    return api.get<{ members: { data: AdminMember[]; current_page: number; last_page: number; total: number } }>(`/admin/members${query}`)
  },

  memberDetail: (id: number) =>
    api.get<{ member: MemberDetail }>(`/admin/members/${id}`),

  winners: (params?: { category?: string; round?: string; page?: number }) => {
    const query = params ? '?' + Object.entries(params)
      .filter(([_, v]) => v !== undefined && v !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&') : ''
    return api.get<{ winners: { data: AdminDraw[]; current_page: number; last_page: number; total: number } }>(`/admin/winners${query}`)
  },

  payments: (params?: { status?: string; page?: number }) => {
    const query = params ? '?' + Object.entries(params)
      .filter(([_, v]) => v !== undefined && v !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&') : ''
    return api.get<{ payments: { data: AdminPaymentLog[]; current_page: number; last_page: number; total: number } }>(`/admin/payments${query}`)
  },

  runDraw: (category: string) =>
    api.post<{ draw: AdminDraw }>('/admin/draw', { category }),

  payout: (drawId: number, password: string) =>
    api.post<{ message: string; draw: AdminDraw }>('/admin/payout', { draw_id: drawId, password }),

  promos: () =>
    api.get<{ promo_codes: AdminPromoCode[] }>('/admin/promos'),

  promosStats: () =>
    api.get<AdminPromoStats>('/admin/promos/stats'),

  createPromo: (data: { broker_name: string; broker_phone: string; commission_rate?: number }) =>
    api.post<{ promo_code: AdminPromoCode }>('/admin/promos', data),

  updatePromo: (id: number, data: Partial<{ broker_name: string; broker_phone: string; commission_rate: number; status: string }>) =>
    api.put<{ promo_code: AdminPromoCode }>(`/admin/promos/${id}`, data),

  deletePromo: (id: number) =>
    api.delete<{ message: string }>(`/admin/promos/${id}`),

  updateSettings: (key: string, value: unknown) =>
    api.post<{ setting: unknown }>('/admin/settings', { key, value }),
}

/* ─── Member API ─── */

export interface MemberPayment {
  id: number
  slot_id: number
  day_index: number
  date: string
  amount: number
  status: 'unpaid' | 'paid'
  trans_ref: string | null
  method: string | null
  created_at: string
  updated_at: string
}

export interface MemberSavingTransaction {
  id: number
  user_id: number
  slot_id: number
  type: 'deposit' | 'withdrawal'
  amount: number
  commission: number
  net_amount: number
  trans_ref: string
  method: string
  created_at: string
}

export interface MemberSavings {
  balance: number
  total_deposits: number
  total_withdrawn: number
  deposits: MemberSavingTransaction[]
  withdrawals: MemberSavingTransaction[]
}

export const memberApi = {
  slots: () =>
    api.get<{ slots: AdminSlot[] }>('/slots'),

  payments: (slotId: number) =>
    api.get<{ payments: MemberPayment[]; slot: AdminSlot }>(`/payments/${slotId}`),

  payDay: (slotId: number, dayIndex: number) =>
    api.post<{ payment: MemberPayment }>('/payments/pay', { slot_id: slotId, day_index: dayIndex }),

  payMultiple: (slotId: number, dayIndices: number[]) =>
    api.post<{ payments: MemberPayment[] }>('/payments/pay-multiple', { slot_id: slotId, day_indices: dayIndices }),

  receipt: (paymentId: number) =>
    api.get<{ payment: MemberPayment & { slot: AdminSlot; user: { name: string } } }>(`/payments/receipt/${paymentId}`),

  savings: (slotId: number) =>
    api.get<MemberSavings>(`/savings/${slotId}`),

  deposit: (slotId: number, amount: number) =>
    api.post<{ transaction: MemberSavingTransaction }>('/savings/deposit', { slot_id: slotId, amount }),

  withdraw: (slotId: number) =>
    api.post<{ success: boolean; transaction: MemberSavingTransaction; commission: number; net_amount: number }>('/savings/withdraw', { slot_id: slotId }),

  statement: (slotId: number) =>
    api.get<{ transactions: MemberSavingTransaction[] }>(`/savings/statement/${slotId}`),
}
