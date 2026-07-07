import { useState, useMemo, useEffect, useRef } from 'react'
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Animated,
  Platform,
  LayoutAnimation,
  UIManager,
  useWindowDimensions,
  Alert,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'
import { Ionicons } from '@expo/vector-icons'
import Svg, { Circle } from 'react-native-svg'
import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import * as Linking from 'expo-linking'
import { colors, fonts } from '../theme'
import { Card } from '../components/ui/Card'
import { PaginationBar } from '../components/ui/PaginationBar'
import { Text } from '../components/ui/AppText'
import { useTranslation } from '../i18n/useTranslation'
import { useNavigation } from '../context/NavigationContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/ui/Toast'
import { getCategoryConfig, CATEGORY_CODES } from '../data/tierConfig'
import { MemberDetailModal } from '../components/admin/MemberDetailModal'
import { roundsApi, type RoundData, type RoundStats, type CreateRoundInput } from '../services/api'
import { updateSettings } from '../services/storage'

/* ─── Mock Data ─── */

interface User {
  id: string
  name: string
  phone: string
  joinedAt: string
}

interface Slot {
  id: string
  userId: string
  category: string
  slotNumber: number
  status: 'active' | 'lien'
  balance: number
  consecutiveMissedSweeps: number
  depositedToday: boolean
}

interface Draw {
  spinId: string
  category: string
  winningSlot: number
  winnerName?: string
  netPayout: number
  timestamp: string
  round: number
}

interface PaymentLog {
  id: string
  userId: string
  userName: string
  amount: number
  status: 'success' | 'failed'
  paymentGateway: string
  timestamp: string
}

const MOCK_USERS: User[] = [
  { id: 'usr-1', name: 'Abebe Kebede', phone: '0911111111', joinedAt: '2026-01-15' },
  { id: 'usr-2', name: 'Almaz Tadesse', phone: '0922222222', joinedAt: '2026-01-20' },
  { id: 'usr-3', name: 'Lemma Hailu', phone: '0933333333', joinedAt: '2026-02-01' },
  { id: 'usr-4', name: 'Tigist Wondimu', phone: '0944444444', joinedAt: '2026-02-10' },
  { id: 'usr-5', name: 'Biruk Alemu', phone: '0955555555', joinedAt: '2026-03-01' },
  { id: 'usr-6', name: 'Meron Getachew', phone: '0966666666', joinedAt: '2026-03-15' },
  { id: 'usr-7', name: 'Henok Desta', phone: '0977777777', joinedAt: '2026-04-01' },
  { id: 'usr-8', name: 'Sara Tekle', phone: '0988888888', joinedAt: '2026-04-10' },
  { id: 'usr-9', name: 'Yonas Ayele', phone: '0999999999', joinedAt: '2026-05-01' },
  { id: 'usr-10', name: 'Hiwot Girma', phone: '0900000000', joinedAt: '2026-05-15' },
]

const MOCK_SLOTS: Slot[] = [
  ...Array.from({ length: 8 }, (_, i) => ({ id: `s500-${i}`, userId: `usr-${(i % 10) + 1}`, category: '500', slotNumber: i + 1, status: 'active' as const, balance: 500, consecutiveMissedSweeps: 0, depositedToday: true })),
  ...Array.from({ length: 6 }, (_, i) => ({ id: `s1000-${i}`, userId: `usr-${((i + 3) % 10) + 1}`, category: '1000', slotNumber: i + 1, status: 'active' as const, balance: 2000, consecutiveMissedSweeps: 0, depositedToday: true })),
  ...Array.from({ length: 4 }, (_, i) => ({ id: `s2000-${i}`, userId: `usr-${((i + 6) % 10) + 1}`, category: '2000', slotNumber: i + 1, status: 'active' as const, balance: 4000, consecutiveMissedSweeps: i === 0 ? 2 : 0, depositedToday: i === 0 ? false : true })),
  ...Array.from({ length: 3 }, (_, i) => ({ id: `s5000-${i}`, userId: `usr-${((i + 9) % 10) + 1}`, category: '5000', slotNumber: i + 1, status: i === 1 ? 'lien' as const : 'active' as const, balance: 10000, consecutiveMissedSweeps: i === 1 ? 3 : 0, depositedToday: i !== 1 })),
]

const MOCK_DRAWS: Draw[] = [
  { spinId: 'd1', category: '500', winningSlot: 3, winnerName: 'Almaz Tadesse', netPayout: 4500, timestamp: '2026-06-15', round: 1 },
  { spinId: 'd2', category: '500', winningSlot: 7, winnerName: 'Henok Desta', netPayout: 4500, timestamp: '2026-06-01', round: 1 },
  { spinId: 'd3', category: '1000', winningSlot: 2, winnerName: 'Sara Tekle', netPayout: 7000, timestamp: '2026-05-20', round: 1 },
  { spinId: 'd4', category: '2000', winningSlot: 1, winnerName: 'Yonas Ayele', netPayout: 10000, timestamp: '2026-05-10', round: 1 },
  { spinId: 'd5', category: '5000', winningSlot: 1, winnerName: 'Hiwot Girma', netPayout: 18000, timestamp: '2026-04-25', round: 1 },
]

const MOCK_PAYMENTS: PaymentLog[] = [
  { id: 'p1', userId: 'usr-1', userName: 'Abebe Kebede', amount: 500, status: 'success', paymentGateway: 'Telebirr', timestamp: '2026-06-20T10:30:00Z' },
  { id: 'p2', userId: 'usr-2', userName: 'Almaz Tadesse', amount: 500, status: 'success', paymentGateway: 'Telebirr', timestamp: '2026-06-20T09:15:00Z' },
  { id: 'p3', userId: 'usr-3', userName: 'Lemma Hailu', amount: 500, status: 'failed', paymentGateway: 'Cash', timestamp: '2026-06-19T14:00:00Z' },
  { id: 'p4', userId: 'usr-4', userName: 'Tigist Wondimu', amount: 1000, status: 'success', paymentGateway: 'Telebirr', timestamp: '2026-06-19T11:45:00Z' },
  { id: 'p5', userId: 'usr-5', userName: 'Biruk Alemu', amount: 1000, status: 'success', paymentGateway: 'Bank', timestamp: '2026-06-18T16:30:00Z' },
  { id: 'p6', userId: 'usr-6', userName: 'Meron Getachew', amount: 500, status: 'failed', paymentGateway: 'Telebirr', timestamp: '2026-06-18T08:00:00Z' },
]

const MOCK_SAVINGS: { userId: string; balance: number }[] = [
  { userId: 'usr-1', balance: 1500 },
  { userId: 'usr-2', balance: 2300 },
  { userId: 'usr-3', balance: 800 },
  { userId: 'usr-4', balance: 3200 },
  { userId: 'usr-5', balance: 1100 },
  { userId: 'usr-6', balance: 450 },
  { userId: 'usr-7', balance: 2100 },
  { userId: 'usr-8', balance: 980 },
  { userId: 'usr-9', balance: 1750 },
  { userId: 'usr-10', balance: 600 },
]

const MOCK_TODAY_STATUS: Record<string, boolean> = {
  'usr-1': true, 'usr-2': true, 'usr-3': false, 'usr-4': true,
  'usr-5': false, 'usr-6': true, 'usr-7': true, 'usr-8': false,
  'usr-9': true, 'usr-10': false,
}

const CATEGORY_CONFIG_MAP: Record<string, { label: string; barColor: string; target: number }> = {
  '100': { label: '100 ETB', barColor: '#a855f7', target: 10 },
  '500': { label: '500 ETB', barColor: '#059669', target: 10 },
  '1000': { label: '1,000 ETB', barColor: '#0ea5e9', target: 8 },
  '2000': { label: '2,000 ETB', barColor: '#8b5cf6', target: 6 },
  '5000': { label: '5,000 ETB', barColor: '#f59e0b', target: 4 },
  'savings': { label: 'Savings', barColor: '#7c3aed', target: 1 },
}

/* ─── Helpers ─── */

function toLoc(n: number) { return (n || 0).toLocaleString() }

function formatDate(ts: string) {
  if (!ts) return '-'
  const d = new Date(ts)
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`
}

function ProgressRing({ pct, size = 48, color = '#059669' }: { pct: number; size?: number; color?: string }) {
  const half = size / 2
  const r = (size - 8) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - Math.min(pct, 100) / 100 * circ
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={half} cy={half} r={r} stroke="#f1f5f9" strokeWidth={4} fill="none" />
        <Circle cx={half} cy={half} r={r} stroke={color} strokeWidth={4} fill="none"
          strokeDasharray={`${circ} ${circ}`} strokeDashoffset={offset}
          strokeLinecap="round" transform={`rotate(-90 ${half} ${half})`}
        />
      </Svg>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color }}>{pct}%</Text>
      </View>
    </View>
  )
}

/* screenWidth is now dynamic via useWindowDimensions inside the component */

/* ─── Tab Config ─── */

interface TabConfig {
  key: string
  icon: string
}

const TABS: TabConfig[] = [
  { key: 'overview', icon: 'stats-chart' },
  { key: 'members', icon: 'people' },
  { key: 'winners', icon: 'trophy' },
  { key: 'payments', icon: 'card-outline' },
  { key: 'rounds', icon: 'refresh' },
]

const TAB_ICONS: Record<string, string> = {
  overview: 'stats-chart',
  members: 'people',
  winners: 'trophy',
  payments: 'card-outline',
  rounds: 'refresh',
}

/* ─── Component ─── */

export function AdminDashboardScreen() {
  const { t, lang, toggleLanguage } = useTranslation()
  const { navigate } = useNavigation()
  const { logout, isLocked, toggleLock, verifyPassword, user } = useAuth()
  const { showToast } = useToast()
  const { width: screenWidth, height: screenHeight } = useWindowDimensions()
  const a = t.admin
  const isAm = lang === 'am'

  const isSmallScreen = screenWidth < 380
  const isMediumScreen = screenWidth >= 380 && screenWidth < 600
  const statCardWidth = useMemo(() => {
    const gap = 12
    const padding = 32
    return (screenWidth - padding - gap) / 2
  }, [screenWidth])

  if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    try { UIManager.setLayoutAnimationEnabledExperimental(true) } catch {}
  }

  const [activeTab, setActiveTab] = useState('overview')
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [roundFilter, setRoundFilter] = useState('all')
  const [memberRoundFilter, setMemberRoundFilter] = useState('all')
  const [selectedWinner, setSelectedWinner] = useState<Draw | null>(null)
  const [showPayoutModal, setShowPayoutModal] = useState(false)
  const [payoutStep, setPayoutStep] = useState('dial')
  const [payoutPassword, setPayoutPassword] = useState('')
  const [payoutError, setPayoutError] = useState('')
  const [spinLoading, setSpinLoading] = useState<string | null>(null)
  const [unlockPassword, setUnlockPassword] = useState('')
  const [unlockError, setUnlockError] = useState('')
  const [unlocking, setUnlocking] = useState(false)
  const [selectedMember, setSelectedMember] = useState<User | null>(null)
  const [showMemberModal, setShowMemberModal] = useState(false)
  const [memberDetailSlots, setMemberDetailSlots] = useState<Slot[]>([])
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [paymentsView, setPaymentsView] = useState<'history' | 'daily' | 'savings'>('history')
  const [paymentDateFilter, setPaymentDateFilter] = useState<'all' | 'paid' | 'unpaid'>('all')
  const [dailyStatusFilter, setDailyStatusFilter] = useState<'unpaid' | 'paid'>('unpaid')
  const [spinError, setSpinError] = useState<string | null>(null)
  const [showSavingsPayout, setShowSavingsPayout] = useState(false)
  const [savingsAmount, setSavingsAmount] = useState('')
  const [selectedSavingsUserId, setSelectedSavingsUserId] = useState<string | null>(null)
  const [savingsPayoutStep, setSavingsPayoutStep] = useState<'select' | 'amount' | 'confirm' | 'processing' | 'success'>('select')
  const [expandedCard, setExpandedCard] = useState<string | null>(null)

  /* ─── Rounds State ─── */
  const [rounds, setRounds] = useState<RoundData[]>([])
  const [roundStats, setRoundStats] = useState<RoundStats | null>(null)
  const [loadingRounds, setLoadingRounds] = useState(false)
  const [showCreateRound, setShowCreateRound] = useState(false)
  const [showEditRound, setShowEditRound] = useState(false)
  const [editingRound, setEditingRound] = useState<RoundData | null>(null)
  const [createRoundForm, setCreateRoundForm] = useState<CreateRoundInput>({
    name: '',
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
  const [creatingRound, setCreatingRound] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)

  /* ─── Pagination State ─── */
  const [memberPage, setMemberPage] = useState(1)
  const [winnerPage, setWinnerPage] = useState(1)
  const [paymentPage, setPaymentPage] = useState(1)
  const [dailyPage, setDailyPage] = useState(1)
  const PER_PAGE = 5

  /* ─── Fetch Rounds ─── */
  const fetchRounds = async () => {
    setLoadingRounds(true)
    try {
      const [roundsRes, statsRes] = await Promise.all([
        roundsApi.list(),
        roundsApi.stats(),
      ])
      setRounds(roundsRes.rounds)
      setRoundStats(statsRes)
    } catch (err) {
      showToast('Failed to load rounds', 'error')
    } finally {
      setLoadingRounds(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'rounds' || activeTab === 'members') {
      fetchRounds()
    }
  }, [activeTab])

  /* ─── Computed ─── */

  const totalUsers = MOCK_USERS.length
  const totalSlots = MOCK_SLOTS.length
  const activeSlots = MOCK_SLOTS.filter(s => s.status === 'active').length
  const lienSlots = MOCK_SLOTS.filter(s => s.status !== 'active').length
  const totalBalance = MOCK_SLOTS.reduce((sum, s) => sum + s.balance, 0)
  const totalPayouts = MOCK_DRAWS.reduce((sum, d) => sum + d.netPayout, 0)
  const delinquentSlots = MOCK_SLOTS.filter(s => s.consecutiveMissedSweeps > 0)

  const slotsByCat = useMemo(() => {
    const map: Record<string, { total: number; active: number; balance: number }> = {}
    CATEGORY_CODES.forEach(c => {
      const s = MOCK_SLOTS.filter(sl => sl.category === c)
      map[c] = {
        total: s.length,
        active: s.filter(x => x.status === 'active').length,
        balance: s.reduce((sum, x) => sum + x.balance, 0),
      }
    })
    return map
  }, [])

  const winners = useMemo(() => {
    const w = [...MOCK_DRAWS].sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())
    if (catFilter !== 'all') return w.filter(d => d.category === catFilter)
    return w
  }, [catFilter])

  const uniqueRounds = useMemo(() => [...new Set(MOCK_DRAWS.map(d => d.round).filter(Boolean))].sort(), [])
  const filteredWinners = roundFilter === 'all' ? winners : winners.filter(d => d.round === parseInt(roundFilter))

  const allPaymentLogs = [...MOCK_PAYMENTS].sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())
  const filteredPayments = useMemo(() => {
    if (paymentDateFilter === 'all') return allPaymentLogs
    return allPaymentLogs.filter(p => paymentDateFilter === 'paid' ? p.status === 'success' : p.status === 'failed')
  }, [paymentDateFilter, allPaymentLogs])
  const savingsTotalBalance = MOCK_SAVINGS.reduce((s, x) => s + x.balance, 0)
  const savingsMembersCount = MOCK_SAVINGS.filter(x => x.balance > 0).length

  /* ─── Paginated Vars ─── */
  const paginatedPayments = useMemo(() => {
    const totalPages = Math.max(1, Math.ceil(filteredPayments.length / PER_PAGE))
    const page = Math.min(paymentPage, totalPages)
    return { items: filteredPayments.slice((page - 1) * PER_PAGE, page * PER_PAGE), totalPages }
  }, [filteredPayments, paymentPage, PER_PAGE])

  /* ─── Payout Modal ─── */

  useEffect(() => {
    if (!showPayoutModal) return
    if (payoutStep === 'dial') {
      const t = setTimeout(() => setPayoutStep('password'), 2000)
      return () => clearTimeout(t)
    }
    if (payoutStep === 'processing') {
      const t = setTimeout(() => setPayoutStep('success'), 2000)
      return () => clearTimeout(t)
    }
  }, [showPayoutModal, payoutStep])

  function handleWinnerPayout(winner: Draw) {
    setSelectedWinner(winner)
    setPayoutPassword('')
    setPayoutError('')
    setPayoutStep('dial')
    setShowPayoutModal(true)
  }

  function handlePayoutPasswordSubmit() {
    if (payoutPassword === '123456') {
      setPayoutError('')
      setPayoutStep('processing')
    } else {
      setPayoutError(a.wrongPassword)
    }
  }

  function handleSavingsPayoutFlow() {
    if (savingsPayoutStep === 'confirm') {
      setSavingsPayoutStep('processing')
      setTimeout(() => {
        setSavingsPayoutStep('success')
      }, 2000)
    }
  }

  /* ─── Lucky Spin ─── */

  async function handleLuckySpin(category: string) {
    setSpinError(null)
    setSpinLoading(category)
    await new Promise(r => setTimeout(r, 1500))
    setSpinLoading(null)
    setSpinError(null)
    showToast(`${isAm ? 'ዕጣ ተውሏል' : 'Draw complete!'}`, 'success')
  }

  /* ─── PDF Generation ─── */

  async function generateMemberPDF(member: User) {
    const userSlots = MOCK_SLOTS.filter(s => s.userId === member.id)
    const totalBalance = userSlots.reduce((sum, s) => sum + s.balance, 0)
    const today = new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })
    const signatureDate = new Date().toISOString().split('T')[0]
    const docId = `EQUB-${member.id.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now()}`
    const categories = [...new Set(userSlots.map(s => s.category))]

    const slotRows = userSlots.map((s, i) => {
      const cfg = CATEGORY_CONFIG_MAP[s.category]
      const freq = rounds.find(r => r.category === s.category)?.frequency || 'daily'
      const amount = rounds.find(r => r.category === s.category)?.amount || parseInt(s.category)
      return `<tr style="${i % 2 === 0 ? 'background:#ffffff;' : 'background:#f9fafb;'}">
        <td style="padding:10px 8px;border:1px solid #ddd;font-weight:bold;">${i + 1}</td>
        <td style="padding:10px 8px;border:1px solid #ddd;">${cfg?.label || s.category} ETB</td>
        <td style="padding:10px 8px;border:1px solid #ddd;text-align:center;">Slot #${s.slotNumber}</td>
        <td style="padding:10px 8px;border:1px solid #ddd;text-align:right;font-weight:bold;color:#059669;">${amount.toLocaleString()} ETB</td>
        <td style="padding:10px 8px;border:1px solid #ddd;text-align:center;">${freq.charAt(0).toUpperCase() + freq.slice(1)}</td>
        <td style="padding:10px 8px;border:1px solid #ddd;text-align:right;font-weight:bold;">${s.balance.toLocaleString()} ETB</td>
        <td style="padding:10px 8px;border:1px solid #ddd;text-align:center;color:${s.status === 'active' ? '#059669' : '#ef4444'};font-weight:bold;">${s.status === 'active' ? 'Active' : 'Lien'}</td>
      </tr>`
    }).join('')

    const catSummary = categories.map(cat => {
      const catSlots = userSlots.filter(s => s.category === cat)
      const cfg = CATEGORY_CONFIG_MAP[cat]
      const round = rounds.find(r => r.category === cat)
      return `<tr>
        <td style="padding:8px;border:1px solid #ddd;">${cfg?.label || cat} ETB</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:center;">${catSlots.length}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:center;">${round?.frequency || 'daily'}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:center;">${round?.total_rounds || 12}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">${catSlots.reduce((s, sl) => s + sl.balance, 0).toLocaleString()} ETB</td>
      </tr>`
    }).join('')

    const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: Georgia, 'Times New Roman', serif; color: #1a1a1a; line-height: 1.5; padding: 30px; margin: 0; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #ddd; padding: 8px; font-size: 11px; }
  th { background: #059669; color: #fff; text-align: left; font-size: 10px; }
  h1 { font-size: 18px; color: #059669; text-align: center; margin: 0 0 4px 0; letter-spacing: 2px; }
  h2 { font-size: 13px; color: #059669; border-bottom: 2px solid #059669; padding-bottom: 4px; margin: 20px 0 10px 0; }
  h3 { font-size: 12px; color: #92400e; margin: 12px 0 8px 0; }
  .hdr { text-align: center; border-bottom: 3px double #059669; padding-bottom: 12px; margin-bottom: 10px; }
  .logo { font-size: 28px; font-weight: bold; color: #059669; letter-spacing: 4px; }
  .sub { font-size: 10px; color: #666; }
  .addr { font-size: 9px; color: #888; text-align: right; margin-top: -30px; line-height: 1.6; }
  .conf { background: #fef2f2; border: 1px solid #fecaca; text-align: center; font-size: 9px; color: #991b1b; padding: 5px; margin: 10px 0; letter-spacing: 2px; font-weight: bold; }
  .meta { font-size: 9px; color: #999; text-align: center; margin: 4px 0 12px 0; font-family: 'Courier New', monospace; }
  .box { background: #f8fafc; border: 1px solid #e5e7eb; border-left: 4px solid #059669; padding: 10px 12px; margin-bottom: 8px; }
  .lbl { font-size: 8px; color: #888; text-transform: uppercase; letter-spacing: 1px; }
  .val { font-size: 12px; font-weight: bold; color: #111; margin-top: 2px; }
  .big { font-size: 14px; color: #059669; font-weight: bold; }
  .legal { background: #fffbeb; border: 1px solid #fde68a; padding: 14px 16px; margin: 14px 0; font-size: 10px; line-height: 1.7; color: #451a03; }
  .legal ol { padding-left: 18px; margin: 6px 0 0 0; }
  .legal li { margin-bottom: 5px; }
  .em { font-weight: bold; color: #78350f; }
  .sig { margin-top: 24px; }
  .sig table { border: none; }
  .sig td { border: none; width: 50%; text-align: center; padding: 10px 20px; vertical-align: top; }
  .stamp { width: 60px; height: 60px; border: 2px dashed #059669; border-radius: 50%; margin: 0 auto 6px auto; line-height: 60px; font-size: 8px; color: #059669; font-weight: bold; text-align: center; }
  .sigline { border-bottom: 1px solid #333; height: 50px; margin: 0 10px; }
  .siglbl { font-size: 9px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }
  .signame { font-size: 12px; font-weight: bold; margin-top: 3px; }
  .sigdt { font-size: 9px; color: #aaa; margin-top: 2px; font-family: 'Courier New', monospace; }
  .ftr { border-top: 2px solid #059669; padding-top: 10px; text-align: center; margin-top: 24px; }
  .ftr p { font-size: 9px; color: #999; margin: 2px 0; }
  .ftr strong { color: #333; }
  .total td { background: #f0fdf4; font-weight: bold; border-top: 2px solid #059669; }
</style>
</head>
<body>

<div class="hdr">
  <div class="logo">EQUB</div>
  <div class="sub">Ethiopian Savings Circle &middot; Digital Agreement</div>
</div>

<div class="addr">
  <strong>Head Office:</strong> Bole Road, Addis Ababa, Ethiopia<br>
  <strong>Phone:</strong> +251 911 00 0000<br>
  <strong>Email:</strong> info@equb-app.com<br>
  <strong>Web:</strong> www.equb-app.com
</div>

<div class="conf">CONFIDENTIAL &mdash; FOR LEGAL PURPOSES ONLY</div>

<h1>MEMBER REGISTRATION &amp; AGREEMENT</h1>
<div class="meta">Document Ref: ${docId} &nbsp;|&nbsp; Generated: ${today}</div>

<h2>1. MEMBER PERSONAL INFORMATION</h2>
<table>
  <tr>
    <td style="width:50%;"><div class="lbl">Full Name</div><div class="val">${member.name}</div></td>
    <td><div class="lbl">Phone Number</div><div class="val">${member.phone}</div></td>
  </tr>
  <tr>
    <td><div class="lbl">Member ID</div><div class="val">${member.id}</div></td>
    <td><div class="lbl">Date of Registration</div><div class="val">${member.joinedAt}</div></td>
  </tr>
  <tr>
    <td><div class="lbl">Document Issue Date</div><div class="val">${today}</div></td>
    <td><div class="lbl">Agreement Type</div><div class="val">Equb Circle Membership</div></td>
  </tr>
</table>

<h2>2. REGISTRATION &amp; PAYMENT DETAILS</h2>
<table>
  <tr>
    <td style="width:33%;text-align:center;"><div class="lbl">Total Slots</div><div class="big">${userSlots.length}</div></td>
    <td style="width:33%;text-align:center;"><div class="lbl">Categories Joined</div><div class="big">${categories.length}</div></td>
    <td style="width:34%;text-align:center;"><div class="lbl">Total Balance</div><div class="big">${totalBalance.toLocaleString()} ETB</div></td>
  </tr>
</table>

<table style="margin-top:10px;">
  <thead>
    <tr>
      <th>#</th>
      <th>Category</th>
      <th>Slot #</th>
      <th>Monthly Contribution</th>
      <th>Frequency</th>
      <th>Current Balance</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    ${slotRows}
    <tr class="total">
      <td colspan="4" style="text-align:left;">TOTAL</td>
      <td colspan="2" style="text-align:right;color:#059669;font-weight:bold;">${totalBalance.toLocaleString()} ETB</td>
      <td></td>
    </tr>
  </tbody>
</table>

<h2>3. CATEGORY BREAKDOWN</h2>
<table>
  <thead>
    <tr>
      <th>Category</th>
      <th>Slots</th>
      <th>Frequency</th>
      <th>Total Rounds</th>
      <th>Balance</th>
    </tr>
  </thead>
  <tbody>
    ${catSummary}
  </tbody>
</table>

<h2>4. TERMS &amp; CONDITIONS</h2>
<div class="legal">
  <h3>Agreement Between Member and Equb Circle</h3>
  <p>I, <span class="em">${member.name}</span> (Member ID: <span class="em">${member.id}</span>), hereby voluntarily agree to the following terms and conditions:</p>
  <ol>
    <li><span class="em">Nature of Equb:</span> I understand and acknowledge that "Equb" is a traditional Ethiopian savings circle (also known as "Iqub" or "Iddir" variant), where members contribute a fixed amount of money at regular intervals and take turns receiving the total pooled amount. I voluntarily join this circle of my own free will.</li>
    <li><span class="em">Deposit Obligations:</span> I agree to make all required deposits in full and on time as per the schedule assigned to my slot(s). Failure to make deposits within the stipulated time may result in penalties, including liens on my slot(s) and potential forfeiture of accumulated savings.</li>
    <li><span class="em">Penalties and Liens:</span> I acknowledge that repeated failure to make deposits (as defined by the circle's rules) may result in a lien being placed on my slot(s), restricting my access to funds until the lien is cleared. I understand that liens may be imposed after two (2) or more consecutive missed deposits.</li>
    <li><span class="em">Payout Rules:</span> I agree that payout amounts and schedules are determined by the circle administrators based on the agreed-upon rules. I shall have no claim to payouts beyond what is allocated by the circle's governing rules.</li>
    <li><span class="em">Withdrawal Policy:</span> I understand that I may request withdrawal from the circle subject to the circle's withdrawal policy. Early withdrawal may result in forfeiture of accumulated benefits, and I must provide at least thirty (30) days' written notice.</li>
    <li><span class="em">Personal Data:</span> I consent to the collection, storage, and processing of my personal information (including name, phone number, and financial records) solely for the purpose of managing my Equb membership and complying with applicable Ethiopian financial regulations.</li>
    <li><span class="em">Dispute Resolution:</span> I agree that any disputes arising from this agreement shall first be addressed through internal mediation by the circle administrators. If unresolved, disputes shall be referred to the appropriate authorities in Addis Ababa, Federal Democratic Republic of Ethiopia.</li>
    <li><span class="em">Governing Law:</span> This agreement shall be governed by and construed in accordance with the laws of the Federal Democratic Republic of Ethiopia, including applicable proclamations and regulations governing savings circles and financial cooperatives.</li>
    <li><span class="em">Digital Signature:</span> I acknowledge that this document bears my digital signature, which has the same legal force and effect as a handwritten signature under applicable Ethiopian law and the Electronic Transactions Proclamation.</li>
    <li><span class="em">Entire Agreement:</span> This document constitutes the entire agreement between the member and the Equb circle. Any amendments must be made in writing and signed by both parties.</li>
  </ol>
</div>

<h2>5. SIGNATURES &amp; OFFICIAL SEAL</h2>
<p style="font-size:10px;color:#888;margin-bottom:12px;">By signing below, both parties confirm they have read, understood, and agree to all terms and conditions stated in this agreement.</p>

<div class="sig">
<table>
  <tr>
    <td>
      <div class="stamp">OFFICIAL<br>STAMP</div>
      <div class="sigline"></div>
      <div class="siglbl">Member Signature</div>
      <div class="signame">${member.name}</div>
      <div class="siglbl">Member ID: ${member.id}</div>
      <div class="sigdt">Date: ${signatureDate}</div>
    </td>
    <td>
      <div class="stamp">EQUB<br>SEAL</div>
      <div class="sigline"></div>
      <div class="siglbl">Circle Administrator</div>
      <div class="signame">Equb Administrator</div>
      <div class="siglbl">Head Office &mdash; Addis Ababa</div>
      <div class="sigdt">Date: ${signatureDate}</div>
    </td>
  </tr>
</table>
</div>

<div class="ftr">
  <p><strong>EQUB</strong> &mdash; Ethiopian Savings Circle Platform</p>
  <p>Bole Road, Addis Ababa, Ethiopia | +251 911 00 0000 | info@equb-app.com</p>
  <p>This document is digitally generated and legally binding. Document Ref: ${docId}</p>
  <p>&copy; ${new Date().getFullYear()} Equb App. All rights reserved.</p>
</div>

</body>
</html>`

    try {
      const { base64: rawBase64 } = await Print.printToFileAsync({ html, base64: true })
      const b64 = rawBase64 || ''
      if (Platform.OS === 'web') {
        const byteChars = atob(b64)
        const byteNums = new Array(byteChars.length)
        for (let i = 0; i < byteChars.length; i++) byteNums[i] = byteChars.charCodeAt(i)
        const byteArr = new Uint8Array(byteNums)
        const blob = new Blob([byteArr], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `agreement-${member.name.replace(/\s+/g, '_')}-${docId}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } else {
        await Sharing.shareAsync(`data:application/pdf;base64,${b64}`, {
          mimeType: 'application/pdf',
          dialogTitle: `${member.name} - Equb Agreement`,
          UTI: 'com.adobe.pdf',
        })
      }
      showToast(isAm ? 'PDF ተፈጥሯል' : 'PDF generated successfully', 'success')
    } catch (err: any) {
      showToast(isAm ? `PDF ስህተት: ${err?.message}` : `PDF error: ${err?.message}`, 'error')
    }
  }

  /* ─── Round Management ─── */

  async function handleCreateRound() {
    if (!createRoundForm.name || !createRoundForm.amount || !createRoundForm.people_goal) {
      showToast(isAm ? 'እባክዎ ሁሉንም መረጃ ያስገቡ' : 'Please fill all required fields', 'error')
      return
    }
    setCreatingRound(true)
    try {
      await roundsApi.create(createRoundForm)
      showToast(isAm ? 'ክብዬ ተፈጥሯል' : 'Round created successfully', 'success')
      setShowCreateRound(false)
      setCreateRoundForm({
        name: '',
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
      fetchRounds()
    } catch (err) {
      showToast(isAm ? 'ክብዬ መፍጠር አልተሳካም' : 'Failed to create round', 'error')
    } finally {
      setCreatingRound(false)
    }
  }

  async function handleActivateRound(id: number) {
    try {
      await roundsApi.activate(id)
      showToast(isAm ? 'ክብዬ ተንቀሳቅሷል' : 'Round activated', 'success')
      fetchRounds()
    } catch (err) {
      showToast(isAm ? 'ክብዬ መንቀሳቀብ አልተሳካም' : 'Failed to activate round', 'error')
    }
  }

  async function handleCompleteRound(id: number) {
    try {
      await roundsApi.complete(id)
      showToast(isAm ? 'ክብዬ ተጠናቅቋል' : 'Round completed', 'success')
      fetchRounds()
    } catch (err) {
      showToast(isAm ? 'ክብዬ መጠናቀቅ አልተሳካም' : 'Failed to complete round', 'error')
    }
  }

  async function handleCancelRound(id: number) {
    try {
      await roundsApi.cancel(id)
      showToast(isAm ? 'ክብዬ ተ 취소 ችሏል' : 'Round cancelled', 'success')
      fetchRounds()
    } catch (err) {
      showToast(isAm ? 'ክብዬ መ 취소 አልተሳካም' : 'Failed to cancel round', 'error')
    }
  }

  async function handleDeleteRound(id: number) {
    try {
      await roundsApi.delete(id)
      showToast(isAm ? 'ክብዬ ጠፍቷል' : 'Round deleted', 'success')
      fetchRounds()
    } catch (err) {
      showToast(isAm ? 'ክብዬ ማስወገድ አልተሳካም' : 'Failed to delete round', 'error')
    }
  }

  async function handleRoundSpin(id: number) {
    setSpinLoading(`round-${id}`)
    try {
      await roundsApi.spin(id)
      showToast(isAm ? 'ዕጣ ተውሏል' : 'Draw complete!', 'success')
      fetchRounds()
    } catch (err: any) {
      const msg = err?.message || (isAm ? 'ዕጣ መወጣት አልተሳካም' : 'Failed to run spin')
      showToast(msg, 'error')
    } finally {
      setSpinLoading(null)
    }
  }

  function openEditRound(round: RoundData) {
    setEditingRound(round)
    setCreateRoundForm({
      name: round.name,
      category: round.category,
      amount: round.amount,
      frequency: round.frequency,
      people_goal: round.people_goal,
      total_rounds: round.total_rounds,
      winners_per_spin: round.winners_per_spin ?? 1,
      auto_spin_enabled: round.auto_spin_enabled,
      spin_time: round.spin_time,
      commission_rate: round.commission_rate,
    })
    setShowEditRound(true)
  }

  async function handleSaveEditRound() {
    if (!editingRound) return
    setSavingEdit(true)
    try {
      await roundsApi.update(editingRound.id, createRoundForm)
      showToast(isAm ? 'ክብዬ ተሻሽሏል' : 'Round updated', 'success')
      setShowEditRound(false)
      setEditingRound(null)
      fetchRounds()
    } catch (err) {
      showToast(isAm ? 'መስረት አልተሳካም' : 'Failed to update round', 'error')
    } finally {
      setSavingEdit(false)
    }
  }

  /* ─── Tab Renderers ─── */

  function renderOverview() {
    const stats = [
      { label: a.totalUsers, value: totalUsers.toString(), icon: 'people-outline' as const, gradient: ['#ecfdf5', '#d1fae5'] as const, accent: '#059669' },
      { label: a.totalSlots, value: totalSlots.toString(), icon: 'grid-outline' as const, gradient: ['#eff6ff', '#dbeafe'] as const, accent: '#0ea5e9' },
      { label: a.totalBalance, value: `ETB ${toLoc(totalBalance)}`, icon: 'wallet-outline' as const, gradient: ['#fffbeb', '#fef3c7'] as const, accent: '#f59e0b' },
      { label: a.totalPayouts, value: `ETB ${toLoc(totalPayouts)}`, icon: 'arrow-up-outline' as const, gradient: ['#fef2f2', '#fecaca'] as const, accent: '#ef4444' },
    ]
    return (
      <>
        <View style={styles.statsGrid}>
          {stats.map((stat, i) => (
            <LinearGradient key={i} colors={stat.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.statCard, { width: statCardWidth }]}>
              <View style={styles.statTopRow}>
                <LinearGradient
                  colors={[stat.accent, stat.accent + 'cc']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.statIconCircle}
                >
                  <Ionicons name={stat.icon} size={18} color="#fff" />
                </LinearGradient>
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
              <View style={[styles.statAccentBar, { backgroundColor: stat.accent + '30' }]}>
                <View style={[styles.statAccentBarFill, { backgroundColor: stat.accent, width: `${60 + i * 10}%` }]} />
              </View>
            </LinearGradient>
          ))}
        </View>

        <Card style={[styles.sectionCard, { backgroundColor: '#fafcfb' }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="pie-chart-outline" size={18} color={colors.primary} />
            <Text style={styles.sectionTitle}>{a.byCategory}</Text>
          </View>
          {CATEGORY_CODES.map(c => {
            const cfg = CATEGORY_CONFIG_MAP[c]
            const info = slotsByCat[c] || { total: 0, active: 0, balance: 0 }
            return (
              <View key={c} style={styles.catRow}>
                <View style={[styles.catDot, { backgroundColor: cfg?.barColor || colors.primary }]} />
                <Text style={styles.catLabel}>{cfg?.label || c}</Text>
                <Text style={styles.catInfo}>
                  {info.active}/{info.total} {a.active} · {toLoc(info.balance)} ETB
                </Text>
              </View>
            )
          })}
        </Card>

        <Card style={[styles.sectionCard, { backgroundColor: '#fafafa' }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="warning-outline" size={18} color="#f59e0b" />
            <Text style={styles.sectionTitle}>{a.riskStatus}</Text>
          </View>
          <View style={styles.riskRow}>
            <View style={styles.riskItem}>
              <Text style={[styles.riskNum, { color: '#ef4444' }]}>{lienSlots}</Text>
              <Text style={styles.riskLabel}>{a.activeLiens}</Text>
            </View>
            <View style={styles.riskDivider} />
            <View style={styles.riskItem}>
              <Text style={[styles.riskNum, { color: '#f59e0b' }]}>{delinquentSlots.length}</Text>
              <Text style={styles.riskLabel}>{a.delinquent}</Text>
            </View>
          </View>
        </Card>
      </>
    )
  }

  function renderMembers() {
    const filtered = MOCK_USERS.filter(u => {
      if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.phone.includes(search)) return false
      if (catFilter !== 'all') {
        const userSlots = MOCK_SLOTS.filter(s => s.userId === u.id)
        if (!userSlots.some(s => s.category === catFilter)) return false
      }
      if (memberRoundFilter !== 'all') {
        const userSlots = MOCK_SLOTS.filter(s => s.userId === u.id)
        if (!userSlots.some(s => {
          const round = rounds.find(r => r.category === s.category)
          return round && String(round.id) === memberRoundFilter
        })) return false
      }
      return true
    })
    const memberTotalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
    const memberSafePage = Math.min(memberPage, memberTotalPages)
    const paginatedMembers = filtered.slice((memberSafePage - 1) * PER_PAGE, memberSafePage * PER_PAGE)

    return (
      <>
        <View style={styles.searchRow}>
          <View style={styles.searchInputWrapper}>
            <Ionicons name="search-outline" size={16} color={colors.mutedForeground} />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={(t) => { setSearch(t); setMemberPage(1) }}
              placeholder={a.search}
              placeholderTextColor={colors.mutedForeground}
            />
            {search ? (
              <TouchableOpacity onPress={() => { setSearch(''); setMemberPage(1) }}>
                <Ionicons name="close-circle" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {['all', ...CATEGORY_CODES].map(c => (
            <TouchableOpacity
              key={c}
              style={[styles.filterChip, catFilter === c && styles.filterChipActive]}
              onPress={() => { setCatFilter(c); setMemberPage(1) }}
            >
              <Text style={[styles.filterChipText, catFilter === c && styles.filterChipTextActive]}>
                {c === 'all' ? a.all : (CATEGORY_CONFIG_MAP[c]?.label || c)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.filterRow, { marginTop: 6 }]}>
          <TouchableOpacity
            style={[styles.filterChip, memberRoundFilter === 'all' && styles.filterChipActive]}
            onPress={() => { setMemberRoundFilter('all'); setMemberPage(1) }}
          >
            <Text style={[styles.filterChipText, memberRoundFilter === 'all' && styles.filterChipTextActive]}>
              {isAm ? 'ሁሉም' : 'All'}
            </Text>
          </TouchableOpacity>
          {rounds.map((r, idx) => (
            <TouchableOpacity
              key={r.id}
              style={[styles.filterChip, memberRoundFilter === String(r.id) && styles.filterChipActive]}
              onPress={() => { setMemberRoundFilter(String(r.id)); setMemberPage(1) }}
            >
              <Text style={[styles.filterChipText, memberRoundFilter === String(r.id) && styles.filterChipTextActive]}>
                R{idx + 1}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {paginatedMembers.map((u, idx) => {
          const userSlots = MOCK_SLOTS.filter(s => s.userId === u.id)
          const totalBalance = userSlots.reduce((sum, s) => sum + s.balance, 0)
          return (
            <TouchableOpacity key={u.id} activeOpacity={0.7} onPress={() => {
              setSelectedMember(u)
              setMemberDetailSlots(userSlots)
              setShowMemberModal(true)
            }}>
            <Card style={[styles.memberCard, { backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafcfe' }]}>
              <View style={styles.memberHeader}>
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberAvatarText}>{u.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{u.name}</Text>
                  <Text style={styles.memberMeta}>{u.phone} · {a.id}: {u.id}</Text>
                  <Text style={[styles.memberMeta, { color: colors.primary, fontWeight: '600' }]}>
                    {toLoc(totalBalance)} ETB · {userSlots.length} {isAm ? 'ቦታ' : 'slots'}
                  </Text>
                </View>
              </View>
              <View style={styles.slotRow}>
                {userSlots.map(slot => {
                  const cfg = CATEGORY_CONFIG_MAP[slot.category]
                  const isLien = slot.status !== 'active'
                  return (
                    <View key={slot.id} style={[styles.slotBadge, isLien && styles.slotBadgeLien]}>
                      <View style={styles.slotBadgeRow}>
                        <View style={[styles.slotBadgeDot, { backgroundColor: cfg?.barColor || colors.primary }]} />
                        <Text style={[styles.slotBadgeText, isLien && styles.slotBadgeTextLien]}>
                          {cfg?.label || slot.category} #{slot.slotNumber}
                        </Text>
                      </View>
                      <Text style={[styles.slotBadgeSub, isLien && styles.slotBadgeTextLien]}>
                        {toLoc(slot.balance)} ETB · {slot.status === 'active' ? a.active : a.lien}
                      </Text>
                    </View>
                  )
                })}
              </View>
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.callBtn} onPress={(e) => {
                  e.stopPropagation?.()
                  Linking.openURL(`tel:${u.phone}`)
                }}>
                  <Ionicons name="call-outline" size={13} color={colors.primary} />
                  <Text style={styles.callBtnText}>{isAm ? 'ደውል' : 'Call'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.callBtn, { borderColor: '#8b5cf6' }]} onPress={(e) => {
                  e.stopPropagation?.()
                  setSelectedMember(u)
                  setMemberDetailSlots(userSlots)
                  setShowMemberModal(true)
                }}>
                  <Ionicons name="eye-outline" size={13} color="#8b5cf6" />
                  <Text style={[styles.callBtnText, { color: '#8b5cf6' }]}>{isAm ? 'ተመልከт' : 'View'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.callBtn, { borderColor: '#f59e0b' }]} onPress={(e) => {
                  e.stopPropagation?.()
                  setSelectedMember(u)
                  setMemberDetailSlots(userSlots)
                  setShowMemberModal(true)
                }}>
                  <Ionicons name="create-outline" size={13} color="#f59e0b" />
                  <Text style={[styles.callBtnText, { color: '#f59e0b' }]}>{isAm ? 'አስተካክል' : 'Edit'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.callBtn, { borderColor: '#ef4444' }]} onPress={(e) => {
                  e.stopPropagation?.()
                  Alert.alert(
                    isAm ? 'ሰርዝ?' : 'Delete?',
                    `${isAm ? 'ፈagit?' : 'Delete'} ${u.name}?`,
                    [
                      { text: isAm ? 'ተመለስ' : 'Cancel', style: 'cancel' },
                      { text: isAm ? 'ሰርዝ' : 'Delete', style: 'destructive', onPress: () => {
                        const userIdx = MOCK_USERS.findIndex(us => us.id === u.id)
                        if (userIdx >= 0) MOCK_USERS.splice(userIdx, 1)
                        const slotIds = MOCK_SLOTS.filter(s => s.userId === u.id).map(s => s.id)
                        slotIds.forEach(sid => {
                          const si = MOCK_SLOTS.findIndex(s => s.id === sid)
                          if (si >= 0) MOCK_SLOTS.splice(si, 1)
                        })
                        setRounds([...rounds])
                        showToast(isAm ? 'ተፈጥሯል' : 'Deleted', 'success')
                      }},
                    ]
                  )
                }}>
                  <Ionicons name="trash-outline" size={13} color="#ef4444" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.memberPdfBtn]} onPress={(e) => {
                  e.stopPropagation?.()
                  generateMemberPDF(u)
                }}>
                  <Ionicons name="document-text-outline" size={13} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </Card>
            </TouchableOpacity>
          )
        })}
        {filtered.length === 0 && <Text style={styles.emptyText}>{a.noMembers}</Text>}
        {memberTotalPages > 1 && (
          <PaginationBar
            currentPage={memberPage}
            totalPages={memberTotalPages}
            onPrev={() => setMemberPage((p) => Math.max(1, p - 1))}
            onNext={() => setMemberPage((p) => Math.min(memberTotalPages, p + 1))}
          />
        )}
      </>
    )
  }

  function renderWinners() {
    const wTotalPages = Math.max(1, Math.ceil(filteredWinners.length / PER_PAGE))
    const wSafePage = Math.min(winnerPage, wTotalPages)
    const paginatedWinners2 = filteredWinners.slice((wSafePage - 1) * PER_PAGE, wSafePage * PER_PAGE)

    const totalPaid = filteredWinners.reduce((s, d) => s + d.netPayout, 0)
    const biggestWin = filteredWinners.length ? Math.max(...filteredWinners.map(d => d.netPayout)) : 0
    const avgPayout = filteredWinners.length ? Math.round(totalPaid / filteredWinners.length) : 0

    return (
      <>
        {/* Stats Strip */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.winnerStatsStrip} contentContainerStyle={{ gap: 10, paddingHorizontal: 4 }}>
          <View style={[styles.winnerStatItem, { backgroundColor: '#fefce8' }]}>
            <View style={[styles.winnerStatIconWrap, { backgroundColor: '#eab30820' }]}>
              <Ionicons name="trophy" size={14} color="#eab308" />
            </View>
            <View>
              <Text style={styles.winnerStatValue}>{toLoc(totalPaid)} ETB</Text>
              <Text style={styles.winnerStatLabel}>{isAm ? 'ጠቅላላ የተከፈለ' : 'Total Paid'}</Text>
            </View>
          </View>
          <View style={[styles.winnerStatItem, { backgroundColor: '#eff6ff' }]}>
            <View style={[styles.winnerStatIconWrap, { backgroundColor: '#0ea5e920' }]}>
              <Ionicons name="arrow-up" size={14} color="#0ea5e9" />
            </View>
            <View>
              <Text style={styles.winnerStatValue}>{toLoc(biggestWin)} ETB</Text>
              <Text style={styles.winnerStatLabel}>{isAm ? 'ትልቁ ሽልማት' : 'Biggest Win'}</Text>
            </View>
          </View>
          <View style={[styles.winnerStatItem, { backgroundColor: '#f0fdf4' }]}>
            <View style={[styles.winnerStatIconWrap, { backgroundColor: '#05966920' }]}>
              <Ionicons name="calculator" size={14} color="#059669" />
            </View>
            <View>
              <Text style={styles.winnerStatValue}>{toLoc(avgPayout)} ETB</Text>
              <Text style={styles.winnerStatLabel}>{isAm ? 'አማካይ' : 'Avg Payout'}</Text>
            </View>
          </View>
          <View style={[styles.winnerStatItem, { backgroundColor: '#faf5ff' }]}>
            <View style={[styles.winnerStatIconWrap, { backgroundColor: '#8b5cf620' }]}>
              <Ionicons name="people" size={14} color="#8b5cf6" />
            </View>
            <View>
              <Text style={styles.winnerStatValue}>{filteredWinners.length}</Text>
              <Text style={styles.winnerStatLabel}>{isAm ? 'አሸናፊዎች' : 'Winners'}</Text>
            </View>
          </View>
        </ScrollView>

        {/* Filters */}
        <View style={styles.searchRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
            {['all', ...CATEGORY_CODES].map(c => (
              <TouchableOpacity
                key={c}
                style={[styles.filterChip, catFilter === c && styles.filterChipActive]}
                onPress={() => { setCatFilter(c); setWinnerPage(1) }}
              >
                <Text style={[styles.filterChipText, catFilter === c && styles.filterChipTextActive]}>
                  {c === 'all' ? a.all : (CATEGORY_CONFIG_MAP[c]?.label || c)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
            {['all', ...uniqueRounds.map(r => r.toString())].map(r => (
              <TouchableOpacity
                key={r}
                style={[styles.filterChip, roundFilter === r && styles.filterChipActive]}
                onPress={() => { setRoundFilter(r); setWinnerPage(1) }}
              >
                <Text style={[styles.filterChipText, roundFilter === r && styles.filterChipTextActive]}>
                  {r === 'all' ? a.all : `${a.round} ${r}`}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Cards */}
        {filteredWinners.length === 0 && (
          <Text style={styles.emptyText}>{a.noWinners}</Text>
        )}
        {paginatedWinners2.map((d, i) => {
          const cfg = CATEGORY_CONFIG_MAP[d.category]
          const isHero = i === 0 && wSafePage === 1
          const isExpanded = expandedCard === d.spinId

          if (isHero) {
            return (
              <TouchableOpacity key={d.spinId} activeOpacity={0.98}>
                <LinearGradient
                  colors={['#fefce8', '#fef9c3', '#fde68a']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.heroCard}
                >
                  <View style={styles.heroTopRow}>
                    <View style={styles.heroTrophyRow}>
                      <View style={styles.heroTrophyCircle}>
                        <Ionicons name="trophy" size={20} color="#eab308" />
                      </View>
                      <View>
                        <Text style={styles.heroLabel}>{isAm ? 'የቅርብ ጊዜ አሸናፊ' : 'Most Recent Winner'}</Text>
                        <Text style={styles.heroRound}>{a.round} {d.round}</Text>
                      </View>
                    </View>
                    <View style={[styles.heroBadge, { backgroundColor: cfg?.barColor || colors.primary }]}>
                      <Text style={styles.heroBadgeText}>{cfg?.label || d.category}</Text>
                    </View>
                  </View>
                  <Text style={styles.heroName}>{d.winnerName || `${a.slot} #${d.winningSlot}`}</Text>
                  <Text style={styles.heroAmount}>{toLoc(d.netPayout)} ETB</Text>
                  <Text style={styles.heroMeta}>{a.slot} #{d.winningSlot} · {formatDate(d.timestamp)}</Text>
                  <TouchableOpacity style={styles.heroPayoutBtn} onPress={() => handleWinnerPayout(d)} activeOpacity={0.8}>
                    <Ionicons name="cash-outline" size={16} color="#fff" />
                    <Text style={styles.heroPayoutBtnText}>{a.payWinner}</Text>
                  </TouchableOpacity>
                </LinearGradient>
              </TouchableOpacity>
            )
          }

          return (
            <TouchableOpacity key={d.spinId} activeOpacity={0.95} onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
              setExpandedCard(expandedCard === d.spinId ? null : d.spinId)
            }}>
              <View style={styles.winnerCard}>
                <View style={styles.cardFrontRow}>
                  <View style={[styles.cardCatDot, { backgroundColor: cfg?.barColor || colors.primary }]} />
                  <View style={{ flex: 1 }}>
                    <View style={styles.cardFrontTop}>
                      <Text style={styles.cardLabel}>{cfg?.label || d.category}</Text>
                      <Text style={styles.cardRound}>R{d.round}</Text>
                      <Text style={styles.cardDate}>{formatDate(d.timestamp)}</Text>
                    </View>
                    <Text style={styles.cardName} numberOfLines={1}>{d.winnerName || `${a.slot} #${d.winningSlot}`}</Text>
                  </View>
                  <Text style={styles.cardAmount}>{toLoc(d.netPayout)}</Text>
                </View>
                {isExpanded && (
                  <View style={styles.cardExpanded}>
                    <View style={styles.cardExpandedMeta}>
                      <Ionicons name="location-outline" size={12} color={colors.mutedForeground} />
                      <Text style={styles.cardExpandedMetaText}>{a.slot} #{d.winningSlot}</Text>
                      <View style={styles.cardExpandedDot} />
                      <Ionicons name="calendar-outline" size={12} color={colors.mutedForeground} />
                      <Text style={styles.cardExpandedMetaText}>{formatDate(d.timestamp)}</Text>
                    </View>
                    <TouchableOpacity style={styles.cardPayoutBtn} onPress={() => handleWinnerPayout(d)} activeOpacity={0.8}>
                      <Ionicons name="cash-outline" size={16} color="#fff" />
                      <Text style={styles.cardPayoutBtnText}>{a.payWinner} — {toLoc(d.netPayout)} ETB</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          )
        })}
        {wTotalPages > 1 && (
          <PaginationBar
            currentPage={winnerPage}
            totalPages={wTotalPages}
            onPrev={() => setWinnerPage((p) => Math.max(1, p - 1))}
            onNext={() => setWinnerPage((p) => Math.min(wTotalPages, p + 1))}
          />
        )}

        {/* Payout Modal */}
        <Modal visible={showPayoutModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {payoutStep === 'dial' && (
                <>
                  <View style={styles.modalIconCircle}>
                    <Ionicons name="phone-portrait-outline" size={32} color={colors.primary} />
                  </View>
                  <Text style={styles.modalTitle}>{a.telebirrTransfer}</Text>
                  <Text style={styles.modalAmount}>{toLoc(selectedWinner?.netPayout || 0)} ETB</Text>
                  <Text style={styles.modalRecipient}>
                    {isAm ? 'ለ' : 'To'}: {selectedWinner?.winnerName || `${a.slot} #${selectedWinner?.winningSlot}`}
                  </Text>
                  <Text style={styles.ussdDialing}>{a.dialing}</Text>
                  <Text style={styles.ussdCode}>*847*123#</Text>
                  <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 16 }} />
                </>
              )}
              {payoutStep === 'password' && (
                <>
                  <View style={[styles.modalIconCircle, { backgroundColor: '#fef3c7' }]}>
                    <Ionicons name="lock-closed" size={32} color="#f59e0b" />
                  </View>
                  <Text style={styles.modalTitle}>{a.enterPin}</Text>
                  <Text style={styles.modalSub}>{a.telebirrPin}</Text>
                  <TextInput
                    style={styles.ussdInput}
                    value={payoutPassword}
                    onChangeText={setPayoutPassword}
                    placeholder="******"
                    placeholderTextColor={colors.mutedForeground}
                    secureTextEntry
                    keyboardType="number-pad"
                    maxLength={10}
                  />
                  {payoutError ? <Text style={styles.errorText}>{payoutError}</Text> : null}
                  <View style={styles.modalBtnRow}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowPayoutModal(false)}>
                      <Text style={styles.cancelBtnText}>{a.cancel}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.submitBtn} onPress={handlePayoutPasswordSubmit} disabled={!payoutPassword}>
                      <Text style={styles.submitBtnText}>{a.confirm}</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
              {payoutStep === 'processing' && (
                <>
                  <View style={[styles.modalIconCircle, { backgroundColor: '#eff6ff' }]}>
                    <ActivityIndicator color={colors.primary} size="large" />
                  </View>
                  <Text style={styles.modalTitle}>{a.transferring}</Text>
                  <Text style={styles.modalSub}>{a.fundsBeingTransferred}</Text>
                </>
              )}
              {payoutStep === 'success' && (
                <>
                  <View style={[styles.modalIconCircle, { backgroundColor: '#ecfdf5' }]}>
                    <Ionicons name="checkmark-circle" size={48} color="#059669" />
                  </View>
                  <Text style={styles.modalTitle}>{a.paymentSuccessful}</Text>
                  <Text style={styles.modalAmount}>{toLoc(selectedWinner?.netPayout || 0)} ETB {a.transferred}</Text>
                  <TouchableOpacity style={styles.doneBtn} onPress={() => setShowPayoutModal(false)}>
                    <Text style={styles.doneBtnText}>{a.done}</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </Modal>
      </>
    )
  }

  function renderRounds() {
    if (loadingRounds) {
      return (
        <View style={{ paddingVertical: 40, alignItems: 'center' }}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={{ marginTop: 12, color: colors.mutedForeground, fontFamily: fonts.regular, fontSize: 13 }}>
            {isAm ? 'ክብሮች እየተጫኑ...' : 'Loading rounds...'}
          </Text>
        </View>
      )
    }

    return (
      <>
        {/* Round Stats Strip */}
        {roundStats && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 4, marginBottom: 16 }}>
            <View style={[styles.winnerStatItem, { backgroundColor: '#f0fdf4' }]}>
              <View style={[styles.winnerStatIconWrap, { backgroundColor: '#05966920' }]}>
                <Ionicons name="refresh" size={14} color="#059669" />
              </View>
              <View>
                <Text style={styles.winnerStatValue}>{roundStats.active_rounds}</Text>
                <Text style={styles.winnerStatLabel}>{isAm ? 'ንቁ' : 'Active'}</Text>
              </View>
            </View>
            <View style={[styles.winnerStatItem, { backgroundColor: '#eff6ff' }]}>
              <View style={[styles.winnerStatIconWrap, { backgroundColor: '#0ea5e920' }]}>
                <Ionicons name="document-outline" size={14} color="#0ea5e9" />
              </View>
              <View>
                <Text style={styles.winnerStatValue}>{roundStats.total_rounds}</Text>
                <Text style={styles.winnerStatLabel}>{isAm ? 'ጠቅላላ' : 'Total'}</Text>
              </View>
            </View>
            <View style={[styles.winnerStatItem, { backgroundColor: '#fefce8' }]}>
              <View style={[styles.winnerStatIconWrap, { backgroundColor: '#eab30820' }]}>
                <Ionicons name="checkmark-circle-outline" size={14} color="#eab308" />
              </View>
              <View>
                <Text style={styles.winnerStatValue}>{roundStats.completed_rounds}</Text>
                <Text style={styles.winnerStatLabel}>{isAm ? 'ተጠናቅቋል' : 'Done'}</Text>
              </View>
            </View>
            <View style={[styles.winnerStatItem, { backgroundColor: '#faf5ff' }]}>
              <View style={[styles.winnerStatIconWrap, { backgroundColor: '#8b5cf620' }]}>
                <Ionicons name="wallet-outline" size={14} color="#8b5cf6" />
              </View>
              <View>
                <Text style={styles.winnerStatValue}>{toLoc(roundStats.total_payouts)}</Text>
                <Text style={styles.winnerStatLabel}>{isAm ? 'ክፍያ ETB' : 'Paid ETB'}</Text>
              </View>
            </View>
          </ScrollView>
        )}

        {/* Create Round Button */}
        <TouchableOpacity
          style={styles.spinBtn}
          onPress={() => {
            setCreateRoundForm({
              name: '',
              category: '500',
              amount: 500,
              frequency: 'daily',
              people_goal: 10,
              total_rounds: 12,
              auto_spin_enabled: true,
              spin_time: '08:00',
              commission_rate: 10,
            })
            setShowCreateRound(true)
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle-outline" size={16} color="#fff" />
          <Text style={styles.spinBtnText}>{isAm ? 'አዲስ ክብ ፍጠር' : 'Create New Round'}</Text>
        </TouchableOpacity>

        {/* Rounds List */}
        {rounds.length === 0 ? (
          <View style={{ paddingVertical: 32, alignItems: 'center' }}>
            <Ionicons name="layers-outline" size={32} color={colors.mutedForeground} />
            <Text style={{ marginTop: 8, color: colors.mutedForeground, fontFamily: fonts.regular, fontSize: 13 }}>
              {isAm ? 'ክብ የለም' : 'No rounds yet'}
            </Text>
            <Text style={{ marginTop: 4, color: colors.mutedForeground, fontFamily: fonts.regular, fontSize: 11 }}>
              {isAm ? 'ወይም የAPI ግንኙነት ስህተት ስለነው አይታይም' : 'Or API connection error'}
            </Text>
          </View>
        ) : (
          rounds.map((round) => {
            const cfg = CATEGORY_CONFIG_MAP[round.category]
            const statusColor = round.status === 'active' ? '#059669' : round.status === 'draft' ? '#f59e0b' : round.status === 'completed' ? '#8b5cf6' : '#ef4444'
            const statusBg = round.status === 'active' ? '#ecfdf5' : round.status === 'draft' ? '#fefce8' : round.status === 'completed' ? '#faf5ff' : '#fef2f2'
            const progressPct = round.people_goal > 0 ? Math.round((round.current_participants / round.people_goal) * 100) : 0

            return (
              <Card key={round.id} style={[styles.roundCard, { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#f1f5f9' }]}>
                {/* Header Row */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    <View style={[styles.roundCatBadge, { backgroundColor: cfg?.barColor || colors.primary }]}>
                      <Text style={styles.roundCatBadgeText}>{round.category} ETB</Text>
                    </View>
                    <Text style={[styles.roundStats, { marginBottom: 0, fontFamily: fonts.semiBold, fontSize: 13, color: colors.foreground }]} numberOfLines={1}>
                      {round.name}
                    </Text>
                  </View>
                  <View style={[styles.roundCatBadge, { backgroundColor: statusBg, paddingHorizontal: 8, paddingVertical: 3 }]}>
                    <Text style={[styles.roundCatBadgeText, { color: statusColor, fontSize: 9 }]}>
                      {round.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {/* Info Row */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  <View style={[styles.slotBadge, { minWidth: undefined, flex: undefined, paddingVertical: 5, paddingHorizontal: 8 }]}>
                    <Text style={[styles.slotBadgeText, { fontSize: 10 }]}>
                      {round.frequency === 'daily' ? (isAm ? 'በየቀኑ' : 'Daily') : round.frequency === 'weekly' ? (isAm ? 'ሳምንታዊ' : 'Weekly') : (isAm ? 'ወራዊ' : 'Monthly')}
                    </Text>
                  </View>
                  <View style={[styles.slotBadge, { minWidth: undefined, flex: undefined, paddingVertical: 5, paddingHorizontal: 8 }]}>
                    <Text style={[styles.slotBadgeText, { fontSize: 10 }]}>{toLoc(round.amount)} ETB</Text>
                  </View>
                  <View style={[styles.slotBadge, { minWidth: undefined, flex: undefined, paddingVertical: 5, paddingHorizontal: 8 }]}>
                    <Text style={[styles.slotBadgeText, { fontSize: 10 }]}>
                      {round.current_participants}/{round.people_goal} {isAm ? 'ሰዎች' : 'ppl'}
                    </Text>
                  </View>
                  <View style={[styles.slotBadge, { minWidth: undefined, flex: undefined, paddingVertical: 5, paddingHorizontal: 8 }]}>
                    <Text style={[styles.slotBadgeText, { fontSize: 10 }]}>
                      {isAm ? 'ክብ' : 'R'} {round.current_round_number}/{round.total_rounds}
                    </Text>
                  </View>
                  <View style={[styles.slotBadge, { minWidth: undefined, flex: undefined, paddingVertical: 5, paddingHorizontal: 8 }]}>
                    <Text style={[styles.slotBadgeText, { fontSize: 10 }]}>
                      {round.commission_rate}%
                    </Text>
                  </View>
                </View>

                {/* Progress Bar */}
                {round.people_goal > 0 && (
                  <View style={[styles.roundBar, { marginBottom: 6 }]}>
                    <View style={[styles.roundBarFill, { width: `${Math.min(progressPct, 100)}%`, backgroundColor: statusColor }]} />
                  </View>
                )}

                {/* Dates */}
                {round.start_date && (
                  <Text style={[styles.roundStats, { marginBottom: 10, fontSize: 10 }]}>
                    {formatDate(round.start_date)} — {round.end_date ? formatDate(round.end_date) : '...'}
                  </Text>
                )}

                {/* Action Buttons */}
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                  {round.status === 'draft' && (
                    <TouchableOpacity
                      style={[styles.callBtn, { backgroundColor: '#ecfdf5' }]}
                      onPress={() => handleActivateRound(round.id)}
                    >
                      <Ionicons name="play-outline" size={12} color="#059669" />
                      <Text style={[styles.callBtnText, { color: '#059669' }]}>{isAm ? 'ጀምር' : 'Start'}</Text>
                    </TouchableOpacity>
                  )}
                  {round.status === 'active' && (
                    <>
                      {round.current_participants >= round.people_goal ? (
                        <TouchableOpacity
                          style={[styles.callBtn, { backgroundColor: '#ecfdf5' }]}
                          onPress={() => handleRoundSpin(round.id)}
                          disabled={spinLoading === `round-${round.id}`}
                        >
                          {spinLoading === `round-${round.id}` ? (
                            <ActivityIndicator color="#059669" size={12} />
                          ) : (
                            <Ionicons name="shuffle" size={12} color="#059669" />
                          )}
                          <Text style={[styles.callBtnText, { color: '#059669' }]}>{isAm ? 'ዕጣ ዘንድ' : 'Spin'}</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={[styles.callBtn, { backgroundColor: '#fefce8', opacity: 0.7 }]}>
                          <Ionicons name="lock-closed-outline" size={12} color="#eab308" />
                          <Text style={[styles.callBtnText, { color: '#eab308' }]}>
                            {round.current_participants}/{round.people_goal}
                          </Text>
                        </View>
                      )}
                      <TouchableOpacity
                        style={[styles.depositBtn, { backgroundColor: '#f0fdf4' }]}
                        onPress={() => handleCompleteRound(round.id)}
                      >
                        <Ionicons name="checkmark-circle-outline" size={12} color="#059669" />
                        <Text style={[styles.depositBtnText, { color: '#059669' }]}>{isAm ? 'ተጠናቅቅ' : 'Done'}</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {/* Edit Button - available for draft and active rounds */}
                  {round.status !== 'completed' && round.status !== 'cancelled' && (
                    <TouchableOpacity
                      style={[styles.callBtn, { backgroundColor: '#eff6ff' }]}
                      onPress={() => openEditRound(round)}
                    >
                      <Ionicons name="create-outline" size={12} color="#0ea5e9" />
                      <Text style={[styles.callBtnText, { color: '#0ea5e9' }]}>{isAm ? 'አስተካክል' : 'Edit'}</Text>
                    </TouchableOpacity>
                  )}
                  {round.status !== 'completed' && round.status !== 'cancelled' && (
                    <TouchableOpacity
                      style={[styles.lienBtn, { backgroundColor: '#fef2f2' }]}
                      onPress={() => handleCancelRound(round.id)}
                    >
                      <Ionicons name="close-circle-outline" size={12} color="#ef4444" />
                      <Text style={[styles.lienBtnText, { color: '#ef4444' }]}>{isAm ? 'ሰርዝ' : 'Cancel'}</Text>
                    </TouchableOpacity>
                  )}
                  {(round.status === 'draft' || round.status === 'cancelled') && (
                    <TouchableOpacity
                      style={[styles.lienBtn, { backgroundColor: '#fef2f2' }]}
                      onPress={() => handleDeleteRound(round.id)}
                    >
                      <Ionicons name="trash-outline" size={12} color="#ef4444" />
                      <Text style={[styles.lienBtnText, { color: '#ef4444' }]}>{isAm ? 'ሰርዝ' : 'Delete'}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </Card>
            )
          })
        )}

        {/* ═══════ CREATE ROUND MODAL ═══════ */}
        <Modal visible={showCreateRound} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.roundFormModal}>
              <View style={styles.roundFormHeader}>
                <View style={styles.roundFormHeaderLeft}>
                  <View style={[styles.roundFormIconCircle, { backgroundColor: '#ecfdf5' }]}>
                    <Ionicons name="add-circle" size={22} color={colors.primary} />
                  </View>
                  <Text style={styles.roundFormTitle}>{isAm ? 'አዲስ ክብ ፍጠር' : 'Create New Round'}</Text>
                </View>
                <TouchableOpacity onPress={() => setShowCreateRound(false)} style={styles.roundFormClose}>
                  <Ionicons name="close" size={20} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.roundFormBody} showsVerticalScrollIndicator={false}>
                {/* Name */}
                <Text style={styles.roundFormFieldLabel}>{isAm ? 'ስም *' : 'Name *'}</Text>
                <TextInput
                  style={styles.roundFormInput}
                  value={createRoundForm.name}
                  onChangeText={(v) => setCreateRoundForm(f => ({ ...f, name: v }))}
                  placeholder={isAm ? 'የክብ ስም' : 'e.g. Monthly 500 ETB Circle'}
                  placeholderTextColor="#94a3b8"
                />

                {/* Category */}
                <Text style={styles.roundFormFieldLabel}>{isAm ? 'ምድብ *' : 'Category *'}</Text>
                <View style={styles.roundFormChipRow}>
                  {['100', '500', '1000', '2000', '5000'].map(c => (
                    <TouchableOpacity
                      key={c}
                      style={[styles.roundFormChip, createRoundForm.category === c && styles.roundFormChipActive]}
                      onPress={() => setCreateRoundForm(f => ({ ...f, category: c, amount: parseInt(c) }))}
                    >
                      <Text style={[styles.roundFormChipText, createRoundForm.category === c && styles.roundFormChipTextActive]}>
                        {c}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Amount */}
                <Text style={styles.roundFormFieldLabel}>{isAm ? 'መጠን (ETB) *' : 'Amount (ETB) *'}</Text>
                <TextInput
                  style={styles.roundFormInput}
                  value={String(createRoundForm.amount)}
                  onChangeText={(v) => setCreateRoundForm(f => ({ ...f, amount: parseInt(v) || 0 }))}
                  keyboardType="number-pad"
                  placeholder="500"
                  placeholderTextColor="#94a3b8"
                />

                {/* Frequency */}
                <Text style={styles.roundFormFieldLabel}>{isAm ? 'የድግስ ድግብ *' : 'Frequency *'}</Text>
                <View style={styles.roundFormChipRow}>
                  {(['daily', 'weekly', 'monthly'] as const).map(f => (
                    <TouchableOpacity
                      key={f}
                      style={[styles.roundFormChip, createRoundForm.frequency === f && styles.roundFormChipActive]}
                      onPress={() => setCreateRoundForm(fr => ({ ...fr, frequency: f, winners_per_spin: f === 'daily' ? 2 : f === 'weekly' ? 2 : 1 }))}
                    >
                      <Text style={[styles.roundFormChipText, createRoundForm.frequency === f && styles.roundFormChipTextActive]}>
                        {f === 'daily' ? (isAm ? 'ቀን' : 'Daily') : f === 'weekly' ? (isAm ? 'ሳምንት' : 'Weekly') : (isAm ? 'ወር' : 'Monthly')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Winners Per Spin */}
                <Text style={styles.roundFormFieldLabel}>{isAm ? 'በአንድ ዙር አሸናፊዎች ብዛት *' : 'Winners Per Round *'}</Text>
                <View style={styles.roundFormChipRow}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <TouchableOpacity
                      key={n}
                      style={[styles.roundFormChip, createRoundForm.winners_per_spin === n && styles.roundFormChipActive]}
                      onPress={() => setCreateRoundForm(f => ({ ...f, winners_per_spin: n }))}
                    >
                      <Text style={[styles.roundFormChipText, createRoundForm.winners_per_spin === n && styles.roundFormChipTextActive]}>{n}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* People Goal + Total Rounds */}
                <View style={styles.roundFormRow}>
                  <View style={styles.roundFormCol}>
                    <Text style={styles.roundFormFieldLabel}>{isAm ? 'ሰዎች ዓላማ *' : 'People Goal *'}</Text>
                    <TextInput
                      style={styles.roundFormInput}
                      value={String(createRoundForm.people_goal)}
                      onChangeText={(v) => setCreateRoundForm(f => ({ ...f, people_goal: parseInt(v) || 0 }))}
                      keyboardType="number-pad"
                      placeholder="10"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                  <View style={styles.roundFormCol}>
                    <Text style={styles.roundFormFieldLabel}>{isAm ? 'ጠቅላላ ድግሮች *' : 'Total Rounds *'}</Text>
                    <TextInput
                      style={styles.roundFormInput}
                      value={String(createRoundForm.total_rounds)}
                      onChangeText={(v) => setCreateRoundForm(f => ({ ...f, total_rounds: parseInt(v) || 0 }))}
                      keyboardType="number-pad"
                      placeholder="12"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                </View>

                {/* Commission + Spin Time */}
                <View style={styles.roundFormRow}>
                  <View style={styles.roundFormCol}>
                    <Text style={styles.roundFormFieldLabel}>{isAm ? 'ኮሚሽን %' : 'Commission %'}</Text>
                    <TextInput
                      style={styles.roundFormInput}
                      value={String(createRoundForm.commission_rate ?? 10)}
                      onChangeText={(v) => setCreateRoundForm(f => ({ ...f, commission_rate: parseFloat(v) || 0 }))}
                      keyboardType="decimal-pad"
                      placeholder="10"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                  <View style={styles.roundFormCol}>
                    <Text style={styles.roundFormFieldLabel}>{isAm ? 'የስপል ሰዓት' : 'Spin Time'}</Text>
                    <TextInput
                      style={styles.roundFormInput}
                      value={createRoundForm.spin_time ?? '08:00'}
                      onChangeText={(v) => setCreateRoundForm(f => ({ ...f, spin_time: v }))}
                      placeholder="08:00"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                </View>

                {/* Auto Spin Toggle */}
                <View style={styles.roundFormToggleRow}>
                  <Text style={[styles.roundFormFieldLabel, { marginBottom: 0 }]}>{isAm ? 'አὐቶማቲክ ስপል' : 'Auto Spin'}</Text>
                  <TouchableOpacity
                    style={[styles.roundFormChip, createRoundForm.auto_spin_enabled && styles.roundFormChipActive]}
                    onPress={() => setCreateRoundForm(f => ({ ...f, auto_spin_enabled: !f.auto_spin_enabled }))}
                  >
                    <Text style={[styles.roundFormChipText, createRoundForm.auto_spin_enabled && styles.roundFormChipTextActive]}>
                      {createRoundForm.auto_spin_enabled ? 'ON' : 'OFF'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>

              <View style={styles.roundFormFooter}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCreateRound(false)}>
                  <Text style={styles.cancelBtnText}>{a.cancel}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.submitBtn} onPress={handleCreateRound} disabled={creatingRound}>
                  {creatingRound ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.submitBtnText}>{isAm ? 'ፍጠር' : 'Create'}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ═══════ EDIT ROUND MODAL ═══════ */}
        <Modal visible={showEditRound} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.roundFormModal}>
              <View style={styles.roundFormHeader}>
                <View style={styles.roundFormHeaderLeft}>
                  <View style={[styles.roundFormIconCircle, { backgroundColor: '#eff6ff' }]}>
                    <Ionicons name="create" size={22} color="#0ea5e9" />
                  </View>
                  <Text style={styles.roundFormTitle}>{isAm ? 'ክብ አርም' : 'Edit Round'}</Text>
                </View>
                <TouchableOpacity onPress={() => { setShowEditRound(false); setEditingRound(null) }} style={styles.roundFormClose}>
                  <Ionicons name="close" size={20} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.roundFormBody} showsVerticalScrollIndicator={false}>
                <Text style={styles.roundFormFieldLabel}>{isAm ? 'ስም *' : 'Name *'}</Text>
                <TextInput
                  style={styles.roundFormInput}
                  value={createRoundForm.name}
                  onChangeText={(v) => setCreateRoundForm(f => ({ ...f, name: v }))}
                  placeholder="Round name"
                  placeholderTextColor="#94a3b8"
                />

                <Text style={styles.roundFormFieldLabel}>{isAm ? 'ምድብ *' : 'Category *'}</Text>
                <View style={styles.roundFormChipRow}>
                  {['100', '500', '1000', '2000', '5000'].map(c => (
                    <TouchableOpacity
                      key={c}
                      style={[styles.roundFormChip, createRoundForm.category === c && styles.roundFormChipActive]}
                      onPress={() => setCreateRoundForm(f => ({ ...f, category: c, amount: parseInt(c) }))}
                    >
                      <Text style={[styles.roundFormChipText, createRoundForm.category === c && styles.roundFormChipTextActive]}>
                        {c}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.roundFormFieldLabel}>{isAm ? 'መጠን (ETB) *' : 'Amount (ETB) *'}</Text>
                <TextInput
                  style={styles.roundFormInput}
                  value={String(createRoundForm.amount)}
                  onChangeText={(v) => setCreateRoundForm(f => ({ ...f, amount: parseInt(v) || 0 }))}
                  keyboardType="number-pad"
                  placeholder="500"
                  placeholderTextColor="#94a3b8"
                />

                <Text style={styles.roundFormFieldLabel}>{isAm ? 'ድግብ *' : 'Frequency *'}</Text>
                <View style={styles.roundFormChipRow}>
                  {(['daily', 'weekly', 'monthly'] as const).map(f => (
                    <TouchableOpacity
                      key={f}
                      style={[styles.roundFormChip, createRoundForm.frequency === f && styles.roundFormChipActive]}
                      onPress={() => setCreateRoundForm(fr => ({ ...fr, frequency: f, winners_per_spin: f === 'daily' ? 2 : f === 'weekly' ? 2 : 1 }))}
                    >
                      <Text style={[styles.roundFormChipText, createRoundForm.frequency === f && styles.roundFormChipTextActive]}>
                        {f === 'daily' ? (isAm ? 'ቀን' : 'Daily') : f === 'weekly' ? (isAm ? 'ሳምንት' : 'Weekly') : (isAm ? 'ወር' : 'Monthly')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Winners Per Spin */}
                <Text style={styles.roundFormFieldLabel}>{isAm ? 'በአንድ ዙር አሸናፊዎች ብዛት *' : 'Winners Per Round *'}</Text>
                <View style={styles.roundFormChipRow}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <TouchableOpacity
                      key={n}
                      style={[styles.roundFormChip, createRoundForm.winners_per_spin === n && styles.roundFormChipActive]}
                      onPress={() => setCreateRoundForm(f => ({ ...f, winners_per_spin: n }))}
                    >
                      <Text style={[styles.roundFormChipText, createRoundForm.winners_per_spin === n && styles.roundFormChipTextActive]}>{n}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.roundFormRow}>
                  <View style={styles.roundFormCol}>
                    <Text style={styles.roundFormFieldLabel}>{isAm ? 'ሰዎች ዓላማ *' : 'People Goal *'}</Text>
                    <TextInput
                      style={styles.roundFormInput}
                      value={String(createRoundForm.people_goal)}
                      onChangeText={(v) => setCreateRoundForm(f => ({ ...f, people_goal: parseInt(v) || 0 }))}
                      keyboardType="number-pad"
                      placeholder="10"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                  <View style={styles.roundFormCol}>
                    <Text style={styles.roundFormFieldLabel}>{isAm ? 'ጠቅላላ ድግሮች *' : 'Total Rounds *'}</Text>
                    <TextInput
                      style={styles.roundFormInput}
                      value={String(createRoundForm.total_rounds)}
                      onChangeText={(v) => setCreateRoundForm(f => ({ ...f, total_rounds: parseInt(v) || 0 }))}
                      keyboardType="number-pad"
                      placeholder="12"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                </View>

                <View style={styles.roundFormRow}>
                  <View style={styles.roundFormCol}>
                    <Text style={styles.roundFormFieldLabel}>{isAm ? 'ኮሚሽን %' : 'Commission %'}</Text>
                    <TextInput
                      style={styles.roundFormInput}
                      value={String(createRoundForm.commission_rate ?? 10)}
                      onChangeText={(v) => setCreateRoundForm(f => ({ ...f, commission_rate: parseFloat(v) || 0 }))}
                      keyboardType="decimal-pad"
                      placeholder="10"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                  <View style={styles.roundFormCol}>
                    <Text style={styles.roundFormFieldLabel}>{isAm ? 'የስপል ሰዓት' : 'Spin Time'}</Text>
                    <TextInput
                      style={styles.roundFormInput}
                      value={createRoundForm.spin_time ?? '08:00'}
                      onChangeText={(v) => setCreateRoundForm(f => ({ ...f, spin_time: v }))}
                      placeholder="08:00"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                </View>

                <View style={styles.roundFormToggleRow}>
                  <Text style={[styles.roundFormFieldLabel, { marginBottom: 0 }]}>{isAm ? 'አὐቶማቲክ ስপል' : 'Auto Spin'}</Text>
                  <TouchableOpacity
                    style={[styles.roundFormChip, createRoundForm.auto_spin_enabled && styles.roundFormChipActive]}
                    onPress={() => setCreateRoundForm(f => ({ ...f, auto_spin_enabled: !f.auto_spin_enabled }))}
                  >
                    <Text style={[styles.roundFormChipText, createRoundForm.auto_spin_enabled && styles.roundFormChipTextActive]}>
                      {createRoundForm.auto_spin_enabled ? 'ON' : 'OFF'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>

              <View style={styles.roundFormFooter}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowEditRound(false); setEditingRound(null) }}>
                  <Text style={styles.cancelBtnText}>{a.cancel}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.submitBtn} onPress={handleSaveEditRound} disabled={savingEdit}>
                  {savingEdit ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.submitBtnText}>{isAm ? 'አርም' : 'Save'}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </>
    )
  }

  function renderPayments() {
    const memberToday = MOCK_USERS.filter(u => {
      if (catFilter !== 'all') {
        const userSlots = MOCK_SLOTS.filter(s => s.userId === u.id)
        if (!userSlots.some(s => s.category === catFilter)) return false
      }
      if (memberRoundFilter !== 'all') {
        const userSlots = MOCK_SLOTS.filter(s => s.userId === u.id)
        if (!userSlots.some(s => {
          const round = rounds.find(r => r.category === s.category)
          return round && String(round.id) === memberRoundFilter
        })) return false
      }
      return true
    }).map(u => {
      const paid = MOCK_TODAY_STATUS[u.id] ?? false
      const slots = MOCK_SLOTS.filter(s => s.userId === u.id)
      return { user: u, paid, slots }
    }).filter(m => dailyStatusFilter === 'paid' ? m.paid : !m.paid)
    const dailyTotalPages = Math.max(1, Math.ceil(memberToday.length / PER_PAGE))
    const dailySafePage = Math.min(dailyPage, dailyTotalPages)
    const paginatedDaily = memberToday.slice((dailySafePage - 1) * PER_PAGE, dailySafePage * PER_PAGE)

    const paidToday = memberToday.filter(m => m.paid).length
    const totalToday = memberToday.length
    const rateToday = totalToday ? Math.round(paidToday / totalToday * 100) : 0

    const catPayData = CATEGORY_CODES.map(c => {
      const cfg = CATEGORY_CONFIG_MAP[c]
      const members = memberToday.filter(m => m.slots.some(s => s.category === c))
      const paid = members.filter(m => m.paid).length
      return { code: c, label: cfg?.label || c, color: cfg?.barColor || colors.primary, total: members.length, paid, pct: members.length ? Math.round(paid / members.length * 100) : 0 }
    })

    const userStreaks: Record<string, { streak: number; total: number }> = {
      'usr-1': { streak: 11, total: 12 }, 'usr-2': { streak: 10, total: 12 }, 'usr-3': { streak: 3, total: 12 },
      'usr-4': { streak: 12, total: 12 }, 'usr-5': { streak: 5, total: 12 }, 'usr-6': { streak: 8, total: 12 },
      'usr-7': { streak: 9, total: 12 }, 'usr-8': { streak: 2, total: 12 }, 'usr-9': { streak: 7, total: 12 },
      'usr-10': { streak: 4, total: 12 },
    }

    /* Heatmap: 5 weeks of demo payment intensity */
    const HEATMAP_DAYS = 35
    const heatmapDays = Array.from({ length: HEATMAP_DAYS }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (HEATMAP_DAYS - 1 - i))
      const dayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const dayPaid = MOCK_PAYMENTS.filter(p => p.timestamp.startsWith(dayStr) && p.status === 'success').length
      const intensity = dayPaid >= 4 ? 1 : dayPaid >= 2 ? 0.6 : dayPaid >= 1 ? 0.3 : 0.08
      return { day: d.getDay(), date: d.getDate(), intensity, key: dayStr }
    })
    const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

    return (
      <>
        {/* View Toggle */}
        <View style={styles.payToggleRow}>
          <TouchableOpacity
            style={[styles.payToggleBtn, paymentsView === 'daily' && styles.payToggleBtnActive]}
            onPress={() => setPaymentsView('daily')}
            activeOpacity={0.7}
          >
            <Ionicons name="today-outline" size={14} color={paymentsView === 'daily' ? '#fff' : colors.mutedForeground} />
            <Text style={[styles.payToggleText, paymentsView === 'daily' && styles.payToggleTextActive]}>{a.todaysStatus}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.payToggleBtn, paymentsView === 'history' && styles.payToggleBtnActive]}
            onPress={() => setPaymentsView('history')}
            activeOpacity={0.7}
          >
            <Ionicons name="list-outline" size={14} color={paymentsView === 'history' ? '#fff' : colors.mutedForeground} />
            <Text style={[styles.payToggleText, paymentsView === 'history' && styles.payToggleTextActive]}>{a.paymentLog}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.payToggleBtn, paymentsView === 'savings' && styles.payToggleBtnActive]}
            onPress={() => setPaymentsView('savings')}
            activeOpacity={0.7}
          >
            <Ionicons name="wallet-outline" size={14} color={paymentsView === 'savings' ? '#fff' : colors.mutedForeground} />
            <Text style={[styles.payToggleText, paymentsView === 'savings' && styles.payToggleTextActive]}>{isAm ? 'ቁጠባ' : 'Savings'}</Text>
          </TouchableOpacity>
        </View>

        {paymentsView === 'history' ? (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
              {(['all', 'paid', 'unpaid'] as const).map(f => (
                <TouchableOpacity
                  key={f}
                  style={[styles.filterChip, paymentDateFilter === f && styles.filterChipActive]}
                  onPress={() => { setPaymentDateFilter(f); setPaymentPage(1) }}
                >
                  <Text style={[styles.filterChipText, paymentDateFilter === f && styles.filterChipTextActive]}>
                    {f === 'all' ? a.all : f === 'paid' ? a.paid : a.unpaid}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={{ height: 8 }} />

            {filteredPayments.length === 0 && <Text style={styles.emptyText}>{isAm ? 'ክፍያ የለም' : 'No payments'}</Text>}
            {paginatedPayments.items.map((p, i) => (
              <View key={p.id} style={[styles.payLogCard, { backgroundColor: i % 2 === 0 ? '#ffffff' : '#fafcfe' }]}>
                <View style={styles.payLogRow}>
                  <View style={[styles.payLogAvatar, { backgroundColor: p.status === 'success' ? '#ecfdf5' : '#fef2f2' }]}>
                    <Ionicons name={p.status === 'success' ? 'checkmark' : 'close'} size={14} color={p.status === 'success' ? '#059669' : '#ef4444'} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberName}>{p.userName}</Text>
                    <Text style={styles.payLogMeta}>{formatDate(p.timestamp)} · {p.paymentGateway}</Text>
                  </View>
                  <Text style={[styles.payLogAmount, { color: p.status === 'success' ? '#059669' : '#ef4444' }]}>
                    {p.status === 'success' ? '+' : '-'} ETB {toLoc(p.amount)}
                  </Text>
                </View>
              </View>
            ))}
            {paginatedPayments.totalPages > 1 && (
              <PaginationBar
                currentPage={paymentPage}
                totalPages={paginatedPayments.totalPages}
                onPrev={() => setPaymentPage((p) => Math.max(1, p - 1))}
                onNext={() => setPaymentPage((p) => Math.min(paginatedPayments.totalPages, p + 1))}
              />
            )}
          </>
        ) : (
          <>
            {/* Idea 5: Summary Card */}
            <View style={styles.paySummaryRow}>
              <View style={[styles.paySummaryItem, { backgroundColor: '#f0fdf4' }]}>
                <Text style={styles.paySummaryValue}>{toLoc(paidToday * 500)}</Text>
                <Text style={styles.paySummaryLabel}>{isAm ? 'ዛሬ የተሰበሰበ' : 'Collected Today'}</Text>
              </View>
              <View style={[styles.paySummaryItem, { backgroundColor: '#eff6ff' }]}>
                <Text style={styles.paySummaryValue}>{paidToday}/{totalToday}</Text>
                <Text style={styles.paySummaryLabel}>{isAm ? 'የተከፈለ' : 'Paid'}</Text>
              </View>
              <View style={[styles.paySummaryItem, { backgroundColor: rateToday >= 70 ? '#f0fdf4' : '#fef2f2' }]}>
                <Text style={[styles.paySummaryValue, { color: rateToday >= 70 ? '#059669' : '#ef4444' }]}>{rateToday}%</Text>
                <Text style={styles.paySummaryLabel}>{isAm ? 'መጠን' : 'Rate'}</Text>
              </View>
            </View>

            {/* Idea 2: Category Progress Rings */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 4 }}>
              {catPayData.map(c => (
                <View key={c.code} style={styles.payCatRingCard}>
                  <ProgressRing pct={c.pct} size={52} color={c.color} />
                  <Text style={styles.payCatRingLabel}>{c.label}</Text>
                  <Text style={styles.payCatRingSub}>{c.paid}/{c.total}</Text>
                </View>
              ))}
            </ScrollView>

            {/* Idea 1: Calendar Heatmap */}
            <View style={styles.payHeatmapBox}>
              <View style={styles.payHeatmapHeader}>
                <Ionicons name="calendar-outline" size={13} color={colors.mutedForeground} />
                <Text style={styles.payHeatmapTitle}>{isAm ? 'የክፍያ ሙቀት ካርታ' : 'Payment Heatmap'}</Text>
              </View>
              <View style={styles.payHeatmapGrid}>
                {dayLabels.map((l, i) => (
                  <Text key={l} style={styles.payHeatmapDayLabel}>{l}</Text>
                ))}
                {heatmapDays.map((d, i) => (
                  <View key={d.key} style={[styles.payHeatmapCell, {
                    backgroundColor: d.intensity >= 1 ? '#059669' : d.intensity >= 0.5 ? '#86efac' : d.intensity >= 0.2 ? '#bbf7d0' : '#f1f5f9',
                    opacity: d.intensity >= 1 ? 1 : d.intensity >= 0.5 ? 0.8 : d.intensity >= 0.2 ? 0.7 : 0.5,
                  }]} />
                ))}
              </View>
            </View>

            {/* Category + Round Filters */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
              {['all', ...CATEGORY_CODES].map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.filterChip, catFilter === c && styles.filterChipActive]}
                  onPress={() => { setCatFilter(c); setDailyPage(1) }}
                >
                  <Text style={[styles.filterChipText, catFilter === c && styles.filterChipTextActive]}>
                    {c === 'all' ? a.all : (CATEGORY_CONFIG_MAP[c]?.label || c)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.filterRow, { marginTop: 6 }]}>
              <TouchableOpacity
                style={[styles.filterChip, memberRoundFilter === 'all' && styles.filterChipActive]}
                onPress={() => { setMemberRoundFilter('all'); setDailyPage(1) }}
              >
                <Text style={[styles.filterChipText, memberRoundFilter === 'all' && styles.filterChipTextActive]}>
                  {isAm ? 'ሁሉም' : 'All'}
                </Text>
              </TouchableOpacity>
              {rounds.map((r, idx) => (
                <TouchableOpacity
                  key={r.id}
                  style={[styles.filterChip, memberRoundFilter === String(r.id) && styles.filterChipActive]}
                  onPress={() => { setMemberRoundFilter(String(r.id)); setDailyPage(1) }}
                >
                  <Text style={[styles.filterChipText, memberRoundFilter === String(r.id) && styles.filterChipTextActive]}>
                    R{idx + 1}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.filterRow, { marginTop: 6 }]}>
              {(['unpaid', 'paid'] as const).map(f => (
                <TouchableOpacity
                  key={f}
                  style={[styles.filterChip, dailyStatusFilter === f && styles.filterChipActive]}
                  onPress={() => { setDailyStatusFilter(f); setDailyPage(1) }}
                >
                  <Text style={[styles.filterChipText, dailyStatusFilter === f && styles.filterChipTextActive]}>
                    {f === 'paid' ? a.paid : a.unpaid}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Triage Member List with Streak Bars */}
            {paginatedDaily
              .sort((a, b) => Number(a.paid) - Number(b.paid))
              .map((item) => {
                const streak = userStreaks[item.user.id] || { streak: 0, total: 12 }
                const streakPct = streak.total ? Math.round(streak.streak / streak.total * 100) : 0
                const userSlots = MOCK_SLOTS.filter(s => s.userId === item.user.id)
                return (
                  <View key={item.user.id} style={[styles.payMemberCard, { opacity: item.paid ? 0.65 : 1 }]}>
                    <View style={styles.payMemberRow}>
                      <View style={[styles.payMemberDot, { backgroundColor: item.paid ? '#059669' : '#ef4444' }]} />
                      <View style={styles.payMemberAvatar}>
                        <Text style={styles.payMemberAvatarText}>{item.user.name.charAt(0)}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.memberName, item.paid && { color: colors.mutedForeground }]}>{item.user.name}</Text>
                        <Text style={styles.memberMeta}>{item.user.phone}</Text>
                        <Text style={[styles.memberMeta, { fontSize: 9, color: '#6b7280' }]}>
                          {userSlots.map(s => CATEGORY_CONFIG_MAP[s.category]?.label || s.category).join(', ')}
                        </Text>
                      </View>
                      <View style={[styles.payMemberBadge, { backgroundColor: item.paid ? '#ecfdf5' : '#fef2f2' }]}>
                        <Text style={[styles.payMemberBadgeText, { color: item.paid ? '#059669' : '#ef4444' }]}>
                          {item.paid ? a.paid : a.unpaid}
                        </Text>
                      </View>
                    </View>

                    {/* Streak bar */}
                    <View style={styles.streakBar}>
                      <View style={styles.streakBarBg}>
                        <View style={[styles.streakBarFill, { width: `${streakPct}%`, backgroundColor: item.paid ? '#059669' : '#f59e0b' }]} />
                      </View>
                      <Text style={styles.streakBarLabel}>{streak.streak}/{streak.total} {isAm ? 'ቀናት' : 'days'}</Text>
                    </View>

                    {/* Action buttons */}
                    <View style={[styles.payActionRow, { flexWrap: 'wrap', gap: 6 }]}>
                      <TouchableOpacity style={styles.payCallBtn} onPress={() => {
                        Linking.openURL(`tel:${item.user.phone}`)
                      }}>
                        <Ionicons name="call-outline" size={12} color={colors.primary} />
                        <Text style={styles.payCallBtnText}>{isAm ? 'ደውል' : 'Call'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.payUssdBtn, { opacity: item.paid ? 0.4 : 1 }]}
                        disabled={item.paid}
                        onPress={() => {
                          Linking.openURL(`tel:*847*500*${item.user.phone.replace(/^0/, '')}#`)
                        }}
                      >
                        <Ionicons name="code-slash-outline" size={12} color="#059669" />
                        <Text style={styles.payUssdBtnText}>{isAm ? 'USSD' : 'USSD'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.payCallBtn, { backgroundColor: '#fef3c7', borderColor: '#f59e0b' }]}
                        onPress={() => {
                          Linking.openURL(`sms:${item.user.phone}?body=${encodeURIComponent(
                            isAm ? `ሰላም ${item.user.name}! የዛሬው ቁጠባ ክፍያዎን ያስፈፅሙ። እናመሰግናለን።` : `Hello ${item.user.name}! Please make today's savings payment. Thank you.`
                          )}`)
                        }}
                      >
                        <Ionicons name="chatbubble-outline" size={12} color="#f59e0b" />
                        <Text style={[styles.payCallBtnText, { color: '#f59e0b' }]}>{isAm ? 'SMS' : 'SMS'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )
              })}
            {dailyTotalPages > 1 && (
              <PaginationBar
                currentPage={dailyPage}
                totalPages={dailyTotalPages}
                onPrev={() => setDailyPage((p) => Math.max(1, p - 1))}
                onNext={() => setDailyPage((p) => Math.min(dailyTotalPages, p + 1))}
              />
            )}
          </>
        )}

        {paymentsView === 'savings' && (
          <>
            {/* Savings Stats */}
            <View style={{ backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a', borderRadius: 8, padding: 12, marginBottom: 12 }}>
              <Text style={{ fontSize: 11, color: '#92400e', fontWeight: '600' }}>
                {isAm ? 'ማስታወቂያ' : 'Notice'}
              </Text>
              <Text style={{ fontSize: 10, color: '#78350f', marginTop: 4, lineHeight: 15 }}>
                {isAm
                  ? 'አባሎች ከተመዝገቡ በኋላ 1 ወር ድሆ መውጫ አይችሉም። ከ1 ወር በኋላ ቁጠባቸውን ማስተረፍ ይችላሉ።'
                  : 'Members cannot withdraw within 1 month of registration. After 1 month they can request withdrawal.'}
              </Text>
            </View>

            <View style={styles.paySummaryRow}>
              <View style={[styles.paySummaryItem, { backgroundColor: '#f0fdf4' }]}>
                <Text style={styles.paySummaryValue}>{toLoc(savingsTotalBalance)}</Text>
                <Text style={styles.paySummaryLabel}>{isAm ? 'ጠቅላላ ቁጠባ' : 'Total Savings'}</Text>
              </View>
              <View style={[styles.paySummaryItem, { backgroundColor: '#eff6ff' }]}>
                <Text style={styles.paySummaryValue}>{savingsMembersCount}</Text>
                <Text style={styles.paySummaryLabel}>{isAm ? 'አባሎች' : 'Members'}</Text>
              </View>
            </View>

            {MOCK_SAVINGS.filter(s => s.balance > 0).map((s, idx) => {
              const user = MOCK_USERS.find(u => u.id === s.userId)
              if (!user) return null
              const regDate = new Date(user.joinedAt)
              const now = new Date()
              const monthsDiff = (now.getFullYear() - regDate.getFullYear()) * 12 + (now.getMonth() - regDate.getMonth())
              const canWithdraw = monthsDiff >= 1
              const commission = Math.round(s.balance * 0.03)
              const netAmount = s.balance - commission

              return (
                <Card key={s.userId} style={[styles.memberCard, { backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafcfe', marginBottom: 8 }]}>
                  <View style={styles.memberHeader}>
                    <View style={styles.memberAvatar}>
                      <Text style={styles.memberAvatarText}>{user.name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>{user.name}</Text>
                      <Text style={styles.memberMeta}>{user.phone}</Text>
                      <Text style={[styles.memberMeta, { color: colors.primary, fontWeight: '600' }]}>
                        {isAm ? 'ቀሪ' : 'Balance'}: {toLoc(s.balance)} ETB
                      </Text>
                    </View>
                    {!canWithdraw && (
                      <View style={{ backgroundColor: '#fef2f2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                        <Text style={{ fontSize: 9, color: '#ef4444', fontWeight: '600' }}>
                          {isAm ? '1 ወር ተቆልፏል' : 'Locked 1mo'}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    {canWithdraw && (
                      <TouchableOpacity
                        style={[styles.callBtn, { backgroundColor: '#059669' }]}
                        onPress={() => {
                          setSelectedWinner({ spinId: s.userId, category: '500', winningSlot: 0, winnerName: user.name, netPayout: netAmount, timestamp: '', round: 0 })
                          setPayoutPassword('')
                          setPayoutError('')
                          setPayoutStep('dial')
                          setShowPayoutModal(true)
                          Linking.openURL(`tel:*847*${netAmount}*${user.phone.replace(/^0/, '')}#`)
                        }}
                      >
                        <Ionicons name="call-outline" size={13} color="#fff" />
                        <Text style={[styles.callBtnText, { color: '#fff' }]}>{isAm ? 'ይውጥ (USSD)' : 'Pay (USSD)'}</Text>
                      </TouchableOpacity>
                    )}
                    <View style={{ backgroundColor: '#f8fafc', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#e5e7eb' }}>
                      <Text style={{ fontSize: 9, color: '#6b7280' }}>
                        {isAm ? 'ኮሚሽን' : 'Comm'}: {toLoc(commission)} ETB (3%)
                      </Text>
                    </View>
                    <View style={{ backgroundColor: '#f0fdf4', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#bbf7d0' }}>
                      <Text style={{ fontSize: 9, color: '#059669', fontWeight: '600' }}>
                        {isAm ? 'ለስላሳ' : 'Net'}: {toLoc(netAmount)} ETB
                      </Text>
                    </View>
                  </View>
                </Card>
              )
            })}

            {MOCK_SAVINGS.filter(s => s.balance > 0).length === 0 && (
              <Text style={styles.emptyText}>{isAm ? 'ምንም ቁጠባ የለም' : 'No savings found'}</Text>
            )}

            {/* Savings Payout Modal */}
            <Modal visible={showPayoutModal} transparent animationType="fade">
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  {payoutStep === 'dial' && (
                    <>
                      <View style={styles.modalIconCircle}>
                        <Ionicons name="phone-portrait-outline" size={32} color={colors.primary} />
                      </View>
                      <Text style={styles.modalTitle}>{isAm ? 'USSD ትራንስፎር' : 'USSD Transfer'}</Text>
                      <Text style={styles.modalAmount}>{toLoc(selectedWinner?.netPayout || 0)} ETB</Text>
                      <Text style={styles.modalRecipient}>
                        {isAm ? 'ለ' : 'To'}: {selectedWinner?.winnerName}
                      </Text>
                      <Text style={styles.ussdDialing}>{isAm ? 'እየተ撥ered...' : 'Dialing...'}</Text>
                      <Text style={styles.ussdCode}>*847*{selectedWinner?.netPayout}*</Text>
                      <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 16 }} />
                      <Text style={{ fontSize: 10, color: '#6b7280', marginTop: 8 }}>{isAm ? 'ትሬንዝፎሩን ያረጋግጡ' : 'Confirm the transfer'}</Text>
                    </>
                  )}
                  {payoutStep === 'password' && (
                    <>
                      <View style={[styles.modalIconCircle, { backgroundColor: '#fef3c7' }]}>
                        <Ionicons name="lock-closed" size={32} color="#f59e0b" />
                      </View>
                      <Text style={styles.modalTitle}>{a.enterPin}</Text>
                      <Text style={styles.modalSub}>{a.telebirrPin}</Text>
                      <TextInput
                        style={styles.ussdInput}
                        value={payoutPassword}
                        onChangeText={setPayoutPassword}
                        placeholder="******"
                        placeholderTextColor={colors.mutedForeground}
                        secureTextEntry
                        keyboardType="number-pad"
                        maxLength={10}
                      />
                      {payoutError ? <Text style={styles.errorText}>{payoutError}</Text> : null}
                      <View style={styles.modalBtnRow}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowPayoutModal(false)}>
                          <Text style={styles.cancelBtnText}>{a.cancel}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.submitBtn} onPress={handlePayoutPasswordSubmit} disabled={!payoutPassword}>
                          <Text style={styles.submitBtnText}>{a.confirm}</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                  {payoutStep === 'processing' && (
                    <>
                      <View style={[styles.modalIconCircle, { backgroundColor: '#eff6ff' }]}>
                        <ActivityIndicator color={colors.primary} size="large" />
                      </View>
                      <Text style={styles.modalTitle}>{isAm ? 'እየተ撥ered...' : 'Processing...'}</Text>
                      <Text style={styles.modalSub}>{isAm ? 'ትሬንዞር እየተስራ ነው' : 'Transfer in progress'}</Text>
                    </>
                  )}
                  {payoutStep === 'success' && (
                    <>
                      <View style={[styles.modalIconCircle, { backgroundColor: '#ecfdf5' }]}>
                        <Ionicons name="checkmark-circle" size={48} color="#059669" />
                      </View>
                      <Text style={styles.modalTitle}>{isAm ? 'ተሳክቷል' : 'Successful'}</Text>
                      <Text style={styles.modalAmount}>{toLoc(selectedWinner?.netPayout || 0)} ETB {isAm ? 'ተ撥Red' : 'transferred'}</Text>
                      <TouchableOpacity style={styles.doneBtn} onPress={() => setShowPayoutModal(false)}>
                        <Text style={styles.doneBtnText}>{a.done}</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            </Modal>
          </>
        )}
      </>
    )
  }

  return (
    <LinearGradient
      colors={['#f1f5f9', '#f8fafc', '#f1f5f9']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.root}
    >
      {/* Header */}
      <LinearGradient
        colors={['#059669', '#047857', '#065f46']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              style={[styles.langToggle, { backgroundColor: 'rgba(255,255,255,0.15)' }]}
              activeOpacity={0.7}
              onPress={() => showToast(isAm ? 'ማሳወቂያዎች የለም' : 'No notifications', 'info')}
            >
              <Ionicons name="notifications-outline" size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.langToggle, { backgroundColor: isLocked ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.15)' }]}
              activeOpacity={0.7}
              onPress={async () => {
                const wasLocked = isLocked
                await toggleLock()
                showToast(wasLocked ? (isAm ? 'መተግበሪያ ተከፍቷል' : 'App unlocked') : (isAm ? 'መተግበሪያ ተቆልፏል' : 'App locked'), wasLocked ? 'success' : 'info')
              }}
            >
              <Ionicons name={isLocked ? 'lock-closed' : 'lock-open-outline'} size={18} color="#fff" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            onPress={toggleLanguage}
            style={styles.langToggle}
            activeOpacity={0.7}
          >
            <Ionicons name="language-outline" size={16} color="#fff" />
            <Text style={styles.langText}>{lang === 'en' ? 'አማ' : 'EN'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.headerBody}>
          <View style={styles.adminAvatarCircle}>
            <Ionicons name={TAB_ICONS[activeTab] as any} size={28} color="#059669" />
          </View>
          <View style={styles.headerTextCol}>
            <Text style={styles.welcomeText}>{(a as any)[activeTab] || activeTab}</Text>
            <Text style={styles.memberSince}>
              {a.subtitle} · {totalUsers} {isAm ? 'ተጠቃሚዎች' : 'users'} · ETB {toLoc(totalBalance)}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Scrollable Content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'members' && renderMembers()}
        {activeTab === 'winners' && renderWinners()}
        {activeTab === 'payments' && renderPayments()}
        {activeTab === 'rounds' && renderRounds()}
        <TouchableOpacity style={styles.logoutFooter} onPress={async () => { await logout(); navigate('landing') }} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={18} color="#fff" />
          <Text style={styles.logoutFooterText}>{t.dashboard.logout}</Text>
        </TouchableOpacity>
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Bottom Tab Bar */}
      <View style={styles.bottomBarContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.whiteBottomBar}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tabItem, isActive && styles.tabItemActive]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.7}
              >
                <View style={[styles.tabIconWrapper, isActive && styles.tabIconWrapperActive]}>
                  <Ionicons
                    name={tab.icon as any}
                    size={isActive ? 22 : 20}
                    color={isActive ? '#fff' : colors.mutedForeground}
                  />
                </View>
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                  {(a as any)[tab.key] || tab.key}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>

      <MemberDetailModal
        visible={showMemberModal}
        user={selectedMember}
        slots={memberDetailSlots}
        allSlots={MOCK_SLOTS}
        onClose={() => { setShowMemberModal(false); setSelectedMember(null) }}
        onUpdateUser={(id, name, phone) => {
          const idx = MOCK_USERS.findIndex(u => u.id === id)
          if (idx !== -1) {
            MOCK_USERS[idx] = { ...MOCK_USERS[idx], name, phone }
            setSelectedMember(MOCK_USERS[idx])
          }
        }}
        onAssignSlot={(userId, category) => {
          const count = MOCK_SLOTS.filter(s => s.category === category).length
          const newSlot: Slot = {
            id: `s${category}-${count}`,
            userId,
            category,
            slotNumber: count + 1,
            status: 'active',
            balance: 0,
            consecutiveMissedSweeps: 0,
            depositedToday: false,
          }
          MOCK_SLOTS.push(newSlot)
          setMemberDetailSlots(MOCK_SLOTS.filter(s => s.userId === userId))
        }}
        onRemoveSlot={(slotId) => {
          const idx = MOCK_SLOTS.findIndex(s => s.id === slotId)
          if (idx !== -1) {
            MOCK_SLOTS.splice(idx, 1)
            if (selectedMember) setMemberDetailSlots(MOCK_SLOTS.filter(s => s.userId === selectedMember.id))
          }
        }}
        onToggleLien={(slotId) => {
          const idx = MOCK_SLOTS.findIndex(s => s.id === slotId)
          if (idx !== -1) {
            MOCK_SLOTS[idx] = { ...MOCK_SLOTS[idx], status: MOCK_SLOTS[idx].status === 'active' ? 'lien' : 'active' }
            if (selectedMember) setMemberDetailSlots([...MOCK_SLOTS.filter(s => s.userId === selectedMember.id)])
            setRounds([...rounds])
          }
        }}
      />

      {/* Lock Overlay */}
      {isLocked && (
        <View style={styles.lockOverlay}>
          <LinearGradient
            colors={['#065f46', '#047857', '#059669']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.lockContainer}
          >
            <View style={styles.lockIconCircle}>
              <Ionicons name="lock-closed" size={40} color="#059669" />
            </View>
            <Text style={styles.lockTitle}>{isAm ? 'መተግበሪያ ተቆልፏል' : 'App Locked'}</Text>
            <Text style={styles.lockSub}>{isAm ? 'ለመክፈት የይለፍ ቃልዎን ያስገቡ' : 'Enter your password to unlock'}</Text>
            <View style={styles.lockInputWrapper}>
              <Ionicons name="lock-open-outline" size={18} color="#94a3b8" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.lockInput}
                value={unlockPassword}
                onChangeText={(t) => { setUnlockPassword(t); setUnlockError('') }}
                placeholder={isAm ? 'የይለፍ ቃል' : 'Password'}
                placeholderTextColor="#94a3b8"
                secureTextEntry
                autoFocus
              />
            </View>
            {unlockError ? <Text style={styles.lockError}>{unlockError}</Text> : null}
            <TouchableOpacity
              style={styles.lockUnlockBtn}
              disabled={unlocking || !unlockPassword}
              activeOpacity={0.8}
              onPress={async () => {
                setUnlocking(true)
                try {
                  const ok = await verifyPassword(unlockPassword)
                  if (ok) {
                    await toggleLock()
                    setUnlockPassword('')
                    setUnlockError('')
                  } else {
                    setUnlockError(isAm ? 'የይለፍ ቃል ትክክል አይደለም' : 'Incorrect password')
                  }
                } catch {
                  setUnlockError(isAm ? 'ስህተት ተከስቷል' : 'An error occurred')
                } finally {
                  setUnlocking(false)
                }
              }}
            >
              {unlocking ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="lock-open-outline" size={18} color="#fff" />
                  <Text style={styles.lockUnlockBtnText}>{isAm ? 'ክፈት' : 'Unlock'}</Text>
                </>
              )}
            </TouchableOpacity>
          </LinearGradient>
        </View>
      )}
    </LinearGradient>
  )
}

/* ─── Styles ─── */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },

  /* ─── Header ─── */
  header: {
    paddingTop: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    zIndex: 10,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  logoutText: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: '#fca5a5',
    fontWeight: '600',
  },
  logoutFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#dc2626',
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 16,
  },
  logoutFooterText: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  langToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  langText: {
    fontFamily: fonts.semiBold,
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  headerBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
  },
  adminAvatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  headerTextCol: { gap: 2 },
  welcomeText: {
    fontFamily: fonts.bold,
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.3,
  },
  memberSince: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.65)',
  },

  /* ─── Scroll ─── */
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 120 },

  /* ─── Overview Stats ─── */
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    borderRadius: 20,
    padding: 18,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  statTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  statValue: {
    fontFamily: fonts.bold,
    fontSize: 20,
    fontWeight: '700',
    color: colors.foreground,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontFamily: fonts.medium,
    fontSize: 10,
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  statAccentBar: {
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 2,
  },
  statAccentBarFill: {
    height: '100%',
    borderRadius: 2,
  },

  /* ─── Shared Section ─── */
  sectionCard: {
    marginBottom: 16,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    fontWeight: '600',
    color: colors.foreground,
    flex: 1,
  },

  /* ─── Category Rows ─── */
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  catDot: { width: 10, height: 10, borderRadius: 5 },
  catLabel: {
    fontFamily: fonts.medium,
    fontSize: 12,
    fontWeight: '500',
    color: colors.foreground,
    flex: 1,
  },
  catInfo: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: colors.mutedForeground,
  },

  /* ─── Risk Status ─── */
  riskRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  riskItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  riskNum: {
    fontFamily: fonts.bold,
    fontSize: 22,
    fontWeight: '700',
  },
  riskLabel: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: colors.mutedForeground,
  },
  riskDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },

  /* ─── Search & Filters ─── */
  searchRow: {
    gap: 10,
    marginBottom: 4,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    height: 46,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.foreground,
    padding: 0,
  },
  filterRow: {
    flexDirection: 'row',
    maxHeight: 36,
  },
  filterChip: {
    backgroundColor: colors.muted,
    borderRadius: 100,
    paddingHorizontal: 14,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterChipText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    fontWeight: '500',
    color: colors.mutedForeground,
  },
  filterChipTextActive: { color: '#fff' },

  /* ─── Member Cards ─── */
  memberCard: {
    marginBottom: 12,
    padding: 14,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  memberAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  memberAvatarText: {
    color: '#fff',
    fontFamily: fonts.bold,
    fontSize: 17,
    fontWeight: '700',
  },
  memberInfo: { flex: 1 },
  memberPdfBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  memberName: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    fontWeight: '600',
    color: colors.foreground,
  },
  memberMeta: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  slotRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  slotBadge: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 10,
    flex: 1,
    minWidth: '45%',
  },
  slotBadgeLien: {
    backgroundColor: '#fef2f2',
  },
  slotBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  slotBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  slotBadgeText: {
    fontFamily: fonts.semiBold,
    fontSize: 10,
    fontWeight: '600',
    color: colors.foreground,
  },
  slotBadgeSub: {
    fontFamily: fonts.regular,
    fontSize: 9,
    color: colors.mutedForeground,
    marginTop: 4,
    marginLeft: 14,
  },
  slotBadgeTextLien: { color: '#ef4444' },
  actionRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ecfdf5',
    borderRadius: 100,
    paddingHorizontal: 10,
    height: 28,
  },
  callBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
  },
  depositBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#f0fdf4',
    borderRadius: 100,
    paddingHorizontal: 10,
    height: 28,
  },
  depositBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 10,
    fontWeight: '600',
    color: '#059669',
  },
  lienBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#fef2f2',
    borderRadius: 100,
    paddingHorizontal: 10,
    height: 28,
  },
  lienBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 10,
    fontWeight: '600',
    color: '#ef4444',
  },

  /* ─── Winner Cards ─── */

  winnerStatsStrip: {
    marginBottom: 12,
  },
  winnerStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 140,
  },
  winnerStatIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  winnerStatValue: {
    fontFamily: fonts.bold,
    fontSize: 14,
    fontWeight: '700',
    color: colors.foreground,
  },
  winnerStatLabel: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: colors.mutedForeground,
    marginTop: 1,
  },

  /* Hero card */
  heroCard: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroTrophyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heroTrophyCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#eab30820',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 9,
    fontWeight: '600',
    color: '#92400e',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroRound: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: '#92400e',
    opacity: 0.7,
    marginTop: 1,
  },
  heroBadge: {
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  heroBadgeText: {
    color: '#fff',
    fontFamily: fonts.semiBold,
    fontSize: 9,
    fontWeight: '600',
  },
  heroName: {
    fontFamily: fonts.bold,
    fontSize: 20,
    fontWeight: '700',
    color: '#1c1917',
    marginTop: 12,
  },
  heroAmount: {
    fontFamily: fonts.bold,
    fontSize: 26,
    fontWeight: '700',
    color: '#1c1917',
    marginTop: 2,
  },
  heroMeta: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: '#92400e',
    opacity: 0.7,
    marginTop: 4,
    marginBottom: 16,
  },
  heroPayoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1c1917',
    borderRadius: 100,
    paddingVertical: 13,
  },
  heroPayoutBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },

  /* Regular winner card */
  winnerCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardFrontRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardCatDot: {
    width: 4,
    height: 36,
    borderRadius: 2,
  },
  cardFrontTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  cardLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 10,
    fontWeight: '600',
    color: colors.foreground,
  },
  cardRound: {
    fontFamily: fonts.semiBold,
    fontSize: 9,
    fontWeight: '600',
    color: colors.mutedForeground,
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  cardDate: {
    fontFamily: fonts.regular,
    fontSize: 9,
    color: colors.mutedForeground,
  },
  cardName: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    fontWeight: '600',
    color: colors.foreground,
  },
  cardAmount: {
    fontFamily: fonts.bold,
    fontSize: 16,
    fontWeight: '700',
    color: colors.foreground,
  },

  /* Expanded section */
  cardExpanded: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    marginTop: 12,
    paddingTop: 12,
    gap: 12,
  },
  cardExpandedMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardExpandedDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.mutedForeground,
    marginHorizontal: 4,
  },
  cardExpandedMetaText: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: colors.mutedForeground,
  },
  cardPayoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 100,
    paddingVertical: 11,
  },
  cardPayoutBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },

  /* ─── Payout Modal ─── */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  modalIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 17,
    fontWeight: '600',
    color: colors.foreground,
    marginTop: 8,
  },
  modalSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.mutedForeground,
    marginTop: 4,
    textAlign: 'center',
  },
  modalAmount: {
    fontFamily: fonts.bold,
    fontSize: 26,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 8,
    textAlign: 'center',
  },
  modalRecipient: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.mutedForeground,
    marginTop: 4,
  },
  ussdDialing: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 16,
  },
  ussdCode: {
    fontFamily: fonts.bold,
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 4,
    letterSpacing: 2,
  },
  ussdInput: {
    width: '100%',
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
    paddingVertical: 8,
    fontSize: 18,
    textAlign: 'center',
    marginTop: 16,
    color: colors.foreground,
    fontFamily: fonts.semiBold,
    fontWeight: '600',
    letterSpacing: 4,
    marginBottom: 4,
  },
  errorText: {
    color: '#ef4444',
    fontFamily: fonts.regular,
    fontSize: 11,
    marginTop: 4,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: colors.muted,
    borderRadius: 100,
    paddingVertical: 13,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
  submitBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 100,
    paddingVertical: 13,
    alignItems: 'center',
  },
  submitBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  doneBtn: {
    backgroundColor: colors.primary,
    borderRadius: 100,
    paddingVertical: 13,
    paddingHorizontal: 48,
    marginTop: 24,
  },
  doneBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },

  /* ─── Round Cards ─── */
  roundCard: {
    marginBottom: 12,
    padding: 14,
  },
  roundHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  roundCatBadge: {
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  roundCatBadgeText: {
    color: '#fff',
    fontFamily: fonts.semiBold,
    fontSize: 10,
    fontWeight: '600',
  },
  roundNum: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    fontWeight: '600',
    color: colors.foreground,
  },
  roundBar: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  roundBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  roundStats: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: colors.mutedForeground,
    marginBottom: 8,
  },
  spinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 100,
    paddingVertical: 11,
  },
  spinBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  roundDrawList: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  drawListTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    fontWeight: '600',
    color: colors.mutedForeground,
    marginBottom: 6,
  },
  roundDrawItem: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: colors.mutedForeground,
    marginBottom: 4,
  },

  /* ─── Security ─── */
  securityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  securityLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  securityLabel: {
    fontFamily: fonts.medium,
    fontSize: 13,
    fontWeight: '500',
    color: colors.foreground,
  },
  securityBadge: {
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  securityBadgeText: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    fontWeight: '600',
  },
  securityInfo: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.mutedForeground,
    marginBottom: 12,
  },
  securityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 100,
    paddingVertical: 13,
  },
  securityBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  securityHint: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginTop: 8,
  },

  /* ─── Empty Text ─── */
  emptyText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.mutedForeground,
    textAlign: 'center',
    paddingVertical: 32,
  },

  /* ─── Payments ─── */
  /* ─── Payments ─── */

  payToggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  payToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.muted,
    borderRadius: 100,
    paddingVertical: 11,
  },
  payToggleBtnActive: {
    backgroundColor: colors.primary,
  },
  payToggleText: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
  payToggleTextActive: { color: '#fff' },

  /* Payment log entries */
  payLogCard: {
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  },
  payLogRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  payLogAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payLogMeta: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  payLogAmount: {
    fontFamily: fonts.bold,
    fontSize: 13,
    fontWeight: '700',
  },

  /* Summary row */
  paySummaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  paySummaryItem: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  paySummaryValue: {
    fontFamily: fonts.bold,
    fontSize: 15,
    fontWeight: '700',
    color: colors.foreground,
  },
  paySummaryLabel: {
    fontFamily: fonts.regular,
    fontSize: 8,
    color: colors.mutedForeground,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  /* Category progress rings */
  payCatRingCard: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    minWidth: 80,
    gap: 6,
  },
  payCatRingLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 9,
    fontWeight: '600',
    color: colors.foreground,
  },
  payCatRingSub: {
    fontFamily: fonts.regular,
    fontSize: 8,
    color: colors.mutedForeground,
  },

  /* Heatmap */
  payHeatmapBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginTop: 12,
    marginBottom: 16,
  },
  payHeatmapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  payHeatmapTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 10,
    fontWeight: '600',
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  payHeatmapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
  },
  payHeatmapDayLabel: {
    width: 18,
    fontSize: 8,
    textAlign: 'center',
    color: colors.mutedForeground,
    fontFamily: fonts.regular,
  },
  payHeatmapCell: {
    width: 18,
    height: 18,
    borderRadius: 4,
  },

  /* Triage member cards */
  payMemberCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  payMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  payMemberDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  payMemberAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payMemberAvatarText: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    fontWeight: '600',
    color: colors.foreground,
  },
  payMemberBadge: {
    borderRadius: 100,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  payMemberBadgeText: {
    fontFamily: fonts.semiBold,
    fontSize: 9,
    fontWeight: '600',
  },

  /* Streak bar */
  streakBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingLeft: 14,
  },
  streakBarBg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#f1f5f9',
    overflow: 'hidden',
  },
  streakBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  streakBarLabel: {
    fontFamily: fonts.regular,
    fontSize: 8,
    color: colors.mutedForeground,
    width: 42,
    textAlign: 'right',
  },

  /* Triage action buttons */
  payActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    paddingLeft: 14,
  },
  payCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ecfdf5',
    borderRadius: 100,
    paddingHorizontal: 14,
    height: 28,
  },
  payCallBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
  },
  payUssdBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0fdf4',
    borderRadius: 100,
    paddingHorizontal: 14,
    height: 28,
  },
  payUssdBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 10,
    fontWeight: '600',
    color: '#059669',
  },

  /* ─── Spin Error ─── */
  spinErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  spinErrorText: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: '#ef4444',
    flex: 1,
  },

  /* ─── Daily Savings ─── */
  savingsBalanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  savingsBalanceLabel: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  savingsBalanceValue: {
    fontFamily: fonts.bold,
    fontSize: 20,
    fontWeight: '700',
    color: '#f59e0b',
  },
  savingsPayoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f59e0b',
    borderRadius: 100,
    paddingVertical: 11,
    marginTop: 8,
  },
  savingsPayoutBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  savingsMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 4,
  },
  savingsMemberRowSelected: {
    backgroundColor: '#ecfdf5',
  },
  savingsMemberInfo: { flex: 1 },
  savingsMemberName: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    fontWeight: '600',
    color: colors.foreground,
  },
  savingsMemberPhone: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  savingsMemberBalance: {
    fontFamily: fonts.bold,
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
    marginRight: 8,
  },

  /* ─── Floating Bottom Tab Bar ─── */
  bottomBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  whiteBottomBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 28,
    marginHorizontal: 12,
    paddingVertical: 6,
    paddingHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 2,
  },
  tabItem: {
    alignItems: 'center',
    gap: 2,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 22,
    minWidth: 52,
  },
  tabItemActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  tabIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconWrapperActive: {},
  tabLabel: {
    fontFamily: fonts.medium,
    fontSize: 9,
    fontWeight: '500',
    color: colors.mutedForeground,
  },
  tabLabelActive: {
    color: '#fff',
    fontWeight: '600',
  },

  /* ─── Round Form Modal ─── */
  roundFormModal: {
    backgroundColor: '#fff',
    borderRadius: 24,
    marginHorizontal: 16,
    width: '100%',
    maxHeight: '90%',
    overflow: 'hidden',
  },
  roundFormHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  roundFormHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  roundFormIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundFormTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    fontWeight: '600',
    color: colors.foreground,
  },
  roundFormClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundFormBody: {
    padding: 20,
    maxHeight: 400,
  },
  roundFormFieldLabel: {
    fontFamily: fonts.medium,
    fontSize: 12,
    fontWeight: '500',
    color: colors.foreground,
    marginBottom: 6,
  },
  roundFormInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    height: 46,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.foreground,
    marginBottom: 14,
  },
  roundFormChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  roundFormChip: {
    backgroundColor: '#f1f5f9',
    borderRadius: 100,
    paddingHorizontal: 16,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundFormChipActive: {
    backgroundColor: colors.primary,
  },
  roundFormChipText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    fontWeight: '500',
    color: colors.mutedForeground,
  },
  roundFormChipTextActive: {
    color: '#fff',
  },
  roundFormRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  roundFormCol: {
    flex: 1,
  },
  roundFormToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  roundFormFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },

  /* ─── Lock Overlay ─── */
  lockOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 9999,
  },
  lockContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  lockIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  lockTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  lockSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: 32,
  },
  lockInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
    width: '100%',
    marginBottom: 12,
  },
  lockInput: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
  },
  lockError: {
    color: '#fca5a5',
    fontSize: 13,
    marginBottom: 12,
  },
  lockUnlockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    height: 50,
    width: '100%',
  },
  lockUnlockBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
})
