import { useState, useEffect, useCallback } from 'react'
import { View, StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as LocalAuthentication from 'expo-local-authentication'
import { colors, spacing, typography } from '../theme'
import { useTranslation } from '../i18n/useTranslation'
import { useNavigation } from '../context/NavigationContext'
import { useAuth } from '../context/AuthContext'
import { updateSettings } from '../services/storage'
import { Text } from '../components/ui/AppText'
import { Button } from '../components/ui/Button'

export function BiometricSetupScreen() {
  const { lang } = useTranslation()
  const { navigate } = useNavigation()
  const { logout } = useAuth()
  const [hasHardware, setHasHardware] = useState<boolean | null>(null)
  const [isEnrolled, setIsEnrolled] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const hardware = await LocalAuthentication.hasHardwareAsync()
      setHasHardware(hardware)
      if (hardware) {
        const enrolled = await LocalAuthentication.isEnrolledAsync()
        setIsEnrolled(enrolled)
      }
    })()
  }, [])

  const handleEnroll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: lang === 'en' ? 'Register your fingerprint for 2FA' : 'ለ2FA የጣት አሻራዎን ያስመዝግቡ',
        cancelLabel: lang === 'en' ? 'Cancel' : 'ሰርዝ',
        disableDeviceFallback: false,
      })
      if (result.success) {
        await updateSettings({ biometricEnabled: true })
        navigate('admin')
      } else if (result.error === 'user_cancel') {
        setError(null)
      } else {
        setError(lang === 'en' ? 'Authentication failed. Please try again.' : 'ማረጋገጥ አልተሳካም። እባክዎ እንደገና ይሞክሩ።')
      }
    } catch {
      setError(lang === 'en' ? 'Something went wrong' : 'ስህተት ተከስቷል')
    } finally {
      setLoading(false)
    }
  }, [lang, navigate])

  const handleSkip = useCallback(async () => {
    await updateSettings({ biometricEnabled: false })
    navigate('admin')
  }, [navigate])

  const handleLogout = useCallback(async () => {
    await logout()
    navigate('landing')
  }, [logout, navigate])

  if (hasHardware === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>
          {lang === 'en' ? 'Loading...' : 'በመጫን ላይ...'}
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons
            name={hasHardware ? 'finger-print' : 'alert-circle-outline'}
            size={72}
            color={hasHardware ? colors.primary : colors.mutedForeground}
          />
        </View>

        <Text style={styles.title}>
          {lang === 'en' ? 'Fingerprint 2FA Setup' : 'የጣት አሻራ 2FA ማዋቀር'}
        </Text>

        <Text style={styles.subtitle}>
          {!hasHardware
            ? (lang === 'en'
                ? 'Your device does not support fingerprint authentication.'
                : 'መሣሪያዎ የጣት አሻራ ማረጋገጫ አይደግፍም።')
            : !isEnrolled
              ? (lang === 'en'
                  ? 'No fingerprints found on this device. Please add one in your device settings first, then come back.'
                  : 'በዚህ መሣሪያ ላይ የጣት አሻራ አልተገኘም። እባክዎ በመሣሪያ ቅንብሮች ውስጥ አንድ ያክሉ፣ ከዚያ ይመለሱ።')
              : (lang === 'en'
                  ? 'Tap the button below to register your fingerprint as a second authentication factor. You will be prompted to scan your fingerprint.'
                  : 'ከዚህ በታች ያለውን አዝራር ይንኩ የጣት አሻራዎን እንደ ሁለተኛ የማረጋገጫ ዘዴ ለመመዝገብ። የጣት አሻራዎን እንዲቃኙ ይጠየቃሉ።')}
        </Text>

        {error && <Text style={styles.error}>{error}</Text>}

        {hasHardware && isEnrolled && (
          <Button
            title={lang === 'en' ? 'Register Fingerprint' : 'የጣት አሻራ ያስመዝግቡ'}
            onPress={handleEnroll}
            loading={loading}
            fullWidth
            size="lg"
          />
        )}

        {!hasHardware || !isEnrolled ? (
          <Button
            title={lang === 'en' ? 'Continue without Fingerprint' : 'ያለ የጣት አሻራ ይቀጥሉ'}
            onPress={handleSkip}
            variant="outline"
            fullWidth
            size="lg"
          />
        ) : (
          <TouchableOpacity onPress={handleSkip} activeOpacity={0.7} style={styles.skipLink}>
            <Text style={styles.skipText}>
              {lang === 'en' ? 'Skip for now' : 'አሁን ዝለል'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn} activeOpacity={0.7}>
        <Ionicons name="log-out-outline" size={20} color={colors.destructive} />
        <Text style={styles.logoutText}>
          {lang === 'en' ? 'Logout' : 'ውጣ'}
        </Text>
      </TouchableOpacity>
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
  iconContainer: {
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
  error: {
    ...typography.bodySmall,
    color: colors.destructive,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  skipLink: {
    marginTop: spacing.lg,
    padding: spacing.sm,
  },
  skipText: {
    ...typography.bodySmall,
    color: colors.mutedForeground,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
  },
  logoutText: {
    ...typography.bodySmall,
    color: colors.destructive,
  },
})
