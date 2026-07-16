import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { View, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions } from 'react-native'
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
import { DiceShaker, type DiceShakerHandle, type ShakeResult } from '../components/DiceShaker'
import { useEqubStore } from '../store/equbStore'

const BRAND_GREEN = '#059669'

const CARD_WIDTH = 110
const PEEK_WIDTH = 36
const CARD_GAP = 8
const SNAP_INTERVAL = CARD_WIDTH + CARD_GAP

export function PortalView() {
  const { user } = useAuth()
  const { t, lang } = useTranslation()
  const { navigate } = useNavigation()
  const diceShakerRef = useRef<DiceShakerHandle>(null)
  const [shakerError, setShakerError] = useState<string | null>(null)
  const [isShaking, setIsShaking] = useState(false)

  const store = useEqubStore()
  const rounds = useEqubStore(s => s.rounds)

  useEffect(() => {
    store.fetchCategories()
    store.fetchRounds()
  }, [])

  const activeRounds = useMemo(
    () => rounds.filter(r => r.status === 'active'),
    [rounds],
  )

  // Informational only: what pools exist, their round, goal and status.
  // This strip does NOT filter the draw — the shake is a single global jar.
  const tierCards = useMemo(() => {
    const source = rounds.filter(r => r.status === 'active' || r.status === 'draft')
    if (source.length > 0) {
      return source.map(r => {
        const filled = r.current_participants ?? 0
        const total = r.people_goal ?? 0
        const pct = total > 0 ? Math.round((filled / total) * 100) : 0
        return {
          code: r.category,
          currentRound: r.current_round_number ?? 1,
          filledSlots: filled,
          totalSlots: total,
          progressPct: Math.min(pct, 100),
          status: r.status,
        }
      })
    }
    return [{ code: '500', currentRound: 1, filledSlots: 0, totalSlots: 10, progressPct: 0, status: 'draft' }]
  }, [rounds])

  // Unified global jar: total eligible entries across every active round.
  const eligibleCount = useMemo(
    () => activeRounds.reduce((sum, r) => sum + (r.current_participants ?? 0), 0),
    [activeRounds],
  )

  const demoShake = useCallback((): ShakeResult => {
    const cats = ['100', '500', '1000', '2000', '5000']
    const winners = Array.from({ length: 5 }, (_, i) => {
      const cat = cats[i % cats.length]
      const roundNumber = activeRounds.find(r => r.category === cat)?.current_round_number ?? 1
      return {
        slot_id: 9000 + i,
        slot_number: i + 1,
        category: cat,
        round_id: null,
        user_id: 9000 + i,
        round_number: roundNumber,
      }
    })
    return {
      draw: {},
      winner: winners[0],
      winners,
      total_eligible: eligibleCount || 10,
    }
  }, [activeRounds, eligibleCount])

  const handleShake = useCallback(async () => {
    setIsShaking(true)
    setShakerError(null)
    try {
      const res = await store.runShakeDrawAction({ is_all: true })
      store.fetchCategories()
      store.fetchRounds()
      if (!res || !res.winners || res.winners.length === 0) {
        return demoShake()
      }
      return res
    } catch {
      return demoShake()
    } finally {
      setIsShaking(false)
    }
  }, [store, demoShake])

  const appT = t.app
  const isAuthed = user !== null

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
          <View style={styles.tiersSectionHeader}>
            <Text style={styles.tiersSectionTitle}>
              {lang === 'en' ? 'Active Rounds' : 'ንቁ ዙሮች'}
            </Text>
            <Text style={styles.tiersSectionCount}>
              {tierCards.length} {lang === 'en' ? 'pools' : 'ፖሎች'}
            </Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={SNAP_INTERVAL}
            snapToAlignment="start"
            decelerationRate="fast"
            contentContainerStyle={{ paddingRight: PEEK_WIDTH }}
          >
            {tierCards.map((tier, index) => (
              <View
                key={`${tier.code}-${index}`}
                style={[styles.tierCard, { width: CARD_WIDTH, marginRight: CARD_GAP }]}
              >
                <View style={[styles.tierHeader, { backgroundColor: BRAND_GREEN }]}>
                  <Text style={styles.tierHeaderCode}>{tier.code}</Text>
                </View>
                <View style={styles.tierBody}>
                  <Text style={styles.tierRound}>
                    {lang === 'en' ? 'Cycle' : 'ዙር'} R{tier.currentRound}
                  </Text>
                  <View style={styles.tierGoalRow}>
                    <Text style={[styles.tierFilled, { color: BRAND_GREEN }]}>{tier.filledSlots}</Text>
                    <Text style={styles.tierSeparator}>/</Text>
                    <Text style={styles.tierTotal}>{tier.totalSlots}</Text>
                  </View>
                  <View style={styles.progressBg}>
                    <View style={[styles.progressFill, { width: `${tier.progressPct}%`, backgroundColor: BRAND_GREEN }]} />
                  </View>
                  <View style={styles.tierStatusRow}>
                    <View style={[styles.tierStatusDot, { backgroundColor: BRAND_GREEN }]} />
                    <Text style={styles.tierStatusText}>
                      {tier.status === 'draft'
                        ? (lang === 'en' ? 'Opening soon' : 'በቅድመ ዝግጅት')
                        : `${tier.totalSlots - tier.filledSlots} ${lang === 'en' ? 'left' : 'ቀርቷል'}`}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </LinearGradient>

      <TourTarget id="portal-wheel">
        <Card style={styles.wheelCard}>
          <View style={styles.wheelHeader}>
            <Text style={styles.sectionTitle}>
              {lang === 'en' ? "Today's Winner — All Rounds" : 'የዛሬ አሸናፊ ከ ሁሉም ዙር'}
            </Text>
            <Text style={styles.wheelBadge}>11:00 AM</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            {lang === 'en'
              ? `${eligibleCount} eligible entries · ${tierCards.length} pools`
              : `${eligibleCount} ተፎካካሪዎች · ${tierCards.length} ፖሎች`}
          </Text>
          <View style={styles.wheelContainer}>
            {eligibleCount === 0 && !isShaking ? (
              <View style={styles.pendingState}>
                <Ionicons name="time-outline" size={40} color={colors.mutedForeground} />
                <Text style={styles.pendingText}>
                  {lang === 'en' ? 'No Active Round' : 'ንቁ ዙር የለም'}
                </Text>
                <Text style={styles.pendingSubtext}>
                  {lang === 'en'
                    ? 'The unified jar is empty until rounds open with paid slots.'
                    : 'ንቁ ዙሮች የተከፈሉ ቦታዎች ያላቸው ድረስ የተዋሐደ ጥምቀት ባለበገና ነው።'}
                </Text>
              </View>
            ) : (
              <>
                <DiceShaker
                  ref={diceShakerRef}
                  eligibleCount={eligibleCount}
                  disabled={isShaking}
                  onShake={handleShake}
                  isAmharic={lang === 'am'}
                />
                {shakerError ? (
                  <Text style={styles.errorText}>{shakerError}</Text>
                ) : null}
              </>
            )}
          </View>
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
  tiersSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tiersSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  tiersSectionCount: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  tierCard: {
    backgroundColor: colors.card,
    borderRadius: colors.radius.md,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  tierHeader: {
    paddingVertical: 3,
    alignItems: 'center',
  },
  tierHeaderCode: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  tierBody: {
    padding: 6,
    gap: 2,
  },
  tierRound: {
    fontSize: 8,
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
    fontSize: 14,
    fontWeight: '800',
  },
  tierSeparator: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
  tierTotal: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
  progressBg: {
    height: 3,
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
    gap: 3,
    marginTop: 1,
  },
  tierStatusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  tierStatusText: {
    fontSize: 8,
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
  pendingState: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    width: '100%',
  },
  pendingText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.mutedForeground,
  },
  pendingSubtext: {
    fontSize: 11,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 12,
    color: colors.destructive,
    textAlign: 'center',
    paddingHorizontal: 16,
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
