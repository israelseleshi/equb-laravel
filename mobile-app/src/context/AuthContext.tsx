import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { type UserModel, type SlotModel, defaultSettings } from '../data/models'
import { getSettings, updateSettings } from '../services/storage'
import { api, setToken } from '../services/api'

interface AuthState {
  user: UserModel | null
  slots: SlotModel[]
  role: 'member' | 'admin' | null
  isLocked: boolean
  isLoading: boolean
}

interface AuthContextValue extends AuthState {
  login: (phone: string, password: string) => Promise<{ success: boolean; error?: string; role?: 'member' | 'admin' }>
  register: (data: { name: string; phone: string; password: string; category: string; promo_code?: string }) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  toggleLock: () => Promise<void>
  restoreSession: () => Promise<void>
  verifyPassword: (password: string) => Promise<boolean>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function mapApiUser(apiUser: any): UserModel {
  return {
    id: String(apiUser.id),
    name: apiUser.name,
    phone: apiUser.phone,
    password: '',
    registrationDate: apiUser.registration_date,
  }
}

function mapApiSlot(apiSlot: any): SlotModel {
  return {
    id: String(apiSlot.id),
    userId: String(apiSlot.user_id),
    category: apiSlot.category,
    slotNumber: Number(apiSlot.slot_number),
    balance: Number(apiSlot.balance),
    status: apiSlot.status,
    hasWon: Boolean(apiSlot.has_won),
    dealClosed: Boolean(apiSlot.deal_closed),
    uniquePaymentCode: apiSlot.unique_payment_code ?? undefined,
    payoutCode: apiSlot.payout_code ?? undefined,
    depositedToday: Boolean(apiSlot.deposited_today),
    consecutiveMissedSweeps: Number(apiSlot.consecutive_missed_sweeps),
    registrationDate: apiSlot.registration_date,
    roundId: apiSlot.round_id ? String(apiSlot.round_id) : undefined,
    roundNumber: apiSlot.round_number ? Number(apiSlot.round_number) : undefined,
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    slots: [],
    role: null,
    isLocked: false,
    isLoading: true,
  })

  const restoreSession = useCallback(async () => {
    try {
      const settings = await getSettings()
      const savedToken = settings.apiToken
      if (savedToken) {
        setToken(savedToken)
        const res = await api.get<{ user: any; slots: any[]; role: string }>('/me')
        setState({
          user: mapApiUser(res.user),
          slots: (res.slots || []).map(mapApiSlot),
          role: res.role as 'member' | 'admin',
          isLocked: settings.isLocked,
          isLoading: false,
        })
        return
      }
      setState((prev) => ({ ...prev, isLoading: false }))
    } catch {
      setToken(null)
      setState((prev) => ({ ...prev, isLoading: false }))
    }
  }, [])

  useEffect(() => {
    restoreSession()
  }, [restoreSession])

  const login = useCallback(async (phone: string, password: string) => {
    try {
      const res = await api.postForm<{
        success: boolean
        user: any
        slots: any[]
        role: string
        token: string
        error?: string
      }>('/login', { phone, password })

      if (!res.success) {
        return { success: false, error: res.error || 'Invalid credentials' }
      }

      const mappedUser = mapApiUser(res.user)
      const mappedSlots = (res.slots || []).map(mapApiSlot)
      setToken(res.token)
      await updateSettings({ apiToken: res.token, currentSessionUserId: mappedUser.id, currentSessionUserRole: res.role as 'member' | 'admin', lockPassword: password })
      setState({ user: mappedUser, slots: mappedSlots, role: res.role as 'member' | 'admin', isLocked: false, isLoading: false })
      return { success: true, role: res.role as 'member' | 'admin' }
    } catch (err: any) {
      return { success: false, error: err.message || 'Login failed' }
    }
  }, [])

  const register = useCallback(async (data: { name: string; phone: string; password: string; category: string; promo_code?: string }) => {
    try {
      const body: Record<string, string> = {
        name: data.name,
        phone: data.phone,
        password: data.password,
        category: data.category,
      }
      if (data.promo_code) body.promo_code = data.promo_code
      const res = await api.postForm<{
        user: any
        slot: any
        token: string
      }>('/register', body)

      const mappedUser = mapApiUser(res.user)
      setToken(res.token)
      await updateSettings({ apiToken: res.token, currentSessionUserId: mappedUser.id, currentSessionUserRole: 'member', lockPassword: data.password })
      setState({ user: mappedUser, slots: [mapApiSlot(res.slot)], role: 'member', isLocked: false, isLoading: false })
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message || 'Registration failed' }
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/logout')
    } catch {}
    setToken(null)
    await updateSettings({ apiToken: undefined, currentSessionUserId: undefined, currentSessionUserRole: undefined, lockPassword: undefined, isLocked: false })
    setState({ user: null, slots: [], role: null, isLocked: false, isLoading: false })
  }, [])

  const toggleLock = useCallback(async () => {
    const next = !state.isLocked
    await updateSettings({ isLocked: next })
    setState((prev) => ({ ...prev, isLocked: next }))
  }, [state.isLocked])

  const verifyPassword = useCallback(async (password: string): Promise<boolean> => {
    const settings = await getSettings()
    return settings.lockPassword === password
  }, [])

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, toggleLock, restoreSession, verifyPassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
