import { useState, useRef, useEffect, useCallback } from 'react'
import { View, StyleSheet, TouchableOpacity, Animated } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as LocalAuthentication from 'expo-local-authentication'
import { colors, spacing } from '../theme'
import { Text } from './ui/AppText'
import { useTranslation } from '../i18n/useTranslation'
import { getSettings } from '../services/storage'

const MAX_FAILED_ATTEMPTS = 3
const LOCKOUT_DURATION_SECONDS = 30
const CORRECT_PASSCODE = '123456'

interface AuthGateProps {
  onSuccess: () => void
  onCancel: () => void
  onEnrollBiometric: () => void
}

export function AuthGate({ onSuccess, onCancel, onEnrollBiometric }: AuthGateProps) {
  const { t, lang } = useTranslation()
  const [pin, setPin] = useState<string[]>(Array(6).fill(''))
  const [currentIndex, setCurrentIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [lockoutEnd, setLockoutEnd] = useState<number | null>(null)
  const [countdown, setCountdown] = useState(0)
  const shakeAnim = useRef(new Animated.Value(0)).current
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const loginT = t.login

  useEffect(() => {
    if (lockoutEnd === null) return
    const update = () => {
      const remaining = Math.max(0, Math.ceil((lockoutEnd - Date.now()) / 1000))
      setCountdown(remaining)
      if (remaining <= 0) {
        setFailedAttempts(0)
        setLockoutEnd(null)
        if (countdownRef.current) clearInterval(countdownRef.current)
      }
    }
    update()
    countdownRef.current = setInterval(update, 1000)
    return () => { if (countdownRef.current) clearInterval(countdownRef.current) }
  }, [lockoutEnd])

  const shake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start()
  }, [shakeAnim])

  const handlePasscodeSuccess = useCallback(async () => {
    try {
      const settings = await getSettings()
      if (settings.biometricEnabled) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: lang === 'en' ? 'Authenticate to unlock' : 'ለመክፈት ያረጋግጡ',
          cancelLabel: lang === 'en' ? 'Cancel' : 'ሰርዝ',
          disableDeviceFallback: false,
        })
        if (result.success) {
          onSuccess()
        }
      } else {
        onEnrollBiometric()
      }
    } catch {
      onEnrollBiometric()
    }
  }, [lang, onSuccess, onEnrollBiometric])

  const handleDigit = useCallback((digit: string) => {
    if (lockoutEnd !== null && Date.now() < lockoutEnd) return
    setError(null)

    const newPin = [...pin]
    if (currentIndex < 6) {
      newPin[currentIndex] = digit
      setPin(newPin)
      const nextIndex = currentIndex + 1
      setCurrentIndex(nextIndex)

      if (nextIndex === 6) {
        const entered = newPin.join('')
        if (entered === CORRECT_PASSCODE) {
          handlePasscodeSuccess()
        } else {
          const attempts = failedAttempts + 1
          setFailedAttempts(attempts)
          setError(lang === 'en' ? 'Incorrect passcode' : 'የማረጋገጫ ቁጥሩ ትክክል አይደለም')
          shake()
          setPin(Array(6).fill(''))
          setCurrentIndex(0)

          if (attempts >= MAX_FAILED_ATTEMPTS) {
            setLockoutEnd(Date.now() + LOCKOUT_DURATION_SECONDS * 1000)
          }
        }
      }
    }
  }, [pin, currentIndex, failedAttempts, lockoutEnd, handlePasscodeSuccess, lang, shake])

  const handleDelete = useCallback(() => {
    if (currentIndex > 0) {
      const newPin = [...pin]
      newPin[currentIndex - 1] = ''
      setPin(newPin)
      setCurrentIndex(currentIndex - 1)
      setError(null)
    }
  }, [pin, currentIndex])

  const isLockedOut = lockoutEnd !== null && Date.now() < lockoutEnd

  const digitRows = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['', '0', 'del'],
  ]

  const getButtonLabel = (d: string) => {
    if (d === 'del') return <Ionicons name="backspace-outline" size={24} color={colors.foreground} />
    return <Text style={styles.digitText}>{d}</Text>
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={24} color={colors.mutedForeground} />
        </TouchableOpacity>
        <Text style={styles.title}>
          {lang === 'en' ? 'Enter Passcode' : 'የማረጋገጫ ቁጥር ያስገቡ'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <Text style={styles.subtitle}>
        {isLockedOut
          ? (lang === 'en'
              ? `Too many attempts. Try again in ${countdown}s`
              : `በጣም ብዙ ሙከራ። በ${countdown}ሰከንድ ውስጥ እንደገና ይሞክሩ`)
          : (lang === 'en' ? 'Enter your 6-digit passcode to continue' : 'ለመቀጠል ባለ 6-አሃዝ የማረጋገጫ ቁጥር ያስገቡ')}
      </Text>

      {error && (
        <Text style={styles.error}>{error}</Text>
      )}

      <Animated.View style={[styles.dotsRow, { transform: [{ translateX: shakeAnim }] }]}>
        {pin.map((d, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              d ? styles.dotFilled : styles.dotEmpty,
              i === currentIndex && currentIndex < 6 && !isLockedOut && styles.dotActive,
            ]}
          >
            {d ? <View style={styles.dotInner} /> : null}
          </View>
        ))}
      </Animated.View>

      <View style={styles.keypad}>
        {digitRows.map((row, ri) => (
          <View key={ri} style={styles.keypadRow}>
            {row.map((d) => {
              if (d === '') {
                return <View key={`empty-${ri}`} style={styles.keypadBtn} />
              }
              if (d === 'del') {
                return (
                  <TouchableOpacity
                    key={d}
                    style={styles.keypadBtn}
                    onPress={handleDelete}
                    disabled={currentIndex === 0 || isLockedOut}
                  >
                    {getButtonLabel(d)}
                  </TouchableOpacity>
                )
              }
              return (
                <TouchableOpacity
                  key={d}
                  style={styles.keypadBtn}
                  onPress={() => handleDigit(d)}
                  disabled={isLockedOut || currentIndex >= 6}
                >
                  {getButtonLabel(d)}
                </TouchableOpacity>
              )
            })}
          </View>
        ))}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.foreground,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginBottom: spacing['2xl'],
    lineHeight: 20,
  },
  error: {
    fontSize: 13,
    color: colors.destructive,
    textAlign: 'center',
    marginBottom: spacing.lg,
    fontWeight: '500',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    marginBottom: spacing['5xl'],
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotEmpty: {
    backgroundColor: colors.muted,
  },
  dotFilled: {
    backgroundColor: colors.primaryLight,
  },
  dotActive: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  dotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  keypad: {
    gap: spacing.md,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  keypadBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  digitText: {
    fontSize: 28,
    fontWeight: '600',
    color: colors.foreground,
  },
})
