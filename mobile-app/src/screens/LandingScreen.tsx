import { View, StyleSheet, TouchableOpacity, Image } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { colors, fonts, typography, spacing } from '../theme'
import { Button } from '../components/ui/Button'
import { Text } from '../components/ui/AppText'
import { useTranslation } from '../i18n/useTranslation'
import { useNavigation } from '../context/NavigationContext'

export function LandingScreen() {
  const { t, lang, toggleLanguage } = useTranslation()
  const { navigate } = useNavigation()

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#059669', '#047857', '#065f46']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.topBar}>
          <TouchableOpacity onPress={toggleLanguage} style={styles.langToggle} activeOpacity={0.7}>
            <Ionicons name="language-outline" size={18} color="#fff" />
            <Text style={styles.langText}>{lang === 'en' ? 'አማ' : 'EN'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.hero}>
          <Image source={require('../../assets/main-logo.png')} style={styles.mainLogo} />
          <Text style={styles.appName}>{t.app.name}</Text>
          <Text style={styles.tagline}>{t.app.tagline}</Text>
        </View>
      </LinearGradient>

      <View style={styles.body}>
        <Button
          title={lang === 'en' ? 'Sign In' : 'ይግቡ'}
          onPress={() => navigate('login')}
          fullWidth
          size="lg"
        />
        <TouchableOpacity onPress={() => navigate('signup')} activeOpacity={0.7} style={styles.signupLink}>
          <Text style={styles.signupText}>
            {lang === 'en' ? "Don't have an account? Create one" : 'መለያ የለዎትም? ይፍጠሩ'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  gradient: {
    flex: 1,
    paddingTop: 60,
    paddingBottom: 48,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
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
    fontSize: 13,
    fontWeight: '600',
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 20,
  },
  mainLogo: {
    width: 88,
    height: 88,
    resizeMode: 'contain',
    marginBottom: 16,
  },
  appName: {
    fontFamily: fonts.bold,
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.5,
  },
  tagline: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 48,
    gap: 16,
  },
  signupLink: {
    alignItems: 'center',
    padding: 8,
  },
  signupText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
})
