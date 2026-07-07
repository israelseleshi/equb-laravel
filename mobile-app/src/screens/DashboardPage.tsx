import { useState } from 'react'
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing } from '../theme'
import { Text } from '../components/ui/AppText'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useAuth } from '../context/AuthContext'
import { useTranslation } from '../i18n/useTranslation'
import { useToast } from '../components/ui/Toast'
import { DashboardScreen } from './DashboardScreen'
import { AdminDashboardScreen } from './AdminDashboardScreen'

export function DashboardPage() {
  const { user, role, login: authLogin } = useAuth()
  const { t, lang } = useTranslation()
  const { showToast } = useToast()

  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ phone?: string; password?: string }>({})

  if (user && role) {
    if (role === 'admin') {
      return <AdminDashboardScreen />
    }
    return <DashboardScreen />
  }

  function validate() {
    const newErrors: { phone?: string; password?: string } = {}
    if (!phone.trim()) {
      newErrors.phone = lang === 'en' ? 'Phone is required' : 'ስልክ ያስፈልጋል'
    } else if (phone.trim().length < 10) {
      newErrors.phone = lang === 'en' ? 'Invalid phone number' : 'የስልክ ቁጥሩ ትክክል አይደለም'
    }
    if (!password) {
      newErrors.password = lang === 'en' ? 'Password is required' : 'የይለፍ ቃል ያስፈልጋል'
    } else if (password.length < 4) {
      newErrors.password = lang === 'en' ? 'Min 4 characters' : 'ቢያንስ 4 ቁምፊዎች'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleLogin() {
    if (!validate()) return
    setLoading(true)
    const result = await authLogin(phone.trim(), password)
    setLoading(false)
    if (result.success) {
      showToast(
        result.role === 'admin'
          ? (lang === 'en' ? 'Welcome Admin!' : 'እንኳን ደህና መጡ አስተዳዳሪ!')
          : (lang === 'en' ? 'Welcome back!' : 'እንኳን ደህና መጡ!'),
        'success',
      )
    } else {
      showToast(result.error || (lang === 'en' ? 'Invalid credentials' : 'የተሳሳተ መረጃ'), 'error')
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.root}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.heroSection}>
          <View style={styles.heroIcon}>
            <Ionicons name="shield-checkmark-outline" size={40} color="#fff" />
          </View>
          <Text style={styles.heroTitle}>
            {lang === 'en' ? 'Member Dashboard' : 'የአባላት ዳሽቦርድ'}
          </Text>
          <Text style={styles.heroSubtitle}>
            {lang === 'en'
              ? 'Sign in to track your savings, slots, and winnings'
              : 'ቁጠባዎችዎን፣ ቦታዎችዎን እና አሸናፊነቶችዎን ለመከታተል ይግቡ'}
          </Text>
        </View>

        <Card style={styles.loginCard}>
          <View style={styles.loginHeader}>
            <View style={styles.loginIconWrap}>
              <Ionicons name="lock-closed" size={24} color={colors.primary} />
            </View>
            <Text style={styles.loginTitle}>
              {lang === 'en' ? 'Sign In' : 'ይግቡ'}
            </Text>
          </View>

          <View style={styles.form}>
            <Input
              label={lang === 'en' ? 'Phone Number' : 'ስልክ ቁጥር'}
              placeholder={lang === 'en' ? 'Enter your phone' : 'ስልክ ቁጥርዎን ያስገቡ'}
              value={phone}
              onChangeText={(text) => {
                setPhone(text)
                if (errors.phone) setErrors({ ...errors, phone: undefined })
              }}
              error={errors.phone}
              keyboardType="phone-pad"
              autoCapitalize="none"
              leftIcon={
                <Ionicons name="phone-portrait-outline" size={20} color={colors.mutedForeground} />
              }
            />

            <Input
              label={lang === 'en' ? 'Password' : 'የይለፍ ቃል'}
              placeholder={lang === 'en' ? 'Enter your password' : 'የይለፍ ቃልዎን ያስገቡ'}
              value={password}
              onChangeText={(text) => {
                setPassword(text)
                if (errors.password) setErrors({ ...errors, password: undefined })
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

            <Button
              title={lang === 'en' ? 'Sign In' : 'ይግቡ'}
              onPress={handleLogin}
              loading={loading}
              fullWidth
              size="lg"
            />

            <TouchableOpacity
              onPress={() => {
                setPhone('')
                setPassword('')
                setErrors({})
              }}
              style={styles.resetBtn}
            >
              <Text style={styles.resetBtnText}>
                {lang === 'en' ? 'Clear fields' : 'ማጽዳት'}
              </Text>
            </TouchableOpacity>
          </View>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: spacing['6xl'],
  },
  heroSection: {
    backgroundColor: colors.primary,
    paddingVertical: spacing['3xl'],
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  loginCard: {
    marginHorizontal: spacing.xl,
    marginTop: -24,
    gap: spacing.xl,
  },
  loginHeader: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  loginIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E6F4EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.foreground,
  },
  form: {
    gap: spacing.lg,
  },
  resetBtn: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  resetBtnText: {
    fontSize: 13,
    color: colors.mutedForeground,
  },
})
