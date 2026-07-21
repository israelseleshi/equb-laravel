import { useState, useEffect } from 'react'
import { View, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { colors } from '../theme'
import { Text } from './ui/AppText'
import { useNavigation } from '../context/NavigationContext'
import { useTranslation } from '../i18n/useTranslation'
import { useAuth } from '../context/AuthContext'

const TABLET_BREAK = 640
const CONTENT_MAX = 1200

export function DesktopPage({ children, centered = false, noFooter = false }: { children: React.ReactNode; centered?: boolean; noFooter?: boolean }) {
  const [width, setWidth] = useState(Dimensions.get('window').width)
  const { navigate } = useNavigation()
  const { lang, toggleLanguage } = useTranslation()
  const { user } = useAuth()
  const isWide = Platform.OS === 'web' && width >= TABLET_BREAK

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => setWidth(window.width))
    return () => sub?.remove()
  }, [])

  if (!isWide) return <>{children}</>

  return (
    <View style={styles.page}>
      <View style={styles.navbar}>
        <View style={styles.navInner}>
          <TouchableOpacity style={styles.navBrand} onPress={() => navigate('portal')} activeOpacity={0.7}>
            <Image source={require('../../assets/main-logo.png')} style={styles.navLogo} />
            <Text style={styles.navTitle}>Equb</Text>
          </TouchableOpacity>

          <View style={styles.navLinks}>
            <TouchableOpacity onPress={() => navigate('portal')} activeOpacity={0.7} style={styles.navLinkWrap}>
              <Text style={styles.navLink}>{lang === 'en' ? 'Home' : 'መነሻ'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigate('dashboard')} activeOpacity={0.7} style={styles.navLinkWrap}>
              <Text style={styles.navLink}>{lang === 'en' ? 'Dashboard' : 'ዳሽቦርድ'}</Text>
            </TouchableOpacity>

            {!user ? (
              <>
                <TouchableOpacity onPress={() => navigate('login')} activeOpacity={0.7} style={styles.navLinkWrap}>
                  <Text style={styles.navLink}>{lang === 'en' ? 'Sign In' : 'ይግቡ'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigate('signup')} activeOpacity={0.7}>
                  <LinearGradient colors={['#059669', '#047857']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.navCta}>
                    <Text style={styles.navCtaText}>{lang === 'en' ? 'Get Started' : 'ይጀምሩ'}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            ) : null}

            <TouchableOpacity onPress={toggleLanguage} activeOpacity={0.7} style={styles.langBtn}>
              <Ionicons name="language-outline" size={18} color={colors.mutedForeground} />
              <Text style={styles.langText}>{lang === 'en' ? 'EN' : 'አማ'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.contentOuter, centered && styles.centeredOuter]}>
          <View style={[styles.contentInner, centered && styles.centeredInner]}>
            {children}
          </View>
        </View>
        {!noFooter && (
          <View style={styles.footer}>
            <Text style={styles.footerCopy}>© 2026 Equb. {lang === 'en' ? 'All rights reserved.' : 'መብቱ በህግ የተጠበቀ ነው።'}</Text>
            <View style={styles.footerLinks}>
              <TouchableOpacity activeOpacity={0.7}><Text style={styles.footerLink}>{lang === 'en' ? 'Privacy' : 'ግላዊነት'}</Text></TouchableOpacity>
              <Text style={styles.footerSep}>·</Text>
              <TouchableOpacity activeOpacity={0.7}><Text style={styles.footerLink}>{lang === 'en' ? 'Terms' : 'ውሎች'}</Text></TouchableOpacity>
              <Text style={styles.footerSep}>·</Text>
              <TouchableOpacity activeOpacity={0.7}><Text style={styles.footerLink}>{lang === 'en' ? 'Contact' : 'አግኙን'}</Text></TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background,
  },
  navbar: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    position: Platform.OS === 'web' ? 'sticky' : undefined,
    top: 0,
    zIndex: 50,
  },
  navInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: CONTENT_MAX,
    width: '100%',
    marginHorizontal: 'auto',
    paddingHorizontal: 32,
    height: 64,
  },
  navBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  navLogo: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  navTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.foreground,
  },
  navLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  navLinkWrap: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  navLink: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.mutedForeground,
  },
  navCta: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginLeft: 4,
  },
  navCtaText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 4,
  },
  langText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  contentOuter: {
    flex: 1,
    width: '100%',
  },
  centeredOuter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  contentInner: {
    width: '100%',
    maxWidth: CONTENT_MAX,
    marginHorizontal: 'auto',
  },
  centeredInner: {
    width: '100%',
    maxWidth: 480,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingVertical: 24,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    maxWidth: CONTENT_MAX,
    width: '100%',
    marginHorizontal: 'auto',
  },
  footerCopy: {
    fontSize: 13,
    color: colors.mutedForeground,
  },
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  footerLink: {
    fontSize: 13,
    color: colors.mutedForeground,
  },
  footerSep: {
    fontSize: 13,
    color: colors.border,
  },
})
