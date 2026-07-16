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
import { api, roundsApi, type RoundData, type RoundStats, type CreateRoundInput } from '../services/api'
import { updateSettings } from '../services/storage'
import { useEqubStore } from '../store/equbStore'

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

/* Demo rounds so the Lucky Spin / Dice Shaker can be tested without a backend.
   These are active and already at their participant goal, so the per-round
   SHAKE buttons render and operate. Used as a fallback when the API is unreachable. */
const DEMO_ROUNDS: RoundData[] = [
  {
    id: 101, name: 'Morning Circle', category: '500', amount: 500, frequency: 'daily',
    people_goal: 10, current_participants: 10, total_rounds: 12, winners_per_spin: 2,
    current_round_number: 3, start_date: null, end_date: null, status: 'active',
    auto_spin_enabled: true, spin_time: '08:00', commission_rate: 10, metadata: null,
    last_auto_draw_at: new Date(Date.now() - 86400000).toISOString(),
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 102, name: 'Evening Savers', category: '1000', amount: 1000, frequency: 'daily',
    people_goal: 8, current_participants: 8, total_rounds: 10, winners_per_spin: 1,
    current_round_number: 2, start_date: null, end_date: null, status: 'active',
    auto_spin_enabled: true, spin_time: '20:00', commission_rate: 10, metadata: null,
    last_auto_draw_at: new Date(Date.now() - 86400000).toISOString(),
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 103, name: 'Big Players', category: '5000', amount: 5000, frequency: 'weekly',
    people_goal: 4, current_participants: 4, total_rounds: 8, winners_per_spin: 1,
    current_round_number: 1, start_date: null, end_date: null, status: 'active',
    auto_spin_enabled: false, spin_time: '12:00', commission_rate: 10, metadata: null,
    last_auto_draw_at: null,
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
  },
]

const DEMO_STATS: RoundStats = {
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
  { key: 'promo', icon: 'gift' },
]

const TAB_ICONS: Record<string, string> = {
  overview: 'stats-chart',
  members: 'people',
  winners: 'trophy',
  payments: 'card-outline',
  rounds: 'refresh',
  promo: 'gift',
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
  const [dailyStatusFilter, setDailyStatusFilter] = useState<'unpaid' | 'paid'>('unpaid')
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
  const [spinError, setSpinError] = useState<string | null>(null)
  const [expandedCard, setExpandedCard] = useState<string | null>(null)
  const [paymentsRefreshKey, setPaymentsRefreshKey] = useState(0)
  const [showReceipt, setShowReceipt] = useState(false)
  const [receiptMember, setReceiptMember] = useState<{ name: string; phone: string; id: string; amount: number; slots: Slot[] } | null>(null)

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

  /* ─── Draw (Auto Schedule) State ─── */

  /* ─── Pagination State ─── */
  const [memberPage, setMemberPage] = useState(1)
  const [winnerPage, setWinnerPage] = useState(1)
  const [dailyPage, setDailyPage] = useState(1)
  const PER_PAGE = 5

  /* ─── Fetch Rounds (Brain & Nerve enabled) ─── */
  const store = useEqubStore()
  const isFetchingRounds = useRef(false)
  const fetchRounds = async () => {
    if (isFetchingRounds.current) return
    isFetchingRounds.current = true
    setLoadingRounds(true)
    try {
      const [roundsRes, statsRes] = await Promise.all([
        roundsApi.list().catch(() => null),
        roundsApi.stats().catch(() => null),
      ])
      const loadedRounds = roundsRes?.rounds
      setRounds(loadedRounds && loadedRounds.length ? loadedRounds : DEMO_ROUNDS)
      setRoundStats(statsRes ?? DEMO_STATS)
    } catch {
      setRounds(DEMO_ROUNDS)
      setRoundStats(DEMO_STATS)
    } finally {
      setLoadingRounds(false)
      isFetchingRounds.current = false
    }
  }

  /* When store revision changes from external source (category cascade), re-fetch rounds */
  useEffect(() => {
    if (store.revision > 0 && (activeTab === 'rounds' || activeTab === 'members' || activeTab === 'payments')) {
      fetchRounds()
    }
  }, [store.revision])

  useEffect(() => {
    if (activeTab === 'rounds' || activeTab === 'members' || activeTab === 'payments') {
      fetchRounds()
    }
  }, [activeTab])

  /* ─── Computed ─── */

  /* Use Brain & Nerve store metrics with mock fallback */
  const storeMetrics = store.metrics
  const totalUsers = storeMetrics.totalMembers || MOCK_USERS.length
  const totalSlots = storeMetrics.totalSlots || MOCK_SLOTS.length
  const activeSlots = storeMetrics.activeSlots || MOCK_SLOTS.filter(s => s.status === 'active').length
  const lienSlots = storeMetrics.lienSlots || MOCK_SLOTS.filter(s => s.status !== 'active').length
  const totalBalance = storeMetrics.totalPoolVolume || MOCK_SLOTS.reduce((sum, s) => sum + s.balance, 0)
  const totalPayouts = MOCK_DRAWS.reduce((sum, d) => sum + d.netPayout, 0)
  const delinquentCount = storeMetrics.delinquentSlots || MOCK_SLOTS.filter(s => s.consecutiveMissedSweeps > 0).length

  const slotsByCat = useMemo(() => {
    if (storeMetrics.byCategory.length > 0) {
      const map: Record<string, { total: number; active: number; balance: number }> = {}
      for (const c of storeMetrics.byCategory) {
        map[c.category] = { total: c.count, active: c.count, balance: c.balance }
      }
      return map
    }
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
  }, [storeMetrics.byCategory])

  const winners = useMemo(() => {
    const w = [...MOCK_DRAWS].sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())
    if (catFilter !== 'all') return w.filter(d => d.category === catFilter)
    return w
  }, [catFilter])

  const uniqueRounds = useMemo(() => [...new Set(MOCK_DRAWS.map(d => d.round).filter(Boolean))].sort(), [])
  const filteredWinners = roundFilter === 'all' ? winners : winners.filter(d => d.round === parseInt(roundFilter))

  /* ─── Payments ─── */

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

  async function handleLuckySpin(category: string) {
    setSpinError(null)
    setSpinLoading(category)
    await new Promise(r => setTimeout(r, 1500))
    setSpinLoading(null)
    setSpinError(null)
    showToast(`${isAm ? 'ዕጣ ተውሏል' : 'Draw complete!'}`, 'success')
  }

  /* ─── PDF Generation ─── */

  function getMemberCategoryType(userSlots: Slot[]): { code: string; labelEn: string; labelAm: string; penaltyEn: string; penaltyAm: string; licenseType: string } {
    const cats = [...new Set(userSlots.map(s => s.category))]
    const hasHigh = cats.some(c => c === '2000' || c === '5000')
    const hasMid = cats.some(c => c === '1000')
    if (hasHigh) return {
      code: 'big_seller',
      labelEn: 'Big Seller / Merchant',
      labelAm: 'ትልቅ ነጋዴ',
      penaltyEn: 'For any breach of this agreement, I acknowledge that my TRADE LICENSE shall be revoked and I will be prohibited from engaging in any commercial activities within the jurisdiction of this Equb circle.',
      penaltyAm: 'ይህን ስምምነት በማፍረሴ የንግድ ፍቃዴ እንደሚሰረዝ እና በዚህ እቁብ ክበብ ውስጥ ማንኛውንም የንግድ እንቅስቃሴ እንደማላደርግ እቀበላለሁ።',
      licenseType: 'Trade License (የንግድ ፍቃድ)',
    }
    if (hasMid) return {
      code: 'transport_driver',
      labelEn: 'Local Transport Driver',
      labelAm: 'የአካባቢ ትራንስፖርት አሽከርካሪ',
      penaltyEn: 'For any breach of this agreement, I acknowledge that my DRIVING LICENSE shall be immediately suspended and I will be prohibited from operating any transport vehicle within the routes governed by this Equb circle.',
      penaltyAm: 'ይህን ስምምነት በማፍረሴ የመንጃ ፍቃዴ ወዲያውኑ እንደሚታገድ እና በዚህ እቁብ ክበብ ቁጥጥር ስር ማንኛውንም የትራንስፖርት ተሽከርካሪ እንደማላሽከረክር እቀበላለሁ።',
      licenseType: 'Driving License (የመንጃ ፍቃድ)',
    }
    return {
      code: 'gov_worker',
      labelEn: 'Government Office Worker',
      labelAm: 'የመንግስት ቢሮ ሰራተኛ',
      penaltyEn: 'For any breach of this agreement, I acknowledge that my FULL MONTHLY SALARY shall be garnished and deducted by my employing government office until all outstanding obligations to this Equb circle are fully settled.',
      penaltyAm: 'ይህን ስምምነት በማፍረሴ ሙሉ ወርሃዊ ደሞዜ ከመንግስት ደሞዝ እንደሚቆረጥ እና በዚህ እቁብ ክበብ ያለብኝን ዕዳ እስከምከፍል ድረስ ደሞዜ እንደሚታገድ እቀበላለሁ።',
      licenseType: 'Government Salary (የመንግስት ደሞዝ)',
    }
  }

  async function generateMemberPDF(member: User) {
    const userSlots = MOCK_SLOTS.filter(s => s.userId === member.id)
    const totalBalance = userSlots.reduce((sum, s) => sum + s.balance, 0)
    const today = new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })
    const signatureDate = new Date().toISOString().split('T')[0]
    const docId = `EQUB-${member.id.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now()}`
    const categories = [...new Set(userSlots.map(s => s.category))]
    const memberType = getMemberCategoryType(userSlots)

    const slotRows = userSlots.map((s, i) => {
      const cfg = CATEGORY_CONFIG_MAP[s.category]
      const freq = rounds.find(r => r.category === s.category)?.frequency || 'daily'
      const amount = rounds.find(r => r.category === s.category)?.amount || parseInt(s.category)
      return `<tr style="${i % 2 === 0 ? 'background:#ffffff;' : 'background:#f9fafb;'}">
        <td style="padding:10px 8px;border:1px solid #ddd;font-weight:bold;text-align:center;">${i + 1}</td>
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

    const totalCycleAmount = totalBalance
    const memberCount = MOCK_USERS.length
    const verificationHash = 'sha256_' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page { margin: 12mm 15mm; }
  * { box-sizing: border-box; }
  body {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    color: #1e293b;
    line-height: 1.5;
    margin: 0;
    padding: 0;
    font-size: 10pt;
  }
  .brand-bar {
    background: linear-gradient(135deg, #059669, #047857);
    color: #fff;
    text-align: center;
    padding: 18px 0 12px 0;
    border-radius: 0 0 24px 24px;
    margin-bottom: 20px;
  }
  .brand-logo {
    font-size: 28pt;
    font-weight: 900;
    letter-spacing: 6px;
  }
  .brand-sub {
    font-size: 7pt;
    letter-spacing: 3px;
    opacity: 0.85;
    margin-top: 2px;
  }
  .doc-title {
    text-align: center;
    font-size: 14pt;
    font-weight: 800;
    color: #059669;
    margin: 8px 0;
  }
  .doc-badge {
    background: #fef2f2;
    border: 1px solid #fecaca;
    text-align: center;
    font-size: 7pt;
    color: #991b1b;
    padding: 5px;
    margin: 6px 0 14px 0;
    letter-spacing: 2px;
    font-weight: 700;
    border-radius: 4px;
  }
  .doc-meta {
    font-size: 7pt;
    color: #94a3b8;
    text-align: center;
    font-family: 'Courier New', monospace;
    margin-bottom: 16px;
  }
  h2 {
    font-size: 11pt;
    color: #059669;
    border-bottom: 2px solid #059669;
    padding-bottom: 4px;
    margin: 20px 0 10px 0;
    font-weight: 700;
    letter-spacing: 0.5px;
  }
  table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
  th, td { padding: 7px 10px; font-size: 9pt; }
  th {
    background: #059669;
    color: #fff;
    text-align: left;
    font-size: 8pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  td { border: 1px solid #e2e8f0; }
  .label-cell { font-weight: 600; color: #64748b; background: #f8fafc; width: 40%; }
  .value-cell { font-weight: 600; color: #0f172a; }
  .critical-box {
    background: #fffbeb;
    border: 2px solid #f59e0b;
    border-left: 6px solid #d97706;
    padding: 14px 18px;
    margin: 14px 0;
    font-size: 9pt;
    line-height: 1.6;
    color: #451a03;
    border-radius: 8px;
  }
  .critical-box strong { color: #92400e; }
  .collateral-table td { border: 1px solid #fde68a; }
  .sig-section { margin-top: 24px; }
  .sig-grid { display: flex; gap: 20px; }
  .sig-col { flex: 1; text-align: center; }
  .sig-stamp {
    width: 64px; height: 64px;
    border: 2px dashed #059669;
    border-radius: 50%;
    margin: 0 auto 6px auto;
    line-height: 64px;
    font-size: 6pt;
    color: #059669;
    font-weight: 700;
    text-align: center;
  }
  .sig-line { border-bottom: 1.5px solid #334155; height: 50px; margin: 0 8px; }
  .sig-label { font-size: 7pt; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.8px; margin-top: 3px; }
  .sig-name { font-size: 10pt; font-weight: 700; margin-top: 3px; color: #0f172a; }
  .sig-dt { font-size: 7pt; color: #94a3b8; font-family: 'Courier New', monospace; }
  .hash-row {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 10px 14px;
    margin: 16px 0;
    font-family: 'Courier New', monospace;
    font-size: 7pt;
    color: #64748b;
    text-align: center;
    word-break: break-all;
  }
  .footer {
    border-top: 2px solid #059669;
    padding-top: 10px;
    text-align: center;
    margin-top: 24px;
  }
  .footer p { font-size: 7pt; color: #94a3b8; margin: 1px 0; }
  .badge {
    display: inline-block;
    background: #ecfdf5;
    color: #059669;
    font-weight: 700;
    padding: 2px 10px;
    border-radius: 100px;
    font-size: 8pt;
  }
  .watermark {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(-30deg);
    font-size: 72pt;
    color: rgba(5, 150, 105, 0.035);
    font-weight: 900;
    pointer-events: none;
    z-index: -1;
    letter-spacing: 12px;
  }
</style>
</head>
<body>

<div class="watermark">EQUB AGREEMENT</div>

<div class="brand-bar">
  <div class="brand-logo">EQUB</div>
  <div class="brand-sub">Digital Equb Savings &amp; Credit Platform</div>
</div>

<div class="doc-title">📄 DIGITAL EQUB MEMBERSHIP &amp; LIABILITY AGREEMENT</div>
<div class="doc-badge">⚠️ LEGALLY BINDING AGREEMENT — READ BEFORE SIGNING</div>
<div class="doc-meta">Document ID: <strong>${docId}</strong> &nbsp;|&nbsp; Issue Date: <strong>${today}</strong></div>

<!-- 1. CONTRACTING PARTIES -->
<h2>1. CONTRACTING PARTIES</h2>
<table>
  <tr><td class="label-cell">Equb Platform / Group</td><td class="value-cell">Gojo Equb Savings Circle — Head Office, Addis Ababa</td></tr>
  <tr><td class="label-cell">Member Full Name</td><td class="value-cell">${member.name}</td></tr>
  <tr><td class="label-cell">National ID / Passport No.</td><td class="value-cell">${member.id}</td></tr>
  <tr><td class="label-cell">Phone Number</td><td class="value-cell">${member.phone}</td></tr>
  <tr><td class="label-cell">Registration Date</td><td class="value-cell">${member.joinedAt}</td></tr>
</table>

<!-- 2. EQUB FINANCIAL TERMS -->
<h2>2. EQUB FINANCIAL TERMS</h2>
<table>
  <tr><td class="label-cell">Total Cycle Amount</td><td class="value-cell"><strong>ETB ${totalBalance.toLocaleString()}</strong></td></tr>
  <tr><td class="label-cell">Individual Contribution</td><td class="value-cell">${categories.map(c => `ETB ${toLoc(parseInt(c))}`).join(' + ') || '—'}</td></tr>
  <tr><td class="label-cell">Payment Frequency</td><td class="value-cell">Daily</td></tr>
  <tr><td class="label-cell">Total Number of Members</td><td class="value-cell">${memberCount}</td></tr>
  <tr><td class="label-cell">Member Classification</td><td class="value-cell"><span class="badge">${memberType.labelEn} / ${memberType.labelAm}</span></td></tr>
  <tr><td class="label-cell">Collateral / License Type</td><td class="value-cell"><strong>${memberType.licenseType}</strong></td></tr>
</table>

<!-- 3. LEGAL COLLATERAL & DEFAULT CLAUSES -->
<h2>3. LEGAL COLLATERAL &amp; DEFAULT CLAUSES</h2>
<div class="critical-box">
  <strong>⚠️ LEGAL NOTICE &amp; BINDING TERMS:</strong><br><br>
  By digitally signing this agreement, the Member acknowledges and explicitly agrees to the following enforcement actions in the event of a payment default or failure to fulfill the Equb terms:<br><br>

  <strong>1. Collateral Submission:</strong> The Member hereby registers their official <strong>${memberType.licenseType}</strong> (Registration No: <strong>${member.id}-LIC-${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}</strong>) as security collateral for this Equb cycle.<br><br>

  <strong>2. License Retention:</strong> In case of default, the Equb Administration reserves the right to legally hold and report the registered license to relevant regulatory authorities until the outstanding balance is cleared.<br><br>

  <strong>3. Salary/Income Withholding:</strong> If the Member fails to pay their due rounds after receiving the Equb lot, the Equb Administration is legally authorized to contact the Member's employer or financial institution to withhold their salary fully or partially until the total defaulted amount is fully recovered.
</div>

<table class="collateral-table">
  <tr><th colspan="2" style="background:#d97706;">APPLICABLE ENFORCEMENT BY MEMBER TYPE</th></tr>
  <tr>
    <td class="label-cell" style="width:50%;">🔴 Big Seller / Merchant</td>
    <td class="value-cell" style="color:#991b1b;">Trade License REVOCATION + Business prohibition</td>
  </tr>
  <tr>
    <td class="label-cell">🟡 Local Transport Driver</td>
    <td class="value-cell" style="color:#92400e;">Driving License IMMEDIATE SUSPENSION</td>
  </tr>
  <tr>
    <td class="label-cell">🔵 Government Office Worker</td>
    <td class="value-cell" style="color:#1e40af;">Full Monthly Salary GARNISHMENT</td>
  </tr>
</table>

<!-- 4. EXECUTION & DIGITAL SIGNATURES -->
<h2>4. EXECUTION &amp; DIGITAL SIGNATURES</h2>
<p style="font-size:8pt;color:#64748b;margin-bottom:10px;">
  This document is electronically generated and digitally signed, constituting a legally binding contract under applicable electronic signature laws (Ethiopian Electronic Transactions Proclamation).
</p>

<div class="sig-section">
<div class="sig-grid">
  <div class="sig-col">
    <div class="sig-stamp">EQUB<br>SEAL</div>
    <div class="sig-line"></div>
    <div class="sig-label">Equb Administrator Signature</div>
    <div class="sig-name">Equb Administrator</div>
    <div class="sig-label">Gojo Equb — Head Office</div>
    <div class="sig-dt">Digitally Signed via System</div>
    <div class="sig-dt">Date: ${signatureDate}</div>
  </div>
  <div class="sig-col">
    <div class="sig-stamp">DIGITAL<br>SIGN</div>
    <div class="sig-line"></div>
    <div class="sig-label">Member Digital Signature</div>
    <div class="sig-name">${member.name}</div>
    <div class="sig-label">Member ID: ${member.id}</div>
    <div class="sig-dt">Confirmed via OTP / Secure Click</div>
    <div class="sig-dt">Date: ${signatureDate}</div>
  </div>
</div>
</div>

<div class="hash-row">
  <strong>Verification Hash:</strong> ${verificationHash}
</div>

<div class="footer">
  <p><strong>ጎጆ እቁብ (GOJO EQUB)</strong> — Ethiopian Digital Savings Platform</p>
  <p>Bole Road, Addis Ababa, Ethiopia | +251 911 00 0000 | info@equb-app.com | www.equb-app.com</p>
  <p>Licensed under Proclamation No. 1007/2024 | Reg. No. FCA-2026-0042</p>
  <p>This document is digitally generated and legally binding. Document Ref: ${docId}</p>
  <p>&copy; ${new Date().getFullYear()} Gojo Equb. All rights reserved. | Printed: ${today}</p>
</div>

</body>
</html>`

    try {
      const result = await Print.printToFileAsync({ html, base64: true })
      let b64 = ''
      if (result.base64) {
        b64 = result.base64
        if (b64.includes('base64,')) b64 = b64.split('base64,')[1]
      } else if ((result as any).uri) {
        showToast(isAm ? 'PDF ተፈጥሯል' : 'PDF generated', 'success')
        return
      }
      if (!b64) { showToast(isAm ? 'PDF ማመንጨት አልተሳካም' : 'PDF generation failed', 'error'); return }

      if (Platform.OS === 'web') {
        const byteChars = atob(b64)
        const byteNums = new Array(byteChars.length)
        for (let i = 0; i < byteChars.length; i++) byteNums[i] = byteChars.charCodeAt(i)
        const byteArr = new Uint8Array(byteNums)
        const blob = new Blob([byteArr], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `Equb-Agreement-${member.name.replace(/\s+/g, '_')}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } else {
        const shareable = await Sharing.isAvailableAsync()
        if (shareable) {
          await Sharing.shareAsync(`data:application/pdf;base64,${b64}`, {
            mimeType: 'application/pdf',
            dialogTitle: `${member.name} - Equb Agreement`,
            UTI: 'com.adobe.pdf',
          })
        } else {
          const fallback = await Print.printToFileAsync({ html })
          showToast(isAm ? `PDF ተቀምጧል: ${fallback.uri}` : `PDF saved: ${fallback.uri}`, 'success')
          return
        }
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
      await store.createRoundAction(createRoundForm)
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
      await store.activateRoundAction(id)
      showToast(isAm ? 'ክብዬ ተንቀሳቅሷል' : 'Round activated', 'success')
      fetchRounds()
    } catch (err) {
      showToast(isAm ? 'ክብዬ መንቀሳቀብ አልተሳካም' : 'Failed to activate round', 'error')
    }
  }

  async function handleCompleteRound(id: number) {
    try {
      await store.completeRoundAction(id)
      showToast(isAm ? 'ክብዬ ተጠናቅቋል' : 'Round completed', 'success')
      fetchRounds()
    } catch (err) {
      showToast(isAm ? 'ክብዬ መጠናቀቅ አልተሳካም' : 'Failed to complete round', 'error')
    }
  }

  async function handleCancelRound(id: number) {
    try {
      await store.cancelRoundAction(id)
      showToast(isAm ? 'ክብዬ ተሰርዟል' : 'Round cancelled', 'success')
      fetchRounds()
    } catch (err) {
      showToast(isAm ? 'ክብዬ መሰረዝ አልተሳካም' : 'Failed to cancel round', 'error')
    }
  }

  async function handleDeleteRound(id: number) {
    try {
      await store.deleteRoundAction(id)
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
      await store.updateRoundAction(editingRound.id, createRoundForm as any)
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
              <Text style={[styles.riskNum, { color: '#f59e0b' }]}>{delinquentCount}</Text>
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
            <View key={u.id}>
            <Card style={[styles.memberCard, { backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafcfe' }]}>
              <TouchableOpacity activeOpacity={0.7} onPress={() => {
                setSelectedMember(u)
                setMemberDetailSlots(userSlots)
                setShowMemberModal(true)
              }}>
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
              </TouchableOpacity>
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
                <TouchableOpacity style={styles.callBtn} onPress={() => {
                  Linking.openURL(`tel:${u.phone}`)
                }}>
                  <Ionicons name="call-outline" size={13} color={colors.primary} />
                  <Text style={styles.callBtnText}>{isAm ? 'ደውል' : 'Call'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.callBtn, { borderColor: '#8b5cf6' }]} onPress={() => {
                  setSelectedMember(u)
                  setMemberDetailSlots(userSlots)
                  setShowMemberModal(true)
                }}>
                  <Ionicons name="eye-outline" size={13} color="#8b5cf6" />
                  <Text style={[styles.callBtnText, { color: '#8b5cf6' }]}>{isAm ? 'ተመልከт' : 'View'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.callBtn, { borderColor: '#f59e0b' }]} onPress={() => {
                  setSelectedMember(u)
                  setMemberDetailSlots(userSlots)
                  setShowMemberModal(true)
                }}>
                  <Ionicons name="create-outline" size={13} color="#f59e0b" />
                  <Text style={[styles.callBtnText, { color: '#f59e0b' }]}>{isAm ? 'አስተካክል' : 'Edit'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.callBtn, { borderColor: '#ef4444' }]} onPress={() => {
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
                <TouchableOpacity style={[styles.memberPdfBtn]} onPress={() => {
                  generateMemberPDF(u)
                }}>
                  <Ionicons name="document-text-outline" size={13} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </Card>
            </View>
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
    const allMemberData = MOCK_USERS.filter(u => {
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
    })
    const memberToday = allMemberData.filter(m => dailyStatusFilter === 'paid' ? m.paid : !m.paid)
    const dailyTotalPages = Math.max(1, Math.ceil(memberToday.length / PER_PAGE))
    const dailySafePage = Math.min(dailyPage, dailyTotalPages)
    const paginatedDaily = memberToday.slice((dailySafePage - 1) * PER_PAGE, dailySafePage * PER_PAGE)

    const paidToday = allMemberData.filter(m => m.paid).length
    const totalToday = allMemberData.length
    const rateToday = totalToday ? Math.round(paidToday / totalToday * 100) : 0
    const totalCollectedAmount = paidToday * 500
    const expectedTotal = totalToday * 500
    const outstandingTotal = expectedTotal - totalCollectedAmount

    const catPayData = CATEGORY_CODES.map(c => {
      const cfg = CATEGORY_CONFIG_MAP[c]
      const members = allMemberData.filter(m => m.slots.some(s => s.category === c))
      const paid = members.filter(m => m.paid).length
      const unpaid = members.length - paid
      return { code: c, label: cfg?.label || c, color: cfg?.barColor || colors.primary, total: members.length, paid, unpaid, pct: members.length ? Math.round(paid / members.length * 100) : 0 }
    })

    function togglePaymentStatus(userId: string, currentStatus: boolean) {
      MOCK_TODAY_STATUS[userId] = !currentStatus
      setPaymentsRefreshKey(k => k + 1)
    }

    return (
      <>
        {/* ═══════ KPI Summary Strip ═══════ */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 2, marginBottom: 16 }}>
          <LinearGradient colors={['#ecfdf5', '#d1fae5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.payKpiCard, { borderLeftColor: '#059669' }]}>
            <Text style={styles.payKpiValue}>ETB {toLoc(totalCollectedAmount)}</Text>
            <Text style={styles.payKpiLabel}>{isAm ? 'የተሰበሰበ' : 'Collected'}</Text>
          </LinearGradient>
          <LinearGradient colors={['#eff6ff', '#dbeafe']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.payKpiCard, { borderLeftColor: '#0ea5e9' }]}>
            <Text style={styles.payKpiValue}>ETB {toLoc(expectedTotal)}</Text>
            <Text style={styles.payKpiLabel}>{isAm ? 'የሚጠበቅ' : 'Expected'}</Text>
          </LinearGradient>
          <LinearGradient colors={['#fef2f2', '#fecaca']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.payKpiCard, { borderLeftColor: '#ef4444' }]}>
            <Text style={styles.payKpiValue}>ETB {toLoc(outstandingTotal)}</Text>
            <Text style={styles.payKpiLabel}>{isAm ? 'ያልተከፈለ' : 'Outstanding'}</Text>
          </LinearGradient>
          <LinearGradient colors={['#faf5ff', '#f3e8ff']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.payKpiCard, { borderLeftColor: '#8b5cf6' }]}>
            <Text style={[styles.payKpiValue, { color: rateToday >= 70 ? '#059669' : '#ef4444' }]}>{rateToday}%</Text>
            <Text style={styles.payKpiLabel}>{isAm ? 'ማጠናቀቅ' : 'Rate'}</Text>
          </LinearGradient>
        </ScrollView>

        {/* ═══════ Progress by Category ═══════ */}
        <Card style={{ padding: 16, marginBottom: 16, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#05966920', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="pie-chart-outline" size={16} color="#059669" />
              </View>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#0f172a' }}>
                {isAm ? 'የክፍያ ሂደት በምድብ' : 'Payment Progress by Category'}
              </Text>
            </View>
            <Text style={{ fontSize: 11, color: '#94a3b8' }}>
              {paidToday}/{totalToday}
            </Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {catPayData.map(c => (
              <View key={c.code} style={styles.payProgressCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <ProgressRing pct={c.pct} size={48} color={c.color} />
                  <View style={{ gap: 2 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#0f172a' }}>{c.label}</Text>
                    <Text style={{ fontSize: 11, color: '#64748b' }}>
                      {c.paid}/{c.total} {isAm ? 'ተከፍሏል' : 'paid'}
                    </Text>
                    {c.unpaid > 0 && (
                      <Text style={{ fontSize: 10, color: '#ef4444', fontWeight: '600' }}>
                        {c.unpaid} {isAm ? 'አልተከፈለም' : 'unpaid'}
                      </Text>
                    )}
                  </View>
                </View>
                <View style={{ height: 4, backgroundColor: '#f1f5f9', borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
                  <View style={{ height: '100%', width: `${c.pct}%`, backgroundColor: c.color, borderRadius: 2 }} />
                </View>
              </View>
            ))}
          </ScrollView>
        </Card>

        {/* ═══════ Filters — Compact Segmented Row ═══════ */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, alignItems: 'center' }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            <TouchableOpacity
              style={[styles.payFilterChip, catFilter === 'all' && styles.payFilterChipActive]}
              onPress={() => { setCatFilter('all'); setDailyPage(1) }}
            >
              <Text style={[styles.payFilterChipText, catFilter === 'all' && styles.payFilterChipTextActive]}>
                {isAm ? 'ሁሉም' : 'All'}
              </Text>
            </TouchableOpacity>
            {CATEGORY_CODES.map(c => (
              <TouchableOpacity
                key={c}
                style={[styles.payFilterChip, catFilter === c && styles.payFilterChipActive]}
                onPress={() => { setCatFilter(c); setDailyPage(1) }}
              >
                <Text style={[styles.payFilterChipText, catFilter === c && styles.payFilterChipTextActive]}>
                  {toLoc(parseInt(c))}
                </Text>
              </TouchableOpacity>
            ))}
            <View style={{ width: 1, height: 24, backgroundColor: '#e2e8f0', alignSelf: 'center' }} />
            <TouchableOpacity
              style={[styles.payFilterChip, dailyStatusFilter === 'unpaid' && styles.payFilterChipActive]}
              onPress={() => { setDailyStatusFilter('unpaid'); setDailyPage(1) }}
            >
              <Ionicons name="close-circle-outline" size={12} color={dailyStatusFilter === 'unpaid' ? '#fff' : '#ef4444'} />
              <Text style={[styles.payFilterChipText, { color: dailyStatusFilter === 'unpaid' ? '#fff' : '#ef4444' }, dailyStatusFilter === 'unpaid' && styles.payFilterChipTextActive]}>
                {isAm ? 'ያልተከፈለ' : 'Unpaid'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.payFilterChip, dailyStatusFilter === 'paid' && styles.payFilterChipActive]}
              onPress={() => { setDailyStatusFilter('paid'); setDailyPage(1) }}
            >
              <Ionicons name="checkmark-circle-outline" size={12} color={dailyStatusFilter === 'paid' ? '#fff' : '#059669'} />
              <Text style={[styles.payFilterChipText, { color: dailyStatusFilter === 'paid' ? '#fff' : '#059669' }, dailyStatusFilter === 'paid' && styles.payFilterChipTextActive]}>
                {isAm ? 'ተከፍሏል' : 'Paid'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* ═══════ Member Payment List ═══════ */}
        <Text style={styles.payListSectionTitle}>
          {dailyStatusFilter === 'paid'
            ? (isAm ? 'የተከፈለ አባላት' : 'PAID Members')
            : (isAm ? 'ያልተከፈለ አባላት' : 'UNPAID Members')}
          <Text style={{ fontWeight: '400', color: '#94a3b8' }}> ({memberToday.length})</Text>
        </Text>

        {paginatedDaily.map((m, idx) => {
          const totalMemberAmount = m.slots.reduce((sum, s) => sum + parseInt(s.category), 0)
          return (
            <View key={m.user.id}>
              <View style={[styles.payMemberCard, m.paid ? styles.payMemberCardPaid : styles.payMemberCardUnpaid]}>
                {/* Card Top: Avatar + Info + Status */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                  <LinearGradient
                    colors={m.paid ? ['#059669', '#047857'] : ['#ef4444', '#dc2626']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={styles.payMemberAvatar}
                  >
                    <Text style={styles.payMemberAvatarText}>{m.user.name.charAt(0)}</Text>
                  </LinearGradient>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.payMemberName}>{m.user.name}</Text>
                    <Text style={styles.payMemberMeta}>
                      {m.user.phone} · {m.slots.length} {isAm ? 'ቦታ' : 'slot'}{m.slots.length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                  <View style={[styles.payMemberStatusBadge, { backgroundColor: m.paid ? '#ecfdf5' : '#fef2f2' }]}>
                    <View style={[styles.payMemberStatusDot, { backgroundColor: m.paid ? '#059669' : '#ef4444' }]} />
                    <Text style={[styles.payMemberStatusText, { color: m.paid ? '#059669' : '#ef4444' }]}>
                      {m.paid ? (isAm ? 'ተከፍሏል' : 'PAID') : (isAm ? 'አልተከፈለም' : 'UNPAID')}
                    </Text>
                  </View>
                </View>

                {/* Card Middle: Slot badges */}
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                  {m.slots.map(slot => {
                    const cfg = CATEGORY_CONFIG_MAP[slot.category]
                    return (
                      <View key={slot.id} style={[styles.paySlotBadge, { borderLeftColor: cfg?.barColor || colors.primary }]}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: cfg?.barColor || colors.primary }}>
                          {cfg?.label || slot.category}
                        </Text>
                        <Text style={{ fontSize: 9, color: '#64748b' }}>{toLoc(parseInt(slot.category))} ETB</Text>
                      </View>
                    )
                  })}
                </View>

                {/* Card Bottom: Actions */}
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                  <TouchableOpacity style={styles.payActionBtn} onPress={() => Linking.openURL(`tel:${m.user.phone}`)}>
                    <Ionicons name="call-outline" size={13} color="#059669" />
                    <Text style={styles.payActionBtnText}>{isAm ? 'ደውል' : 'Call'}</Text>
                  </TouchableOpacity>
                  {!m.paid ? (
                    <>
                      <TouchableOpacity style={[styles.payActionBtn, { backgroundColor: '#eff6ff' }]} onPress={() => {
                        Linking.openURL(`sms:${m.user.phone}?body=${encodeURIComponent('Equb payment reminder - please make your daily contribution.')}`)
                      }}>
                        <Ionicons name="chatbox-outline" size={13} color="#0ea5e9" />
                        <Text style={[styles.payActionBtnText, { color: '#0ea5e9' }]}>{isAm ? 'ኤስኤምኤስ' : 'SMS'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.payActionBtn, { backgroundColor: '#fefce8' }]} onPress={() => {
                        Linking.openURL(`tel:*847*${m.user.phone.replace(/\D/g, '')}%23`)
                      }}>
                        <Ionicons name="phone-portrait-outline" size={13} color="#eab308" />
                        <Text style={[styles.payActionBtnText, { color: '#eab308' }]}>{isAm ? 'USSD' : 'USSD'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.payActionBtn, { backgroundColor: '#ecfdf5' }]}
                        onPress={() => togglePaymentStatus(m.user.id, m.paid)}
                      >
                        <Ionicons name="checkmark-outline" size={13} color="#059669" />
                        <Text style={[styles.payActionBtnText, { color: '#059669' }]}>{isAm ? 'ክፍል ምልክት' : 'Mark Paid'}</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <TouchableOpacity style={[styles.payActionBtn, { backgroundColor: '#f0fdf4' }]} onPress={() => {
                        setReceiptMember({ name: m.user.name, phone: m.user.phone, id: m.user.id, amount: totalMemberAmount, slots: m.slots })
                        setShowReceipt(true)
                      }}>
                        <Ionicons name="receipt-outline" size={13} color="#059669" />
                        <Text style={[styles.payActionBtnText, { color: '#059669' }]}>{isAm ? 'ደረሰኝ' : 'Receipt'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.payActionBtn, { backgroundColor: '#fef2f2' }]}
                        onPress={() => togglePaymentStatus(m.user.id, m.paid)}
                      >
                        <Ionicons name="close-outline" size={13} color="#ef4444" />
                        <Text style={[styles.payActionBtnText, { color: '#ef4444' }]}>{isAm ? 'ተመለስ' : 'Undo'}</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            </View>
          )
        })}
        {memberToday.length === 0 && <Text style={styles.emptyText}>{a.noMembers}</Text>}

        {dailyTotalPages > 1 && (
          <PaginationBar
            currentPage={dailyPage}
            totalPages={dailyTotalPages}
            onPrev={() => setDailyPage(p => Math.max(1, p - 1))}
            onNext={() => setDailyPage(p => Math.min(dailyTotalPages, p + 1))}
          />
        )}

        {/* ═══════ Bottom Summary — Overall Progress Bar ═══════ */}
        <Card style={styles.paySummaryCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="stats-chart-outline" size={16} color="#059669" />
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#0f172a' }}>
                {isAm ? 'ዛሬ የክፍያ ማጠቃለያ' : "Today's Collection Summary"}
              </Text>
            </View>
            <Text style={{ fontSize: 20, fontWeight: '800', color: rateToday >= 70 ? '#059669' : '#ef4444' }}>{rateToday}%</Text>
          </View>
          <View style={{ height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden', marginBottom: 12 }}>
            <LinearGradient
              colors={rateToday >= 70 ? ['#059669', '#34d399'] : ['#ef4444', '#fca5a5']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={{ height: '100%', width: `${rateToday}%`, borderRadius: 4 }}
            />
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>{isAm ? 'የተሰበሰበ' : 'Collected'}</Text>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#059669', marginTop: 2 }}>ETB {toLoc(totalCollectedAmount)}</Text>
            </View>
            <View style={{ width: 1, backgroundColor: '#f1f5f9' }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>{isAm ? 'ያልተከፈለ' : 'Outstanding'}</Text>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#ef4444', marginTop: 2 }}>ETB {toLoc(outstandingTotal)}</Text>
            </View>
            <View style={{ width: 1, backgroundColor: '#f1f5f9' }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>{isAm ? 'የሚጠበቅ' : 'Expected'}</Text>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#0ea5e9', marginTop: 2 }}>ETB {toLoc(expectedTotal)}</Text>
            </View>
          </View>
        </Card>

        {/* ═══════ Receipt Modal ═══════ */}
        <Modal visible={showReceipt} transparent animationType="fade" onRequestClose={() => setShowReceipt(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.receiptModalHeader}>
                <View style={styles.receiptModalHeaderLeft}>
                  <Ionicons name="receipt-outline" size={20} color={colors.primary} />
                  <Text style={styles.receiptModalTitle}>{isAm ? 'የክፍያ ደረሰኝ' : 'Payment Receipt'}</Text>
                </View>
                <TouchableOpacity onPress={() => setShowReceipt(false)} style={styles.roundFormClose} activeOpacity={0.7}>
                  <Ionicons name="close" size={20} color="#64748b" />
                </TouchableOpacity>
              </View>
              {receiptMember && (
                <View style={styles.receiptBody}>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptFieldLabel}>{isAm ? 'የአባል መለያ' : 'Member ID'}</Text>
                    <Text style={styles.receiptFieldValue}>{receiptMember.id}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptFieldLabel}>{isAm ? 'ሙሉ ስም' : 'Full Name'}</Text>
                    <Text style={styles.receiptFieldValue}>{receiptMember.name}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptFieldLabel}>{isAm ? 'ስልክ' : 'Phone'}</Text>
                    <Text style={styles.receiptFieldValue}>{receiptMember.phone}</Text>
                  </View>
                  {receiptMember.slots.map(s => {
                    const cfg = CATEGORY_CONFIG_MAP[s.category]
                    return (
                      <View key={s.id} style={styles.receiptRow}>
                        <Text style={styles.receiptFieldLabel}>{cfg?.label || s.category}</Text>
                        <Text style={styles.receiptFieldValue}>{toLoc(parseInt(s.category))} ETB</Text>
                      </View>
                    )
                  })}
                  <View style={[styles.receiptRow, { borderBottomWidth: 0 }]}>
                    <Text style={[styles.receiptFieldLabel, { fontWeight: '700' }]}>{isAm ? 'ጠቅላላ' : 'Total'}</Text>
                    <Text style={[styles.receiptFieldValue, { fontSize: 18, color: colors.primary, fontWeight: '700' }]}>
                      {toLoc(receiptMember.amount)} ETB
                    </Text>
                  </View>
                  <View style={[styles.receiptRow, { borderBottomWidth: 0 }]}>
                    <Text style={styles.receiptFieldLabel}>{isAm ? 'ሁኔታ' : 'Status'}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#e6f4ea', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#137333' }} />
                      <Text style={{ fontFamily: fonts.medium, fontSize: 10, fontWeight: '500', color: '#137333' }}>{isAm ? 'ተሳክቷል' : 'Successful'}</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.downloadPdfBtn} onPress={async () => {
                    if (!receiptMember) return
                    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
                      @page { margin: 15mm; }
                      body { font-family: Arial,sans-serif; color: #1a1a1a; font-size: 12px; }
                      .title { text-align: center; font-size: 18px; font-weight: 800; color: #059669; margin-bottom: 4px; }
                      .sub { text-align: center; font-size: 11px; color: #555; margin-bottom: 16px; }
                      table { width: 100%; border-collapse: collapse; margin: 8px 0; }
                      td { padding: 6px 10px; border: 1px solid #ccc; }
                      td:first-child { font-weight: 700; background: #f5f5f5; width: 35%; }
                      .badge { display: inline-block; background: #e6f4ea; color: #137333; font-weight: 700; padding: 2px 12px; border-radius: 4px; }
                      .footer { margin-top: 20px; text-align: center; font-size: 9px; color: #999; border-top: 1px solid #eee; padding-top: 8px; }
                    </style></head><body>
                    <p class="title">${isAm ? 'የክፍያ ደረሰኝ' : 'PAYMENT RECEIPT'}</p>
                    <p class="sub">Gojo Equb</p>
                    <table>
                      <tr><td>${isAm ? 'የአባል መለያ' : 'Member ID'}</td><td>${receiptMember.id}</td></tr>
                      <tr><td>${isAm ? 'ሙሉ ስም' : 'Full Name'}</td><td>${receiptMember.name}</td></tr>
                      <tr><td>${isAm ? 'ስልክ' : 'Phone'}</td><td>${receiptMember.phone}</td></tr>
                      <tr><td>${isAm ? 'የተከፈለ መጠን' : 'Amount Paid'}</td><td>${toLoc(receiptMember.amount)} ETB</td></tr>
                      <tr><td>${isAm ? 'ሁኔታ' : 'Status'}</td><td><span class="badge">${isAm ? 'ተሳክቷል' : 'Successful'}</span></td></tr>
                    </table>
                    <div class="footer"><p>${isAm ? 'ይህ ደረሰኝ በራስ-ሰር የመነጨ ነው' : 'This receipt was automatically generated'}</p></div>
                    </body></html>`
                    try {
                      const { base64: rawBase64 } = await Print.printToFileAsync({ html, base64: true })
                      const b64 = rawBase64 || ''
                      if (Platform.OS === 'web') {
                        const byteChars = atob(b64); const byteNums = new Array(byteChars.length)
                        for (let i = 0; i < byteChars.length; i++) byteNums[i] = byteChars.charCodeAt(i)
                        const byteArr = new Uint8Array(byteNums); const blob = new Blob([byteArr], { type: 'application/pdf' })
                        const url = URL.createObjectURL(blob); const a = document.createElement('a')
                        a.href = url; a.download = `receipt-${receiptMember.id}.pdf`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
                      } else {
                        await Sharing.shareAsync(`data:application/pdf;base64,${b64}`, { mimeType: 'application/pdf', dialogTitle: isAm ? 'ደረሰኝ' : 'Payment Receipt', UTI: 'com.adobe.pdf' })
                      }
                    } catch {}
                  }} activeOpacity={0.8}>
                    <Ionicons name="document-text-outline" size={18} color="#fff" />
                    <Text style={styles.downloadPdfBtnText}>{isAm ? 'PDF አውርድ' : 'Download PDF'}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Modal>
      </>
    )
  }

  /* ─── Promo / Broker Management ─── */
  const [promoCodes, setPromoCodes] = useState<any[]>([])
  const [promoStats, setPromoStats] = useState<any>(null)
  const [showCreatePromo, setShowCreatePromo] = useState(false)
  const [brokerName, setBrokerName] = useState('')
  const [brokerPhone, setBrokerPhone] = useState('')
  const [creatingPromo, setCreatingPromo] = useState(false)

  async function fetchPromos() {
    try {
      const list = await api.get<{ promo_codes: any[] }>('/admin/promos')
      const stats = await api.get<any>('/admin/promos/stats')
      setPromoCodes(list.promo_codes || [])
      setPromoStats((stats as any))
    } catch {}
  }

  useEffect(() => {
    if (activeTab === 'promo') fetchPromos()
  }, [activeTab])

  async function handleCreatePromo() {
    if (!brokerName.trim() || !brokerPhone.trim()) {
      showToast(isAm ? 'እባክዎ ሁሉንም መረጃ ያስገቡ' : 'Please fill all fields', 'error')
      return
    }
    setCreatingPromo(true)
    try {
      await api.post('/admin/promos', { broker_name: brokerName.trim(), broker_phone: brokerPhone.trim() })
      showToast(isAm ? 'የፕሮሞ ኮድ ተፈጥሯል' : 'Promo code created', 'success')
      setShowCreatePromo(false)
      setBrokerName('')
      setBrokerPhone('')
      fetchPromos()
    } catch (err) {
      showToast(isAm ? 'መፍጠር አልተሳካም' : 'Failed to create', 'error')
    } finally {
      setCreatingPromo(false)
    }
  }

  function renderPromo() {
    const ps = promoStats
    return (
      <>
        {/* Stats Strip */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 }}>
          {[
            { label: a.totalBrokers, value: ps?.total_brokers ?? promoCodes.length.toString(), icon: 'people-outline' as const, color: '#059669' },
            { label: a.totalRegs, value: ps?.total_registrations?.toString() ?? '0', icon: 'person-add-outline' as const, color: '#0ea5e9' },
            { label: a.paidOut, value: `ETB ${toLoc(ps?.total_paid_out ?? 0)}`, icon: 'cash-outline' as const, color: '#f59e0b' },
            { label: a.todayRegs, value: ps?.registrations_today?.toString() ?? '0', icon: 'today-outline' as const, color: '#8b5cf6' },
          ].map((stat, i) => (
<View key={i} style={[styles.statCard, { width: (screenWidth - 48) / 2, padding: 12 }]}>            
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: stat.color + '20', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={stat.icon} size={16} color={stat.color} />
                </View>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#0f172a' }}>{stat.value}</Text>
              </View>
              <Text style={{ fontSize: 11, color: '#94a3b8' }}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Generate Button */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
          <TouchableOpacity
            style={[styles.submitBtn, { flexDirection: 'row', gap: 8, justifyContent: 'center' }]}
            onPress={() => setShowCreatePromo(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="gift-outline" size={18} color="#fff" />
            <Text style={styles.submitBtnText}>{a.generateCode}</Text>
          </TouchableOpacity>
        </View>

        {/* Broker List */}
        <View style={{ paddingHorizontal: 16, flex: 1 }}>
          <Text style={[styles.sectionTitle, { marginBottom: 8 }]}>{a.brokers}</Text>
          {promoCodes.length === 0 ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Ionicons name="gift-outline" size={48} color="#cbd5e1" />
              <Text style={{ fontSize: 13, color: '#94a3b8', marginTop: 8 }}>{a.noBrokers}</Text>
            </View>
          ) : (
            promoCodes.map((pc: any) => (
              <Card key={pc.id} style={{ padding: 14, marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#05966920', alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="person" size={16} color="#059669" />
                      </View>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: '#0f172a' }}>{pc.broker_name}</Text>
                    </View>
                    <Text style={{ fontSize: 12, color: '#64748b', marginLeft: 40 }}>{pc.broker_phone}</Text>
                    <View style={{ marginLeft: 40, marginTop: 6, flexDirection: 'row', gap: 6 }}>
                      <View style={{ backgroundColor: '#ecfdf5', paddingVertical: 3, paddingHorizontal: 10, borderRadius: 100 }}>
                        <Text style={{ fontSize: 10, fontWeight: '600', color: '#059669' }}>{pc.code}</Text>
                      </View>
                      <View style={{ backgroundColor: '#fef2f2', paddingVertical: 3, paddingHorizontal: 10, borderRadius: 100 }}>
                        <Text style={{ fontSize: 10, fontWeight: '600', color: '#ef4444' }}>{pc.commission_rate}%</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 16, marginTop: 8, marginLeft: 40 }}>
                      <View>
                        <Text style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase' }}>{a.registrations}</Text>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: '#0f172a' }}>{pc.total_registrations}</Text>
                      </View>
                      <View>
                        <Text style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase' }}>{a.earnings}</Text>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: '#059669' }}>ETB {toLoc(pc.total_earned)}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={{ gap: 6 }}>
                    <TouchableOpacity
                      style={{ backgroundColor: '#059669', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                      onPress={() => { showToast(isAm ? 'የUSSD ኮድ ተልኳል' : 'USSD code sent to broker', 'success') }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="phone-portrait-outline" size={14} color="#fff" />
                      <Text style={{ fontSize: 11, fontWeight: '600', color: '#fff' }}>{a.ussdPay}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ backgroundColor: '#0ea5e9', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                      onPress={() => { Linking.openURL(`tel:${pc.broker_phone}`) }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="call-outline" size={14} color="#fff" />
                      <Text style={{ fontSize: 11, fontWeight: '600', color: '#fff' }}>{a.call}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Card>
            ))
          )}
        </View>

        {/* Create Promo Modal */}
        <Modal visible={showCreatePromo} transparent animationType="fade" onRequestClose={() => setShowCreatePromo(false)}>
          <View style={styles.modalOverlay}>
            <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={[styles.modalContent, { padding: 20 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <View style={[styles.modalIconCircle, { backgroundColor: '#fef3c7' }]}>
                  <Ionicons name="gift" size={20} color="#d97706" />
                </View>
                <Text style={styles.modalTitle}>{a.generateCode}</Text>
              </View>
              <View style={{ gap: 12, marginBottom: 16 }}>
                <View>
                  <Text style={{ fontSize: 11, color: '#64748b', marginBottom: 4, fontWeight: '600' }}>{a.brokerName}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f8fafc', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 12, height: 48 }}>
                    <Ionicons name="person-outline" size={18} color="#94a3b8" />
                    <TextInput
                      style={{ flex: 1, fontFamily: fonts.regular, fontSize: 14, color: '#0f172a', padding: 0 }}
                      placeholder={isAm ? 'የደላላ ስም' : 'Broker full name'}
                      placeholderTextColor="#94a3b8"
                      value={brokerName}
                      onChangeText={setBrokerName}
                    />
                  </View>
                </View>
                <View>
                  <Text style={{ fontSize: 11, color: '#64748b', marginBottom: 4, fontWeight: '600' }}>{a.brokerPhone}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f8fafc', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 12, height: 48 }}>
                    <Ionicons name="phone-portrait-outline" size={18} color="#94a3b8" />
                    <TextInput
                      style={{ flex: 1, fontFamily: fonts.regular, fontSize: 14, color: '#0f172a', padding: 0 }}
                      placeholder="09XXXXXXXX"
                      placeholderTextColor="#94a3b8"
                      value={brokerPhone}
                      onChangeText={setBrokerPhone}
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity style={[styles.cancelBtn, { flex: 1 }]} onPress={() => { setShowCreatePromo(false); setBrokerName(''); setBrokerPhone('') }}>
                  <Text style={styles.cancelBtnText}>{a.cancel}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.submitBtn, { flex: 1 }]} onPress={handleCreatePromo} disabled={creatingPromo}>
                  {creatingPromo ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.submitBtnText}>{isAm ? 'ፍጠር' : 'Create'}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
        {activeTab === 'promo' && renderPromo()}
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
    paddingHorizontal: 16,
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
  statusSegRow: {
    flexDirection: 'row',
    width: '100%',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statusSegBtn: {
    flex: 1,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  statusSegBtnActive: {
    backgroundColor: colors.primary,
  },
  statusSegText: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    fontWeight: '700',
    color: colors.mutedForeground,
    letterSpacing: 1,
  },
  statusSegTextActive: { color: '#fff' },

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

  /* ─── KPI Summary Cards ─── */
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  kpiCard: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  kpiValue: {
    fontFamily: fonts.bold,
    fontSize: 17,
    fontWeight: '700',
    color: colors.foreground,
  },
  kpiValueSmall: {
    fontFamily: fonts.regular,
    fontSize: 12,
    fontWeight: '400',
    color: colors.mutedForeground,
  },
  kpiLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 8,
    fontWeight: '600',
    color: colors.mutedForeground,
    marginTop: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  kpiSub: {
    fontFamily: fonts.regular,
    fontSize: 7,
    color: '#94a3b8',
    marginTop: 1,
  },

  /* ─── Section Title ─── */
  progressSectionTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },

  /* ─── Progress Cards Carousel ─── */
  progressCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    minWidth: 120,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  progressCardTop: {
    alignItems: 'center',
    gap: 6,
  },
  progressCardMetric: {
    fontFamily: fonts.bold,
    fontSize: 15,
    fontWeight: '700',
    color: colors.foreground,
  },
  progressCardMetricTotal: {
    fontFamily: fonts.regular,
    fontSize: 11,
    fontWeight: '400',
    color: colors.mutedForeground,
  },
  progressCardLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 9,
    fontWeight: '600',
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  progressCardPct: {
    fontFamily: fonts.bold,
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },

  /* ─── Activity Heatmap Card ─── */
  heatmapCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  heatmapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  heatmapTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  heatmapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
  },
  heatmapDayLabel: {
    width: 18,
    fontSize: 8,
    textAlign: 'center',
    color: colors.mutedForeground,
    fontFamily: fonts.regular,
  },
  heatmapCell: {
    width: 18,
    height: 18,
    borderRadius: 4,
  },
  heatmapLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    justifyContent: 'flex-end',
  },
  heatmapLegendLabel: {
    fontFamily: fonts.regular,
    fontSize: 8,
    color: '#94a3b8',
  },
  heatmapLegendDot: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },

  /* ─── Pay Status Badge ─── */
  payStatusBadge: {
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 8,
  },
  payStatusText: {
    fontFamily: fonts.semiBold,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  /* ─── Bottom Summary Bar ─── */
  bottomSummary: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    alignItems: 'center',
  },
  bottomSummaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  bottomSummaryLabel: {
    fontFamily: fonts.regular,
    fontSize: 8,
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bottomSummaryValue: {
    fontFamily: fonts.bold,
    fontSize: 13,
    fontWeight: '700',
    color: colors.foreground,
  },
  bottomSummaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#f1f5f9',
  },

  /* ─── Receipt Modal ─── */
  receiptModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
  },
  receiptModalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  receiptModalTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    fontWeight: '600',
    color: colors.foreground,
  },
  receiptBody: {
    width: '100%',
    gap: 0,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  receiptFieldLabel: {
    fontFamily: fonts.medium,
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
  },
  receiptFieldValue: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    fontWeight: '600',
    color: colors.foreground,
    textAlign: 'right',
  },
  downloadPdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 100,
    paddingVertical: 13,
    marginTop: 20,
    width: '100%',
  },
  downloadPdfBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
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

  /* ─── Payments Redesigned ─── */

  payKpiCard: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    minWidth: 130,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  payKpiValue: {
    fontFamily: fonts.bold,
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  payKpiLabel: {
    fontFamily: fonts.medium,
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  payProgressCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    minWidth: 175,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  payFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f8fafc',
    borderRadius: 100,
    paddingHorizontal: 14,
    height: 32,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  payFilterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  payFilterChipText: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  payFilterChipTextActive: {
    color: '#ffffff',
  },
  payListSectionTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  payMemberCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
  },
  payMemberCardPaid: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
  },
  payMemberCardUnpaid: {
    backgroundColor: '#fffcfc',
    borderColor: '#fecaca',
  },
  payMemberAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  payMemberAvatarText: {
    color: '#ffffff',
    fontFamily: fonts.bold,
    fontSize: 17,
    fontWeight: '700',
  },
  payMemberName: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  payMemberMeta: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  payMemberStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  payMemberStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  payMemberStatusText: {
    fontFamily: fonts.semiBold,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  paySlotBadge: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderLeftWidth: 3,
    gap: 2,
  },
  payActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ecfdf5',
    borderRadius: 100,
    paddingHorizontal: 10,
    height: 28,
  },
  payActionBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 10,
    fontWeight: '600',
    color: '#059669',
  },
  paySummaryCard: {
    padding: 16,
    marginTop: 8,
    gap: 0,
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
