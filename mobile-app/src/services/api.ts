import { Platform } from 'react-native'
import Constants from 'expo-constants'
import { getSettings } from './storage'

const PORT = 8000

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
  if (workingBase) return workingBase

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

/* ─── Round API ─── */

export interface RoundData {
  id: number
  name: string
  category: string
  amount: number
  frequency: 'daily' | 'weekly' | 'monthly'
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
  frequency: 'daily' | 'weekly' | 'monthly'
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
