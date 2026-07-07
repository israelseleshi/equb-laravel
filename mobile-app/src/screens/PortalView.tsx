import { useState, useCallback, useRef } from 'react'
import { View, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { colors, spacing } from '../theme'
import { Text } from '../components/ui/AppText'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { TourTarget } from '../components/TourTarget'
import { useAuth } from '../context/AuthContext'
import { useNavigation } from '../context/NavigationContext'
import { useTranslation } from '../i18n/useTranslation'
import { SpinWheel, SpinResultCard, type SpinWheelHandle } from '../components/SpinWheel'

interface TierData {
  code: string
  label: string
  barColor: string
  filledSlots: number
  totalSlots: number
  progressPct: number
}

const TIERS: TierData[] = [
  { code: '100', label: '100 ETB', barColor: '#059669', filledSlots: 2, totalSlots: 10, progressPct: 23 },
  { code: '500', label: '500 ETB', barColor: '#047857', filledSlots: 8, totalSlots: 10, progressPct: 80 },
  { code: '1000', label: '1,000 ETB', barColor: '#34d399', filledSlots: 1, totalSlots: 8, progressPct: 17 },
  { code: '2000', label: '2,000 ETB', barColor: '#065f46', filledSlots: 1, totalSlots: 6, progressPct: 11 },
]

const ROUND = 1

interface CategoryWinner {
  category: string
  amount: number
  slots: number[]
}

const CATEGORY_WINNERS: CategoryWinner[] = [
  { category: '100', amount: 1000, slots: [7, 11] },
  { category: '500', amount: 5000, slots: [3] },
  { category: '1000', amount: 8000, slots: [7] },
  { category: '2000', amount: 15000, slots: [3, 22] },
]

export function PortalView() {
  const { user } = useAuth()
  const { t, lang } = useTranslation()
  const { navigate } = useNavigation()
  const spinWheelRef = useRef<SpinWheelHandle>(null)
  const [activeCategory, setActiveCategory] = useState('500')
  const [isSpinning, setIsSpinning] = useState(false)
  const [spinResult, setSpinResult] = useState<{ slots: number[]; amount: number; category: string; round: number; date: string } | null>(null)
  const appT = t.app

  const isAuthed = user !== null
  const userDisplayName = isAuthed ? user!.name : appT.name
  const userInitial = userDisplayName.charAt(0).toUpperCase()

  const activeTier = TIERS.find((t) => t.code === activeCategory)!
  const activeWinner = CATEGORY_WINNERS.find((w) => w.category === activeCategory)

  const handleSpinEnd = useCallback(() => {
    if (!activeWinner) return
    setSpinResult({
      slots: activeWinner.slots,
      amount: activeWinner.amount,
      category: activeWinner.category,
      round: ROUND,
      date: '2026-06-24T11:00:00',
    })
    setIsSpinning(false)
  }, [activeWinner])

  const handleSpinPress = useCallback(() => {
    if (!activeWinner) return
    setSpinResult(null)
    setIsSpinning(true)
    spinWheelRef.current?.spin(activeWinner.slots[0])
  }, [activeWinner])

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Image source={require('../../assets/main-logo.png')} style={styles.mainLogo} />
        <View>
          <Text style={styles.appName}>{appT.name}</Text>
          <Text style={styles.appTagline}>{appT.tagline}</Text>
        </View>
      </View>

      <LinearGradient
        colors={['#065f46', '#059669', '#34d399', '#f8fafc']}
        locations={[0, 0.25, 0.55, 1]}
        style={styles.tiersSection}
      >
        <View style={styles.tiersInner}>
          <Text style={styles.tiersSectionTitle}>
            {lang === 'en' ? 'Active Rounds' : 'ንቁ ዙሮች'}
          </Text>
          <View style={styles.tierRow}>
            {TIERS.map((tier) => {
              const isActive = activeCategory === tier.code
              return (
                <TouchableOpacity
                  key={tier.code}
                  style={[styles.tierCard, isActive && styles.tierCardActive]}
                  onPress={() => setActiveCategory(tier.code)}
                  activeOpacity={0.85}
                >
                  <View style={[styles.tierHeader, isActive && styles.tierHeaderActive]}>
                    <Text style={[styles.tierHeaderCode, isActive && styles.tierHeaderCodeActive]}>{tier.code}</Text>
                  </View>
                  <View style={styles.tierBody}>
                    <Text style={styles.tierRound}>R{ROUND}</Text>
                    <View style={styles.tierGoalRow}>
                      <Text style={[styles.tierFilled, { color: isActive ? '#047857' : '#059669' }]}>{tier.filledSlots}</Text>
                      <Text style={styles.tierSeparator}>/</Text>
                      <Text style={styles.tierTotal}>{tier.totalSlots}</Text>
                    </View>
                    <View style={styles.progressBg}>
                      <View style={[styles.progressFill, { width: `${tier.progressPct}%`, backgroundColor: isActive ? '#047857' : '#059669' }]} />
                    </View>
                    <View style={styles.tierStatusRow}>
                      <View style={[styles.tierStatusDot, { backgroundColor: tier.filledSlots < tier.totalSlots ? (isActive ? '#047857' : '#059669') : '#ef4444' }]} />
                      <Text style={styles.tierStatusText}>
                        {tier.filledSlots < tier.totalSlots
                          ? (lang === 'en' ? `${tier.totalSlots - tier.filledSlots} left` : `${tier.totalSlots - tier.filledSlots} ቀርቷል`)
                          : (lang === 'en' ? 'Full' : 'ሞልቷል')}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
      </LinearGradient>

      <TourTarget id="portal-wheel">
        <Card style={styles.wheelCard}>
          <View style={styles.wheelHeader}>
            <Text style={styles.sectionTitle}>
              {lang === 'en' ? 'Official Draw Result' : 'የይፋዊ ዕጣ ውጤት'}
            </Text>
            <Text style={styles.wheelBadge}>11:00 AM</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            {activeCategory} ETB — {lang === 'en' ? 'Winner' : 'አሸናፊ'}
          </Text>
          <View style={styles.wheelContainer}>
            <SpinWheel
              ref={spinWheelRef}
              onSpinEnd={handleSpinEnd}
            />
            <Button
              title={isSpinning
                ? (lang === 'en' ? 'Spinning...' : 'እየተሽከረከረ ነው...')
                : (lang === 'en' ? 'Spin to See Winner' : 'አሸናፊውን ለማየት አሽከርክር')}
              onPress={handleSpinPress}
              disabled={isSpinning}
              loading={isSpinning}
              fullWidth
              size="lg"
              style={styles.spinBtn}
            />
          </View>
          <SpinResultCard result={spinResult} />
        </Card>
      </TourTarget>

      {!isAuthed && (
        <TourTarget id="portal-register">
          <Card style={styles.registerCard}>
            <View style={styles.registerIcon}>
              <Ionicons name="wallet-outline" size={32} color={colors.primary} />
            </View>
            <Text style={styles.registerTitle}>
              {lang === 'en' ? 'Join Gojo Equb Today' : 'ጎጆ ዕቁብን ዛሬ ይቀላቀሉ'}
            </Text>
            <Text style={styles.registerDesc}>
              {lang === 'en'
                ? 'Create an account to start saving, track your slots, and win big!'
                : 'መቆጠብ ለመጀመር፣ ቦታዎችዎን ለመከታተል እና ትልቅ ለማሸነፍ መለያ ይፍጠሩ!'}
            </Text>
            <Button
              title={lang === 'en' ? 'Register' : 'ይመዝገቡ'}
              onPress={() => navigate('signup')}
              variant="primary"
              size="lg"
              fullWidth
            />
            <TouchableOpacity onPress={() => navigate('login')} style={styles.signInLink}>
              <Text style={styles.signInLinkText}>
                {lang === 'en' ? 'Already have an account? Sign In' : 'መለያ አለዎት? ይግቡ'}
              </Text>
            </TouchableOpacity>
          </Card>
        </TourTarget>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: spacing['6xl'],
    gap: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  mainLogo: {
    width: 52,
    height: 52,
    resizeMode: 'contain',
  },
  appName: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.foreground,
  },
  appTagline: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginTop: 1,
  },
  tiersSection: {
    marginHorizontal: spacing.lg,
    borderRadius: 20,
    overflow: 'hidden',
  },
  tiersInner: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  tiersSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  tierRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tierCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: colors.radius.md,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  tierCardActive: {
    borderColor: colors.primary,
    backgroundColor: '#E6F4EA',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  tierHeader: {
    paddingVertical: 4,
    alignItems: 'center',
    backgroundColor: '#059669',
  },
  tierHeaderActive: {
    backgroundColor: '#047857',
  },
  tierHeaderCode: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  tierHeaderCodeActive: {
    fontSize: 14,
  },
  tierBody: {
    padding: spacing.sm,
    gap: 3,
  },
  tierRound: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.mutedForeground,
    letterSpacing: 0.3,
  },
  tierGoalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 1,
  },
  tierFilled: {
    fontSize: 18,
    fontWeight: '800',
  },
  tierSeparator: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
  tierTotal: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
  progressBg: {
    height: 4,
    backgroundColor: colors.muted,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  tierStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  tierStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tierStatusText: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.mutedForeground,
    flex: 1,
  },
  wheelCard: {
    marginHorizontal: spacing.lg,
    gap: spacing.md,
  },
  wheelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  wheelBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    backgroundColor: '#E6F4EA',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.foreground,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.mutedForeground,
    marginTop: -spacing.sm,
  },
  wheelContainer: {
    alignItems: 'center',
    gap: spacing.lg,
  },
  spinBtn: {
    marginTop: spacing.sm,
  },
  registerCard: {
    marginHorizontal: spacing.lg,
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing['2xl'],
  },
  registerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E6F4EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.foreground,
    textAlign: 'center',
  },
  registerDesc: {
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing.lg,
  },
  signInLink: {
    paddingVertical: spacing.sm,
  },
  signInLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
})
