import { useState } from 'react'
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
  ActivityIndicator,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { colors, fonts } from '../theme'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Text } from '../components/ui/AppText'
import { Card } from '../components/ui/Card'
import { useTranslation } from '../i18n/useTranslation'
import { useNavigation } from '../context/NavigationContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/ui/Toast'
import { api } from '../services/api'

export function SignupScreen() {
  const { t, lang, toggleLanguage } = useTranslation()
  const { navigate } = useNavigation()
  const { register } = useAuth()
  const { showToast } = useToast()

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [agreeToTerms, setAgreeToTerms] = useState(false)
  const [promoCode, setPromoCode] = useState('')
  const [promoValid, setPromoValid] = useState<boolean | null>(null)
  const [promoValidating, setPromoValidating] = useState(false)
  const [promoBrokerName, setPromoBrokerName] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const signup = t.signup

  function validate() {
    const newErrors: Record<string, string> = {}

    if (!fullName.trim()) {
      newErrors.fullName = signup.errors.nameRequired
    }

    if (!phone.trim()) {
      newErrors.phone = signup.errors.phoneRequired
    } else if (phone.trim().length < 10) {
      newErrors.phone = signup.errors.phoneInvalid
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = signup.errors.emailInvalid
    }

    if (!password) {
      newErrors.password = signup.errors.passwordRequired
    } else if (password.length < 4) {
      newErrors.password = signup.errors.passwordMin
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = signup.errors.passwordsMismatch
    }

    if (!agreeToTerms) {
      newErrors.agreeToTerms = signup.errors.acceptTerms
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSignup() {
    if (!validate()) return
    setLoading(true)
    const result = await register({
      name: fullName.trim(),
      phone: phone.trim(),
      password,
      category: '500',
      ...(promoCode.trim() ? { promo_code: promoCode.trim() } : {}),
    })
    setLoading(false)

    if (result.success) {
      navigate('onboarding')
    } else {
      showToast(result.error || 'Registration failed', 'error')
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
          <Image source={require('../../assets/main-logo.png')} style={styles.mainLogo} />
          <Text style={styles.title}>{signup.title}</Text>
          <Text style={styles.subtitle}>{signup.subtitle}</Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.formContainer}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Card style={styles.card}>
            <View style={styles.form}>
              <Input
                label={signup.fullNameLabel}
                placeholder={signup.fullNamePlaceholder}
                value={fullName}
                onChangeText={(text) => {
                  setFullName(text)
                  if (errors.fullName) setErrors({ ...errors, fullName: '' })
                }}
                error={errors.fullName}
                autoCapitalize="words"
                leftIcon={
                  <Ionicons name="person-outline" size={20} color={colors.mutedForeground} />
                }
              />

              <Input
                label={signup.phoneLabel}
                placeholder={signup.phonePlaceholder}
                value={phone}
                onChangeText={(text) => {
                  setPhone(text)
                  if (errors.phone) setErrors({ ...errors, phone: '' })
                }}
                error={errors.phone}
                keyboardType="phone-pad"
                autoCapitalize="none"
                leftIcon={
                  <Ionicons name="phone-portrait-outline" size={20} color={colors.mutedForeground} />
                }
              />

              <Input
                label={signup.emailLabel}
                placeholder={signup.emailPlaceholder}
                value={email}
                onChangeText={(text) => {
                  setEmail(text)
                  if (errors.email) setErrors({ ...errors, email: '' })
                }}
                error={errors.email}
                keyboardType="email-address"
                autoCapitalize="none"
                leftIcon={
                  <Ionicons name="mail-outline" size={20} color={colors.mutedForeground} />
                }
              />

              <Input
                label={signup.passwordLabel}
                placeholder={signup.passwordPlaceholder}
                value={password}
                onChangeText={(text) => {
                  setPassword(text)
                  if (errors.password) setErrors({ ...errors, password: '' })
                }}
                error={errors.password}
                secureTextEntry={!showPassword}
                leftIcon={
                  <Ionicons name="lock-closed-outline" size={20} color={colors.mutedForeground} />
                }
                rightIcon={
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.mutedForeground}
                  />
                }
                onRightIconPress={() => setShowPassword(!showPassword)}
              />

              <Input
                label={signup.confirmPasswordLabel}
                placeholder={signup.confirmPasswordPlaceholder}
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text)
                  if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' })
                }}
                error={errors.confirmPassword}
                secureTextEntry={!showConfirmPassword}
                leftIcon={
                  <Ionicons name="lock-closed-outline" size={20} color={colors.mutedForeground} />
                }
                rightIcon={
                  <Ionicons
                    name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.mutedForeground}
                  />
                }
                onRightIconPress={() => setShowConfirmPassword(!showConfirmPassword)}
              />

              {/* Optional Promo Code */}
              <View>
                <Input
                  label={lang === 'am' ? 'የፕሮሞ ኮድ (አማራጭ)' : 'Promo Code (optional)'}
                  placeholder={'PROMO-XXXXXXXX'}
                  value={promoCode}
                  onChangeText={async (text) => {
                    setPromoCode(text.toUpperCase())
                    setPromoValid(null)
                    setPromoBrokerName('')
                    if (text.trim().length >= 8) {
                      setPromoValidating(true)
                      try {
                        const res = await api.post<{ valid: boolean; promo_code?: { broker_name: string } }>('/promo/validate', { code: text.toUpperCase() })
                        setPromoValid(res.valid)
                        if (res.valid && res.promo_code) setPromoBrokerName(res.promo_code.broker_name)
                      } catch { setPromoValid(false) }
                      setPromoValidating(false)
                    }
                  }}
                  autoCapitalize="characters"
                  leftIcon={
                    <Ionicons name="gift-outline" size={20} color={colors.mutedForeground} />
                  }
                  rightIcon={
                    promoValidating ? (
                      <ActivityIndicator size="small" color={colors.mutedForeground} />
                    ) : promoValid === true ? (
                      <Ionicons name="checkmark-circle" size={20} color="#059669" />
                    ) : promoValid === false ? (
                      <Ionicons name="close-circle" size={20} color="#ef4444" />
                    ) : undefined
                  }
                />
                {promoBrokerName ? (
                  <Text style={{ fontSize: 11, color: '#059669', marginTop: -8, marginLeft: 4 }}>
                    {lang === 'am' ? `የ${promoBrokerName} የፕሮሞ ኮድ` : `Promo code by ${promoBrokerName}`}
                  </Text>
                ) : null}
              </View>

              <TouchableOpacity
                style={styles.termsRow}
                onPress={() => setAgreeToTerms(!agreeToTerms)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, agreeToTerms && styles.checkboxChecked]}>
                  {agreeToTerms && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
                <Text style={styles.termsText}>{signup.agreeToTerms}</Text>
              </TouchableOpacity>
              {(errors as any).agreeToTerms && (
                <Text style={styles.termsError}>{(errors as any).agreeToTerms}</Text>
              )}

              <Button
                title={signup.createAccount}
                onPress={handleSignup}
                loading={loading}
                fullWidth
                size="lg"
              />
            </View>
          </Card>

          <View style={styles.signinRow}>
            <Text style={styles.signinText}>{signup.haveAccount} </Text>
            <TouchableOpacity activeOpacity={0.7} onPress={() => navigate('login')}>
              <Text style={styles.signinLink}>{signup.signIn}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
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
  mainLogo: {
    width: 64,
    height: 64,
    resizeMode: 'contain',
    marginBottom: 4,
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
    marginTop: -24,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 48,
  },
  card: {
    padding: 24,
  },
  form: {
    gap: 16,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    color: colors.foreground,
    lineHeight: 18,
  },
  termsError: {
    fontSize: 12,
    color: colors.destructive,
    marginTop: -8,
  },
  signinRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
  },
  signinText: {
    fontSize: 14,
    color: colors.mutedForeground,
  },
  signinLink: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
})
