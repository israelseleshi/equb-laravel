import { useState, useCallback, useMemo, useEffect } from 'react'
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Dimensions,
  Platform,
  Alert,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { BlurView } from 'expo-blur'
import * as Print from 'expo-print'
import { Text } from '../components/ui/AppText'
import * as Sharing from 'expo-sharing'
import { colors, fonts, spacing } from '../theme'
import { Card } from '../components/ui/Card'
import { useTranslation } from '../i18n/useTranslation'
import { useNavigation } from '../context/NavigationContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/ui/Toast'
import {
  formatDate,
  toLocale,
  getUssdPassword,
  type PaymentRecord,
  type SavingsAccount,
} from '../services/memberData'
import type { SlotModel as DbSlotModel } from '../data/models'
import {
  generateSchedule,
  getPaymentStats,
  payDay,
  payMultiple,
  type PaymentStats,
} from '../services/scheduleService'
import { getSavings, saveSavings, saveSchedule, createSlot, getSlotsByUser, deleteSlot, getAllSchedules } from '../services/storage'
import {
  todayStr,
  requestWithdrawal,
  depositToSavings,
} from '../services/memberData'

import { PaginationBar } from '../components/ui/PaginationBar'
import { roundsApi } from '../services/api'
/* ─── Constants ─── */

const PER_PAGE = 5

const TIERS = [
  { code: '500', label: '500 ETB', target: 10, amount: 500, barColor: '#059669' },
  { code: '1000', label: '1,000 ETB', target: 8, amount: 1000, barColor: '#0ea5e9' },
  { code: '2000', label: '2,000 ETB', target: 6, amount: 2000, barColor: '#8b5cf6' },
  { code: '5000', label: '5,000 ETB', target: 4, amount: 5000, barColor: '#f59e0b' },
]

const { width: screenWidth } = Dimensions.get('window')
const NOTIF_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  due_today: { bg: '#fef3c7', border: '#fde68a', text: '#92400e' },
  missed: { bg: '#fce8e6', border: '#f5c6c2', text: '#c5221f' },
  complete: { bg: '#e6f4ea', border: '#c2e0d1', text: '#137333' },
  winner: { bg: '#fef3c7', border: '#fde68a', text: '#92400e' },
}

/* ─── NotificationBar ─── */

function NotificationBar({ notifications, isAm }: { notifications: Array<{ type: string; message: string }>; isAm: boolean }) {
  if (notifications.length === 0) return null
  return (
    <View style={styles.notifContainer}>
      {notifications.map((n, i) => {
        const c = NOTIF_COLORS[n.type] || NOTIF_COLORS.missed
        return (
          <View key={i} style={[styles.notifBar, { backgroundColor: c.bg, borderColor: c.border }]}>
            <Text style={[styles.notifText, { color: c.text }]}>{n.message}</Text>
          </View>
        )
      })}
    </View>
  )
}

/* ─── Main Component ─── */

export function DashboardScreen() {
  const { t, lang, toggleLanguage } = useTranslation()
  const { navigate } = useNavigation()
  const { user, slots: userSlots, logout, toggleLock, restoreSession, isLocked, verifyPassword } = useAuth()
  const { showToast } = useToast()
  const d = t.dashboard
  const isAm = lang === 'am'

  /* ─── Slot State ─── */
  const [selectedSlotId, setSelectedSlotId] = useState(userSlots[0]?.id || '')
  const currentSlot = useMemo(() => userSlots.find((s) => s.id === selectedSlotId) || userSlots[0], [selectedSlotId, userSlots])
  const [unlockPassword, setUnlockPassword] = useState('')
  const [unlockError, setUnlockError] = useState('')
  const [unlocking, setUnlocking] = useState(false)
  const [savings, setSavings] = useState<SavingsAccount>({
    balance: 0, totalDeposits: 0, totalWithdrawn: 0, deposits: [], withdrawals: [],
  })

  /* ─── Schedule State ─── */
  const [schedule, setSchedule] = useState<PaymentRecord[]>(() =>
    currentSlot ? generateSchedule(currentSlot.category, currentSlot.registrationDate) : []
  )
  const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set())
  const [payingDay, setPayingDay] = useState<number | null>(null)
  const [batchPaying, setBatchPaying] = useState(false)

  useEffect(() => {
    if (currentSlot) {
      ;(async () => {
        const schedules = await getAllSchedules()
        const saved = schedules.find((s) => s.slotId === currentSlot.id)
        const paidDays = saved?.payments.filter((p) => p.status === 'paid') || []
        setSchedule(generateSchedule(currentSlot.category, currentSlot.registrationDate, paidDays))
      })()
      setSelectedDays(new Set())
      loadSavings(currentSlot.id)
    }
  }, [currentSlot?.id])

  const stats = useMemo(() => getPaymentStats(schedule), [schedule])

  async function loadSavings(slotId: string) {
    const acct = await getSavings(slotId)
    if (acct) setSavings(acct)
  }

  /* ─── Savings State ─── */
  const isSavings = currentSlot?.category === 'savings'
  const [depositAmount, setDepositAmount] = useState('')
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false)
  const [withdrawResult, setWithdrawResult] = useState<{ success: boolean; withdrawal?: any; commission?: number; netAmount?: number; error?: string } | null>(null)
  const [showTransactionHistory, setShowTransactionHistory] = useState(false)

  /* ─── Add Category Modal ─── */
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [activeRoundsByCat, setActiveRoundsByCat] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!showAddCategory) return
    ;(async () => {
      const map: Record<string, number> = {}
      for (const tier of TIERS) {
        try {
          const res = await roundsApi.list({ status: 'active', category: tier.code })
          const rounds = Array.isArray(res) ? res : (res as any)?.rounds
          if (rounds && rounds.length > 0) {
            map[tier.code] = rounds[0].current_round_number
          }
        } catch {}
      }
      setActiveRoundsByCat(map)
    })()
  }, [showAddCategory])

  /* ─── Filter & Pagination State ─── */
  const [filter, setFilter] = useState<'all' | 'unpaid' | 'paid'>('unpaid')
  const [paymentPage, setPaymentPage] = useState(1)
  const [recentPmtPage, setRecentPmtPage] = useState(1)
  const [depositPage, setDepositPage] = useState(1)
  const [withdrawPage, setWithdrawPage] = useState(1)

  /* ─── Notifications ─── */
  const notifications = useMemo(() => {
    const alerts: Array<{ type: string; message: string }> = []
    if (!schedule) return alerts
    const todayPmt = schedule.find((p) => p.date === todayStr())
    if (todayPmt && todayPmt.status === 'unpaid') {
      alerts.push({ type: 'due_today', message: d.notPaidToday.replace('{amount}', toLocale(todayPmt.amount)) })
    }
    const missed = schedule.filter((p) => p.status === 'unpaid' && p.date < todayStr())
    if (missed.length > 0) {
      alerts.push({ type: 'missed', message: d.missedCount.replace('{count}', missed.length.toString()) })
    }
    if (stats.completed > 0 && stats.completed === stats.total) {
      alerts.push({ type: 'complete', message: d.allComplete })
    }
    if (currentSlot?.hasWon && !currentSlot?.dealClosed) {
      alerts.push({ type: 'winner', message: d.youWon })
    }
    return alerts
  }, [schedule, stats, currentSlot, d])

  /* ─── Always-5 Lists ─── */
  const unpaidList5 = useMemo(() => {
    if (!schedule) return []
    return schedule.filter((p) => p.status === 'unpaid').slice(0, 5)
  }, [schedule])

  const paidList5 = useMemo(() => {
    if (!schedule) return []
    return schedule.filter((p) => p.status === 'paid').reverse().slice(0, 5)
  }, [schedule])

  /* ─── Filtered Payments ─── */
  const filteredPayments = useMemo(() => {
    if (!schedule) return []
    if (filter === 'unpaid') return schedule.filter((p) => p.status === 'unpaid')
    if (filter === 'paid') return schedule.filter((p) => p.status === 'paid')
    return [...schedule]
  }, [schedule, filter])

  const paginatedPayments = useMemo(() => {
    const totalPages = Math.max(1, Math.ceil(filteredPayments.length / PER_PAGE))
    const page = Math.min(paymentPage, totalPages)
    return {
      items: filteredPayments.slice((page - 1) * PER_PAGE, page * PER_PAGE),
      totalPages,
    }
  }, [filteredPayments, paymentPage])

  /* ─── Recent Payments (for modal) ─── */
  const recentPayments = useMemo(() => {
    if (!schedule) return []
    return schedule.filter((p) => p.status === 'paid').reverse().slice(0, 50)
  }, [schedule])

  /* ─── Paginated Lists ─── */
  const paginatedRecentPmts = useMemo(() => {
    const totalPages = Math.max(1, Math.ceil(recentPayments.length / PER_PAGE))
    const page = Math.min(recentPmtPage, totalPages)
    return {
      items: recentPayments.slice((page - 1) * PER_PAGE, page * PER_PAGE),
      totalPages,
    }
  }, [recentPayments, recentPmtPage])

  const paginatedDeposits = useMemo(() => {
    const totalPages = Math.max(1, Math.ceil(savings.deposits.length / PER_PAGE))
    const page = Math.min(depositPage, totalPages)
    return {
      items: savings.deposits.slice((page - 1) * PER_PAGE, page * PER_PAGE),
      totalPages,
    }
  }, [savings.deposits, depositPage])

  const paginatedWithdrawals = useMemo(() => {
    const totalPages = Math.max(1, Math.ceil(savings.withdrawals.length / PER_PAGE))
    const page = Math.min(withdrawPage, totalPages)
    return {
      items: savings.withdrawals.slice((page - 1) * PER_PAGE, page * PER_PAGE),
      totalPages,
    }
  }, [savings.withdrawals, withdrawPage])

  /* ─── Handlers ─── */
  const toggleDay = useCallback((dayIndex: number) => {
    setSelectedDays((prev) => {
      const next = new Set(prev)
      if (next.has(dayIndex)) next.delete(dayIndex)
      else next.add(dayIndex)
      return next
    })
  }, [])

  /* ─── USSD Modal State ─── */
  const [showUssd, setShowUssd] = useState(false)
  const [ussdStep, setUssdStep] = useState<'dial' | 'password' | 'processing' | 'success'>('dial')
  const [ussdPassword, setUssdPassword] = useState('')
  const [ussdAmount, setUssdAmount] = useState(0)
  const [ussdError, setUssdError] = useState('')
  const [pendingDayIndices, setPendingDayIndices] = useState<number[]>([])

  useEffect(() => {
    if (!showUssd) return
    if (ussdStep === 'dial') {
      const t = setTimeout(() => setUssdStep('password'), 2000)
      return () => clearTimeout(t)
    }
    if (ussdStep === 'processing') {
      const t = setTimeout(() => setUssdStep('success'), 2000)
      return () => clearTimeout(t)
    }
  }, [showUssd, ussdStep])

  const handlePaySingle = useCallback((dayIndex: number) => {
    const pmt = schedule.find((p) => p.dayIndex === dayIndex)
    setUssdAmount(pmt?.amount || 0)
    setPendingDayIndices([dayIndex])
    setUssdPassword('')
    setUssdError('')
    setUssdStep('dial')
    setShowUssd(true)
  }, [schedule])

  const handlePaySelected = () => {
    if (selectedDays.size === 0) return
    const total = [...selectedDays].reduce((sum, idx) => {
      const p = schedule.find((pm) => pm.dayIndex === idx)
      return sum + (p?.amount || 0)
    }, 0)
    setUssdAmount(total)
    setPendingDayIndices([...selectedDays])
    setUssdPassword('')
    setUssdError('')
    setUssdStep('dial')
    setShowUssd(true)
  }

  const handleUssdPasswordSubmit = () => {
    if (ussdPassword === getUssdPassword()) {
      setUssdError('')
      setUssdStep('processing')
    } else {
      setUssdError(isAm ? 'የተሳሳተ የይለፍ ቃል' : 'Wrong password')
    }
  }

  const handleUssdSuccess = async () => {
    setShowUssd(false)
    let updated: PaymentRecord[]
    if (pendingDayIndices.length === 1) {
      setPayingDay(pendingDayIndices[0])
      updated = payDay(pendingDayIndices[0], schedule)
      setSchedule(updated)
      setPayingDay(null)
    } else {
      setBatchPaying(true)
      updated = payMultiple(pendingDayIndices, schedule)
      setSchedule(updated)
      setBatchPaying(false)
      setSelectedDays(new Set())
    }
    if (currentSlot) {
      await saveSchedule({ slotId: currentSlot.id, payments: updated })
    }
  }

  /* ─── Receipt Modal ─── */
  const [showReceipt, setShowReceipt] = useState(false)
  const [receiptData, setReceiptData] = useState<PaymentRecord | null>(null)

  const handleViewReceipt = useCallback((payment: PaymentRecord) => {
    setReceiptData(payment)
    setShowReceipt(true)
  }, [])

  const handleDownloadReceiptPdf = async () => {
    if (!receiptData || !currentSlot) return
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  @page { margin: 15mm; }
  body { font-family: Arial,'Noto Sans Ethiopic',sans-serif; color: #1a1a1a; font-size: 12px; }
  .title { text-align: center; font-size: 18px; font-weight: 800; color: #059669; margin-bottom: 4px; }
  .sub { text-align: center; font-size: 11px; color: #555; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0; }
  td { padding: 6px 10px; border: 1px solid #ccc; }
  td:first-child { font-weight: 700; background: #f5f5f5; width: 35%; }
  .badge { display: inline-block; background: #e6f4ea; color: #137333; font-weight: 700; padding: 2px 12px; border-radius: 4px; }
  .footer { margin-top: 20px; text-align: center; font-size: 9px; color: #999; border-top: 1px solid #eee; padding-top: 8px; }
</style></head>
<body>
<p class="title">${isAm ? 'የክፍያ ደረሰኝ' : 'PAYMENT RECEIPT'}</p>
<p class="sub">${isAm ? 'ጎጆ ዕቁብ' : 'Gojo Equb'} &mdash; ${isAm ? 'የእምነት ቁጠባ አጋርዎ' : 'Your trusted savings companion'}</p>
<table>
  <tr><td>${isAm ? 'የአባል መለያ' : 'Member ID'}</td><td>${user!.id}</td></tr>
  <tr><td>${isAm ? 'ሙሉ ስም' : 'Full Name'}</td><td>${user!.name}</td></tr>
  <tr><td>${isAm ? 'ምድብ' : 'Category'}</td><td>${currentSlot.category} ETB</td></tr>
  <tr><td>${isAm ? 'የተከፈለበት ቀን' : 'Payment Date'}</td><td>${formatDate(receiptData.date, 'en')}</td></tr>
  <tr><td>${isAm ? 'የተከፈለ መጠን' : 'Amount Paid'}</td><td>${receiptData.amount} ETB</td></tr>
  <tr><td>${isAm ? 'የግብይት መለያ' : 'Transaction Ref'}</td><td>${receiptData.transRef || '-'}</td></tr>
  <tr><td>${isAm ? 'ሁኔታ' : 'Status'}</td><td><span class="badge">${isAm ? 'ተሳክቷል' : 'Successful'}</span></td></tr>
  <tr><td>${isAm ? 'የክፍያ ዘዴ' : 'Payment Method'}</td><td>${receiptData.method || 'USSD'}</td></tr>
</table>
<div class="footer">
<p>${isAm ? 'ይህ ደረሰኝ በራስ-ሰር የመነጨ ነው' : 'This receipt was automatically generated'}</p>
</div>
</body></html>`

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
        a.download = `receipt-${receiptData.date}-${user!.name.replace(/\s+/g, '_')}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } else {
        await Sharing.shareAsync(`data:application/pdf;base64,${b64}`, {
          mimeType: 'application/pdf',
          dialogTitle: isAm ? 'ደረሰኝ' : 'Payment Receipt',
          UTI: 'com.adobe.pdf',
        })
      }
    } catch {
      /* silent */
    }
  }

  /* ─── Recent Payments Modal ─── */
  const [showRecentPayments, setShowRecentPayments] = useState(false)

  /* ─── Savings Handlers ─── */
  const handleSavingsWithdraw = async () => {
    const result = requestWithdrawal(currentSlot?.id || '', savings)
    setWithdrawResult(result)
    setShowWithdrawConfirm(true)
    if (result.success && result.withdrawal && savings) {
      const updated = {
        ...savings,
        balance: savings.balance - result.withdrawal.amount,
        totalWithdrawn: savings.totalWithdrawn + result.withdrawal.amount,
        withdrawals: [...savings.withdrawals, result.withdrawal],
      }
      setSavings(updated)
      if (currentSlot) await saveSavings(currentSlot.id, updated)
    }
  }

  const handleSavingsDeposit = async () => {
    const amt = parseInt(depositAmount, 10)
    if (isNaN(amt) || amt < 10) {
      showToast(isAm ? 'ቢያንስ 10 ETB ያስገቡ' : 'Minimum 10 ETB', 'info')
      return
    }
    const updated = depositToSavings(savings, amt)
    setSavings(updated)
    setDepositAmount('')
    if (currentSlot) await saveSavings(currentSlot.id, updated)
    showToast(isAm ? `${amt} ETB ተቀምጧል` : `${amt} ETB deposited`, 'success')
  }

  const handleDownloadSavingsStatement = async () => {
    const allTx = [
      ...savings.deposits.map((d) => ({ ...d, type: 'deposit' as const })),
      ...savings.withdrawals.map((w) => ({ ...w, type: 'withdrawal' as const })),
    ].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))

    const rows = allTx
      .map((tx) => {
        if (tx.type === 'deposit') {
          return `<tr><td>${tx.date}</td><td>${isAm ? 'ተቀማጭ' : 'Deposit'}</td><td>${toLocale(tx.amount)} ETB</td><td>-</td><td>${tx.transRef || '-'}</td></tr>`
        }
        return `<tr><td>${tx.date}</td><td>${isAm ? 'መውጫ' : 'Withdrawal'}</td><td>-</td><td>${toLocale(tx.amount)} ETB</td><td>${tx.transRef || '-'}</td></tr>`
      })
      .join('')

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      @page { margin: 15mm; }
      body { font-family: Arial,'Noto Sans Ethiopic',sans-serif; color: #1a1a1a; font-size: 11px; }
      .title { text-align: center; font-size: 18px; font-weight: 800; color: #059669; margin-bottom: 4px; }
      .sub { text-align: center; font-size: 11px; color: #555; margin-bottom: 16px; }
      table { width: 100%; border-collapse: collapse; margin: 8px 0; }
      th { background: #059669; color: #fff; padding: 6px 8px; font-size: 10px; text-align: left; }
      td { padding: 5px 8px; border: 1px solid #ddd; font-size: 10px; }
      .summary { margin-top: 16px; padding: 10px; background: #f0fdf4; border-radius: 6px; }
      .footer { margin-top: 20px; text-align: center; font-size: 8px; color: #999; }
    </style></head><body>
    <p class="title">${isAm ? 'የቁጠባ መግለጫ' : 'SAVINGS STATEMENT'}</p>
    <p class="sub">Gojo Equb | ${user!.name} | ${user!.id}</p>
    <div class="summary">
      <p><strong>${isAm ? 'የአሁኑ ቀሪ ሂሳብ' : 'Current Balance'}:</strong> ${toLocale(savings.balance)} ETB</p>
      <p><strong>${isAm ? 'ጠቅላላ ተቀማጭ' : 'Total Deposits'}:</strong> ${toLocale(savings.totalDeposits)} ETB</p>
      <p><strong>${isAm ? 'ጠቅላላ መውጫ' : 'Total Withdrawn'}:</strong> ${toLocale(savings.totalWithdrawn)} ETB</p>
    </div>
    <table><thead><tr>
      <th>${isAm ? 'ቀን' : 'Date'}</th><th>${isAm ? 'አይነት' : 'Type'}</th><th>${isAm ? 'ተቀማጭ' : 'Deposit'}</th><th>${isAm ? 'መውጫ' : 'Withdrawal'}</th><th>${isAm ? 'ማጣቀሻ' : 'Ref'}</th>
    </tr></thead><tbody>${rows}</tbody></table>
    <div class="footer"><p>${isAm ? 'ይህ መግለጫ በራስ-ሰር የመነጨ ነው' : 'This statement was automatically generated'}</p></div>
    </body></html>`

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
        a.download = `savings-statement-${user!.name.replace(/\s+/g, '_')}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } else {
        await Sharing.shareAsync(`data:application/pdf;base64,${b64}`, {
          mimeType: 'application/pdf',
          dialogTitle: isAm ? 'የቁጠባ መግለጫ' : 'Savings Statement',
          UTI: 'com.adobe.pdf',
        })
      }
    } catch {
      /* silent */
    }
  }

  /* ─── Guard ─── */
  if (!user || !currentSlot) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: '#94a3b8', fontFamily: fonts.regular, fontSize: 15 }}>
          {isAm ? 'እባክዎ ይግቡ' : 'Please sign in'}
        </Text>
      </View>
    )
  }

  return (
    <LinearGradient
      colors={['#f1f5f9', '#f8fafc', '#f1f5f9']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.root}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ════════════════ HEADER ════════════════ */}
        <LinearGradient
          colors={['#059669', '#047857', '#065f46']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity style={styles.lockBtn} onPress={toggleLock} activeOpacity={0.7}>
              <Ionicons name="lock-closed-outline" size={16} color="#fff" />
              <Text style={styles.lockBtnText}>{d.lock}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleLanguage} style={styles.langToggle} activeOpacity={0.7}>
              <Ionicons name="language-outline" size={16} color="#fff" />
              <Text style={styles.langText}>{lang === 'en' ? 'አማ' : 'EN'}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.headerBody}>
            <LinearGradient colors={['#fff', '#f0fdf4']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
            </LinearGradient>
            <View style={styles.headerTextCol}>
              <Text style={styles.welcomeText}>{d.welcomeBack} {user.name.split(' ')[0]}</Text>
              <Text style={styles.headerMeta}>
                {d.memberId} {user.id} · {currentSlot.registrationDate}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* ════════════════ NOTIFICATIONS ════════════════ */}
        <NotificationBar notifications={notifications} isAm={isAm} />

        {/* ════════════════ SLOT SWITCHER ════════════════ */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.slotSwitcher} contentContainerStyle={styles.slotSwitcherContent}>
          {userSlots.map((slot) => {
            const isActive = slot.id === selectedSlotId
            return (
              <TouchableOpacity
                key={slot.id}
                style={[styles.slotTab, isActive && styles.slotTabActive]}
                onPress={() => setSelectedSlotId(slot.id)}
                onLongPress={() => {
                  if (userSlots.length <= 1) {
                    showToast(lang === 'en' ? 'Cannot remove your only slot' : 'የመጨረሻ ቦታዎን ማስወገድ አይችሉም')
                    return
                  }
                  Alert.alert(
                    lang === 'en' ? 'Remove Slot' : 'ቦታ አስወግድ',
                    lang === 'en' ? `Remove ${slot.category} ETB #${slot.slotNumber}?` : `${slot.category} ETB #${slot.slotNumber} ያስወግዱ?`,
                    [
                      { text: lang === 'en' ? 'Cancel' : 'ተው', style: 'cancel' },
                      {
                        text: lang === 'en' ? 'Remove' : 'አስወግድ',
                        style: 'destructive',
                        onPress: async () => {
                          await deleteSlot(slot.id)
                          await restoreSession()
                          if (selectedSlotId === slot.id) {
                            setSelectedSlotId(userSlots.filter((s) => s.id !== slot.id)[0]?.id || '')
                          }
                        },
                      },
                    ],
                  )
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.slotTabText, isActive && styles.slotTabTextActive]}>
                  {slot.category} ETB{slot.roundNumber ? ` · ${isAm ? 'ዙር' : 'R'}${slot.roundNumber}` : ` #${slot.slotNumber}`}
                </Text>
              </TouchableOpacity>
            )
          })}
          <TouchableOpacity style={styles.slotAddBtn} onPress={() => setShowAddCategory(true)} activeOpacity={0.7}>
            <Ionicons name="add" size={20} color="#059669" />
          </TouchableOpacity>
        </ScrollView>

        {/* ════════════════ STATS CARD ════════════════ */}
        <View style={styles.statsCard}>
          <View style={styles.statsRow}>
            <View style={styles.statsMain}>
              <Text style={styles.statsMainLabel}>{d.paymentProgress}</Text>
              <View style={styles.statsBarOuter}>
                <View style={[styles.statsBarInner, { width: stats.total > 0 ? `${(stats.completed / stats.total) * 100}%` : '0%' }]} />
              </View>
              <Text style={styles.statsMainValue}>{stats.completed} / {stats.total} {isAm ? 'ቀናት' : 'days'}</Text>
            </View>
          </View>
          <View style={styles.statsGrid}>
            <View style={styles.statsGridItem}>
              <Text style={styles.statsGridLabel}>{d.paid}</Text>
              <Text style={[styles.statsGridValue, { color: '#059669' }]}>{toLocale(stats.paidAmount)}</Text>
              <Text style={styles.statsGridSuffix}>ETB</Text>
            </View>
            <View style={styles.statsGridItem}>
              <Text style={styles.statsGridLabel}>{d.daysRemaining}</Text>
              <Text style={[styles.statsGridValue, { color: '#d97706' }]}>{stats.total - stats.completed}</Text>
              <Text style={styles.statsGridSuffix}>{isAm ? 'ቀናት' : 'days'}</Text>
            </View>
            <View style={styles.statsGridItem}>
              <Text style={styles.statsGridLabel}>{d.remaining}</Text>
              <Text style={[styles.statsGridValue, { color: '#dc2626' }]}>{toLocale(stats.remaining)}</Text>
              <Text style={styles.statsGridSuffix}>ETB</Text>
            </View>
          </View>
        </View>

        {/* ════════════════ ACTION BUTTONS ════════════════ */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setShowRecentPayments(true)} activeOpacity={0.7}>
            <LinearGradient colors={['#fff', '#f8fafc']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.actionBtnGrad}>
              <Ionicons name="time-outline" size={18} color={colors.primary} />
              <Text style={styles.actionBtnText}>{d.recentPayments}</Text>
            </LinearGradient>
          </TouchableOpacity>
          {isSavings && (
            <TouchableOpacity style={styles.actionBtn} onPress={handleSavingsWithdraw} activeOpacity={0.7}>
              <LinearGradient colors={['#fef2f2', '#fff']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.actionBtnGrad}>
                <Ionicons name="cash-outline" size={18} color="#dc2626" />
                <Text style={[styles.actionBtnText, { color: '#dc2626' }]}>{d.withdraw}</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
            <LinearGradient colors={[colors.primary, '#047857']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.actionBtnGrad}>
              <Ionicons name="help-circle-outline" size={18} color="#fff" />
              <Text style={[styles.actionBtnText, { color: '#fff' }]}>{d.help}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* ════════════════ SAVINGS CARD ════════════════ */}
        {isSavings && (
          <Card style={styles.savingsCard}>
            <View style={styles.savingsBalanceRow}>
              <View>
                <Text style={styles.savingsBalanceLabel}>{d.savingsBalance}</Text>
                <Text style={styles.savingsBalance}>{toLocale(savings.balance)} ETB</Text>
              </View>
              <Ionicons name="wallet-outline" size={32} color={colors.primary} />
            </View>
            <View style={styles.savingsMetaRow}>
              <View style={styles.savingsMetaItem}>
                <Text style={styles.savingsMetaValue}>{toLocale(savings.totalDeposits)} ETB</Text>
                <Text style={styles.savingsMetaLabel}>{d.totalDeposits}</Text>
              </View>
              <View style={styles.savingsMetaItem}>
                <Text style={[styles.savingsMetaValue, { color: '#dc2626' }]}>{toLocale(savings.totalWithdrawn)} ETB</Text>
                <Text style={styles.savingsMetaLabel}>{d.totalWithdrawn}</Text>
              </View>
            </View>
            <View style={styles.savingsDepositRow}>
              <TextInput
                style={styles.savingsInput}
                value={depositAmount}
                onChangeText={setDepositAmount}
                placeholder={isAm ? 'መጠን...' : 'Amount...'}
                placeholderTextColor="#94a3b8"
                keyboardType="number-pad"
              />
              <TouchableOpacity style={styles.savingsDepositBtn} onPress={handleSavingsDeposit} activeOpacity={0.8}>
                <Text style={styles.savingsDepositBtnText}>{d.deposit}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.savingsActionBtns}>
              <TouchableOpacity style={styles.savingsWithdrawBtn} onPress={handleSavingsWithdraw} activeOpacity={0.8}>
                <Text style={styles.savingsWithdrawBtnText}>{d.withdraw}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.savingsStatementBtn} onPress={handleDownloadSavingsStatement} activeOpacity={0.8}>
                <Text style={styles.savingsStatementBtnText}>{d.statement}</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.savingsTxBtn} onPress={() => setShowTransactionHistory(true)} activeOpacity={0.7}>
              <Text style={styles.savingsTxBtnText}>{d.transactionHistory}</Text>
            </TouchableOpacity>
          </Card>
        )}

        {/* ════════════════ FILTER TABS ════════════════ */}
        {!isSavings && (
          <View style={styles.filterRow}>
            {(['all', 'unpaid', 'paid'] as const).map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.filterTab, filter === f && styles.filterTabActive]}
                onPress={() => { setFilter(f); setPaymentPage(1) }}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterTabText, filter === f && styles.filterTabTextActive]}>
                  {f === 'all' ? d.all : f === 'unpaid' ? d.unpaid : d.paid}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ════════════════ PAYMENT LIST ════════════════ */}
        {!isSavings && (
          <>
            {filter === 'unpaid' && (
              <>
                {unpaidList5.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Ionicons name="checkmark-circle" size={28} color="#059669" />
                    <Text style={styles.emptyBoxText}>{isAm ? 'ሁሉም ተከፍሏል' : 'All paid up'}</Text>
                  </View>
                ) : (
                  unpaidList5.map((pmt) => {
                    const isDue = pmt.date === todayStr()
                    return (
                      <View key={pmt.dayIndex} style={[styles.pmtCard, isDue && styles.pmtCardDue]}>
                        <View style={styles.pmtLeft}>
                          <TouchableOpacity
                            style={[styles.checkbox, selectedDays.has(pmt.dayIndex) && styles.checkboxChecked]}
                            onPress={() => toggleDay(pmt.dayIndex)}
                            activeOpacity={0.7}
                          >
                            {selectedDays.has(pmt.dayIndex) && <Ionicons name="checkmark" size={12} color="#fff" />}
                          </TouchableOpacity>
                          <View style={styles.pmtInfo}>
                            <Text style={styles.pmtDate}>{formatDate(pmt.date, lang)}</Text>
                            <Text style={styles.pmtAmount}>{toLocale(pmt.amount)} ETB</Text>
                          </View>
                        </View>
                        <View style={styles.pmtRight}>
                          <TouchableOpacity
                            style={[styles.payBtn, payingDay === pmt.dayIndex && styles.payBtnBusy]}
                            onPress={() => handlePaySingle(pmt.dayIndex)}
                            disabled={payingDay === pmt.dayIndex}
                            activeOpacity={0.8}
                          >
                            {payingDay === pmt.dayIndex ? (
                              <ActivityIndicator color="#fff" size="small" />
                            ) : (
                              <Text style={styles.payBtnText}>{d.payNow}</Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    )
                  })
                )}
                {selectedDays.size > 0 && (
                  <View style={styles.batchBar}>
                    <Text style={styles.batchCount}>
                      {selectedDays.size} {d.daySelected}
                    </Text>
                    <Text style={styles.batchTotal}>
                      {toLocale([...selectedDays].reduce((sum, idx) => {
                        const p = schedule.find((pm) => pm.dayIndex === idx)
                        return sum + (p?.amount || 0)
                      }, 0))} ETB
                    </Text>
                    <TouchableOpacity
                      style={styles.batchPayBtn}
                      onPress={handlePaySelected}
                      disabled={batchPaying}
                      activeOpacity={0.8}
                    >
                      {batchPaying ? (
                        <ActivityIndicator color="#059669" size="small" />
                      ) : (
                        <Text style={styles.batchPayBtnText}>{d.paySelected}</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}

            {filter === 'paid' && (
              <>
                {paidList5.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Ionicons name="receipt-outline" size={28} color="#94a3b8" />
                    <Text style={styles.emptyBoxText}>{isAm ? 'ገና ክፍያ የለም' : 'No payments yet'}</Text>
                  </View>
                ) : (
                  paidList5.map((pmt) => (
                    <View key={pmt.dayIndex} style={styles.pmtCard}>
                      <View style={styles.pmtLeft}>
                        <View style={styles.pmtCheckStub}>
                          <Ionicons name="checkmark-circle" size={18} color="#059669" />
                        </View>
                        <View style={styles.pmtInfo}>
                          <Text style={styles.pmtDate}>{formatDate(pmt.date, lang)}</Text>
                          <Text style={styles.pmtAmount}>{toLocale(pmt.amount)} ETB</Text>
                        </View>
                      </View>
                      <View style={styles.pmtRight}>
                        <TouchableOpacity
                          style={styles.receiptBtn}
                          onPress={() => handleViewReceipt(pmt)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="receipt-outline" size={13} color="#fff" />
                          <Text style={styles.receiptBtnText}>{d.receipt}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </>
            )}

            {filter === 'all' && (
              <>
                {paginatedPayments.items.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Ionicons name="receipt-outline" size={28} color="#94a3b8" />
                    <Text style={styles.emptyBoxText}>{d.noPayments}</Text>
                  </View>
                ) : (
                  paginatedPayments.items.map((pmt) => {
                    const isPaid = pmt.status === 'paid'
                    return (
                      <View key={pmt.dayIndex} style={styles.pmtCard}>
                        <View style={styles.pmtLeft}>
                          <View style={styles.pmtCheckStub}>
                            <Ionicons
                              name={isPaid ? 'checkmark-circle' : 'ellipse-outline'}
                              size={18}
                              color={isPaid ? '#059669' : '#d1d5db'}
                            />
                          </View>
                          <View style={styles.pmtInfo}>
                            <Text style={styles.pmtDate}>{formatDate(pmt.date, lang)}</Text>
                            <Text style={styles.pmtAmount}>{toLocale(pmt.amount)} ETB</Text>
                          </View>
                        </View>
                        <View style={styles.pmtRight}>
                          {isPaid ? (
                            <TouchableOpacity style={styles.receiptBtn} onPress={() => handleViewReceipt(pmt)} activeOpacity={0.7}>
                              <Ionicons name="receipt-outline" size={13} color="#fff" />
                              <Text style={styles.receiptBtnText}>{d.receipt}</Text>
                            </TouchableOpacity>
                          ) : (
                            <TouchableOpacity
                              style={[styles.payBtn, payingDay === pmt.dayIndex && styles.payBtnBusy]}
                              onPress={() => handlePaySingle(pmt.dayIndex)}
                              disabled={payingDay === pmt.dayIndex}
                              activeOpacity={0.8}
                            >
                              {payingDay === pmt.dayIndex ? (
                                <ActivityIndicator color="#fff" size="small" />
                              ) : (
                                <Text style={styles.payBtnText}>{d.payNow}</Text>
                              )}
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    )
                  })
                )}
                {paginatedPayments.totalPages > 1 && (
                  <View style={styles.paginationRow}>
                    <TouchableOpacity
                      style={[styles.pageBtn, paymentPage <= 1 && styles.pageBtnDisabled]}
                      onPress={() => setPaymentPage((p) => Math.max(1, p - 1))}
                      disabled={paymentPage <= 1}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="chevron-back" size={16} color={paymentPage <= 1 ? '#cbd5e1' : '#059669'} />
                    </TouchableOpacity>
                    <Text style={styles.pageText}>{paymentPage} / {paginatedPayments.totalPages}</Text>
                    <TouchableOpacity
                      style={[styles.pageBtn, paymentPage >= paginatedPayments.totalPages && styles.pageBtnDisabled]}
                      onPress={() => setPaymentPage((p) => Math.min(paginatedPayments.totalPages, p + 1))}
                      disabled={paymentPage >= paginatedPayments.totalPages}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="chevron-forward" size={16} color={paymentPage >= paginatedPayments.totalPages ? '#cbd5e1' : '#059669'} />
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </>
        )}



        {/* ════════════════ FOOTER ════════════════ */}
        <TouchableOpacity style={styles.logoutFooter} onPress={async () => { await logout(); navigate('landing') }} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={18} color="#fff" />
          <Text style={styles.logoutFooterText}>{d.logout}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ════════════════════════════════════════════
           MODALS
           ════════════════════════════════════════════ */}

      {/* ─── Add Category Modal ─── */}
      <Modal visible={showAddCategory} transparent animationType="fade" onRequestClose={() => setShowAddCategory(false)}>
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill}>
          <View style={styles.addCatOverlay}>
            <View style={styles.addCatModal}>
              <Text style={styles.addCatTitle}>{lang === 'en' ? 'Add a Category' : 'ምድብ ያክሉ'}</Text>
              <TouchableOpacity style={styles.addCatClose} onPress={() => setShowAddCategory(false)} activeOpacity={0.7}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
              {TIERS.map((tier) => (
                <TouchableOpacity
                  key={tier.code}
                  style={styles.addCatItem}
                  activeOpacity={0.7}
                  onPress={async () => {
                    const existing = await getSlotsByUser(user!.id)
                    const sameCat = existing.filter((s) => s.category === tier.code)
                    const slotNumber = sameCat.length + 1
                    let roundId: string | undefined
                    let roundNumber: number | undefined
                    try {
                      const roundsRes = await roundsApi.list({ status: 'active', category: tier.code })
                      const activeRounds = Array.isArray(roundsRes) ? roundsRes : (roundsRes as any)?.rounds
                      if (activeRounds && activeRounds.length > 0) {
                        const round = activeRounds[0]
                        const backendUserId = Number(user!.id)
                        if (!isNaN(backendUserId)) {
                          const enrollRes = await roundsApi.enroll(round.id, backendUserId)
                          roundId = String(round.id)
                          roundNumber = round.current_round_number
                        }
                      }
                    } catch {
                    }
                    const newSlot: DbSlotModel = {
                      id: `${user!.id}-${tier.code}-${slotNumber}-${Date.now()}`,
                      userId: user!.id,
                      category: tier.code,
                      slotNumber,
                      status: 'active',
                      hasWon: false,
                      dealClosed: false,
                      registrationDate: new Date().toISOString().slice(0, 10),
                      balance: 0,
                      depositedToday: false,
                      consecutiveMissedSweeps: 0,
                      roundId,
                      roundNumber,
                    }
                    await createSlot(newSlot)
                    await restoreSession()
                    setSelectedSlotId(newSlot.id)
                    setShowAddCategory(false)
                  }}
                >
                  <View style={[styles.addCatDot, { backgroundColor: tier.barColor }]} />
                  <Text style={styles.addCatLabel}>{tier.label}</Text>
                  <Text style={styles.addCatRound}>{activeRoundsByCat[tier.code] ? `${isAm ? 'ዙር' : 'R'}${activeRoundsByCat[tier.code]}` : ''}</Text>
                  <Ionicons name="add-circle-outline" size={20} color="#059669" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </BlurView>
      </Modal>

      {/* ─── USSD Payment Modal ─── */}
      <Modal visible={showUssd} transparent animationType="fade" onRequestClose={() => setShowUssd(false)}>
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill}>
          <View style={styles.ussdOverlay}>
            <View style={styles.ussdModal}>
              {ussdStep === 'dial' && (
                <>
                  <View style={styles.ussdStepIcon}>
                    <Ionicons name="call-outline" size={32} color={colors.primary} />
                  </View>
                  <Text style={styles.ussdTitle}>{d.ussdPayment}</Text>
                  <Text style={styles.ussdDialing}>{d.dialing}</Text>
                  <Text style={styles.ussdCode}>*847*123#</Text>
                  <Text style={styles.ussdAmountLabel}>{isAm ? 'መጠን፡' : 'Amount:'} {toLocale(ussdAmount)} ETB</Text>
                  <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 20 }} />
                </>
              )}

              {ussdStep === 'password' && (
                <>
                  <View style={styles.ussdStepIcon}>
                    <Ionicons name="key-outline" size={32} color={colors.primary} />
                  </View>
                  <Text style={styles.ussdTitle}>{d.enterPassword}</Text>
                  <Text style={styles.ussdSub}>{d.ussdPasswordHint}</Text>
                  <TextInput
                    style={styles.ussdInput}
                    value={ussdPassword}
                    onChangeText={setUssdPassword}
                    placeholder="******"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry
                    keyboardType="number-pad"
                    maxLength={10}
                    autoFocus
                  />
                  {ussdError !== '' && (
                    <View style={styles.ussdErrorRow}>
                      <Ionicons name="alert-circle" size={14} color="#dc2626" />
                      <Text style={styles.ussdError}>{ussdError}</Text>
                    </View>
                  )}
                  <View style={styles.ussdBtnRow}>
                    <TouchableOpacity style={styles.ussdCancelBtn} onPress={() => setShowUssd(false)} activeOpacity={0.7}>
                      <Text style={styles.ussdCancelBtnText}>{d.cancel}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.ussdSubmitBtn, !ussdPassword && { opacity: 0.5 }]}
                      onPress={handleUssdPasswordSubmit}
                      disabled={!ussdPassword}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.ussdSubmitBtnText}>{d.submit}</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {ussdStep === 'processing' && (
                <>
                  <View style={styles.ussdStepIcon}>
                    <Ionicons name="hourglass-outline" size={32} color={colors.primary} />
                  </View>
                  <Text style={styles.ussdTitle}>{d.processing}</Text>
                  <Text style={styles.ussdSub}>{isAm ? 'ክፍያዎ እየተሰራ ነው...' : 'Your payment is being processed...'}</Text>
                  <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 20 }} />
                </>
              )}

              {ussdStep === 'success' && (
                <>
                  <View style={[styles.ussdStepIcon, { backgroundColor: '#e6f4ea' }]}>
                    <Ionicons name="checkmark-circle" size={32} color="#137333" />
                  </View>
                  <Text style={styles.ussdTitle}>{d.paymentSuccessful}</Text>
                  <Text style={[styles.ussdSub, { fontSize: 22, fontWeight: '700', color: colors.primary, marginTop: 8 }]}>
                    {toLocale(ussdAmount)} ETB
                  </Text>
                  <Text style={styles.ussdSub}>{d.paidSuccessfully}</Text>
                  <TouchableOpacity style={styles.ussdDoneBtn} onPress={handleUssdSuccess} activeOpacity={0.8}>
                    <Text style={styles.ussdDoneBtnText}>{d.done}</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </BlurView>
      </Modal>

      {/* ─── Receipt Modal ─── */}
      <Modal visible={showReceipt} transparent animationType="fade" onRequestClose={() => setShowReceipt(false)}>
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill}>
          <View style={styles.modalOverlay}>
            <View style={styles.receiptModal}>
              <View style={styles.receiptModalHeader}>
                <View style={styles.receiptModalHeaderLeft}>
                  <Ionicons name="receipt-outline" size={20} color={colors.primary} />
                  <Text style={styles.receiptModalTitle}>{d.paymentReceipt}</Text>
                </View>
                <TouchableOpacity onPress={() => setShowReceipt(false)} style={styles.modalCloseBtn} activeOpacity={0.7}>
                  <Ionicons name="close" size={20} color="#64748b" />
                </TouchableOpacity>
              </View>
              {receiptData && (
                <View style={styles.receiptBody}>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptFieldLabel}>{d.memberId}</Text>
                    <Text style={styles.receiptFieldValue}>{user.id}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptFieldLabel}>{isAm ? 'ሙሉ ስም' : 'Full Name'}</Text>
                    <Text style={styles.receiptFieldValue}>{user.name}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptFieldLabel}>{d.tier}</Text>
                    <Text style={styles.receiptFieldValue}>{currentSlot.category} ETB</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptFieldLabel}>{d.date}</Text>
                    <Text style={styles.receiptFieldValue}>{formatDate(receiptData.date, 'en')}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptFieldLabel}>{d.amount}</Text>
                    <Text style={[styles.receiptFieldValue, { fontSize: 16, color: colors.primary, fontWeight: '700' }]}>
                      {toLocale(receiptData.amount)} ETB
                    </Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptFieldLabel}>{d.ref}</Text>
                    <Text style={[styles.receiptFieldValue, { fontSize: 10 }]}>{receiptData.transRef || '-'}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptFieldLabel}>{d.status}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#e6f4ea', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#137333' }} />
                      <Text style={{ fontFamily: fonts.medium, fontSize: 10, fontWeight: '500', color: '#137333' }}>{d.successful}</Text>
                    </View>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptFieldLabel}>{d.method}</Text>
                    <Text style={styles.receiptFieldValue}>{receiptData.method || 'USSD'}</Text>
                  </View>
                  <TouchableOpacity style={styles.downloadPdfBtn} onPress={handleDownloadReceiptPdf} activeOpacity={0.8}>
                    <Ionicons name="document-text-outline" size={18} color="#fff" />
                    <Text style={styles.downloadPdfBtnText}>{d.downloadPdf}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </BlurView>
      </Modal>

      {/* ─── Recent Payments Modal ─── */}
      <Modal visible={showRecentPayments} transparent animationType="slide" onRequestClose={() => setShowRecentPayments(false)}>
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill}>
          <View style={styles.modalOverlayBottom}>
            <View style={styles.modalContent}>
              <View style={styles.receiptModalHeader}>
                <View style={styles.receiptModalHeaderLeft}>
                  <Ionicons name="time-outline" size={20} color={colors.primary} />
                  <Text style={styles.receiptModalTitle}>{d.recentPayments}</Text>
                </View>
                <TouchableOpacity onPress={() => setShowRecentPayments(false)} style={styles.modalCloseBtn} activeOpacity={0.7}>
                  <Ionicons name="close" size={20} color="#64748b" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalScroll}>
                {recentPayments.length === 0 ? (
                  <View style={styles.modalEmpty}>
                    <Ionicons name="receipt-outline" size={32} color="#94a3b8" />
                    <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.mutedForeground, textAlign: 'center' }}>{isAm ? 'ምንም ክፍያ የለም' : 'No payments yet'}</Text>
                  </View>
                ) : (
                  <>
                    {paginatedRecentPmts.items.map((pmt) => (
                      <View key={pmt.dayIndex} style={styles.recentRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.recentDate}>{formatDate(pmt.date, lang)}</Text>
                          <Text style={styles.recentAmount}>{toLocale(pmt.amount)} ETB</Text>
                          <View style={styles.recentMeta}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#e6f4ea', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#137333' }} />
                              <Text style={{ fontFamily: fonts.medium, fontSize: 10, fontWeight: '500', color: '#137333' }}>{d.successful}</Text>
                            </View>
                            <Text style={styles.recentRef}>{d.ref}: {pmt.transRef}</Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          style={styles.recentReceiptBtn}
                          onPress={() => { setShowRecentPayments(false); handleViewReceipt(pmt) }}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.recentReceiptBtnText}>{d.receipt}</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                    <PaginationBar
                      currentPage={recentPmtPage}
                      totalPages={paginatedRecentPmts.totalPages}
                      onPrev={() => setRecentPmtPage((p) => Math.max(1, p - 1))}
                      onNext={() => setRecentPmtPage((p) => Math.min(paginatedRecentPmts.totalPages, p + 1))}
                    />
                  </>
                )}
              </ScrollView>
            </View>
          </View>
        </BlurView>
      </Modal>

      {/* ─── Transaction History Modal ─── */}
      <Modal visible={showTransactionHistory} transparent animationType="slide" onRequestClose={() => setShowTransactionHistory(false)}>
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill}>
          <View style={styles.modalOverlayBottom}>
            <View style={styles.modalContent}>
              <View style={styles.receiptModalHeader}>
                <View style={styles.receiptModalHeaderLeft}>
                  <Ionicons name="swap-horizontal-outline" size={20} color={colors.primary} />
                  <Text style={styles.receiptModalTitle}>{d.transactionHistory}</Text>
                </View>
                <TouchableOpacity onPress={() => setShowTransactionHistory(false)} style={styles.modalCloseBtn} activeOpacity={0.7}>
                  <Ionicons name="close" size={20} color="#64748b" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalScroll}>
                {savings.deposits.length === 0 && savings.withdrawals.length === 0 ? (
                  <View style={styles.modalEmpty}>
                    <Ionicons name="swap-horizontal-outline" size={32} color="#94a3b8" />
                    <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.mutedForeground, textAlign: 'center' }}>{d.noTransactions}</Text>
                  </View>
                ) : (
                  <>
                    {savings.deposits.length > 0 && (
                      <>
                        <Text style={styles.txSectionLabel}>{d.deposits}</Text>
                        {paginatedDeposits.items.map((dep, i) => (
                          <View key={i} style={styles.txRow}>
                            <View style={[styles.txDot, { backgroundColor: '#e6f4ea' }]}>
                              <Ionicons name="arrow-down" size={12} color="#137333" />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.txDate}>{dep.date}</Text>
                              <Text style={styles.txAmount}>+{toLocale(dep.amount)} ETB</Text>
                              <Text style={styles.txRef}>{dep.transRef}</Text>
                            </View>
                            <Text style={styles.txMethod}>{dep.method}</Text>
                          </View>
                        ))}
                        {paginatedDeposits.totalPages > 1 && (
                          <PaginationBar
                            currentPage={depositPage}
                            totalPages={paginatedDeposits.totalPages}
                            onPrev={() => setDepositPage((p) => Math.max(1, p - 1))}
                            onNext={() => setDepositPage((p) => Math.min(paginatedDeposits.totalPages, p + 1))}
                          />
                        )}
                      </>
                    )}
                    {savings.withdrawals.length > 0 && (
                      <>
                        <Text style={[styles.txSectionLabel, { color: '#dc2626', marginTop: 16 }]}>{d.withdrawals}</Text>
                        {paginatedWithdrawals.items.map((w, i) => (
                          <View key={i} style={styles.txRow}>
                            <View style={[styles.txDot, { backgroundColor: '#fce8e6' }]}>
                              <Ionicons name="arrow-up" size={12} color="#dc2626" />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.txDate}>{w.date}</Text>
                              <Text style={[styles.txAmount, { color: '#dc2626' }]}>-{toLocale(w.amount)} ETB</Text>
                              {w.commission > 0 && (
                                <Text style={styles.txCommission}>
                                  {d.commission}: {toLocale(w.commission)} ETB | {d.netAmount}: {toLocale(w.netAmount)} ETB
                                </Text>
                              )}
                              <Text style={styles.txRef}>{w.transRef}</Text>
                            </View>
                          </View>
                        ))}
                        {paginatedWithdrawals.totalPages > 1 && (
                          <PaginationBar
                            currentPage={withdrawPage}
                            totalPages={paginatedWithdrawals.totalPages}
                            onPrev={() => setWithdrawPage((p) => Math.max(1, p - 1))}
                            onNext={() => setWithdrawPage((p) => Math.min(paginatedWithdrawals.totalPages, p + 1))}
                          />
                        )}
                      </>
                    )}
                  </>
                )}
              </ScrollView>
            </View>
          </View>
        </BlurView>
      </Modal>

      {/* ─── Withdrawal Confirmation Modal ─── */}
      <Modal visible={showWithdrawConfirm} transparent animationType="fade" onRequestClose={() => setShowWithdrawConfirm(false)}>
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill}>
          <View style={styles.modalOverlay}>
            <View style={styles.receiptModal}>
              <View style={styles.receiptModalHeader}>
                <View style={styles.receiptModalHeaderLeft}>
                  <Ionicons name="cash-outline" size={20} color={colors.primary} />
                  <Text style={styles.receiptModalTitle}>{d.withdrawalResult}</Text>
                </View>
                <TouchableOpacity onPress={() => setShowWithdrawConfirm(false)} style={styles.modalCloseBtn} activeOpacity={0.7}>
                  <Ionicons name="close" size={20} color="#64748b" />
                </TouchableOpacity>
              </View>
              {withdrawResult && (
                <ScrollView style={{ maxHeight: 400 }}>
                  {withdrawResult.success ? (
                    <>
                      <View style={styles.withdrawIcon}>
                        <Ionicons name="checkmark-circle" size={48} color="#137333" />
                      </View>
                      <Text style={[styles.ussdTitle, { marginTop: 8 }]}>{d.withdrawalApproved}</Text>
                      <View style={styles.receiptBody}>
                        <View style={styles.receiptRow}>
                          <Text style={styles.receiptFieldLabel}>{d.requestedAmount}</Text>
                          <Text style={styles.receiptFieldValue}>{toLocale(withdrawResult.withdrawal?.amount || 0)} ETB</Text>
                        </View>
                        <View style={styles.receiptRow}>
                          <Text style={styles.receiptFieldLabel}>{d.commission}</Text>
                          <Text style={styles.receiptFieldValue}>{toLocale(withdrawResult.commission || 0)} ETB</Text>
                        </View>
                        <View style={[styles.receiptRow, { borderBottomWidth: 0 }]}>
                          <Text style={styles.receiptFieldLabel}>{d.netAmount}</Text>
                          <Text style={[styles.receiptFieldValue, { color: colors.primary, fontSize: 18, fontWeight: '700' }]}>
                            {toLocale(withdrawResult.netAmount || 0)} ETB
                          </Text>
                        </View>
                      </View>
                    </>
                  ) : (
                    <>
                      <View style={styles.withdrawIcon}>
                        <Ionicons name="close-circle" size={48} color="#dc2626" />
                      </View>
                      <Text style={[styles.ussdTitle, { marginTop: 8 }]}>{d.withdrawalRejected}</Text>
                      <Text style={[styles.ussdSub, { marginTop: 8, marginBottom: 16 }]}>{withdrawResult.error}</Text>
                    </>
                  )}
                  <TouchableOpacity style={styles.downloadPdfBtn} onPress={() => setShowWithdrawConfirm(false)} activeOpacity={0.8}>
                    <Text style={styles.downloadPdfBtnText}>{d.done}</Text>
                  </TouchableOpacity>
                </ScrollView>
              )}
            </View>
          </View>
        </BlurView>
      </Modal>

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
            <TouchableOpacity style={styles.lockLogoutBtn} onPress={async () => { await logout(); navigate('landing') }} activeOpacity={0.7}>
              <Ionicons name="log-out-outline" size={14} color="#e2e8f0" />
              <Text style={styles.lockLogoutText}>{isAm ? 'ውጣ' : 'Logout'}</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      )}
    </LinearGradient>
  )
}

/* ════════════════════════════════════════════
   STYLES
   ════════════════════════════════════════════ */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 32, gap: 10 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },

  /* ─── Header ─── */
  header: {
    paddingTop: 32,
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  headerTopRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  registerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  registerBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  lockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  lockBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },

  /* ─── Add Category Modal ─── */
  addCatOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  addCatModal: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: colors.radius.lg,
    padding: 24,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  addCatTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.foreground,
    textAlign: 'center',
    marginBottom: 4,
  },
  addCatClose: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.muted,
    borderRadius: colors.radius.md,
  },
  addCatDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  addCatLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.foreground,
  },
  addCatRound: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    marginRight: 8,
  },
  addCatNone: {
    fontSize: 13,
    color: colors.mutedForeground,
    textAlign: 'center',
    paddingVertical: 12,
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
    marginBottom: 16,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  avatarText: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: '#059669',
    fontWeight: '700',
  },
  headerTextCol: { gap: 2 },
  welcomeText: {
    fontFamily: fonts.bold,
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.3,
  },
  memberSince: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
  },
  headerMeta: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },

  /* ─── Stats Card ─── */
  statsCard: {
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  statsRow: {
    marginBottom: 16,
  },
  statsMain: {},
  statsMainLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    fontWeight: '600',
    color: colors.mutedForeground,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsBarOuter: {
    height: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  statsBarInner: {
    height: '100%',
    backgroundColor: '#059669',
    borderRadius: 4,
  },
  statsMainValue: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 0,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 14,
  },
  statsGridItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statsGridLabel: {
    fontFamily: fonts.medium,
    fontSize: 9,
    fontWeight: '500',
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  statsGridValue: {
    fontFamily: fonts.bold,
    fontSize: 18,
    fontWeight: '700',
    color: colors.foreground,
  },
  statsGridSuffix: {
    fontFamily: fonts.regular,
    fontSize: 9,
    color: colors.mutedForeground,
  },

  /* ─── Filter Tabs ─── */
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
  },
  filterTab: {
    flex: 1,
    borderRadius: 100,
    paddingVertical: 9,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterTabActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  filterTabText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
  },
  filterTabTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  pageBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  pageBtnDisabled: { opacity: 0.5 },
  pageText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: '#64748b',
  },

  /* ─── Section Headers ─── */
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
  },
  sectionHeadTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    fontWeight: '600',
    color: colors.foreground,
    flex: 1,
  },
  sectionHeadBadge: {
    backgroundColor: '#fef3c7',
    borderRadius: 100,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  sectionHeadBadgeText: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    fontWeight: '600',
    color: '#d97706',
  },

  /* ─── Notifications ─── */
  notifContainer: { paddingHorizontal: 16, gap: 6 },
  notifBar: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
  },
  notifText: { fontFamily: fonts.medium, fontSize: 12, fontWeight: '500' },

  /* ─── Slot Switcher ─── */
  slotSwitcher: { maxHeight: 40, marginHorizontal: 16 },
  slotSwitcherContent: { gap: 8 },
  slotTab: {
    backgroundColor: colors.muted,
    borderRadius: 100,
    paddingHorizontal: 16,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  slotTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  slotTabText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    fontWeight: '500',
    color: colors.mutedForeground,
  },
  slotTabTextActive: { color: '#fff', fontWeight: '600' },
  slotAddBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: '#059669',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ─── Stats Card ─── */
  progressCard: {
    marginHorizontal: 16,
    backgroundColor: '#ffffff',
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  progressTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    fontWeight: '600',
    color: colors.foreground,
  },
  progressBarOuter: {
    height: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 14,
  },
  progressBarInner: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 5,
  },
  progressStats: {
    flexDirection: 'row',
    gap: 8,
  },
  progressStat: {
    flex: 1,
    backgroundColor: colors.muted,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    gap: 2,
  },
  progressStatValue: {
    fontFamily: fonts.bold,
    fontSize: 14,
    fontWeight: '700',
    color: colors.foreground,
  },
  progressStatLabel: {
    fontFamily: fonts.regular,
    fontSize: 9,
    fontWeight: '400',
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  /* ─── Action Buttons ─── */
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  actionBtn: { flex: 1 },
  actionBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionBtnText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    fontWeight: '500',
    color: colors.foreground,
  },
  actionIconBtn: { width: 44, height: 44 },
  actionIconGrad: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionIconText: { color: '#fff', fontSize: 18, fontWeight: '700', fontFamily: fonts.bold },

  /* ─── Savings Card ─── */
  savingsCard: {
    marginHorizontal: 16,
    backgroundColor: '#ffffff',
  },
  savingsBalanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  savingsBalanceLabel: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  savingsBalance: {
    fontFamily: fonts.bold,
    fontSize: 32,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: -0.5,
  },
  savingsMetaRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  savingsMetaItem: {
    flex: 1,
    backgroundColor: colors.muted,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    gap: 4,
  },
  savingsMetaValue: {
    fontFamily: fonts.bold,
    fontSize: 15,
    fontWeight: '700',
    color: colors.foreground,
  },
  savingsMetaLabel: {
    fontFamily: fonts.regular,
    fontSize: 9,
    fontWeight: '400',
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  savingsDepositRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  savingsInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.foreground,
    backgroundColor: colors.muted,
  },
  savingsDepositBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  savingsDepositBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  savingsActionBtns: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  savingsWithdrawBtn: {
    flex: 1,
    backgroundColor: '#dc2626',
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
  },
  savingsWithdrawBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  savingsStatementBtn: {
    flex: 1,
    backgroundColor: colors.mutedForeground,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
  },
  savingsStatementBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  savingsTxBtn: {
    backgroundColor: colors.muted,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  savingsTxBtnText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    fontWeight: '500',
    color: colors.foreground,
  },

  /* ─── Payment Cards ─── */
  pmtCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  pmtCardDue: {
    borderWidth: 1,
    borderColor: '#fde68a',
    backgroundColor: '#fffbeb',
  },
  pmtLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  pmtInfo: { flex: 1 },
  pmtDate: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    fontWeight: '600',
    color: colors.foreground,
  },
  pmtAmount: {
    fontFamily: fonts.bold,
    fontSize: 16,
    fontWeight: '700',
    color: colors.foreground,
    marginTop: 1,
  },
  pmtRight: { marginLeft: 8 },
  pmtCheckStub: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: { backgroundColor: '#059669', borderColor: '#059669' },
  payBtn: {
    backgroundColor: '#059669',
    borderRadius: 100,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 72,
    alignItems: 'center',
  },
  payBtnText: { fontFamily: fonts.semiBold, fontSize: 12, fontWeight: '600', color: '#fff' },
  payBtnBusy: { opacity: 0.6 },
  receiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#94a3b8',
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  receiptBtnText: { fontFamily: fonts.medium, fontSize: 11, fontWeight: '500', color: '#fff' },

  /* ─── Empty ─── */
  emptyBox: {
    marginHorizontal: 16,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 24,
    backgroundColor: '#f0fdf4',
    borderRadius: 14,
  },
  emptyBoxText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: '#137333',
    textAlign: 'center',
  },

  /* ─── Batch Bar ─── */
  batchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    backgroundColor: '#059669',
    borderRadius: 14,
    padding: 12,
  },
  batchCount: { fontFamily: fonts.medium, fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.8)', flex: 1 },
  batchTotal: { fontFamily: fonts.semiBold, fontSize: 14, fontWeight: '600', color: '#fff' },
  batchPayBtn: {
    backgroundColor: '#fff',
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  batchPayBtnText: { fontFamily: fonts.semiBold, fontSize: 12, fontWeight: '600', color: '#059669' },

  /* ─── USSD Modal ─── */
  ussdOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  ussdModal: {
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 32,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  ussdStepIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  ussdTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 18,
    fontWeight: '600',
    color: colors.foreground,
    marginTop: 4,
  },
  ussdSub: {
    fontFamily: fonts.regular,
    fontSize: 13,
    fontWeight: '400',
    color: colors.mutedForeground,
    marginTop: 4,
    textAlign: 'center',
  },
  ussdDialing: {
    fontFamily: fonts.medium,
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
    marginTop: 16,
  },
  ussdCode: {
    fontFamily: fonts.bold,
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 4,
    letterSpacing: 2,
  },
  ussdAmountLabel: {
    fontFamily: fonts.medium,
    fontSize: 13,
    fontWeight: '500',
    color: colors.mutedForeground,
    marginTop: 8,
  },
  ussdInput: {
    width: '100%',
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
    padding: 12,
    fontSize: 22,
    textAlign: 'center',
    marginTop: 16,
    color: colors.foreground,
    fontWeight: '600',
    fontFamily: fonts.semiBold,
    letterSpacing: 6,
  },
  ussdErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  ussdError: {
    fontFamily: fonts.medium,
    fontSize: 12,
    fontWeight: '500',
    color: '#dc2626',
  },
  ussdBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    width: '100%',
  },
  ussdCancelBtn: {
    flex: 1,
    backgroundColor: colors.muted,
    borderRadius: 100,
    paddingVertical: 12,
    alignItems: 'center',
  },
  ussdCancelBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
  ussdSubmitBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 100,
    paddingVertical: 12,
    alignItems: 'center',
  },
  ussdSubmitBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  ussdDoneBtn: {
    backgroundColor: colors.primary,
    borderRadius: 100,
    paddingVertical: 14,
    paddingHorizontal: 48,
    marginTop: 24,
  },
  ussdDoneBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },

  /* ─── Modals (bottom sheet style) ─── */
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalOverlayBottom: { flex: 1, justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: '80%',
    paddingBottom: 40,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: { maxHeight: 500 },
  modalEmpty: { alignItems: 'center', gap: 8, paddingVertical: 32 },

  /* ─── Receipt Modal ─── */
  receiptModal: {
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  receiptModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  receiptModalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  receiptModalTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 17,
    fontWeight: '600',
    color: colors.foreground,
  },
  receiptBody: { gap: 0 },
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
    color: colors.mutedForeground,
  },
  receiptFieldValue: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    fontWeight: '600',
    color: colors.foreground,
    maxWidth: '55%',
    textAlign: 'right',
  },
  downloadPdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 100,
    paddingVertical: 14,
    marginTop: 20,
  },
  downloadPdfBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },

  /* ─── Recent Payments ─── */
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  recentDate: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    fontWeight: '600',
    color: colors.foreground,
  },
  recentAmount: {
    fontFamily: fonts.bold,
    fontSize: 15,
    fontWeight: '700',
    color: colors.foreground,
    marginTop: 1,
  },
  recentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  recentRef: {
    fontFamily: fonts.regular,
    fontSize: 10,
    fontWeight: '400',
    color: colors.mutedForeground,
  },
  recentReceiptBtn: {
    backgroundColor: colors.muted,
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginLeft: 8,
  },
  recentReceiptBtnText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    fontWeight: '500',
    color: colors.mutedForeground,
  },

  /* ─── Transaction History ─── */
  txSectionLabel: {
    fontFamily: fonts.bold,
    fontSize: 12,
    fontWeight: '700',
    color: '#137333',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  txDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  txDate: {
    fontFamily: fonts.medium,
    fontSize: 12,
    fontWeight: '500',
    color: colors.mutedForeground,
  },
  txAmount: {
    fontFamily: fonts.bold,
    fontSize: 15,
    fontWeight: '700',
    color: '#137333',
    marginTop: 1,
  },
  txCommission: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: colors.mutedForeground,
    marginTop: 1,
  },
  txRef: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: colors.mutedForeground,
    marginTop: 1,
  },
  txMethod: {
    fontFamily: fonts.regular,
    fontSize: 9,
    fontWeight: '400',
    color: colors.mutedForeground,
    alignSelf: 'center',
  },

  /* ─── Withdrawal ─── */
  withdrawIcon: { alignItems: 'center', marginTop: 8 },

  /* ─── Footer ─── */
  logoutFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#dc2626',
    borderRadius: 14,
    paddingVertical: 14,
    marginHorizontal: 16,
  },
  logoutFooterText: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
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
  lockLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  lockLogoutText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#e2e8f0',
  },
})
