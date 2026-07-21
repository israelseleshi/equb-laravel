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
import { LuckyJarSection } from '../components/LuckyJarSection'
import { useEqubStore } from '../store/equbStore'

const BRAND_GREEN = '#059669'
const CARD_WIDTH = 110
const PEEK_WIDTH = 36
const CARD_GAP = 8
const SNAP_INTERVAL = CARD_WIDTH + CARD_GAP
const TABLET_BREAK = 640
const { width: SCREEN_W } = Dimensions.get('window')
const isNarrow = SCREEN_W < TABLET_BREAK

/* ─── Phone App Layout (narrow) ─── */
function PhoneLayout({
  lang, appT, tierCards, eligibleCount, isShaking, diceShakerRef, handleShake, shakerError, isAuthed, navigate, jarPrizes, jarParticipants,
}: any) {
  return (
    <ScrollView style={plStyles.container} contentContainerStyle={plStyles.content}>
      <View style={plStyles.headerRow}>
        <Image source={require('../../assets/main-logo.png')} style={plStyles.mainLogo} />
        <View>
          <Text style={plStyles.appName}>{appT.name}</Text>
          <Text style={plStyles.appTagline}>{appT.tagline}</Text>
        </View>
      </View>

      <LinearGradient colors={['#065f46', '#059669', '#34d399', '#f8fafc']} locations={[0, 0.25, 0.55, 1]} style={plStyles.tiersSection}>
        <View style={plStyles.tiersInner}>
          <View style={plStyles.tiersSectionHeader}>
            <Text style={plStyles.tiersSectionTitle}>{lang === 'en' ? 'Active Rounds' : 'ንቁ ዙሮች'}</Text>
            <Text style={plStyles.tiersSectionCount}>{tierCards.length} {lang === 'en' ? 'pools' : 'ፖሎች'}</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={SNAP_INTERVAL} snapToAlignment="start" decelerationRate="fast" contentContainerStyle={{ paddingRight: PEEK_WIDTH }}>
            {tierCards.map((tier: any, index: number) => (
              <View key={`${tier.code}-${index}`} style={[plStyles.tierCard, { width: CARD_WIDTH, marginRight: CARD_GAP }]}>
                <View style={[plStyles.tierHeader, { backgroundColor: BRAND_GREEN }]}>
                  <Text style={plStyles.tierHeaderCode}>{tier.code}</Text>
                </View>
                <View style={plStyles.tierBody}>
                  <Text style={plStyles.tierRound}>{lang === 'en' ? 'Cycle' : 'ዙር'} R{tier.currentRound}</Text>
                  <View style={plStyles.tierGoalRow}>
                    <Text style={[plStyles.tierFilled, { color: BRAND_GREEN }]}>{tier.filledSlots}</Text>
                    <Text style={plStyles.tierSeparator}>/</Text>
                    <Text style={plStyles.tierTotal}>{tier.totalSlots}</Text>
                  </View>
                  <View style={plStyles.progressBg}>
                    <View style={[plStyles.progressFill, { width: `${tier.progressPct}%`, backgroundColor: BRAND_GREEN }]} />
                  </View>
                  <View style={plStyles.tierStatusRow}>
                    <View style={[plStyles.tierStatusDot, { backgroundColor: BRAND_GREEN }]} />
                    <Text style={plStyles.tierStatusText}>{tier.status === 'draft' ? (lang === 'en' ? 'Opening soon' : 'በቅድመ ዝግጅት') : `${tier.totalSlots - tier.filledSlots} ${lang === 'en' ? 'left' : 'ቀርቷል'}`}</Text>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </LinearGradient>

      <TourTarget id="portal-wheel">
        <Card style={plStyles.wheelCard}>
          <View style={plStyles.wheelHeader}>
            <Text style={plStyles.sectionTitle}>{lang === 'en' ? "Today's Winner — Lucky Jar" : 'የዛሬ አሸናፊ — እድለኛ ድስት'}</Text>
            <Text style={plStyles.wheelBadge}>11:00 AM</Text>
          </View>
          <Text style={plStyles.sectionSubtitle}>{eligibleCount} {lang === 'en' ? 'eligible entries' : 'ተፎካካሪዎች'} · {tierCards.length} {lang === 'en' ? 'pools' : 'ፖሎች'}</Text>
          <View style={plStyles.wheelContainer}>
            <LuckyJarSection prizes={jarPrizes} participants={jarParticipants} eligibleCount={eligibleCount} />
          </View>
        </Card>
      </TourTarget>

      {!isAuthed && (
        <TourTarget id="portal-register">
          <Card style={plStyles.registerCard}>
            <View style={plStyles.registerIcon}>
              <Ionicons name="wallet-outline" size={32} color={colors.primary} />
            </View>
            <Text style={plStyles.registerTitle}>{lang === 'en' ? 'Join Gojo Equb Today' : 'ጎጆ ዕቁብን ዛሬ ይቀላቀሉ'}</Text>
            <Text style={plStyles.registerDesc}>{lang === 'en' ? 'Create an account to start saving, track your slots, and win big!' : 'መቆጠብ ለመጀመር፣ ቦታዎችዎን ለመከታተል እና ትልቅ ለማሸነፍ መለያ ይፍጠሩ!'}</Text>
            <Button title={lang === 'en' ? 'Register' : 'ይመዝገቡ'} onPress={() => navigate('signup')} variant="primary" size="lg" fullWidth />
            <TouchableOpacity onPress={() => navigate('login')} style={plStyles.signInLink}>
              <Text style={plStyles.signInLinkText}>{lang === 'en' ? 'Already have an account? Sign In' : 'መለያ አለዎት? ይግቡ'}</Text>
            </TouchableOpacity>
          </Card>
        </TourTarget>
      )}
    </ScrollView>
  )
}

const plStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing['6xl'], gap: spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  mainLogo: { width: 52, height: 52, resizeMode: 'contain' },
  appName: { fontSize: 20, fontWeight: '800', color: colors.foreground },
  appTagline: { fontSize: 12, color: colors.mutedForeground, marginTop: 1 },
  tiersSection: { marginHorizontal: spacing.lg, borderRadius: 20, overflow: 'hidden' },
  tiersInner: { padding: spacing.lg, gap: spacing.md },
  tiersSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tiersSectionTitle: { fontSize: 15, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },
  tiersSectionCount: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
  tierCard: { backgroundColor: colors.card, borderRadius: colors.radius.md, overflow: 'hidden', borderWidth: 1.5, borderColor: 'transparent' },
  tierHeader: { paddingVertical: 3, alignItems: 'center' },
  tierHeaderCode: { color: '#fff', fontSize: 11, fontWeight: '800' },
  tierBody: { padding: 6, gap: 2 },
  tierRound: { fontSize: 8, fontWeight: '700', color: colors.mutedForeground, letterSpacing: 0.3 },
  tierGoalRow: { flexDirection: 'row', alignItems: 'baseline', gap: 1 },
  tierFilled: { fontSize: 14, fontWeight: '800' },
  tierSeparator: { fontSize: 10, fontWeight: '600', color: colors.mutedForeground },
  tierTotal: { fontSize: 10, fontWeight: '600', color: colors.mutedForeground },
  progressBg: { height: 3, backgroundColor: colors.muted, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  tierStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 1 },
  tierStatusDot: { width: 5, height: 5, borderRadius: 3 },
  tierStatusText: { fontSize: 8, fontWeight: '600', color: colors.mutedForeground, flex: 1 },
  wheelCard: { marginHorizontal: spacing.lg, gap: spacing.md },
  wheelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  wheelBadge: { fontSize: 11, fontWeight: '700', color: colors.primary, backgroundColor: '#E6F4EA', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, overflow: 'hidden' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.foreground },
  sectionSubtitle: { fontSize: 13, color: colors.mutedForeground, marginTop: -spacing.sm },
  wheelContainer: { alignItems: 'center', gap: spacing.lg },
  registerCard: { marginHorizontal: spacing.lg, alignItems: 'center', gap: spacing.lg, paddingVertical: spacing['2xl'] },
  registerIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#E6F4EA', alignItems: 'center', justifyContent: 'center' },
  registerTitle: { fontSize: 22, fontWeight: '700', color: colors.foreground, textAlign: 'center' },
  registerDesc: { fontSize: 14, color: colors.mutedForeground, textAlign: 'center', lineHeight: 20, paddingHorizontal: spacing.lg },
  signInLink: { paddingVertical: spacing.sm },
  signInLinkText: { fontSize: 14, fontWeight: '600', color: colors.primary },
})

/* ─── Desktop Website Layout (wide) ─── */

const FEATURES = [
  { icon: 'shield-checkmark-outline' as const, titleEn: 'Secure & Trusted', titleAm: 'አስተማማኝ', descEn: 'Every transaction is recorded and verifiable. Your savings are always protected.', descAm: 'ሁሉም ግብይቶች የተመዘገቡ እና የሚረጋገጡ ናቸው። ቁጠባዎ ሁልጊዜ የተጠበቀ ነው።' },
  { icon: 'trending-up-outline' as const, titleEn: 'Guaranteed Returns', titleAm: 'የተረጋገጠ ትርፍ', descEn: 'Win fixed amounts in every cycle. Know exactly what you\'re saving toward.', descAm: 'በእያንዳንዱ ዙር የተወሰነ መጠን ያሸንፉ። ለምን ያህል እንደሚቆጥቡ በትክክል ይወቁ።' },
  { icon: 'people-outline' as const, titleEn: 'Community Driven', titleAm: 'ማህበረሰብ ተኮር', descEn: 'Join a group of like-minded savers. Collective saving, collective winning.', descAm: 'ከሚመስሉ ቆጣቢዎች ቡድን ጋር ይቀላቀሉ። የጋራ ቁጠባ፣ የጋራ ድል።' },
  { icon: 'phone-portrait-outline' as const, titleEn: 'Mobile First', titleAm: 'ሞባይል ተኮር', descEn: 'Manage everything from your phone. Track slots, view draws, and get notified.', descAm: 'ሁሉንም ነገር ከስልክዎ ያስተዳድሩ። ቦታዎችን ይከታተሉ፣ ዕጣዎችን ይመልከቱ እና ማሳወቂያ ያግኙ።' },
  { icon: 'analytics-outline' as const, titleEn: 'Real-time Tracking', titleAm: 'የቀጥታ ክትትል', descEn: 'See exactly where each round stands. Filled slots, remaining spots, and winners.', descAm: 'እያንዳንዱ ዙር የት እንዳለ በትክክል ይመልከቱ። የተሞሉ ቦታዎች፣ የቀሩ ቦታዎች እና አሸናፊዎች።' },
  { icon: 'notifications-outline' as const, titleEn: 'Instant Alerts', titleAm: 'ፈጣን ማሳወቂያ', descEn: 'Get notified when it\'s your turn, when draws happen, and when you win.', descAm: 'ተራዎ ሲደርስ፣ ዕጣ ሲወጣ እና ሲያሸንፉ ማሳወቂያ ያግኙ።' },
]

const HOW_IT_WORKS = [
  { step: '01', icon: 'person-add-outline' as const, titleEn: 'Create Account', titleAm: 'መለያ ይፍጠሩ', descEn: 'Sign up in seconds. Choose your preferred savings pool amount.', descAm: 'በሰከንዶች ውስጥ ይመዝገቡ። የሚመርጡትን የቁጠባ ፖል መጠን ይምረጡ።' },
  { step: '02', icon: 'wallet-outline' as const, titleEn: 'Pay Your Slot', titleAm: 'ቦታዎን ይክፈሉ', descEn: 'Deposit your slot amount. Each slot is one entry in the rotation.', descAm: 'የቦታዎን መጠን ይክፈሉ። እያንዳንዱ ቦታ በዙሩ ውስጥ አንድ መግቢያ ነው።' },
  { step: '03', icon: 'trophy-outline' as const, titleEn: 'Win & Withdraw', titleAm: 'ያሸንፉ እና ያውጡ', descEn: 'Daily draws pick winners. When you win, withdraw instantly.', descAm: 'ዕለታዊ ዕጣ አሸናፊዎችን ይመርጣል። ሲያሸንፉ ወዲያውኑ ያውጡ።' },
]

function DesktopLayout({
  lang, appT, tierCards, eligibleCount, isShaking, diceShakerRef, handleShake, shakerError, isAuthed, navigate, toggleLanguage, jarPrizes, jarParticipants,
}: any) {
  const desktopW = useRef(Dimensions.get('window').width)
  const isWide = desktopW.current >= 1024

  return (
    <ScrollView style={dlStyles.root} contentContainerStyle={dlStyles.rootContent} bounces={false}>
      {/* ─── Navbar ─── */}
      <View style={dlStyles.nav}>
        <View style={dlStyles.navInner}>
          <View style={dlStyles.navBrand}>
            <Image source={require('../../assets/main-logo.png')} style={dlStyles.navLogo} />
            <Text style={dlStyles.navName}>{appT.name}</Text>
          </View>
          <View style={dlStyles.navLinks}>
            <Text style={dlStyles.navLink}>{lang === 'en' ? 'Home' : 'መነሻ'}</Text>
            <Text style={dlStyles.navLink}>{lang === 'en' ? 'How It Works' : 'እንዴት እንደሚሰራ'}</Text>
            <Text style={dlStyles.navLink}>{lang === 'en' ? 'Pools' : 'ፖሎች'}</Text>
          </View>
          <View style={dlStyles.navActions}>
            <TouchableOpacity onPress={toggleLanguage} style={dlStyles.navLang} activeOpacity={0.7}>
              <Ionicons name="language-outline" size={16} color={colors.mutedForeground} />
              <Text style={dlStyles.navLangText}>{lang === 'en' ? 'አማ' : 'EN'}</Text>
            </TouchableOpacity>
            {!isAuthed ? (
              <>
                <TouchableOpacity onPress={() => navigate('login')} activeOpacity={0.7} style={dlStyles.navSignInBtn}>
                  <Text style={dlStyles.navSignIn}>{lang === 'en' ? 'Sign In' : 'ይግቡ'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigate('signup')} activeOpacity={0.8}>
                  <View style={dlStyles.navCta}>
                    <Text style={dlStyles.navCtaText}>{lang === 'en' ? 'Get Started' : 'ይጀምሩ'}</Text>
                  </View>
                </TouchableOpacity>
              </>
            ) : null}
          </View>
        </View>
      </View>

      {/* ─── Hero ─── */}
      <LinearGradient colors={['#064e3b', '#065f46', '#059669', '#10b981']} locations={[0, 0.3, 0.7, 1]} style={dlStyles.hero}>
        <View style={dlStyles.heroBgPattern} />
        <View style={dlStyles.heroInner}>
          <View style={dlStyles.heroContent}>
            <View style={dlStyles.heroTag}>
              <View style={dlStyles.heroTagDot} />
              <Text style={dlStyles.heroTagText}>{lang === 'en' ? 'Now Live on Gojo Equb' : 'አሁን በጎጆ ዕቁብ ላይ'}</Text>
            </View>
            <Text style={dlStyles.heroTitle}>
              <Text style={dlStyles.heroTitleAccent}>{lang === 'en' ? 'Smart Saving' : 'ብልህ ቁጠባ'}</Text>
              {'\n'}
              <Text>{lang === 'en' ? 'Meets' : ''}</Text>
              {'\n'}
              <Text style={dlStyles.heroTitleAccent}>{lang === 'en' ? 'Big Wins' : 'ትልቅ ድል'}</Text>
            </Text>
            <Text style={dlStyles.heroSub}>{lang === 'en' ? 'Join thousands of Ethiopians in the modern way to save together. Track your slots, win daily draws, and grow your community fund — all from your phone.' : 'ከሺዎች ኢትዮጵያውያን ጋር አብረው ለመቆጠብ ዘመናዊ መንገድ። ቦታዎችዎን ይከታተሉ፣ ዕለታዊ ዕጣ ያሸንፉ እና የማህበረሰብ ፈንድዎን ያሳድጉ — ሁሉንም ከስልክዎ።'}</Text>
            <View style={dlStyles.heroCtas}>
              <TouchableOpacity onPress={() => navigate('signup')} activeOpacity={0.8}>
                <View style={dlStyles.heroCtaPrimary}>
                  <Text style={dlStyles.heroCtaPrimaryText}>{lang === 'en' ? 'Create Free Account' : 'ነጻ መለያ ይፍጠሩ'}</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </View>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigate('login')} style={dlStyles.heroLearn} activeOpacity={0.7}>
                <Text style={dlStyles.heroLearnText}>{lang === 'en' ? 'Sign In' : 'ይግቡ'}</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={dlStyles.heroVisual}>
            <View style={dlStyles.phoneGlow} />
            <View style={dlStyles.phoneMock}>
              <View style={dlStyles.phoneNotch} />
              <View style={dlStyles.phoneScreen}>
                <View style={dlStyles.phoneHeader}>
                  <Image source={require('../../assets/main-logo.png')} style={dlStyles.phoneLogo} />
                  <Text style={dlStyles.phoneName}>{appT.name}</Text>
                </View>
                <View style={dlStyles.phoneCup}>
                  <DiceShaker ref={diceShakerRef} eligibleCount={eligibleCount} disabled={isShaking} onShake={handleShake} isAmharic={lang === 'am'} />
                </View>
              </View>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* ─── Stats Bar ─── */}
      <View style={dlStyles.statsBar}>
        <View style={dlStyles.statsInner}>
          <View style={dlStyles.stat}>
            <Text style={dlStyles.statValue}>{eligibleCount || '—'}</Text>
            <Text style={dlStyles.statLabel}>{lang === 'en' ? 'Active Entries' : 'ንቁ ተሳታፊዎች'}</Text>
          </View>
          <View style={dlStyles.statDivider} />
          <View style={dlStyles.stat}>
            <Text style={dlStyles.statValue}>{tierCards.length}</Text>
            <Text style={dlStyles.statLabel}>{lang === 'en' ? 'Active Pools' : 'ንቁ ፖሎች'}</Text>
          </View>
          <View style={dlStyles.statDivider} />
          <View style={dlStyles.stat}>
            <Text style={dlStyles.statValue}>{tierCards.reduce((s: number, t: any) => s + t.totalSlots, 0)}</Text>
            <Text style={dlStyles.statLabel}>{lang === 'en' ? 'Total Slots' : 'ጠቅላላ ቦታዎች'}</Text>
          </View>
          <View style={dlStyles.statDivider} />
          <View style={dlStyles.stat}>
            <Text style={dlStyles.statValue}>{tierCards.filter((t: any) => t.status === 'active').length}</Text>
            <Text style={dlStyles.statLabel}>{lang === 'en' ? 'Active Now' : 'አሁን ንቁ'}</Text>
          </View>
        </View>
      </View>

      {/* ─── How It Works ─── */}
      <View style={dlStyles.howSection}>
        <View style={dlStyles.howInner}>
          <View style={dlStyles.howHeader}>
            <Text style={dlStyles.howEyebrow}>{lang === 'en' ? 'Simple Process' : 'ቀላል ሂደት'}</Text>
            <Text style={dlStyles.howTitle}>{lang === 'en' ? 'How Gojo Equb Works' : 'ጎጆ ዕቁብ እንዴት እንደሚሰራ'}</Text>
            <Text style={dlStyles.howDesc}>{lang === 'en' ? 'Three simple steps to start saving and winning with your community.' : 'ማህበረሰብዎ ጋር መቆጠብ እና ማሸነፍ ለመጀመር ሶስት ቀላል ደረጃዎች።'}</Text>
          </View>
          <View style={dlStyles.howGrid}>
            {HOW_IT_WORKS.map((item, i) => (
              <View key={i} style={dlStyles.howCard}>
                <View style={dlStyles.howStepBadge}>
                  <Text style={dlStyles.howStepNumber}>{item.step}</Text>
                </View>
                <View style={dlStyles.howIconWrap}>
                  <Ionicons name={item.icon} size={28} color="#059669" />
                </View>
                <Text style={dlStyles.howCardTitle}>{lang === 'en' ? item.titleEn : item.titleAm}</Text>
                <Text style={dlStyles.howCardDesc}>{lang === 'en' ? item.descEn : item.descAm}</Text>
                {i < HOW_IT_WORKS.length - 1 && <View style={dlStyles.howConnector} />}
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* ─── Active Rounds ─── */}
      <View style={dlStyles.roundsSection}>
        <View style={dlStyles.roundsInner}>
          <View style={dlStyles.roundsHeader}>
            <View>
              <Text style={dlStyles.roundsEyebrow}>{lang === 'en' ? 'Current Pools' : 'የአሁን ፖሎች'}</Text>
              <Text style={dlStyles.roundsTitle}>{lang === 'en' ? 'Open Savings Pools' : 'ክፍት የቁጠባ ፖሎች'}</Text>
              <Text style={dlStyles.roundsDesc}>{lang === 'en' ? 'Pick a pool and secure your slot before it fills up.' : 'ፖል ይምረጡ እና ከመሞላቱ በፊት ቦታዎን ያስጠብቁ።'}</Text>
            </View>
            <Text style={dlStyles.roundsCount}>{tierCards.length} {lang === 'en' ? 'available' : 'ይገኛሉ'}</Text>
          </View>
          <View style={[dlStyles.tierGrid, isWide ? dlStyles.tierGridWide : dlStyles.tierGridNarrow]}>
            {tierCards.map((tier: any, index: number) => (
              <View key={`${tier.code}-${index}`} style={dlStyles.tierCard}>
                <LinearGradient colors={['#059669', '#047857', '#065f46']} style={dlStyles.tierHead}>
                  <Text style={dlStyles.tierHeadLabel}>{lang === 'en' ? 'Pool' : 'ፖል'}</Text>
                  <Text style={dlStyles.tierHeadCode}>ETB {tier.code}</Text>
                </LinearGradient>
                <View style={dlStyles.tierBody}>
                  <View style={dlStyles.tierMeta}>
                    <View style={dlStyles.tierMetaLeft}>
                      <View style={[dlStyles.tierStatusDot, { backgroundColor: tier.status === 'active' ? '#059669' : '#94a3b8' }]} />
                      <Text style={dlStyles.tierRound}>{lang === 'en' ? 'Cycle' : 'ዙር'} {tier.currentRound}</Text>
                    </View>
                    <Text style={[dlStyles.tierStatusBadge, { color: tier.status === 'active' ? '#059669' : '#94a3b8', backgroundColor: tier.status === 'active' ? '#ecfdf5' : '#f1f5f9' }]}>
                      {tier.status === 'active' ? (lang === 'en' ? 'Open' : 'ክፍት') : (lang === 'en' ? 'Draft' : 'ረቂቅ')}
                    </Text>
                  </View>
                  <View style={dlStyles.tierNumbers}>
                    <Text style={dlStyles.tierFilled}>{tier.filledSlots}</Text>
                    <Text style={dlStyles.tierSep}>/</Text>
                    <Text style={dlStyles.tierTotal}>{tier.totalSlots}</Text>
                    <Text style={dlStyles.tierLabel}>{lang === 'en' ? 'slots' : 'ቦታዎች'}</Text>
                  </View>
                  <View style={dlStyles.progressTrack}>
                    <View style={[dlStyles.progressFill, { width: `${tier.progressPct}%` }]} />
                  </View>
                  <View style={dlStyles.tierFooter}>
                    <Text style={dlStyles.tierStatus}>
                      {tier.status === 'draft'
                        ? (lang === 'en' ? 'Opening soon' : 'በቅድመ ዝግጅት')
                        : `${tier.totalSlots - tier.filledSlots} ${lang === 'en' ? 'slots remaining' : 'ቦታዎች ቀርተዋል'}`}
                    </Text>
                    {tier.status === 'active' && (
                      <TouchableOpacity onPress={() => navigate('signup')} activeOpacity={0.7}>
                        <Text style={dlStyles.tierJoin}>{lang === 'en' ? 'Join →' : 'ተቀላቀል →'}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* ─── Features ─── */}
      <View style={dlStyles.featuresSection}>
        <View style={dlStyles.featuresInner}>
          <View style={dlStyles.featuresHeader}>
            <Text style={dlStyles.featuresEyebrow}>{lang === 'en' ? 'Why Choose Us' : 'ለምን እኛን ይመርጣሉ'}</Text>
            <Text style={dlStyles.featuresTitle}>{lang === 'en' ? 'Built for Ethiopian Communities' : 'ለኢትዮጵያ ማህበረሰቦች የተሰራ'}</Text>
            <Text style={dlStyles.featuresDesc}>{lang === 'en' ? 'Gojo Equb combines tradition with technology to make community saving seamless, transparent, and rewarding.' : 'ጎጆ ዕቁብ ባህልን ከቴክኖሎጂ ጋር በማጣመር የማህበረሰብ ቁጠባን እንከን የለሽ፣ ግልጽ እና የሚክስ ያደርገዋል።'}</Text>
          </View>
          <View style={dlStyles.featuresGrid}>
            {FEATURES.map((feat, i) => (
              <View key={i} style={dlStyles.featureCard}>
                <View style={dlStyles.featureIconWrap}>
                  <Ionicons name={feat.icon} size={22} color="#fff" />
                </View>
                <Text style={dlStyles.featureTitle}>{lang === 'en' ? feat.titleEn : feat.titleAm}</Text>
                <Text style={dlStyles.featureDesc}>{lang === 'en' ? feat.descEn : feat.descAm}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* ─── Lucky Jar ─── */}
      <View style={dlStyles.jarSection}>
        <LuckyJarSection prizes={jarPrizes} participants={jarParticipants} eligibleCount={eligibleCount} />
      </View>

      {/* ─── Register CTA ─── */}
      {!isAuthed && (
        <LinearGradient colors={['#064e3b', '#065f46', '#059669']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={dlStyles.ctaSection}>
          <View style={dlStyles.ctaInner}>
            <Text style={dlStyles.ctaEyebrow}>{lang === 'en' ? 'Get Started Today' : 'ዛሬ ይጀምሩ'}</Text>
            <Text style={dlStyles.ctaTitle}>{lang === 'en' ? 'Ready to Start Your Equb Journey?' : 'የዕቁብ ጉዞዎን ለመጀመር ዝግጁ ነዎት?'}</Text>
            <Text style={dlStyles.ctaDesc}>{lang === 'en' ? 'Join thousands of members already saving and winning. Create your account in under a minute.' : 'ቀድሞውኑ እየቆጠቡ እና እያሸነፉ ከሚገኙ ሺዎች አባላት ጋር ይቀላቀሉ። መለያዎን በአንድ ደቂቃ ውስጥ ይፍጠሩ።'}</Text>
            <View style={dlStyles.ctaActions}>
              <TouchableOpacity onPress={() => navigate('signup')} activeOpacity={0.8}>
                <View style={dlStyles.ctaBtnPrimary}>
                  <Text style={dlStyles.ctaBtnText}>{lang === 'en' ? 'Create Free Account' : 'ነጻ መለያ ይፍጠሩ'}</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </View>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigate('login')} activeOpacity={0.7}>
                <Text style={dlStyles.ctaSignIn}>{lang === 'en' ? 'I already have an account' : 'መለያ አለኝ'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      )}

      {/* ─── Footer ─── */}
      <View style={dlStyles.footer}>
        <View style={dlStyles.footerInner}>
          <View style={dlStyles.footerBrand}>
            <Image source={require('../../assets/main-logo.png')} style={dlStyles.footerLogo} />
            <Text style={dlStyles.footerName}>{appT.name}</Text>
            <Text style={dlStyles.footerTag}>{appT.tagline}</Text>
          </View>
          <View style={dlStyles.footerLinks}>
            <Text style={dlStyles.footerLinkHead}>{lang === 'en' ? 'Product' : 'ምርት'}</Text>
            <Text style={dlStyles.footerLink}>{lang === 'en' ? 'Home' : 'መነሻ'}</Text>
            <Text style={dlStyles.footerLink}>{lang === 'en' ? 'How It Works' : 'እንዴት እንደሚሰራ'}</Text>
            <Text style={dlStyles.footerLink}>{lang === 'en' ? 'Pools' : 'ፖሎች'}</Text>
            <Text style={dlStyles.footerLink}>{lang === 'en' ? 'FAQ' : 'ጥያቄዎች'}</Text>
          </View>
          <View style={dlStyles.footerLinks}>
            <Text style={dlStyles.footerLinkHead}>{lang === 'en' ? 'Account' : 'መለያ'}</Text>
            <TouchableOpacity onPress={() => navigate('login')} activeOpacity={0.7}>
              <Text style={dlStyles.footerLink}>{lang === 'en' ? 'Sign In' : 'ይግቡ'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigate('signup')} activeOpacity={0.7}>
              <Text style={dlStyles.footerLink}>{lang === 'en' ? 'Register' : 'ይመዝገቡ'}</Text>
            </TouchableOpacity>
          </View>
          <View style={dlStyles.footerLinks}>
            <Text style={dlStyles.footerLinkHead}>{lang === 'en' ? 'Language' : 'ቋንቋ'}</Text>
            <TouchableOpacity onPress={toggleLanguage} activeOpacity={0.7}>
              <View style={dlStyles.footerLangRow}>
                <Ionicons name="language-outline" size={14} color="#64748b" />
                <Text style={dlStyles.footerLink}>{lang === 'en' ? 'English' : 'አማርኛ'}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
        <View style={dlStyles.footerDivider} />
        <Text style={dlStyles.footerCopy}>© 2026 {appT.name}. {lang === 'en' ? 'All rights reserved.' : 'መብቱ በህግ የተጠበቀ ነው።'}</Text>
      </View>
    </ScrollView>
  )
}

const dlStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  rootContent: {},

  /* Nav */
  nav: {
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
    paddingHorizontal: 24, position: 'sticky', top: 0, zIndex: 50,
  },
  navInner: {
    maxWidth: 1200, width: '100%', alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14,
  },
  navBrand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  navLogo: { width: 34, height: 34, resizeMode: 'contain' },
  navName: { fontSize: 18, fontWeight: '800', color: '#0f172a', letterSpacing: -0.3 },
  navLinks: { flexDirection: 'row', alignItems: 'center', gap: 28 },
  navLink: { fontSize: 14, fontWeight: '500', color: '#475569', letterSpacing: 0.2 },
  navActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  navLang: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 5, paddingHorizontal: 11, borderRadius: 18, backgroundColor: '#f1f5f9' },
  navLangText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  navSignInBtn: { paddingVertical: 8, paddingHorizontal: 4 },
  navSignIn: { fontSize: 14, fontWeight: '600', color: '#059669' },
  navCta: { backgroundColor: '#059669', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  navCtaText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  /* Hero */
  hero: { overflow: 'hidden', position: 'relative' },
  heroBgPattern: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    opacity: 0.04,
    backgroundColor: '#fff',
  },
  heroInner: {
    maxWidth: 1200, width: '100%', alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', paddingVertical: 80, paddingHorizontal: 24, gap: 60,
  },
  heroContent: { flex: 1, gap: 20 },
  heroTag: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.12)', paddingVertical: 7, paddingHorizontal: 16, borderRadius: 20 },
  heroTagDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#34d399' },
  heroTagText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.9)' },
  heroTitle: { fontSize: 52, fontWeight: '800', color: '#fff', lineHeight: 60, letterSpacing: -1.5 },
  heroTitleAccent: { color: '#6ee7b7' },
  heroSub: { fontSize: 16, color: 'rgba(255,255,255,0.8)', lineHeight: 26, maxWidth: 500 },
  heroCtas: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 8 },
  heroCtaPrimary: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 12 },
  heroCtaPrimaryText: { fontSize: 15, fontWeight: '700', color: '#065f46' },
  heroLearn: { paddingVertical: 14, paddingHorizontal: 20 },
  heroLearnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  heroVisual: { width: 280, alignItems: 'center', position: 'relative' },
  phoneGlow: { position: 'absolute', top: '30%', left: '10%', width: 220, height: 220, borderRadius: 110, backgroundColor: '#34d399', opacity: 0.15 },
  phoneMock: {
    width: 250, height: 500, backgroundColor: '#000', borderRadius: 36, overflow: 'hidden',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.35, shadowRadius: 32, elevation: 20,
    position: 'relative',
  },
  phoneNotch: { position: 'absolute', top: 0, left: '50%', marginLeft: -55, width: 110, height: 26, backgroundColor: '#000', borderBottomLeftRadius: 14, borderBottomRightRadius: 14, zIndex: 10 },
  phoneScreen: { flex: 1, backgroundColor: '#f8fafc', paddingTop: 12, paddingHorizontal: 10, gap: 6 },
  phoneHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 6 },
  phoneLogo: { width: 24, height: 24, resizeMode: 'contain' },
  phoneName: { fontSize: 12, fontWeight: '800', color: '#0f172a' },
  phoneCup: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  /* Stats */
  statsBar: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  statsInner: { maxWidth: 1200, width: '100%', alignSelf: 'center', flexDirection: 'row', justifyContent: 'center', paddingVertical: 28, paddingHorizontal: 24, gap: 48 },
  stat: { alignItems: 'center', gap: 4 },
  statValue: { fontSize: 28, fontWeight: '800', color: '#059669' },
  statLabel: { fontSize: 13, fontWeight: '500', color: '#64748b' },
  statDivider: { width: 1, backgroundColor: '#e2e8f0' },

  /* How It Works */
  howSection: { backgroundColor: '#f8fafc', paddingHorizontal: 24, paddingVertical: 80 },
  howInner: { maxWidth: 1000, width: '100%', alignSelf: 'center', gap: 48 },
  howHeader: { alignItems: 'center', gap: 12 },
  howEyebrow: { fontSize: 12, fontWeight: '700', color: '#059669', textTransform: 'uppercase', letterSpacing: 2 },
  howTitle: { fontSize: 32, fontWeight: '700', color: '#0f172a', textAlign: 'center' },
  howDesc: { fontSize: 16, color: '#64748b', textAlign: 'center', maxWidth: 600, lineHeight: 24 },
  howGrid: { flexDirection: 'row', justifyContent: 'center', gap: 40 },
  howCard: { flex: 1, maxWidth: 280, alignItems: 'center', gap: 16, position: 'relative' },
  howStepBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#059669', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  howStepNumber: { fontSize: 14, fontWeight: '800', color: '#fff' },
  howIconWrap: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#ecfdf5', alignItems: 'center', justifyContent: 'center' },
  howCardTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', textAlign: 'center' },
  howCardDesc: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 22 },
  howConnector: { position: 'absolute', top: 48, right: -20, width: 40, height: 2, backgroundColor: '#d1fae5' },

  /* Rounds */
  roundsSection: { backgroundColor: '#fff', paddingHorizontal: 24, paddingVertical: 80 },
  roundsInner: { maxWidth: 1200, width: '100%', alignSelf: 'center', gap: 36 },
  roundsHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  roundsEyebrow: { fontSize: 12, fontWeight: '700', color: '#059669', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 },
  roundsTitle: { fontSize: 28, fontWeight: '700', color: '#0f172a' },
  roundsDesc: { fontSize: 15, color: '#64748b', marginTop: 6 },
  roundsCount: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  tierGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 24 },
  tierGridWide: { justifyContent: 'flex-start' },
  tierGridNarrow: { justifyContent: 'center' },
  tierCard: {
    backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: '#e2e8f0', width: 195,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 4,
  },
  tierHead: { paddingVertical: 14, alignItems: 'center', gap: 2 },
  tierHeadLabel: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 1 },
  tierHeadCode: { color: '#fff', fontSize: 16, fontWeight: '800' },
  tierBody: { padding: 16, gap: 12 },
  tierMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tierMetaLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tierRound: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  tierStatusDot: { width: 7, height: 7, borderRadius: 4 },
  tierStatusBadge: { fontSize: 11, fontWeight: '700', paddingVertical: 3, paddingHorizontal: 10, borderRadius: 10, overflow: 'hidden' },
  tierNumbers: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  tierFilled: { fontSize: 28, fontWeight: '800', color: '#059669' },
  tierSep: { fontSize: 16, fontWeight: '600', color: '#94a3b8' },
  tierTotal: { fontSize: 16, fontWeight: '600', color: '#94a3b8' },
  tierLabel: { fontSize: 12, fontWeight: '500', color: '#94a3b8', marginLeft: 4 },
  progressTrack: { height: 6, backgroundColor: '#f1f5f9', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: '#059669' },
  tierFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tierStatus: { fontSize: 12, fontWeight: '500', color: '#64748b' },
  tierJoin: { fontSize: 13, fontWeight: '700', color: '#059669' },

  /* Features */
  featuresSection: { backgroundColor: '#f8fafc', paddingHorizontal: 24, paddingVertical: 80 },
  featuresInner: { maxWidth: 1100, width: '100%', alignSelf: 'center', gap: 40 },
  featuresHeader: { alignItems: 'center', gap: 12 },
  featuresEyebrow: { fontSize: 12, fontWeight: '700', color: '#059669', textTransform: 'uppercase', letterSpacing: 2 },
  featuresTitle: { fontSize: 32, fontWeight: '700', color: '#0f172a', textAlign: 'center' },
  featuresDesc: { fontSize: 16, color: '#64748b', textAlign: 'center', maxWidth: 650, lineHeight: 24 },
  featuresGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 24 },
  featureCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 24, gap: 14, width: 240,
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  featureIconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#059669', alignItems: 'center', justifyContent: 'center' },
  featureTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  featureDesc: { fontSize: 13, color: '#64748b', lineHeight: 20 },

  /* CTA */
  ctaSection: { paddingHorizontal: 24, paddingVertical: 80 },
  ctaInner: { maxWidth: 700, width: '100%', alignSelf: 'center', alignItems: 'center', gap: 20 },
  ctaEyebrow: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 2 },
  ctaTitle: { fontSize: 34, fontWeight: '700', color: '#fff', textAlign: 'center', lineHeight: 42 },
  ctaDesc: { fontSize: 16, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 26, maxWidth: 540 },
  ctaActions: { flexDirection: 'row', alignItems: 'center', gap: 24, marginTop: 8 },
  ctaBtnPrimary: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 12 },
  ctaBtnText: { fontSize: 15, fontWeight: '700', color: '#065f46' },
  ctaSignIn: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.85)', textDecorationLine: 'underline' },

  /* Footer */
  footer: { backgroundColor: '#f8fafc', paddingHorizontal: 24, paddingVertical: 48 },
  footerInner: { maxWidth: 1100, width: '100%', alignSelf: 'center', flexDirection: 'row', justifyContent: 'space-between', gap: 40, flexWrap: 'wrap' },
  footerBrand: { gap: 8, maxWidth: 220 },
  footerLogo: { width: 36, height: 36, resizeMode: 'contain' },
  footerName: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  footerTag: { fontSize: 12, color: '#64748b', lineHeight: 18 },
  footerLinks: { gap: 10 },
  footerLinkHead: { fontSize: 13, fontWeight: '700', color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  footerLink: { fontSize: 14, fontWeight: '500', color: '#64748b' },
  footerLangRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footerDivider: { height: 1, backgroundColor: '#e2e8f0', maxWidth: 1100, width: '100%', alignSelf: 'center', marginTop: 32, marginBottom: 20 },
  footerCopy: { fontSize: 13, color: '#94a3b8', textAlign: 'center' },

  /* Lucky Jar */
  jarSection: { paddingVertical: 40, paddingHorizontal: 24, maxWidth: 1100, width: '100%', alignSelf: 'center' },
})

/* ─── Main ─── */

export function WebPortalView() {
  const { user } = useAuth()
  const { t, lang, toggleLanguage } = useTranslation()
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

  const activeRounds = useMemo(() => rounds.filter(r => r.status === 'active'), [rounds])

  const tierCards = useMemo(() => {
    const source = rounds.filter(r => r.status === 'active' || r.status === 'draft')
    if (source.length > 0) {
      return source.map(r => {
        const filled = r.current_participants ?? 0
        const total = r.people_goal ?? 0
        const pct = total > 0 ? Math.round((filled / total) * 100) : 0
        return { code: r.category, currentRound: r.current_round_number ?? 1, filledSlots: filled, totalSlots: total, progressPct: Math.min(pct, 100), status: r.status }
      })
    }
    return [{ code: '500', currentRound: 1, filledSlots: 0, totalSlots: 10, progressPct: 0, status: 'draft' }]
  }, [rounds])

  const eligibleCount = useMemo(() => activeRounds.reduce((sum, r) => sum + (r.current_participants ?? 0), 0), [activeRounds])

  const jarPrizes = useMemo(
    () => tierCards.map((card, i) => ({
      id: String(i),
      amount: `${card.code} ETB`,
      slot: `SLOT #${card.filledSlots || i + 1}`,
      r: `R-${card.currentRound}`,
      color: ['#00b080', '#00a375', '#10b981', '#00c27a', '#008f6b'][i % 5],
    })),
    [tierCards],
  )

  const jarParticipants = useMemo(() => {
    const count = Math.min(eligibleCount || 5, 20)
    const colors = ['#34d399', '#60a5fa', '#f472b6', '#fbbf24', '#a78bfa', '#fb923c', '#2dd4bf', '#e879f9', '#22d3ee', '#a3e635']
    return Array.from({ length: count }, (_, i) => ({
      id: `p${i}`,
      name: `${lang === 'en' ? 'Player' : 'ተወዳዳሪ'} ${i + 1}`,
      avatarColor: colors[i % colors.length],
    }))
  }, [eligibleCount, lang])

  const demoShake = useCallback((): ShakeResult => {
    const cats = ['100', '500', '1000', '2000', '5000']
    const winners = Array.from({ length: 5 }, (_, i) => {
      const cat = cats[i % cats.length]
      const roundNumber = activeRounds.find(r => r.category === cat)?.current_round_number ?? 1
      return { slot_id: 9000 + i, slot_number: i + 1, category: cat, round_id: null, user_id: 9000 + i, round_number: roundNumber }
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

  const shared = { lang, appT, tierCards, eligibleCount, isShaking, diceShakerRef, handleShake, shakerError, isAuthed, navigate, toggleLanguage, jarPrizes, jarParticipants }

  if (isNarrow) return <PhoneLayout {...shared} />

  return <DesktopLayout {...shared} />
}
