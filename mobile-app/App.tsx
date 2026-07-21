import { StatusBar } from 'expo-status-bar'
import { StyleSheet, View, ActivityIndicator, TouchableOpacity, Animated, Platform, Dimensions } from 'react-native'
import * as Font from 'expo-font'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import {
  useFonts,
  InterTight_400Regular,
  InterTight_500Medium,
  InterTight_600SemiBold,
  InterTight_700Bold,
} from '@expo-google-fonts/inter-tight'
import {
  NavigationProvider,
  useNavigation,
} from './src/context/NavigationContext'
import { AuthProvider, useAuth } from './src/context/AuthContext'
import { ToastProvider } from './src/components/ui/Toast'
import { PortalView } from './src/screens/PortalView'
import { WebPortalView } from './src/screens/WebPortalView'
import { WebFrame } from './src/components/WebFrame'
import { DesktopPage } from './src/components/DesktopPage'
import { LoginScreen } from './src/screens/LoginScreen'
import { SignupScreen } from './src/screens/SignupScreen'
import { ForgotPasswordScreen } from './src/screens/ForgotPasswordScreen'
import { DashboardScreen } from './src/screens/DashboardScreen'
import { DashboardPage } from './src/screens/DashboardPage'
import { AdminDashboardScreen } from './src/screens/AdminDashboardScreen'
import { OnboardingWizardScreen } from './src/screens/OnboardingWizardScreen'
import { MainScreen } from './src/navigation/MainScreen'
import { AuthGate } from './src/components/AuthGate'


import { TourProvider } from './src/context/TourContext'
import { useEffect, useState, useRef, useCallback } from 'react'
import { colors, spacing } from './src/theme'

import { Ionicons } from '@expo/vector-icons'
import { Text } from './src/components/ui/AppText'
import { useTranslation } from './src/i18n/useTranslation'
import { LinearGradient } from 'expo-linear-gradient'

function BottomTabBar({ activeTab, onTabChange }: { activeTab: string; onTabChange: (tab: 'home' | 'dashboard' | 'others') => void }) {
  const { lang } = useTranslation()
  const barWidth = useRef(0)
  const pillAnim = useRef(new Animated.Value(0)).current
  const prevTab = useRef(activeTab)
  const NUM = 3

  const tabs = [
    { key: 'home' as const, label: lang === 'en' ? 'Home' : 'መነሻ', icon: 'home', iconOutline: 'home-outline' },
    { key: 'dashboard' as const, label: lang === 'en' ? 'Dashboard' : 'ደብተር', icon: 'book', iconOutline: 'book-outline' },
    { key: 'others' as const, label: lang === 'en' ? 'Others' : 'ሌሎች', icon: 'ellipsis-horizontal', iconOutline: 'ellipsis-horizontal-outline' },
  ]

  const getPillX = useCallback((key: string) => {
    const idx = tabs.findIndex((t) => t.key === key)
    if (idx < 0 || !barWidth.current) return 0
    const tabW = (barWidth.current - 32) / NUM
    return 16 + idx * tabW + (tabW - 80) / 2
  }, [tabs])

  useEffect(() => {
    const target = getPillX(activeTab)
    if (prevTab.current !== activeTab) {
      Animated.spring(pillAnim, { toValue: target, useNativeDriver: true, tension: 120, friction: 10 }).start()
      prevTab.current = activeTab
    } else {
      pillAnim.setValue(target)
    }
  }, [activeTab, getPillX, pillAnim])

  return (
    <View style={styles.bottomBar} onLayout={(e) => { barWidth.current = e.nativeEvent.layout.width; pillAnim.setValue(getPillX(activeTab)) }}>
      <Animated.View style={[styles.bottomPill, { transform: [{ translateX: pillAnim }] }]} />
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key
        return (
          <TouchableOpacity key={tab.key} style={styles.bottomTab} onPress={() => onTabChange(tab.key)} activeOpacity={0.7}>
            <Ionicons name={isActive ? tab.icon : (tab.iconOutline as any)} size={22} color={isActive ? colors.primary : colors.mutedForeground} />
            <Text style={[styles.bottomTabLabel, isActive && styles.bottomTabLabelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

function ScreenRouter() {
  const { currentScreen, navigate } = useNavigation()
  const { isLoading, role } = useAuth()
  const [publicTab, setPublicTab] = useState<'home' | 'dashboard' | 'others'>('home')
  const { t, lang, toggleLanguage } = useTranslation()
  const [winW, setWinW] = useState(Dimensions.get('window').width)

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => setWinW(window.width))
    return () => sub?.remove()
  }, [])

  const isPublicScreen = currentScreen === 'portal' || currentScreen === 'dashboard'
  const isDesktop = Platform.OS === 'web' && winW >= 640
  const effectivePublicTab = currentScreen === 'dashboard' ? 'dashboard' : publicTab

  const showWebBottomBar = !(Platform.OS === 'web' && winW >= 640 && isPublicScreen)

  useEffect(() => {
    if (currentScreen === 'portal') setPublicTab('home')
    if (currentScreen === 'dashboard') setPublicTab('dashboard')
  }, [currentScreen])

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  const renderOthersDesktop = () => (
    <View style={styles.desktopOthers}>
      <View style={styles.desktopOthersHeader}>
        <Text style={styles.desktopOthersTitle}>{lang === 'en' ? 'More Options' : 'ተጨማሪ አማራጮች'}</Text>
        <Text style={styles.desktopOthersSub}>{lang === 'en' ? 'Manage your account and preferences' : 'መለያዎን እና ምርጫዎችዎን ያስተዳድሩ'}</Text>
      </View>
      <View style={styles.desktopOthersGrid}>
        <TouchableOpacity style={styles.desktopOthersCard} onPress={toggleLanguage} activeOpacity={0.7}>
          <View style={[styles.desktopOthersIcon, { backgroundColor: '#E6F4EA' }]}>
            <Ionicons name="language-outline" size={28} color={colors.primary} />
          </View>
          <Text style={styles.desktopOthersCardTitle}>{lang === 'en' ? 'Language' : 'ቋንቋ'}</Text>
          <Text style={styles.desktopOthersCardValue}>{lang === 'en' ? 'English' : 'አማርኛ'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.desktopOthersCard} onPress={() => navigate('login')} activeOpacity={0.7}>
          <View style={[styles.desktopOthersIcon, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="log-in-outline" size={28} color="#D97706" />
          </View>
          <Text style={styles.desktopOthersCardTitle}>{lang === 'en' ? 'Sign In' : 'ይግቡ'}</Text>
          <Text style={styles.desktopOthersCardValue}>{lang === 'en' ? 'Access your dashboard' : 'ዳሽቦርድዎን ያግኙ'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.desktopOthersCard} onPress={() => navigate('signup')} activeOpacity={0.7}>
          <View style={[styles.desktopOthersIcon, { backgroundColor: '#DBEAFE' }]}>
            <Ionicons name="person-add-outline" size={28} color="#2563EB" />
          </View>
          <Text style={styles.desktopOthersCardTitle}>{lang === 'en' ? 'Create Account' : 'መለያ ይፍጠሩ'}</Text>
          <Text style={styles.desktopOthersCardValue}>{lang === 'en' ? 'Join Equb today' : 'ዛሬ ይቀላቀሉ'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )

  const renderPublicContent = () => {
    switch (effectivePublicTab) {
      case 'home':
        return Platform.OS === 'web' ? <WebPortalView /> : <PortalView />
      case 'dashboard':
        return <DashboardPage />
      case 'others':
        if (isDesktop) return renderOthersDesktop()
        return (
          <View style={styles.othersContainer}>
            <View style={styles.othersHeader}>
              <Text style={styles.othersTitle}>{lang === 'en' ? 'More' : 'ሌሎች'}</Text>
            </View>
            <View style={styles.othersBody}>
              <TouchableOpacity style={styles.othersRow} onPress={toggleLanguage} activeOpacity={0.7}>
                <Ionicons name="language-outline" size={22} color={colors.primary} />
                <Text style={styles.othersRowText}>{lang === 'en' ? 'Language' : 'ቋንቋ'}</Text>
                <Text style={styles.othersRowValue}>{lang === 'en' ? 'English' : 'አማርኛ'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.othersRow} onPress={() => navigate('login')} activeOpacity={0.7}>
                <Ionicons name="log-in-outline" size={22} color={colors.primary} />
                <Text style={styles.othersRowText}>{lang === 'en' ? 'Sign In' : 'ይግቡ'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.othersRow} onPress={() => navigate('signup')} activeOpacity={0.7}>
                <Ionicons name="person-add-outline" size={22} color={colors.primary} />
                <Text style={styles.othersRowText}>{lang === 'en' ? 'Create Account' : 'መለያ ይፍጠሩ'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )
    }
  }

  if (isPublicScreen) {
    if (effectivePublicTab === 'home' && isDesktop) {
      return <WebPortalView />
    }
    const content = (
      <View style={styles.publicLayout}>
        <View style={styles.publicContent}>
          {renderPublicContent()}
        </View>
        {showWebBottomBar ? <BottomTabBar activeTab={effectivePublicTab} onTabChange={setPublicTab} /> : null}
      </View>
    )
    if (isDesktop) {
      return <DesktopPage>{content}</DesktopPage>
    }
    return Platform.OS === 'web' ? <WebFrame>{content}</WebFrame> : content
  }

  const web = Platform.OS === 'web'
  if (isDesktop) {
    switch (currentScreen) {
      case 'login':
        return <DesktopPage centered><LoginScreen /></DesktopPage>
      case 'signup':
        return <DesktopPage centered><SignupScreen /></DesktopPage>
      case 'forgotPassword':
        return <DesktopPage centered><ForgotPasswordScreen /></DesktopPage>
      case 'onboarding':
        return <DesktopPage><OnboardingWizardScreen /></DesktopPage>
      case 'admin':
        return <DesktopPage><AdminDashboardScreen /></DesktopPage>
      case 'authGate':
        return <DesktopPage centered><AuthGate onSuccess={() => navigate('admin')} onCancel={() => navigate('portal')} /></DesktopPage>
      case 'main':
        return <MainScreen />
      default:
        navigate('portal')
        return null
    }
  }
  switch (currentScreen) {
    case 'login':
      return web ? <WebFrame centered><LoginScreen /></WebFrame> : <LoginScreen />
    case 'signup':
      return web ? <WebFrame centered><SignupScreen /></WebFrame> : <SignupScreen />
    case 'forgotPassword':
      return web ? <WebFrame centered><ForgotPasswordScreen /></WebFrame> : <ForgotPasswordScreen />
    case 'onboarding':
      return web ? <WebFrame><OnboardingWizardScreen /></WebFrame> : <OnboardingWizardScreen />
    case 'admin':
      return web ? <WebFrame><AdminDashboardScreen /></WebFrame> : <AdminDashboardScreen />
    case 'authGate':
      return web ? (
        <WebFrame centered>
          <AuthGate onSuccess={() => navigate('admin')} onCancel={() => navigate('portal')} />
        </WebFrame>
      ) : (
        <AuthGate onSuccess={() => navigate('admin')} onCancel={() => navigate('portal')} />
      )
    case 'main':
      return <MainScreen />
    default:
      navigate('portal')
      return null
  }
}

function AppContent() {
  const [interFontsLoaded] = useFonts({
    InterTight_400Regular,
    InterTight_500Medium,
    InterTight_600SemiBold,
    InterTight_700Bold,
  })
  const [kefaLoaded, setKefaLoaded] = useState(false)

  useEffect(() => {
    Font.loadAsync({
      'Kefa': require('./assets/fonts/Kefa-Regular.ttf'),
      'Kefa-Bold': require('./assets/fonts/Kefa-Bold.ttf'),
    }).then(() => setKefaLoaded(true))
  }, [])

  if (!interFontsLoaded || !kefaLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  return (
    <SafeAreaProvider>
      <NavigationProvider>
        <AuthProvider>
          <TourProvider>
            <SafeAreaView style={styles.container}>
              <StatusBar style="light" />
              <ToastProvider>
                <ScreenRouter />
              </ToastProvider>
            </SafeAreaView>
          </TourProvider>
        </AuthProvider>
      </NavigationProvider>
    </SafeAreaProvider>
  )
}

export default function App() {
  return <AppContent />
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  publicLayout: {
    flex: 1,
    backgroundColor: colors.background,
  },
  publicContent: {
    flex: 1,
  },

  /* ─── Bottom Tab Bar ─── */
  bottomBar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'web' ? 10 : 24,
    paddingHorizontal: 16,
  },
  bottomPill: {
    position: 'absolute',
    left: 0,
    top: 4,
    width: 80,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#05966918',
  },
  bottomTab: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  bottomTabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
  bottomTabLabelActive: {
    color: colors.primary,
  },

  /* ─── Others Tab ─── */
  othersContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  othersHeader: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['3xl'],
    paddingBottom: spacing.lg,
  },
  othersTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.foreground,
  },
  othersBody: {
    paddingHorizontal: spacing.xl,
    gap: 2,
  },
  othersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  othersRowText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: colors.foreground,
  },
  othersRowValue: {
    fontSize: 13,
    color: colors.mutedForeground,
  },

  /* ─── Desktop Others Tab ─── */
  desktopOthers: {
    flex: 1,
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  desktopOthersHeader: {
    marginBottom: 40,
  },
  desktopOthersTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: 8,
  },
  desktopOthersSub: {
    fontSize: 15,
    color: colors.mutedForeground,
  },
  desktopOthersGrid: {
    flexDirection: 'row',
    gap: 24,
    flexWrap: 'wrap',
  },
  desktopOthersCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 28,
    width: 240,
    gap: 12,
  },
  desktopOthersIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  desktopOthersCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.foreground,
  },
  desktopOthersCardValue: {
    fontSize: 13,
    color: colors.mutedForeground,
  },
})
