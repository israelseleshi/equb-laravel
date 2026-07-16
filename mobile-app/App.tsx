import { StatusBar } from 'expo-status-bar'
import { StyleSheet, View, ActivityIndicator, TouchableOpacity, Animated } from 'react-native'
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
import { LandingScreen } from './src/screens/LandingScreen'
import { PortalView } from './src/screens/PortalView'
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

  useEffect(() => {
    if (currentScreen === 'portal') setPublicTab('home')
  }, [currentScreen])

  useEffect(() => {
    if (!role || (currentScreen !== 'landing' && currentScreen !== 'portal')) return
    if (role === 'admin') {
      navigate('authGate')
    } else {
      navigate('dashboard')
    }
  }, [role, currentScreen, navigate])

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  const isPublicScreen = currentScreen === 'portal' || currentScreen === 'dashboard'

  const renderPublicContent = () => {
    switch (publicTab) {
      case 'home':
        return <PortalView />
      case 'dashboard':
        return <DashboardPage />
      case 'others':
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
    return (
      <View style={styles.publicLayout}>
        <View style={styles.publicContent}>
          {renderPublicContent()}
        </View>
        <BottomTabBar activeTab={publicTab} onTabChange={setPublicTab} />
      </View>
    )
  }

  switch (currentScreen) {
    case 'landing':
      return <LandingScreen />
    case 'login':
      return <LoginScreen />
    case 'signup':
      return <SignupScreen />
    case 'forgotPassword':
      return <ForgotPasswordScreen />
    case 'onboarding':
      return <OnboardingWizardScreen />
    case 'admin':
      return <AdminDashboardScreen />
    case 'authGate':
      return (
        <AuthGate
          onSuccess={() => navigate('admin')}
          onCancel={() => navigate('landing')}
        />
      )
    case 'main':
      return <MainScreen />
    default:
      return <LandingScreen />
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
    paddingBottom: 24,
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
})
