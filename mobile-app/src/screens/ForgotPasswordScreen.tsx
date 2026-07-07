import { useState } from 'react'
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  StatusBar,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { colors, fonts } from '../theme'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card } from '../components/ui/Card'
import { Text } from '../components/ui/AppText'
import { useTranslation } from '../i18n/useTranslation'
import { useNavigation } from '../context/NavigationContext'
import { useToast } from '../components/ui/Toast'

type Step = 'phone' | 'code' | 'reset'

export function ForgotPasswordScreen() {
  const { t, lang, toggleLanguage } = useTranslation()
  const { navigate } = useNavigation()
  const { showToast } = useToast()

  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [codeSent, setCodeSent] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const fp = t.forgotPassword

  function validatePhone() {
    const newErrors: Record<string, string> = {}
    if (!phone.trim()) {
      newErrors.phone = fp.errors.phoneRequired
    } else if (phone.trim().length < 10) {
      newErrors.phone = fp.errors.phoneInvalid
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function validateCode() {
    const newErrors: Record<string, string> = {}
    if (!code.trim()) {
      newErrors.code = fp.errors.codeRequired
    } else if (code.trim().length !== 4) {
      newErrors.code = fp.errors.codeInvalid
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function validateReset() {
    const newErrors: Record<string, string> = {}

    if (!newPassword) {
      newErrors.newPassword = fp.errors.passwordRequired
    } else if (newPassword.length < 6) {
      newErrors.newPassword = fp.errors.passwordMin
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = fp.errors.confirmRequired
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = fp.errors.passwordsMismatch
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSendCode() {
    if (!validatePhone()) {
      showToast('Please enter a valid phone number', 'error')
      return
    }
    setLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setLoading(false)
    setCodeSent(true)
    setStep('code')
    showToast(fp.codeSent, 'success')
  }

  async function handleVerifyCode() {
    if (!validateCode()) {
      showToast('Please enter a valid code', 'error')
      return
    }
    setStep('reset')
  }

  async function handleResetPassword() {
    if (!validateReset()) {
      showToast('Please fix the errors above', 'error')
      return
    }
    setLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setLoading(false)
    showToast('Password reset successfully!', 'success')
    navigate('login')
  }

  function getStepTitle() {
    return fp.title
  }

  function getStepSubtitle() {
    switch (step) {
      case 'phone': return fp.subtitle
      case 'code': return fp.codeSent
      case 'reset': return fp.resetSubtitle
    }
  }

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#059669', '#047857', '#065f46']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => navigate('login')}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={toggleLanguage}
            style={styles.langToggle}
            activeOpacity={0.7}
          >
            <Ionicons name="language-outline" size={18} color="#fff" />
            <Text style={styles.langText}>{lang === 'en' ? 'አማ' : 'EN'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.headerContent}>
          <View style={styles.iconCircle}>
            <Ionicons name="lock-open-outline" size={28} color="#059669" />
          </View>
          <Text style={styles.title}>{getStepTitle()}</Text>
          <Text style={styles.subtitle}>{getStepSubtitle()}</Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.formContainer}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={styles.centeredContent}>
          {/* Step indicators */}
          <View style={styles.stepsRow}>
            {(['phone', 'code', 'reset'] as Step[]).map((s, i) => (
              <View key={s} style={styles.stepItem}>
                <View
                  style={[
                    styles.stepDot,
                    step === s && styles.stepDotActive,
                    (step === 'code' || step === 'reset') && s === 'phone' && styles.stepDotDone,
                    step === 'reset' && s === 'code' && styles.stepDotDone,
                  ]}
                >
                  {(step === 'code' || step === 'reset') && s === 'phone' ? (
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  ) : step === 'reset' && s === 'code' ? (
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  ) : (
                    <Text style={[styles.stepNumber, step === s && styles.stepNumberActive]}>
                      {i + 1}
                    </Text>
                  )}
                </View>
                {i < 2 && (
                  <View
                    style={[
                      styles.stepLine,
                      (step === 'code' || step === 'reset') && i === 0 && styles.stepLineActive,
                      step === 'reset' && i === 1 && styles.stepLineActive,
                    ]}
                  />
                )}
              </View>
            ))}
          </View>

          <Card style={styles.card}>
            {step === 'phone' && (
              <View style={styles.form}>
                <Input
                  label={fp.phoneLabel}
                  placeholder={fp.phonePlaceholder}
                  value={phone}
                  onChangeText={(text) => {
                    setPhone(text)
                    if (errors.phone) setErrors({ ...errors, phone: '' })
                  }}
                  error={errors.phone}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  leftIcon={<Ionicons name="phone-portrait-outline" size={20} color={colors.mutedForeground} />}
                />

                <Button
                  title={fp.sendCode}
                  onPress={handleSendCode}
                  loading={loading}
                  fullWidth
                  size="lg"
                />
              </View>
            )}

            {step === 'code' && (
              <View style={styles.form}>
                <Input
                  label={fp.codeLabel}
                  placeholder={fp.codePlaceholder}
                  value={code}
                  onChangeText={(text) => {
                    setCode(text.replace(/[^0-9]/g, '').slice(0, 4))
                    if (errors.code) setErrors({ ...errors, code: '' })
                  }}
                  error={errors.code}
                  keyboardType="number-pad"
                  maxLength={4}
                  leftIcon={<Ionicons name="keypad-outline" size={20} color={colors.mutedForeground} />}
                />

                <Button
                  title={fp.verifyCode}
                  onPress={handleVerifyCode}
                  fullWidth
                  size="lg"
                />

                <TouchableOpacity onPress={handleSendCode} disabled={loading} activeOpacity={0.7}>
                  <Text style={styles.resendText}>{fp.resendCode}</Text>
                </TouchableOpacity>
              </View>
            )}

            {step === 'reset' && (
              <View style={styles.form}>
                <Input
                  label={fp.newPasswordLabel}
                  placeholder={fp.newPasswordPlaceholder}
                  value={newPassword}
                  onChangeText={(text) => {
                    setNewPassword(text)
                    if (errors.newPassword) setErrors({ ...errors, newPassword: '' })
                  }}
                  error={errors.newPassword}
                  secureTextEntry={!showNewPassword}
                  leftIcon={<Ionicons name="lock-closed-outline" size={20} color={colors.mutedForeground} />}
                  rightIcon={
                    <Ionicons
                      name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={colors.mutedForeground}
                    />
                  }
                  onRightIconPress={() => setShowNewPassword(!showNewPassword)}
                />

                <Input
                  label={fp.confirmPasswordLabel}
                  placeholder={fp.confirmPasswordPlaceholder}
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text)
                    if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' })
                  }}
                  error={errors.confirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  leftIcon={<Ionicons name="lock-closed-outline" size={20} color={colors.mutedForeground} />}
                  rightIcon={
                    <Ionicons
                      name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={colors.mutedForeground}
                    />
                  }
                  onRightIconPress={() => setShowConfirmPassword(!showConfirmPassword)}
                />

                <Button
                  title={fp.resetPassword}
                  onPress={handleResetPassword}
                  loading={loading}
                  fullWidth
                  size="lg"
                />
              </View>
            )}
          </Card>

          <TouchableOpacity
            style={styles.backRow}
            onPress={() => navigate('login')}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={16} color={colors.primary} />
            <Text style={styles.backText}>{fp.backToLogin}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerGradient: {
    paddingTop: (Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0) + 24,
    paddingBottom: 40,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
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
  headerContent: {
    alignItems: 'center',
    gap: 6,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
  },
  formContainer: {
    flex: 1,
  },
  centeredContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 48,
    justifyContent: 'center',
    gap: 24,
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 0,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: colors.primary,
  },
  stepDotDone: {
    backgroundColor: colors.primary,
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
  stepNumberActive: {
    color: '#fff',
  },
  stepLine: {
    width: 60,
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: 4,
  },
  stepLineActive: {
    backgroundColor: colors.primary,
  },
  card: {
    padding: 24,
  },
  form: {
    gap: 16,
  },
  resendText: {
    textAlign: 'center',
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  backText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
})
