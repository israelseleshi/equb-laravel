import { useState, useCallback, useEffect } from 'react'
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Modal,
  Image,
  TextInput as RNTextInput,
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
import { getSettings, updateSettings } from '../services/storage'
import { setServerHost } from '../services/api'

export function LoginScreen() {
  const { t, lang, toggleLanguage, fonts } = useTranslation()
  const { navigate } = useNavigation()
  const { showToast } = useToast()
  const { login: authLogin } = useAuth()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ phone?: string; password?: string }>(
    {}
  )
  const [showServerConfig, setShowServerConfig] = useState(false)
  const [serverHostInput, setServerHostInput] = useState('')
  const [savingServer, setSavingServer] = useState(false)

  useEffect(() => {
    getSettings().then(s => { if (s.serverHost) setServerHostInput(s.serverHost) })
  }, [])

  /* ─── End Animations ─── */

  const login = t.login

  function validate() {
    const newErrors: { phone?: string; password?: string } = {}

    if (!phone.trim()) {
      newErrors.phone = login.errors.phoneRequired
    } else if (phone.trim().length < 10) {
      newErrors.phone = login.errors.phoneInvalid
    }

    if (!password) {
      newErrors.password = login.errors.passwordRequired
    } else if (password.length < 4) {
      newErrors.password = login.errors.passwordMin
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleLogin() {
    if (!validate()) {
      showToast('Please fix the errors above', 'error')
      return
    }
    setLoading(true)
    const result = await authLogin(phone.trim(), password)
    setLoading(false)

    if (result.success) {
      showToast(result.role === 'admin' ? 'Welcome Admin!' : 'Welcome back!', 'success')
      if (result.role === 'admin') {
        navigate('authGate')
      } else {
        navigate('dashboard')
      }
    } else {
      const isConnError = result.error?.toLowerCase().includes('cannot connect') || result.error?.toLowerCase().includes('cannot reach')
      if (isConnError) setShowServerConfig(true)
      showToast(result.error || 'Invalid credentials', 'error')
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
          <Text style={styles.appName}>{t.app.name}</Text>
          <Text style={styles.tagline}>{t.app.tagline}</Text>
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
                <Text style={styles.welcomeBack}>{login.title}</Text>
                <Text style={styles.subtitle}>{login.subtitle}</Text>

                <View style={styles.form}>
                  <Input
                      label={login.phoneLabel}
                      placeholder={login.phonePlaceholder}
                      value={phone}
                      onChangeText={(text) => {
                        setPhone(text)
                        if (errors.phone) setErrors({ ...errors, phone: undefined })
                      }}
                      error={errors.phone}
                      keyboardType="phone-pad"
                      autoCapitalize="none"
                      leftIcon={
                        <Ionicons
                          name="phone-portrait-outline"
                          size={20}
                          color={colors.mutedForeground}
                        />
                      }
                    />

                    <Input
                      label={login.passwordLabel}
                      placeholder={login.passwordPlaceholder}
                      value={password}
                      onChangeText={(text) => {
                        setPassword(text)
                        if (errors.password)
                          setErrors({ ...errors, password: undefined })
                      }}
                      error={errors.password}
                      secureTextEntry={!showPassword}
                      leftIcon={
                        <Ionicons
                          name="lock-closed-outline"
                          size={20}
                          color={colors.mutedForeground}
                        />
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

                  <View style={styles.row}>
                    <TouchableOpacity
                      style={styles.checkboxRow}
                      onPress={() => setRememberMe(!rememberMe)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                        {rememberMe && <Ionicons name="checkmark" size={14} color="#fff" />}
                      </View>
                      <Text style={styles.rememberText}>{login.rememberMe}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity activeOpacity={0.7} onPress={() => navigate('forgotPassword')}>
                      <Text style={styles.forgotPassword}>{login.forgotPassword}</Text>
                    </TouchableOpacity>
                  </View>

                  <Button
                    title={login.signIn}
                    onPress={handleLogin}
                    loading={loading}
                    fullWidth
                    size="lg"
                  />
                </View>

                <View style={styles.signupRow}>
                  <Text style={styles.signupText}>{login.noAccount} </Text>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => navigate('signup')}
                  >
                    <Text style={styles.signupLink}>{login.createAccount}</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity activeOpacity={0.7} onPress={() => { getSettings().then(s => setServerHostInput(s.serverHost || '')); setShowServerConfig(true) }} style={styles.serverBtn}>
                  <Ionicons name="server-outline" size={14} color={colors.mutedForeground} />
                  <Text style={styles.serverBtnText}>{lang === 'en' ? 'Server' : 'ሰርቨር'}</Text>
                </TouchableOpacity>
              </Card>
        </ScrollView>
      </KeyboardAvoidingView>
      {/* Server Config Modal */}
      <Modal visible={showServerConfig} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="server-outline" size={40} color={colors.primary} />
            </View>
            <Text style={styles.modalTitle}>
              {lang === 'en' ? 'Server IP Address' : 'የሰርቨር አድራሻ'}
            </Text>
            <Text style={[styles.modalDesc, { fontSize: 13 }]}>
              {lang === 'en'
                ? 'Enter your computer\'s local IP address (e.g. 192.168.1.100). Find it by running "ipconfig" on Windows or "ifconfig" on Mac.'
                : 'የኮምፒውተርዎን የአይፒ አድራሻ ያስገቡ (ለምሳሌ 192.168.1.100)።'}
            </Text>
            <View style={styles.serverInputRow}>
              <RNTextInput
                style={styles.serverInput}
                value={serverHostInput}
                onChangeText={setServerHostInput}
                placeholder="192.168.1.100"
                placeholderTextColor="#94a3b8"
                keyboardType="decimal-pad"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <Button
              title={lang === 'en' ? 'Save' : 'አስቀምጥ'}
              onPress={async () => {
                if (!serverHostInput.trim()) return
                setSavingServer(true)
                await updateSettings({ serverHost: serverHostInput.trim() })
                setServerHost(serverHostInput.trim())
                setSavingServer(false)
                setShowServerConfig(false)
                showToast(lang === 'en' ? 'Server IP saved!' : 'የሰርቨር አድራሻ ተቀምጧል!', 'success')
              }}
              loading={savingServer}
              fullWidth
              size="lg"
            />
            <TouchableOpacity onPress={() => setShowServerConfig(false)} activeOpacity={0.7} style={styles.modalSkip}>
              <Text style={styles.modalSkipText}>{lang === 'en' ? 'Cancel' : 'ሰርዝ'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    marginBottom: 8,
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
    width: 72,
    height: 72,
    resizeMode: 'contain',
    marginBottom: 4,
  },
  appName: {
    fontFamily: fonts.bold,
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.5,
  },
  tagline: {
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
    gap: 24,
  },
  welcomeBack: {
    fontFamily: fonts.semiBold,
    fontSize: 24,
    fontWeight: '600',
    color: colors.foreground,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginTop: -12,
  },

  form: {
    gap: 20,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  rememberText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.foreground,
  },
  forgotPassword: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },

  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  signupText: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.mutedForeground,
  },
  signupLink: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: colors.primary,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  modalCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    gap: 16,
  },
  modalIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E6F4EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 20,
    fontWeight: '600',
    color: colors.foreground,
    textAlign: 'center',
  },
  modalDesc: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalSkip: {
    padding: 8,
  },
  modalSkipText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.mutedForeground,
  },
  serverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    padding: 8,
  },
  serverBtnText: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.mutedForeground,
  },
  serverInputRow: {
    width: '100%',
    marginBottom: 16,
  },
  serverInput: {
    backgroundColor: colors.muted,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.foreground,
    textAlign: 'center',
  },
})
