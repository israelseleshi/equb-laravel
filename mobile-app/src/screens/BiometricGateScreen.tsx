import { useEffect, useState, useCallback } from 'react'
import { View, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as LocalAuthentication from 'expo-local-authentication'
import { colors, typography, spacing } from '../theme'
import { Text } from '../components/ui/AppText'
import { Button } from '../components/ui/Button'
import { useNavigation } from '../context/NavigationContext'
import { useAuth } from '../context/AuthContext'
import { useTranslation } from '../i18n/useTranslation'

export function BiometricGateScreen() {
  const { lang } = useTranslation()
  const { navigate } = useNavigation()
  const { logout } = useAuth()
  const [state, setState] = useState<'checking' | 'ready' | 'error'>('checking')
  const [errorMsg, setErrorMsg] = useState('')

  const attemptAuth = useCallback(async () => {
    setState('checking')
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: lang === 'en' ? 'Login with fingerprint' : 'በጣት አሻራ ይግቡ',
        cancelLabel: lang === 'en' ? 'Cancel' : 'ሰርዝ',
        disableDeviceFallback: false,
      })
      if (result.success) {
        navigate('dashboard')
      } else if (result.error === 'user_cancel') {
        setState('ready')
      } else {
        setState('error')
        setErrorMsg(lang === 'en' ? 'Authentication failed' : 'ማረጋገጥ አልተሳካም')
      }
    } catch {
      setState('error')
      setErrorMsg(lang === 'en' ? 'Something went wrong' : 'ስህተት ተከስቷል')
    }
  }, [lang, navigate])

  useEffect(() => {
    attemptAuth()
  }, [])

  const handleLogout = useCallback(async () => {
    await logout()
    navigate('landing')
  }, [logout, navigate])

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons
            name={state === 'error' ? 'alert-circle-outline' : 'finger-print'}
            size={72}
            color={state === 'error' ? colors.destructive : colors.primary}
          />
        </View>

        <Text style={styles.title}>
          {state === 'checking'
            ? (lang === 'en' ? 'Checking...' : 'በመፈተሽ ላይ...')
            : state === 'error'
              ? (lang === 'en' ? 'Fingerprint Failed' : 'የጣት አሻራ አልተሳካም')
              : (lang === 'en' ? 'Fingerprint Login' : 'የጣት አሻራ መግቢያ')}
        </Text>

        <Text style={styles.subtitle}>
          {state === 'checking'
            ? (lang === 'en' ? 'Scan your fingerprint to continue' : 'ለመቀጠል የጣት አሻራዎን ያስገቡ')
            : state === 'error'
              ? errorMsg
              : (lang === 'en' ? 'Tap the button below to scan your fingerprint' : 'ከዚህ በታች ያለውን አዝራር ይንኩ የጣት አሻራዎን ለማስገባት')}
        </Text>

        {state !== 'checking' && (
          <Button
            title={lang === 'en' ? 'Try Again' : 'እንደገና ይሞክሩ'}
            onPress={attemptAuth}
            fullWidth
            size="lg"
          />
        )}
      </View>

      <View style={styles.bottom}>
        <Button
          title={lang === 'en' ? 'Use Password Instead' : 'በይለፍ ቃል ይግቡ'}
          onPress={handleLogout}
          variant="ghost"
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    paddingHorizontal: spacing['3xl'],
  },
  content: {
    alignItems: 'center',
  },
  iconWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing['2xl'],
  },
  title: {
    ...typography.h3,
    color: colors.foreground,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  subtitle: {
    ...typography.body,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginBottom: spacing['2xl'],
    lineHeight: 22,
  },
  bottom: {
    position: 'absolute',
    bottom: 40,
    left: spacing['3xl'],
    right: spacing['3xl'],
  },
})
