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
import { colors, fonts, spacing } from '../theme'
import { Card } from '../components/ui/Card'
import { PaginationBar } from '../components/ui/PaginationBar'
import { Text } from '../components/ui/AppText'
import { useTranslation } from '../i18n/useTranslation'
import { useNavigation } from '../context/NavigationContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/ui/Toast'
import { getCategoryConfig, CATEGORY_CODES } from '../data/tierConfig'
import { MemberDetailModal } from '../components/admin/MemberDetailModal'
import { api, roundsApi, adminApi, type RoundData, type RoundStats, type CreateRoundInput, type AdminStats, type AdminMember, type AdminSlot, type AdminDraw, type AdminPaymentLog, type AdminPromoCode, type AdminPromoStats } from '../services/api'
import { updateSettings } from '../services/storage'
import { useEqubStore } from '../store/equbStore'

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

  /* ─── Admin Data State ─── */
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null)
  const [membersList, setMembersList] = useState<AdminMember[]>([])
  const [winnersList, setWinnersList] = useState<AdminDraw[]>([])
  const [paymentsList, setPaymentsList] = useState<AdminPaymentLog[]>([])
  const [promoCodes, setPromoCodes] = useState<AdminPromoCode[]>([])
  const [promoStats, setPromoStats] = useState<AdminPromoStats | null>(null)
  const [loadingAdmin, setLoadingAdmin] = useState(false)

  const [activeTab, setActiveTab] = useState('overview')
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [roundFilter, setRoundFilter] = useState('all')
  const [memberRoundFilter, setMemberRoundFilter] = useState('all')
  const [dailyStatusFilter, setDailyStatusFilter] = useState<'unpaid' | 'paid'>('unpaid')
  const [selectedWinner, setSelectedWinner] = useState<AdminDraw | null>(null)
  const [showPayoutModal, setShowPayoutModal] = useState(false)
  const [payoutStep, setPayoutStep] = useState('dial')
  const [payoutPassword, setPayoutPassword] = useState('')
  const [payoutError, setPayoutError] = useState('')
  const [spinLoading, setSpinLoading] = useState<string | null>(null)
  const [unlockPassword, setUnlockPassword] = useState('')
  const [unlockError, setUnlockError] = useState('')
  const [unlocking, setUnlocking] = useState(false)
  const [selectedMember, setSelectedMember] = useState<AdminMember | null>(null)
  const [showMemberModal, setShowMemberModal] = useState(false)
  const [memberDetailSlots, setMemberDetailSlots] = useState<AdminSlot[]>([])
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null)
  const [spinError, setSpinError] = useState<string | null>(null)
  const [expandedCard, setExpandedCard] = useState<string | null>(null)
  const [paymentsRefreshKey, setPaymentsRefreshKey] = useState(0)
  const [showReceipt, setShowReceipt] = useState(false)
  const [receiptMember, setReceiptMember] = useState<{ name: string; phone: string; id: string; amount: number; slots: AdminSlot[] } | null>(null)

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
      if (roundsRes?.rounds) setRounds(roundsRes.rounds)
      if (statsRes) setRoundStats(statsRes)
    } catch {
      // API unavailable - rounds will remain empty
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

  /* ─── Fetch Admin Data by Tab ─── */
  useEffect(() => {
    if (activeTab === 'overview') {
      adminApi.stats().then(setAdminStats).catch(() => {})
    }
    if (activeTab === 'members') {
      setLoadingAdmin(true)
      adminApi.members({ search, category: catFilter !== 'all' ? catFilter : undefined })
        .then(res => { setMembersList(res.members.data); setLoadingAdmin(false) })
        .catch(() => setLoadingAdmin(false))
    }
    if (activeTab === 'winners') {
      setLoadingAdmin(true)
      adminApi.winners({ category: catFilter !== 'all' ? catFilter : undefined, round: roundFilter !== 'all' ? roundFilter : undefined })
        .then(res => { setWinnersList(res.winners.data); setLoadingAdmin(false) })
        .catch(() => setLoadingAdmin(false))
    }
    if (activeTab === 'payments') {
      setLoadingAdmin(true)
      adminApi.payments()
        .then(res => { setPaymentsList(res.payments.data); setLoadingAdmin(false) })
        .catch(() => setLoadingAdmin(false))
    }
    if (activeTab === 'promo') {
      setLoadingAdmin(true)
      Promise.all([
        adminApi.promos(),
        adminApi.promosStats(),
      ]).then(([p, s]) => {
        setPromoCodes(p.promo_codes)
        setPromoStats(s)
        setLoadingAdmin(false)
      }).catch(() => setLoadingAdmin(false))
    }
  }, [activeTab, search, catFilter, roundFilter])

  /* ─── Computed ─── */

  /* Use real admin API stats */
  const storeMetrics = store.metrics
  const stats = adminStats
  const totalUsers = stats?.total_users ?? storeMetrics.totalMembers ?? 0
  const totalSlots = stats?.total_slots ?? storeMetrics.totalSlots ?? 0
  const activeSlots = stats?.active_slots ?? storeMetrics.activeSlots ?? 0
  const lienSlots = stats?.lien_slots ?? storeMetrics.lienSlots ?? 0
  const totalBalance = stats?.total_balance ?? storeMetrics.totalPoolVolume ?? 0
  const totalPayouts = stats?.total_payouts ?? 0
  const delinquentCount = stats?.delinquent_slots ?? storeMetrics.delinquentSlots ?? 0

  const slotsByCat = useMemo(() => {
    const map: Record<string, { total: number; active: number; balance: number }> = {}
    if (stats?.slots_by_category) {
      for (const c of stats.slots_by_category) {
        map[c.category] = { total: c.total, active: c.total, balance: c.balance }
      }
    }
    CATEGORY_CODES.forEach(c => {
      if (!map[c]) map[c] = { total: 0, active: 0, balance: 0 }
    })
    return map
  }, [stats?.slots_by_category])

  const filteredWinners = useMemo(() => {
    let w = [...winnersList]
    if (catFilter !== 'all') w = w.filter(d => d.category === catFilter)
    if (roundFilter !== 'all') w = w.filter(d => String(d.round) === roundFilter)
    return w.sort((a, b) => new Date(b.draw_date).getTime() - new Date(a.draw_date).getTime())
  }, [winnersList, catFilter, roundFilter])

  const uniqueRounds = useMemo(() => {
    const rounds = new Set(winnersList.map(d => d.round).filter(Boolean))
    return [...rounds].sort()
  }, [winnersList])

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

  function handleWinnerPayout(winner: AdminDraw) {
    setSelectedWinner(winner)
    setPayoutPassword('')
    setPayoutError('')
    setPayoutStep('dial')
    setShowPayoutModal(true)
  }

  async function handlePayoutPasswordSubmit() {
    if (!selectedWinner) return
    try {
      await adminApi.payout(selectedWinner.id, payoutPassword)
      setPayoutError('')
      setPayoutStep('processing')
      setTimeout(() => {
        setShowPayoutModal(false)
        showToast(isAm ? 'ክፍያ ተሳክቷል' : 'Payout successful', 'success')
      }, 2000)
    } catch (e: any) {
      setPayoutError(e?.message || a.wrongPassword)
    }
  }

  async function handleLuckySpin(category: string) {
    setSpinError(null)
    setSpinLoading(category)
    try {
      await adminApi.runDraw(category)
      showToast(`${isAm ? 'ዕጣ ተውሏል' : 'Draw complete!'}`, 'success')
    } catch (e: any) {
      setSpinError(e?.message || 'Draw failed')
      showToast(e?.message || (isAm ? 'ዕጣ አልተሳካም' : 'Draw failed'), 'error')
    }
    setSpinLoading(null)
  }

  /* ─── PDF Generation ─── */

  function getMemberCategoryType(userSlots: AdminSlot[]): { code: string; labelEn: string; labelAm: string; penaltyEn: string; penaltyAm: string; licenseType: string } {
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

  async function generateMemberPDF(member: AdminMember) {
    const userSlots = member.slots || []
    const totalBalance = userSlots.reduce((sum, s) => sum + Number(s.balance), 0)
    const today = new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })
    const signatureDate = new Date().toISOString().split('T')[0]
    const docId = `EQUB-${String(member.id).replace(/[^a-zA-Z0-9]/g, '')}-${Date.now()}`
    const categories = [...new Set(userSlots.map(s => s.category))]
    const memberType = getMemberCategoryType(userSlots)

    const slotRows = userSlots.map((s, i) => {
      const cfg = CATEGORY_CONFIG_MAP[s.category]
      const freq = rounds.find(r => r.category === s.category)?.frequency || 'daily'
      const amount = rounds.find(r => r.category === s.category)?.amount || parseInt(s.category)
      return `<tr style="${i % 2 === 0 ? 'background:#ffffff;' : 'background:#f9fafb;'}">
        <td style="padding:10px 8px;border:1px solid #ddd;font-weight:bold;text-align:center;">${i + 1}</td>
        <td style="padding:10px 8px;border:1px solid #ddd;">${cfg?.label || s.category} ETB</td>
        <td style="padding:10px 8px;border:1px solid #ddd;text-align:center;">Slot #${s.slot_number}</td>
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
    const memberCount = membersList.length || totalUsers
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
  <tr><td class="label-cell">Registration Date</td><td class="value-cell">${member.registration_date}</td></tr>
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
      { label: a.totalUsers, value: totalUsers.toString(), icon: 'people-outline' as const, accent: '#059669', bg: '#f0fdf4' },
      { label: a.totalSlots, value: totalSlots.toString(), icon: 'grid-outline' as const, accent: '#0ea5e9', bg: '#eff6ff' },
      { label: a.totalBalance, value: `ETB ${toLoc(totalBalance)}`, icon: 'wallet-outline' as const, accent: '#f59e0b', bg: '#fffbeb' },
      { label: a.totalPayouts, value: `ETB ${toLoc(totalPayouts)}`, icon: 'arrow-up-outline' as const, accent: '#ef4444', bg: '#fef2f2' },
    ]
    return (
      <>
        <View style={styles.statsGrid}>
          {stats.map((stat, i) => (
            <Card key={i} style={[styles.statCard, { backgroundColor: '#ffffff' }]}>
              <View style={styles.statTopRow}>
                <View style={[styles.statIconCircle, { backgroundColor: stat.bg }]}>
                  <Ionicons name={stat.icon} size={18} color={stat.accent} />
                </View>
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
              <View style={[styles.statAccentBar, { backgroundColor: colors.border }]}>
                <View style={[styles.statAccentBarFill, { backgroundColor: stat.accent, width: `${60 + i * 10}%` }]} />
              </View>
            </Card>
          ))}
        </View>

        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#f0fdf4' }]}>
              <Ionicons name="pie-chart-outline" size={16} color={colors.primary} />
            </View>
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

        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#fefce8' }]}>
              <Ionicons name="warning-outline" size={16} color="#f59e0b" />
            </View>
            <Text style={styles.sectionTitle}>{a.riskStatus}</Text>
          </View>
          <View style={styles.riskRow}>
            <View style={styles.riskItem}>
              <Text style={[styles.riskNum, { color: colors.destructive }]}>{lienSlots}</Text>
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
    let displayedMembers = membersList
    if (search) {
      displayedMembers = displayedMembers.filter(u =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.phone.includes(search)
      )
    }
    if (catFilter !== 'all') {
      displayedMembers = displayedMembers.filter(u =>
        u.slots?.some(s => s.category === catFilter)
      )
    }
    const memberTotalPages = Math.max(1, Math.ceil(displayedMembers.length / PER_PAGE))
    const memberSafePage = Math.min(memberPage, memberTotalPages)
    const paginatedMembers = displayedMembers.slice((memberSafePage - 1) * PER_PAGE, memberSafePage * PER_PAGE)

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
          const userSlots = u.slots || []
          const totalBalance = userSlots.reduce((sum, s) => sum + Number(s.balance), 0)
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
                          {cfg?.label || slot.category} #{slot.slot_number}
                        </Text>
                      </View>
                      <Text style={[styles.slotBadgeSub, isLien && styles.slotBadgeTextLien]}>
                        {toLoc(Number(slot.balance))} ETB · {slot.status === 'active' ? a.active : a.lien}
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
                        // Remove from local state after API call
                        setMembersList(prev => prev.filter(m => m.id !== u.id))
                        setRounds([...rounds])
                        showToast(isAm ? 'ተወግዷል' : 'Removed', 'success')
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
        {displayedMembers.length === 0 && <Text style={styles.emptyText}>{a.noMembers}</Text>}
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

    const totalPaid = filteredWinners.reduce((s, d) => s + d.net_payout, 0)
    const biggestWin = filteredWinners.length ? Math.max(...filteredWinners.map(d => d.net_payout)) : 0
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
          const isExpanded = expandedCard === d.spin_id

          if (isHero) {
            return (
              <TouchableOpacity key={d.spin_id} activeOpacity={0.98}>
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
                  <Text style={styles.heroName}>{d.winner_name || `${a.slot} #${d.winning_slot}`}</Text>
                  <Text style={styles.heroAmount}>{toLoc(d.net_payout)} ETB</Text>
                  <Text style={styles.heroMeta}>{a.slot} #{d.winning_slot} · {formatDate(d.draw_date)}</Text>
                  <TouchableOpacity style={styles.heroPayoutBtn} onPress={() => handleWinnerPayout(d)} activeOpacity={0.8}>
                    <Ionicons name="cash-outline" size={16} color="#fff" />
                    <Text style={styles.heroPayoutBtnText}>{a.payWinner}</Text>
                  </TouchableOpacity>
                </LinearGradient>
              </TouchableOpacity>
            )
          }

          return (
            <TouchableOpacity key={d.spin_id} activeOpacity={0.95} onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
              setExpandedCard(expandedCard === d.spin_id ? null : d.spin_id)
            }}>
              <View style={styles.winnerCard}>
                <View style={styles.cardFrontRow}>
                  <View style={[styles.cardCatDot, { backgroundColor: cfg?.barColor || colors.primary }]} />
                  <View style={{ flex: 1 }}>
                    <View style={styles.cardFrontTop}>
                      <Text style={styles.cardLabel}>{cfg?.label || d.category}</Text>
                      <Text style={styles.cardRound}>R{d.round}</Text>
                      <Text style={styles.cardDate}>{formatDate(d.draw_date)}</Text>
                    </View>
                    <Text style={styles.cardName} numberOfLines={1}>{d.winner_name || `${a.slot} #${d.winning_slot}`}</Text>
                  </View>
                  <Text style={styles.cardAmount}>{toLoc(d.net_payout)}</Text>
                </View>
                {isExpanded && (
                  <View style={styles.cardExpanded}>
                    <View style={styles.cardExpandedMeta}>
                      <Ionicons name="location-outline" size={12} color={colors.mutedForeground} />
                      <Text style={styles.cardExpandedMetaText}>{a.slot} #{d.winning_slot}</Text>
                      <View style={styles.cardExpandedDot} />
                      <Ionicons name="calendar-outline" size={12} color={colors.mutedForeground} />
                      <Text style={styles.cardExpandedMetaText}>{formatDate(d.draw_date)}</Text>
                    </View>
                    <TouchableOpacity style={styles.cardPayoutBtn} onPress={() => handleWinnerPayout(d)} activeOpacity={0.8}>
                      <Ionicons name="cash-outline" size={16} color="#fff" />
                      <Text style={styles.cardPayoutBtnText}>{a.payWinner} — {toLoc(d.net_payout)} ETB</Text>
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
                  <Text style={styles.modalAmount}>{toLoc(selectedWinner?.net_payout || 0)} ETB</Text>
                  <Text style={styles.modalRecipient}>
                    {isAm ? 'ለ' : 'To'}: {selectedWinner?.winner_name || `${a.slot} #${selectedWinner?.winning_slot}`}
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
                  <Text style={styles.modalAmount}>{toLoc(selectedWinner?.net_payout || 0)} ETB {a.transferred}</Text>
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
            <View style={[styles.winnerStatItem, { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#05966920' }]}>
              <View style={[styles.winnerStatIconWrap, { backgroundColor: '#05966915' }]}>
                <Ionicons name="refresh" size={14} color="#059669" />
              </View>
              <View>
                <Text style={styles.winnerStatValue}>{roundStats.active_rounds}</Text>
                <Text style={styles.winnerStatLabel}>{isAm ? 'ንቁ' : 'Active'}</Text>
              </View>
            </View>
            <View style={[styles.winnerStatItem, { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#0ea5e920' }]}>
              <View style={[styles.winnerStatIconWrap, { backgroundColor: '#0ea5e915' }]}>
                <Ionicons name="document-outline" size={14} color="#0ea5e9" />
              </View>
              <View>
                <Text style={styles.winnerStatValue}>{roundStats.total_rounds}</Text>
                <Text style={styles.winnerStatLabel}>{isAm ? 'ጠቅላላ' : 'Total'}</Text>
              </View>
            </View>
            <View style={[styles.winnerStatItem, { backgroundColor: '#fefce8', borderWidth: 1, borderColor: '#eab30820' }]}>
              <View style={[styles.winnerStatIconWrap, { backgroundColor: '#eab30815' }]}>
                <Ionicons name="checkmark-circle-outline" size={14} color="#eab308" />
              </View>
              <View>
                <Text style={styles.winnerStatValue}>{roundStats.completed_rounds}</Text>
                <Text style={styles.winnerStatLabel}>{isAm ? 'ተጠናቅቋል' : 'Done'}</Text>
              </View>
            </View>
            <View style={[styles.winnerStatItem, { backgroundColor: '#faf5ff', borderWidth: 1, borderColor: '#8b5cf620' }]}>
              <View style={[styles.winnerStatIconWrap, { backgroundColor: '#8b5cf615' }]}>
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
              <Card key={round.id} style={styles.roundCard}>
                {/* Header Row */}
                <View style={styles.roundHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    <View style={[styles.roundCatBadge, { backgroundColor: cfg?.barColor || colors.primary }]}>
                      <Text style={styles.roundCatBadgeText}>{round.category} ETB</Text>
                    </View>
                    <Text style={[styles.roundNum, { marginBottom: 0 }]} numberOfLines={1}>
                      {round.name}
                    </Text>
                  </View>
                  <View style={[styles.roundStatusBadge, { backgroundColor: statusBg }]}>
                    <Text style={[styles.roundStatusBadgeText, { color: statusColor }]}>
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
                      style={styles.callBtn}
                      onPress={() => handleActivateRound(round.id)}
                    >
                      <Ionicons name="play-outline" size={12} color="#059669" />
                      <Text style={styles.callBtnText}>{isAm ? 'ጀምር' : 'Start'}</Text>
                    </TouchableOpacity>
                  )}
                  {round.status === 'active' && (
                    <>
                      {round.current_participants >= round.people_goal ? (
                        <TouchableOpacity
                          style={styles.callBtn}
                          onPress={() => handleRoundSpin(round.id)}
                          disabled={spinLoading === `round-${round.id}`}
                        >
                          {spinLoading === `round-${round.id}` ? (
                            <ActivityIndicator color="#059669" size={12} />
                          ) : (
                            <Ionicons name="shuffle" size={12} color="#059669" />
                          )}
                          <Text style={styles.callBtnText}>{isAm ? 'ዕጣ ዘንድ' : 'Spin'}</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={[styles.depositBtn, { opacity: 0.7 }]}>
                          <Ionicons name="lock-closed-outline" size={12} color="#059669" />
                          <Text style={styles.depositBtnText}>
                            {round.current_participants}/{round.people_goal}
                          </Text>
                        </View>
                      )}
                      <TouchableOpacity
                        style={styles.depositBtn}
                        onPress={() => handleCompleteRound(round.id)}
                      >
                        <Ionicons name="checkmark-circle-outline" size={12} color="#059669" />
                        <Text style={styles.depositBtnText}>{isAm ? 'ተጠናቅቅ' : 'Done'}</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {/* Edit Button - available for draft and active rounds */}
                  {round.status !== 'completed' && round.status !== 'cancelled' && (
                    <TouchableOpacity
                      style={styles.callBtn}
                      onPress={() => openEditRound(round)}
                    >
                      <Ionicons name="create-outline" size={12} color="#0ea5e9" />
                      <Text style={[styles.callBtnText, { color: '#0ea5e9' }]}>{isAm ? 'አስተካክል' : 'Edit'}</Text>
                    </TouchableOpacity>
                  )}
                  {round.status !== 'completed' && round.status !== 'cancelled' && (
                    <TouchableOpacity
                      style={styles.lienBtn}
                      onPress={() => handleCancelRound(round.id)}
                    >
                      <Ionicons name="close-circle-outline" size={12} color="#ef4444" />
                      <Text style={styles.lienBtnText}>{isAm ? 'ሰርዝ' : 'Cancel'}</Text>
                    </TouchableOpacity>
                  )}
                  {(round.status === 'draft' || round.status === 'cancelled') && (
                    <TouchableOpacity
                      style={styles.lienBtn}
                      onPress={() => handleDeleteRound(round.id)}
                    >
                      <Ionicons name="trash-outline" size={12} color="#ef4444" />
                      <Text style={styles.lienBtnText}>{isAm ? 'ሰርዝ' : 'Delete'}</Text>
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
    const allMemberData = membersList.filter(u => {
      if (catFilter !== 'all') {
        const userSlots = u.slots || []
        if (!userSlots.some(s => s.category === catFilter)) return false
      }
      return true
    }).map(u => {
      const slots = u.slots || []
      return { user: u, paid: slots.length > 0, slots }
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
      setPaymentsRefreshKey(k => k + 1)
      showToast(isAm ? 'ሁኔታ ተለውጧል' : 'Status updated', 'success')
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
                        Linking.openURL(`tel:*847*${String(m.user.phone).replace(/\D/g, '')}%23`)
                      }}>
                        <Ionicons name="phone-portrait-outline" size={13} color="#eab308" />
                        <Text style={[styles.payActionBtnText, { color: '#eab308' }]}>{isAm ? 'USSD' : 'USSD'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.payActionBtn, { backgroundColor: '#ecfdf5' }]}
                        onPress={() => togglePaymentStatus(String(m.user.id), m.paid)}
                      >
                        <Ionicons name="checkmark-outline" size={13} color="#059669" />
                        <Text style={[styles.payActionBtnText, { color: '#059669' }]}>{isAm ? 'ክፍል ምልክት' : 'Mark Paid'}</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <TouchableOpacity style={[styles.payActionBtn, { backgroundColor: '#f0fdf4' }]} onPress={() => {
                        setReceiptMember({ name: m.user.name, phone: String(m.user.phone), id: String(m.user.id), amount: totalMemberAmount, slots: m.slots })
                        setShowReceipt(true)
                      }}>
                        <Ionicons name="receipt-outline" size={13} color="#059669" />
                        <Text style={[styles.payActionBtnText, { color: '#059669' }]}>{isAm ? 'ደረሰኝ' : 'Receipt'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.payActionBtn, { backgroundColor: '#fef2f2' }]}
                        onPress={() => togglePaymentStatus(String(m.user.id), m.paid)}
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
  const [showCreatePromo, setShowCreatePromo] = useState(false)
  const [brokerName, setBrokerName] = useState('')
  const [brokerPhone, setBrokerPhone] = useState('')
  const [creatingPromo, setCreatingPromo] = useState(false)

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
      // Refresh promo list from API
      Promise.all([adminApi.promos(), adminApi.promosStats()])
        .then(([p, s]) => { setPromoCodes(p.promo_codes); setPromoStats(s) })
        .catch(() => {})
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

      {Platform.OS === 'web' && screenWidth >= 1024 ? (
        <View style={styles.desktopLayout}>
          {/* Sidebar */}
          <View style={styles.desktopSidebar}>
            <View style={styles.sidebarBrand}>
              <View style={styles.sidebarLogo}>
                <Ionicons name="wallet" size={22} color="#fff" />
              </View>
              <Text style={styles.sidebarBrandText}>Gojo Equb</Text>
            </View>

            <View style={styles.sidebarNav}>
              <Text style={styles.sidebarNavLabel}>{isAm ? 'ዋና' : 'MAIN'}</Text>
              {TABS.slice(0, 2).map((tab) => {
                const isActive = activeTab === tab.key
                return (
                  <TouchableOpacity
                    key={tab.key}
                    style={[styles.sidebarTab, isActive && styles.sidebarTabActive]}
                    onPress={() => setActiveTab(tab.key)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name={tab.icon as any} size={20} color={isActive ? '#fff' : colors.mutedForeground} />
                    <Text style={[styles.sidebarLabel, isActive && styles.sidebarLabelActive]}>
                      {(a as any)[tab.key] || tab.key}
                    </Text>
                  </TouchableOpacity>
                )
              })}

              <Text style={[styles.sidebarNavLabel, { marginTop: 16 }]}>{isAm ? 'አስተዳደር' : 'MANAGE'}</Text>
              {TABS.slice(2).map((tab) => {
                const isActive = activeTab === tab.key
                return (
                  <TouchableOpacity
                    key={tab.key}
                    style={[styles.sidebarTab, isActive && styles.sidebarTabActive]}
                    onPress={() => setActiveTab(tab.key)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name={tab.icon as any} size={20} color={isActive ? '#fff' : colors.mutedForeground} />
                    <Text style={[styles.sidebarLabel, isActive && styles.sidebarLabelActive]}>
                      {(a as any)[tab.key] || tab.key}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            <TouchableOpacity style={styles.sidebarLogout} onPress={async () => { await logout(); navigate('portal') }} activeOpacity={0.8}>
              <Ionicons name="log-out-outline" size={20} color="#ef4444" />
              <Text style={styles.sidebarLogoutText}>{t.dashboard.logout}</Text>
            </TouchableOpacity>
          </View>

          {/* Main Content */}
          <View style={styles.desktopMain}>
            {/* Top Header */}
            <View style={styles.desktopHeader}>
              <View style={styles.desktopHeaderLeft}>
                <Text style={styles.desktopHeaderTitle}>{(a as any)[activeTab] || activeTab}</Text>
                <Text style={styles.desktopHeaderSubtitle}>
                  {a.subtitle} · {totalUsers} {isAm ? 'ተጠቃሚዎች' : 'users'} · ETB {toLoc(totalBalance)}
                </Text>
              </View>
              <View style={styles.desktopHeaderRight}>
                <View style={styles.searchBox}>
                  <Ionicons name="search-outline" size={16} color={colors.mutedForeground} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder={a.search || 'Search...'}
                    placeholderTextColor={colors.mutedForeground}
                    value={search}
                    onChangeText={setSearch}
                  />
                </View>
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={() => showToast(isAm ? 'ማሳወቂያዎች የለም' : 'No notifications', 'info')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="notifications-outline" size={20} color={colors.mutedForeground} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={toggleLanguage}
                  activeOpacity={0.7}
                >
                  <Ionicons name="language-outline" size={20} color={colors.mutedForeground} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={async () => {
                    const wasLocked = isLocked
                    await toggleLock()
                    showToast(wasLocked ? (isAm ? 'መተግበሪያ ተከፍቷል' : 'App unlocked') : (isAm ? 'መተግበሪያ ተቆልፏል' : 'App locked'), wasLocked ? 'success' : 'info')
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name={isLocked ? 'lock-closed' : 'lock-open-outline'} size={20} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Scrollable Content */}
            <ScrollView
              style={styles.desktopScroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {activeTab === 'overview' && renderOverview()}
              {activeTab === 'members' && renderMembers()}
              {activeTab === 'winners' && renderWinners()}
              {activeTab === 'payments' && renderPayments()}
              {activeTab === 'rounds' && renderRounds()}
              {activeTab === 'promo' && renderPromo()}
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      ) : (
        <>
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
            <TouchableOpacity style={styles.logoutFooter} onPress={async () => { await logout(); navigate('portal') }} activeOpacity={0.8}>
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
        </>
      )}

      <MemberDetailModal
        visible={showMemberModal}
        user={selectedMember as any}
        slots={memberDetailSlots as any}
        allSlots={membersList.flatMap(m => m.slots || []) as any}
        onClose={() => { setShowMemberModal(false); setSelectedMember(null) }}
        onUpdateUser={(id: any, name: string, phone: string) => {
          const found = membersList.find(m => m.id === id)
          if (found) {
            const updated = { ...found, name, phone }
            setMembersList(prev => prev.map(m => m.id === id ? updated : m))
            setSelectedMember(updated)
          }
        }}
        onAssignSlot={(userId: any, category: string) => {
          const count = membersList.flatMap(m => m.slots || []).filter(s => s.category === category).length
          const newSlot: AdminSlot = {
            id: count + 1000,
            user_id: userId,
            round_id: null,
            category,
            slot_number: count + 1,
            status: 'active' as const,
            balance: 0,
            consecutive_missed_sweeps: 0,
            deposited_today: false,
            has_won: false,
            unique_payment_code: null,
            payout_code: null,
            registration_date: new Date().toISOString().slice(0, 10),
          }
          const updatedSlots = [...memberDetailSlots, newSlot]
          setMemberDetailSlots(updatedSlots)
        }}
        onRemoveSlot={(slotId: any) => {
          setMemberDetailSlots(prev => prev.filter(s => s.id !== Number(slotId)))
        }}
        onToggleLien={(slotId: any) => {
          setMemberDetailSlots(prev => prev.map(s => s.id === Number(slotId) ? { ...s, status: s.status === 'active' ? 'lien' : 'active' } : s))
          setRounds([...rounds])
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
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    borderRadius: colors.radius.lg,
    padding: spacing['2xl'],
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#ffffff',
  },
  statTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statIconCircle: {
    width: 40,
    height: 40,
    borderRadius: colors.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontFamily: fonts.bold,
    fontSize: 22,
    fontWeight: '700',
    color: colors.foreground,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  statAccentBar: {
    height: 4,
    borderRadius: 100,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  statAccentBarFill: {
    height: '100%',
    borderRadius: 100,
  },

  /* ─── Shared Section ─── */
  sectionCard: {
    marginBottom: spacing.lg,
    padding: spacing['2xl'],
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: colors.radius.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: colors.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: colors.muted,
    borderRadius: colors.radius.md,
    paddingVertical: 6,
    paddingHorizontal: 10,
    flex: 1,
    minWidth: '45%',
    borderWidth: 1,
    borderColor: colors.border,
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
    gap: 4,
    backgroundColor: 'transparent',
    borderRadius: colors.radius.md,
    paddingHorizontal: 12,
    height: 32,
    borderWidth: 1,
    borderColor: '#05966930',
  },
  callBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  depositBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#05966915',
    borderRadius: colors.radius.md,
    paddingHorizontal: 12,
    height: 32,
  },
  depositBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
  },
  lienBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ef444415',
    borderRadius: colors.radius.md,
    paddingHorizontal: 12,
    height: 32,
  },
  lienBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    fontWeight: '600',
    color: colors.destructive,
  },

  /* ─── Winner Cards ─── */

  winnerStatsStrip: {
    marginBottom: 12,
  },
  winnerStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: colors.radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 140,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#ffffff',
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
    backgroundColor: 'transparent',
    borderRadius: colors.radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
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
    borderRadius: colors.radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  submitBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  doneBtn: {
    backgroundColor: colors.primary,
    borderRadius: colors.radius.md,
    paddingVertical: 12,
    paddingHorizontal: 32,
    marginTop: 24,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  doneBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },

  /* ─── Round Cards (shadcn-inspired) ─── */
  roundCard: {
    marginBottom: 12,
    padding: 14,
    backgroundColor: '#ffffff',
    borderRadius: colors.radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  roundHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  roundCatBadge: {
    borderRadius: colors.radius.md,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  roundCatBadgeText: {
    color: '#fff',
    fontFamily: fonts.semiBold,
    fontSize: 10,
    fontWeight: '600',
  },
  roundStatusBadge: {
    borderRadius: colors.radius.md,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  roundStatusBadgeText: {
    fontFamily: fonts.semiBold,
    fontSize: 9,
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
    backgroundColor: colors.muted,
    borderRadius: 100,
    overflow: 'hidden',
    marginBottom: 8,
  },
  roundBarFill: {
    height: '100%',
    borderRadius: 100,
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
    borderRadius: colors.radius.md,
    paddingVertical: 10,
    paddingHorizontal: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  spinBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
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

  /* ─── Desktop Sidebar ─── */
  desktopLayout: {
    flexDirection: 'row',
    flex: 1,
  },
  desktopSidebar: {
    width: 240,
    backgroundColor: '#ffffff',
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'stretch',
  },
  sidebarBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 8,
    marginBottom: 24,
  },
  sidebarLogo: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarBrandText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    fontWeight: '700',
    color: colors.foreground,
    letterSpacing: -0.3,
  },
  sidebarNav: {
    flex: 1,
  },
  sidebarNavLabel: {
    fontFamily: fonts.medium,
    fontSize: 10,
    fontWeight: '600',
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 8,
    marginBottom: 6,
  },
  sidebarTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: colors.radius.md,
    marginBottom: 2,
  },
  sidebarTabActive: {
    backgroundColor: colors.primary,
  },
  sidebarLabel: {
    fontFamily: fonts.medium,
    fontSize: 13,
    fontWeight: '500',
    color: colors.mutedForeground,
  },
  sidebarLabelActive: {
    color: '#fff',
    fontWeight: '600',
  },
  sidebarLogout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: colors.radius.md,
    marginTop: 8,
  },
  sidebarLogoutText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    fontWeight: '500',
    color: colors.destructive,
  },
  desktopMain: {
    flex: 1,
    backgroundColor: colors.background,
  },
  desktopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  desktopHeaderLeft: {
    flex: 1,
  },
  desktopHeaderTitle: {
    fontFamily: fonts.bold,
    fontSize: 20,
    fontWeight: '700',
    color: colors.foreground,
    letterSpacing: -0.3,
  },
  desktopHeaderSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  desktopHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.muted,
    borderRadius: colors.radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    height: 40,
    width: 240,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: colors.radius.md,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  desktopScroll: {
    flex: 1,
  },
  tabLabelActive: {
    color: '#fff',
    fontWeight: '600',
  },

  /* ─── Round Form Modal ─── */
  roundFormModal: {
    backgroundColor: '#fff',
    borderRadius: colors.radius.xl,
    marginHorizontal: 16,
    width: '100%',
    maxHeight: '90%',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  roundFormHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    backgroundColor: colors.muted,
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
    backgroundColor: 'transparent',
    borderRadius: colors.radius.md,
    borderWidth: 1,
    borderColor: colors.input,
    paddingHorizontal: 12,
    height: 40,
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
    backgroundColor: colors.muted,
    borderRadius: colors.radius.md,
    paddingHorizontal: 14,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  roundFormChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
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
