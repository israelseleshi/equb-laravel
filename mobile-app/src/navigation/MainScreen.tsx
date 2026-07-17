import { useState } from 'react'
import { View, StyleSheet, TouchableOpacity, ScrollView, Image, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing } from '../theme'
import { Text } from '../components/ui/AppText'
import { TourTarget } from '../components/TourTarget'
import { TourOverlay } from '../components/TourOverlay'
import { useAuth } from '../context/AuthContext'
import { useNavigation } from '../context/NavigationContext'
import { useTour } from '../context/TourContext'
import { useTranslation } from '../i18n/useTranslation'
import { PortalView } from '../screens/PortalView'
import { WebPortalView } from '../screens/WebPortalView'
import { DashboardScreen } from '../screens/DashboardScreen'
import { AdminDashboardScreen } from '../screens/AdminDashboardScreen'

type Tab = 'portal' | 'dashboard' | 'admin'

export function MainScreen() {
  const { role, logout } = useAuth()
  const { navigate } = useNavigation()
  const { startTour } = useTour()
  const { t, lang, toggleLanguage } = useTranslation()
  const navT = t.nav
  const footerT = t.footer

  const [activeTab, setActiveTab] = useState<Tab>('portal')

  const tabs: { key: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'portal', label: navT.portal, icon: 'globe-outline' },
    { key: 'dashboard', label: navT.dashboard, icon: 'grid-outline' },
  ]
  if (role === 'admin') {
    tabs.push({ key: 'admin', label: navT.admin, icon: 'shield-checkmark-outline' })
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'portal':
        return Platform.OS === 'web' ? <WebPortalView /> : <PortalView />
      case 'dashboard':
        return <DashboardScreen />
      case 'admin':
        return <AdminDashboardScreen />
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('portal')
  }

  return (
    <View style={styles.safeArea}>
      <TourOverlay />

      <View style={styles.navbar}>
        <View style={styles.navLeft}>
          <Image source={require('../../assets/main-logo.png')} style={styles.navLogo} />
          <Text style={styles.brandTitle}>{navT.equbTitle}</Text>
        </View>

        <View style={styles.navRight}>
          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => startTour(activeTab === 'admin' ? 'portal' : activeTab)}
          >
            <Ionicons name="compass-outline" size={20} color={colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.navBtn} onPress={toggleLanguage}>
            <Text style={styles.langText}>{lang === 'en' ? 'AM' : 'EN'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      </View>

      <TourTarget id="portal-nav">
        <View style={styles.tabBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Ionicons
                  name={tab.icon}
                  size={16}
                  color={activeTab === tab.key ? colors.primaryForeground : colors.mutedForeground}
                />
                <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TourTarget>

      <View style={styles.content}>
        {renderContent()}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>{footerT.copyright}</Text>
        <Text style={styles.footerRegulatory}>{footerT.regulatory}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  navLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  navLogo: {
    width: 34,
    height: 34,
    resizeMode: 'contain',
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.foreground,
  },
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  navBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  tabBar: {
    backgroundColor: colors.card,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabScroll: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.muted,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
  tabTextActive: {
    color: colors.primaryForeground,
  },
  content: {
    flex: 1,
  },
  footer: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: colors.mutedForeground,
  },
  footerRegulatory: {
    fontSize: 10,
    color: colors.mutedForeground,
    opacity: 0.8,
    textAlign: 'center',
  },
})
