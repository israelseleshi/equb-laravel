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
const MAX_WIDTH = 1180

export function WebPortalView() {
  const { user } = useAuth()
  const { t, lang, toggleLanguage } = useTranslation()
  const { navigate } = useNavigation()
  const diceShakerRef = useRef<DiceShakerHandle>(null)
  const [shakerError, setShakerError] = useState<string | null>(null)
  const [isShaking, setIsShaking] = useState(false)

  const store = useEqubStore()
  const rounds = useEqubStore(s => s.rounds)
  const isWide = Dimensions.get('window').width >= 900

  useEffect(() => {
    store.fetchCategories()
    store.fetchRounds()
  }, [])

  const activeRounds = useMemo(() => rounds.filter(r => r.status === 'active'), [rounds])

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
    return { draw: {}, winner: winners[0], winners, total_eligible: eligibleCount || 10 }
  }, [activeRounds, eligibleCount])

  const handleShake = useCallback(async () => {
    setIsShaking(true)
    setShakerError(null)
    try {
      const res = await store.runShakeDrawAction({ is_all: true })
      store.fetchCategories()
      store.fetchRounds()
      if (!res || !res.winners || res.winners.length === 0) return demoShake()
      return res
    } catch {
      return demoShake()
    } finally {
      setIsShaking(false)
    }
  }, [store, demoShake])

  const appT = t.app
  const isAuthed = user !== null

  const sidebar = (
    <View style={styles.sidebar}>
      <View style={styles.sidebarBrand}>
        <Image source={require('../../assets/main-logo.png')} style={styles.sidebarLogo} />
        <View>
          <Text style={styles.appName}>{appT.name}</Text>
          <Text style={styles.appTagline}>{appT.tagline}</Text>
        </View>
      </View>
      <TouchableOpacity style={[styles.navItem, styles.navItemActive]} activeOpacity={0.7}>
        <Ionicons name="home-outline" size={20} color={BRAND_GREEN} />
        <Text style={[styles.navText, { color: BRAND_GREEN }]}>{lang === 'en' ? 'Home' : 'ቤት'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.navItem} onPress={() => navigate('login')} activeOpacity={0.7}>
        <Ionicons name="log-in-outline" size={20} color={colors.mutedForeground} />
        <Text style={styles.navText}>{lang === 'en' ? 'Sign In' : 'ይግቡ'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.navItem} onPress={() => navigate('signup')} activeOpacity={0.7}>
        <Ionicons name="person-add-outline" size={20} color={colors.mutedForeground} />
        <Text style={styles.navText}>{lang === 'en' ? 'Create Account' : 'መለያ ይፍጠሩ'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.navItem} onPress={toggleLanguage} activeOpacity={0.7}>
        <Ionicons name="language-outline" size={20} color={colors.mutedForeground} />
        <Text style={styles.navText}>{lang === 'en' ? 'Language' : 'ቋንቋ'}</Text>
      </TouchableOpacity>
      <View style={styles.sidebarSpacer} />
      <Card style={styles.sidebarCta}>
        <Text style={styles.ctaTitle}>{lang === 'en' ? 'Join Gojo Equb' : 'ጎጆ ዕቁብን ይቀላቀሉ'}</Text>
        <Text style={styles.ctaDesc}>{lang === 'en' ? 'Start saving, track slots, win big.' : 'ይቆጠቡ፣ ቦታዎችዎን ይከታተሉ፣ ይሸንፉ።'}</Text>
        <Button title={lang === 'en' ? 'Register' : 'ይመዝገቡ'} onPress={() => navigate('signup')} variant="primary" size="md" fullWidth />
      </Card>
    </View>
  )

  const tiersSection = (
    <Card style={styles.tiersCard}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{lang === 'en' ? 'Active Rounds' : 'ንቁ ዙሮች'}</Text>
        <Text style={styles.sectionCount}>{tierCards.length} {lang === 'en' ? 'pools' : 'ፖሎች'}</Text>
      </View>
      <View style={[styles.tierGrid, isWide ? styles.tierGridWide : styles.tierGridNarrow]}>
        {tierCards.map((tier, index) => (
          <View key={`${tier.code}-${index}`} style={styles.tierCard}>
            <LinearGradient colors={['#059669', '#047857']} style={styles.tierHeader}>
              <Text style={styles.tierHeaderCode}>{tier.code}</Text>
            </LinearGradient>
            <View style={styles.tierBody}>
              <Text style={styles.tierRound}>{lang === 'en' ? 'Cycle' : 'ዙር'} R{tier.currentRound}</Text>
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
      </View>
    </Card>
  )

  const wheelSection = (
    <TourTarget id="portal-wheel">
      <Card style={styles.wheelCard}>
        <View style={styles.wheelHeader}>
          <View>
            <Text style={styles.sectionTitle}>{lang === 'en' ? "Today's Winner — All Rounds" : 'የዛሬ አሸናፊ ከ ሁሉም ዙር'}</Text>
            <Text style={styles.sectionSubtitle}>{eligibleCount} {lang === 'en' ? 'eligible entries' : 'ተፎካካሪዎች'} · {tierCards.length} {lang === 'en' ? 'pools' : 'ፖሎች'}</Text>
          </View>
          <Text style={styles.wheelBadge}>11:00 AM</Text>
        </View>
        <View style={styles.wheelContainer}>
          {eligibleCount === 0 && !isShaking ? (
            <View style={styles.pendingState}>
              <Ionicons name="time-outline" size={40} color={colors.mutedForeground} />
              <Text style={styles.pendingText}>{lang === 'en' ? 'No Active Round' : 'ንቁ ዙር የለም'}</Text>
              <Text style={styles.pendingSubtext}>{lang === 'en' ? 'The unified jar is empty until rounds open with paid slots.' : 'ንቁ ዙሮች የተከፈሉ ቦታዎች ያላቸው ድረስ የተዋሐደ ጥምቀት ባለበገና ነው።'}</Text>
            </View>
          ) : (
            <>
              <DiceShaker ref={diceShakerRef} eligibleCount={eligibleCount} disabled={isShaking} onShake={handleShake} isAmharic={lang === 'am'} />
              {shakerError ? <Text style={styles.errorText}>{shakerError}</Text> : null}
            </>
          )}
        </View>
      </Card>
    </TourTarget>
  )

  const registerSection = !isAuthed ? (
    <TourTarget id="portal-register">
      <Card style={styles.registerCard}>
        <View style={styles.registerIcon}>
          <Ionicons name="wallet-outline" size={32} color={colors.primary} />
        </View>
        <Text style={styles.registerTitle}>{lang === 'en' ? 'Join Gojo Equb Today' : 'ጎጆ ዕቁብን ዛሬ ይቀላቀሉ'}</Text>
        <Text style={styles.registerDesc}>{lang === 'en' ? 'Create an account to start saving, track your slots, and win big!' : 'መቆጠብ ለመጀመር፣ ቦታዎችዎን ለመከታተል እና ትልቅ ለማሸነፍ መለያ ይፍጠሩ!'}</Text>
        <Button title={lang === 'en' ? 'Register' : 'ይመዝገቡ'} onPress={() => navigate('signup')} variant="primary" size="lg" fullWidth />
        <TouchableOpacity onPress={() => navigate('login')} style={styles.signInLink}>
          <Text style={styles.signInLinkText}>{lang === 'en' ? 'Already have an account? Sign In' : 'መለያ አለዎት? ይግቡ'}</Text>
        </TouchableOpacity>
      </Card>
    </TourTarget>
  ) : null

  return (
    <View style={styles.root}>
      <View style={styles.inner}>
        {isWide && sidebar}
        <ScrollView style={styles.main} contentContainerStyle={styles.mainContent}>
          {!isWide && (
            <View style={styles.headerRow}>
              <Image source={require('../../assets/main-logo.png')} style={styles.mainLogo} />
              <View>
                <Text style={styles.appName}>{appT.name}</Text>
                <Text style={styles.appTagline}>{appT.tagline}</Text>
              </View>
            </View>
          )}
          {tiersSection}
          <View style={[styles.columns, isWide ? styles.columnsWide : styles.columnsNarrow]}>
            <View style={styles.colMain}>{wheelSection}</View>
            <View style={styles.colSide}>{registerSection}</View>
          </View>
        </ScrollView>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  inner: { flex: 1, flexDirection: 'row', maxWidth: MAX_WIDTH, width: '100%', alignSelf: 'center' },
  sidebar: {
    width: 250,
    backgroundColor: colors.card,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  sidebarBrand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sidebarLogo: { width: 44, height: 44, resizeMode: 'contain' },
  sidebarSpacer: { flex: 1 },
  navItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: 10 },
  navItemActive: { backgroundColor: '#05966912' },
  navText: { fontSize: 14, fontWeight: '600', color: colors.foreground },
  sidebarCta: { gap: spacing.sm, padding: spacing.lg },
  ctaTitle: { fontSize: 16, fontWeight: '700', color: colors.foreground },
  ctaDesc: { fontSize: 12, color: colors.mutedForeground, lineHeight: 18 },
  main: { flex: 1 },
  mainContent: { padding: spacing.lg, gap: spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingBottom: spacing.sm },
  mainLogo: { width: 44, height: 44, resizeMode: 'contain' },
  appName: { fontSize: 20, fontWeight: '800', color: colors.foreground },
  appTagline: { fontSize: 12, color: colors.mutedForeground, marginTop: 1 },
  tiersCard: { gap: spacing.md, padding: spacing.lg },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.foreground },
  sectionCount: { fontSize: 12, fontWeight: '600', color: colors.mutedForeground },
  sectionSubtitle: { fontSize: 13, color: colors.mutedForeground, marginTop: 2 },
  tierGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tierGridWide: { justifyContent: 'flex-start' },
  tierGridNarrow: { justifyContent: 'space-between' },
  tierCard: { backgroundColor: colors.card, borderRadius: colors.radius.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, width: 150 },
  tierHeader: { paddingVertical: 6, alignItems: 'center' },
  tierHeaderCode: { color: '#fff', fontSize: 13, fontWeight: '800' },
  tierBody: { padding: spacing.sm, gap: 4 },
  tierRound: { fontSize: 11, fontWeight: '700', color: colors.mutedForeground },
  tierGoalRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  tierFilled: { fontSize: 18, fontWeight: '800' },
  tierSeparator: { fontSize: 12, fontWeight: '600', color: colors.mutedForeground },
  tierTotal: { fontSize: 12, fontWeight: '600', color: colors.mutedForeground },
  progressBg: { height: 4, backgroundColor: colors.muted, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  tierStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  tierStatusDot: { width: 6, height: 6, borderRadius: 3 },
  tierStatusText: { fontSize: 11, fontWeight: '600', color: colors.mutedForeground, flex: 1 },
  columns: { gap: spacing.lg },
  columnsWide: { flexDirection: 'row', alignItems: 'flex-start' },
  columnsNarrow: { flexDirection: 'column' },
  colMain: { flex: 1, minWidth: 0 },
  colSide: { width: 320 },
  wheelCard: { gap: spacing.md, padding: spacing.lg },
  wheelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  wheelBadge: { fontSize: 11, fontWeight: '700', color: colors.primary, backgroundColor: '#E6F4EA', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  wheelContainer: { alignItems: 'center', gap: spacing.lg },
  pendingState: { alignItems: 'center', gap: 6, paddingVertical: spacing.lg, paddingHorizontal: spacing.lg, width: '100%' },
  pendingText: { fontSize: 14, fontWeight: '700', color: colors.mutedForeground },
  pendingSubtext: { fontSize: 11, color: colors.mutedForeground, textAlign: 'center' },
  errorText: { fontSize: 12, color: colors.destructive, textAlign: 'center', paddingHorizontal: 16 },
  registerCard: { alignItems: 'center', gap: spacing.lg, paddingVertical: spacing['2xl'] },
  registerIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#E6F4EA', alignItems: 'center', justifyContent: 'center' },
  registerTitle: { fontSize: 22, fontWeight: '700', color: colors.foreground, textAlign: 'center' },
  registerDesc: { fontSize: 14, color: colors.mutedForeground, textAlign: 'center', lineHeight: 20, paddingHorizontal: spacing.lg },
  signInLink: { paddingVertical: spacing.sm },
  signInLinkText: { fontSize: 14, fontWeight: '600', color: colors.primary },
})
