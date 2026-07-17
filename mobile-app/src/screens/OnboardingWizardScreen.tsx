import { useState, useRef, useEffect } from 'react'
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  TextInput as RNTextInput,
  Animated,
  Modal,
  ActivityIndicator,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import { colors, spacing } from '../theme'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card } from '../components/ui/Card'
import { Text } from '../components/ui/AppText'
import { SignaturePad } from '../components/SignaturePad'
import { useNavigation } from '../context/NavigationContext'
import { useTranslation } from '../i18n/useTranslation'
import { useToast } from '../components/ui/Toast'
import { legalTerms } from '../data/legalTerms'

const CATEGORIES = [
  { id: '100', label: '100 ETB', daily: '100 ETB', target: '50 slots', color: '#a855f7' },
  { id: '500', label: '500 ETB', daily: '500 ETB', target: '600 slots', color: '#059669' },
  { id: '1000', label: '1,000 ETB', daily: '1,000 ETB', target: '500 slots', color: '#2563eb' },
  { id: '2000', label: '2,000 ETB', daily: '2,000 ETB', target: '400 slots', color: '#d97706' },
  { id: 'savings', label: 'Savings', daily: 'Flexible', target: 'No limit', color: '#7c3aed' },
]

const STEP_LABELS_EN = ['Welcome', 'Verify ID', 'Create Account', 'Agreement', 'Payment']
const STEP_LABELS_AM = ['እንኳን ደህና መጡ', 'ማረጋገጫ', 'መለያ ይፍጠሩ', 'ውል', 'ክፍያ']

function getCategoryInfo(category: string) {
  if (category === '2000') return {
    code: 'big_seller',
    labelEn: 'Big Seller / Merchant',
    labelAm: 'ትልቅ ነጋዴ',
    penaltyEn: 'For any breach of this agreement, I acknowledge that my TRADE LICENSE shall be revoked and I will be prohibited from engaging in any commercial activities within the jurisdiction of this Equb circle.',
    penaltyAm: 'ይህን ስምምነት በማፍረሴ የንግድ ፍቃዴ እንደሚሰረዝ እና በዚህ እቁብ ክበብ ውስጥ ማንኛውንም የንግድ እንቅስቃሴ እንደማላደርግ እቀበላለሁ።',
    licenseType: 'Trade License (የንግድ ፍቃድ)',
  }
  if (category === '1000') return {
    code: 'transport_driver',
    labelEn: 'Local Transport Driver',
    labelAm: 'የአካባቢ ትራንስፖርት አሽከርካሪ',
    penaltyEn: 'For any breach of this agreement, I acknowledge that my DRIVING LICENSE shall be immediately suspended and I will be prohibited from operating any transport vehicle within the routes governed by this Equb circle.',
    penaltyAm: 'ይህን ስምምነት በማፍረሴ የመንጃ ፍቃዴ ወዲያውኑ እንደሚታገድ እና በዚህ እቁብ ክበብ ቁጥጥር ስር ማንኛውንም የትራንስፖርት ተሽከርካሪ እንደማላሽከረክር እቀበላለሁ።',
    licenseType: 'Driving License (የመንጃ ፍቃድ)',
  }
  return {
    code: 'gov_worker',
    labelEn: 'Government Office Worker',
    labelAm: 'የመንግስት ቢሮ ሰራተኛ',
    penaltyEn: 'For any breach of this agreement, I acknowledge that my FULL MONTHLY SALARY shall be garnished and deducted by my employing government office until all outstanding obligations to this Equb circle are fully settled.',
    penaltyAm: 'ይህን ስምምነት በማፍረሴ ሙሉ ወርሃዊ ደሞዜ ከመንግስት ደሞዝ እንደሚቆረጥ እና በዚህ እቁብ ክበብ ያለብኝን ዕዳ እስከምከፍል ድረስ ደሞዜ እንደሚታገድ እቀበላለሁ።',
    licenseType: 'Government Salary (የመንግስት ደሞዝ)',
  }
}

export function OnboardingWizardScreen() {
  const { navigate } = useNavigation()
  const { t, lang, toggleLanguage } = useTranslation()
  const { showToast } = useToast()
  const onboarding = t.onboarding
  const steps = lang === 'en' ? STEP_LABELS_EN : STEP_LABELS_AM

  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [agreeToTerms, setAgreeToTerms] = useState(false)
  const [signatureData, setSignatureData] = useState<string | null>(null)
  const [showUssd, setShowUssd] = useState(false)
  const [ussdStep, setUssdStep] = useState<'dial' | 'password' | 'processing' | 'success'>('dial')
  const [ussdPin, setUssdPin] = useState('')
  const [ussdError, setUssdError] = useState('')
  const [pdfLoading, setPdfLoading] = useState(false)

  const [formData, setFormData] = useState({
    faydaId: '',
    otp: '',
    fullName: '',
    phone: '',
    password: '',
    confirmPassword: '',
    workAddress: '',
    category: '',
    dailySavings: '',
  })

  const headerOpacity = useRef(new Animated.Value(0)).current
  const headerTranslate = useRef(new Animated.Value(-30)).current
  const iconScale = useRef(new Animated.Value(0)).current
  const iconPulse = useRef(new Animated.Value(1)).current
  const cardOpacity = useRef(new Animated.Value(0)).current
  const cardTranslate = useRef(new Animated.Value(30)).current
  const shakeAnim = useRef(new Animated.Value(0)).current
  const progressAnim = useRef(new Animated.Value(0)).current
  const faydaOtpRef = useRef<RNTextInput>(null)
  const scrollRef = useRef<ScrollView>(null)

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(headerTranslate, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start()

    Animated.spring(iconScale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }).start()

    Animated.loop(
      Animated.sequence([
        Animated.timing(iconPulse, { toValue: 1.08, duration: 1000, useNativeDriver: true }),
        Animated.timing(iconPulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start()

    Animated.parallel([
      Animated.timing(cardOpacity, { toValue: 1, duration: 500, delay: 200, useNativeDriver: true }),
      Animated.timing(cardTranslate, { toValue: 0, duration: 500, delay: 200, useNativeDriver: true }),
    ]).start()
  }, [])

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: (step) / 4,
      duration: 300,
      useNativeDriver: false,
    }).start()
    scrollRef.current?.scrollTo({ y: 0, animated: true })
  }, [step])

  function shakeError() {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start()
  }

  function updateField(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  function validateStep(): boolean {
    const newErrors: Record<string, string> = {}

    switch (step) {
      case 1:
        if (!formData.faydaId.trim() || formData.faydaId.length !== 12) {
          newErrors.faydaId = lang === 'en' ? 'Enter a valid 12-digit Fayda ID' : 'ባለ 12 አሃዝ ፋይዳ መለያ ያስገቡ'
        }
        if (formData.otp.length !== 4) {
          newErrors.otp = lang === 'en' ? 'Enter the 4-digit OTP code' : 'ባለ 4 አሃዝ ኮዱን ያስገቡ'
        }
        break
      case 2:
        if (!formData.fullName.trim()) {
          newErrors.fullName = lang === 'en' ? 'Full name is required' : 'ሙሉ ስም ያስፈልጋል'
        }
        if (!formData.phone.trim() || formData.phone.length < 9) {
          newErrors.phone = lang === 'en' ? 'Enter a valid phone number' : 'የሚሰራ ስልክ ቁጥር ያስገቡ'
        }
        if (!formData.password.trim() || formData.password.length < 6) {
          newErrors.password = lang === 'en' ? 'Password must be at least 6 characters' : 'የይለፍ ቃል ቢያንስ 6 ቁምፊዎች መሆን አለበት'
        }
        if (formData.password !== formData.confirmPassword) {
          newErrors.confirmPassword = lang === 'en' ? 'Passwords do not match' : 'የይለፍ ቃላቱ አይዛመዱም'
        }
        if (!formData.workAddress.trim()) {
          newErrors.workAddress = lang === 'en' ? 'Work address is required' : 'የስራ አድራሻ ያስፈልጋል'
        }
        if (!formData.category) {
          newErrors.category = lang === 'en' ? 'Select a savings category' : 'የቁጠባ ምድብ ይምረጡ'
        }
        break
      case 3:
        if (!agreeToTerms) {
          newErrors.agreeToTerms = lang === 'en' ? 'You must agree to the terms' : 'ውሎቹን መስማማት አለብዎት'
        }
        if (!signatureData) {
          newErrors.signature = lang === 'en' ? 'Please sign above' : 'እባክዎ ከላይ ይፈርሙ'
        }
        break
    }

    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) shakeError()
    return Object.keys(newErrors).length === 0
  }

  function goNext() {
    if (!validateStep()) return
    setStep((s) => Math.min(s + 1, 4))
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 0))
  }

  function handleVerifyFayda() {
    if (!formData.faydaId.trim() || formData.faydaId.length !== 12) {
      setErrors({ faydaId: lang === 'en' ? 'Enter a valid 12-digit Fayda ID' : 'ባለ 12 አሃዝ ፋይዳ መለያ ያስገቡ' })
      shakeError()
      return
    }
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      showToast(lang === 'en' ? 'OTP sent to your registered phone' : 'OTP ወደ ስልክዎ ተልኳል', 'success')
    }, 800)
  }

  function handleOtpChange(val: string) {
    if (val.length <= 4) {
      updateField('otp', val)
      if (val.length === 4) {
        if (val === '4921') {
          showToast(lang === 'en' ? 'Verified successfully!' : 'በተሳካ ሁኔታ ተረጋግጧል!', 'success')
          setTimeout(() => goNext(), 600)
        } else {
          shakeError()
          setErrors({ otp: lang === 'en' ? 'Invalid code. Try again.' : 'የተሳሳተ ኮድ። እንደገና ይሞክሩ።' })
        }
      }
    }
  }

  function handleCategorySelect(id: string) {
    updateField('category', id)
  }

  async function handleGeneratePDF() {
    setPdfLoading(true)
    const categoryInfo = getCategoryInfo(formData.category)
    const selectedCat = CATEGORIES.find((c) => c.id === formData.category)
    const today = new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })
    const regId = `EQ-${Date.now().toString(36).toUpperCase()}`
    const randomSlot = Math.floor(Math.random() * 500) + 1
    const signatureDate = new Date().toISOString().split('T')[0]
    const docId = `EQUB-REG-${regId}`

    const termsList = (lang === 'en' ? legalTerms.en : legalTerms.am)
      .slice(0, -1)
      .map((term, i) => `<p style="margin:2px 0;font-size:9pt;color:#333;line-height:1.5;"><span style="font-weight:700;">${i + 1}.</span> ${term}</p>`)
      .join('')

    const categorySpecificTerms = lang === 'en'
      ? `<p style="margin:4px 0;font-size:9.5pt;color:#1a1a1a;line-height:1.5;"><strong>Member Classification:</strong> Based on your selected savings tier of <strong>${selectedCat?.label || formData.category}</strong>, you are classified as a <strong>${categoryInfo.labelEn}</strong>.</p>
         <p style="margin:4px 0;font-size:9.5pt;color:#991b1b;line-height:1.5;"><strong>Default Penalty:</strong> ${categoryInfo.penaltyEn}</p>`
      : `<p style="margin:4px 0;font-size:9.5pt;color:#1a1a1a;line-height:1.5;"><strong>የአባል ምደባ፡</strong> በመረጡት የቁጠባ ደረጃ <strong>${selectedCat?.label || formData.category}</strong> መሰረት፣ እንደ <strong>${categoryInfo.labelAm}</strong> ተመድበዋል።</p>
         <p style="margin:4px 0;font-size:9.5pt;color:#991b1b;line-height:1.5;"><strong>የውል ማፍረስ ቅጣት፡</strong> ${categoryInfo.penaltyAm}</p>`

    const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page { margin: 14mm 12mm; }
  * { box-sizing: border-box; }
  body {
    font-family: 'Times New Roman', Georgia, serif;
    color: #1a1a1a;
    line-height: 1.6;
    margin: 0;
    padding: 0;
    font-size: 11pt;
  }
  .header {
    text-align: center;
    border-bottom: 3px double #0d6b3e;
    padding-bottom: 12px;
    margin-bottom: 6px;
    position: relative;
  }
  .logo { font-size: 28pt; font-weight: 900; color: #0d6b3e; letter-spacing: 4px; line-height: 1; }
  .logo-sub { font-size: 7pt; color: #64748b; letter-spacing: 3px; text-transform: uppercase; margin-top: 2px; }
  .confidential {
    background: #fef2f2; border: 1.5px solid #fecaca; text-align: center;
    font-size: 8pt; color: #991b1b; padding: 4px; letter-spacing: 2px; margin: 6px 0; font-weight: 700;
  }
  h1 { font-size: 16pt; color: #0d6b3e; text-align: center; margin: 8px 0 4px 0; font-weight: 700; }
  h2 {
    font-size: 12pt; color: #0d6b3e; border-bottom: 2px solid #0d6b3e;
    padding-bottom: 3px; margin: 16px 0 8px 0; font-weight: 700;
  }
  .section { margin-bottom: 8px; }
  .info-grid { width:100%; border-collapse: collapse; margin: 6px 0; }
  .info-grid td { padding: 5px 8px; border: 1px solid #cbd5e1; font-size: 9.5pt; }
  .info-grid .label { background: #f1f5f9; font-weight: 600; width: 140px; color: #475569; }
  .info-grid .value { font-weight: 500; color: #1a1a1a; }
  .terms-box { border: 1px solid #cbd5e1; padding: 8px 10px; margin: 6px 0; border-radius: 4px; background: #fafafa; }
  .declaration { border: 1.5px solid #0d6b3e; padding: 10px; margin: 10px 0; background: #f0fdf4; text-align: center; font-size: 10pt; font-style: italic; }
  .sig-table { width:100%; margin-top: 10px; }
  .sig-table td { padding: 8px; vertical-align: top; }
  .sig-line { border-top: 1px solid #1a1a1a; margin-top: 30px; padding-top: 4px; font-size: 9pt; color: #475569; }
  .footer { margin-top: 14px; border-top: 1px solid #cbd5e1; padding-top: 6px; text-align: center; font-size: 7pt; color: #94a3b8; }
  .badge {
    display: inline-block; padding: 2px 10px; border-radius: 3px;
    font-size: 8pt; font-weight: 700; color: #fff;
  }
  .badge-primary { background: #0d6b3e; }
  .badge-amber { background: #d97706; }
</style>
</head>
<body>
  <div class="header">
    <div class="logo">GOJO EQUIB</div>
    <div class="logo-sub">Digital Equb Savings Platform &bull; ዲጂታል የእቁብ ቁጠባ መድረክ</div>
  </div>

  <div class="confidential">CONFIDENTIAL &bull; MEMBER REGISTRATION AGREEMENT &bull; ሚስጥራዊ &bull; የአባል ምዝገባ ስምምነት</div>

  <p style="text-align:center;font-size:9pt;color:#475569;margin:4px 0;">
    Document ID: ${docId} &nbsp;|&nbsp; Date: ${today}
  </p>

  <h1>Equb Savings Membership Agreement</h1>
  <p style="text-align:center;font-size:9pt;color:#64748b;margin:0 0 8px 0;">
    የእቁብ ቁጠባ የአባልነት ስምምነት
  </p>

  <div class="section">
    <h2>1. Member Information &bull; የአባል መረጃ</h2>
    <table class="info-grid">
      <tr><td class="label">Full Name / ሙሉ ስም</td><td class="value">${formData.fullName}</td></tr>
      <tr><td class="label">Phone / ስልክ</td><td class="value">${formData.phone}</td></tr>
      <tr><td class="label">Fayda ID / የፋይዳ መለያ</td><td class="value">${formData.faydaId}</td></tr>
      <tr><td class="label">Work Address / የስራ አድራሻ</td><td class="value">${formData.workAddress}</td></tr>
      <tr><td class="label">Registration ID / የምዝገባ መለያ</td><td class="value">${regId}</td></tr>
    </table>
  </div>

  <div class="section">
    <h2>2. Savings Plan &bull; የቁጠባ እቅድ</h2>
    <table class="info-grid">
      <tr><td class="label">Category / ምድብ</td><td class="value">${selectedCat?.label || formData.category}</td></tr>
      <tr><td class="label">Daily Amount / ዕለታዊ መጠን</td><td class="value">${selectedCat?.daily || '-'}</td></tr>
      <tr><td class="label">Slot Number / ቦታ ቁጥር</td><td class="value">${randomSlot}</td></tr>
      <tr><td class="label">Member Type / የአባል አይነት</td><td class="value">${categoryInfo.labelEn} / ${categoryInfo.labelAm}</td></tr>
      <tr><td class="label">Classification / ምደባ</td><td class="value"><span class="badge badge-amber">${categoryInfo.licenseType}</span></td></tr>
    </table>
  </div>

  <div class="section">
    <h2>3. Terms & Conditions &bull; ውሎች እና ሁኔታዎች</h2>
    <div class="terms-box">
      ${termsList}
    </div>
  </div>

  <div class="section">
    <h2>4. Member Classification & Penalty &bull; የአባል ምደባ እና ቅጣት</h2>
    <div class="terms-box" style="background:#fef2f2;border-color:#fecaca;">
      ${categorySpecificTerms}
    </div>
  </div>

  <div class="declaration">
    <p style="font-size:10pt;font-weight:700;margin:0 0 4px 0;">DECLARATION &bull; ማረጋገጫ</p>
    <p style="font-size:9pt;margin:0;line-height:1.6;">
      I, <strong>${formData.fullName}</strong>, hereby confirm that all information provided above is true and correct.
      I have read, understood, and agreed to all terms, conditions, and penalty clauses applicable to my membership
      classification as a <strong>${categoryInfo.labelEn}</strong>.
    </p>
    <p style="font-size:9pt;margin:4px 0 0 0;line-height:1.6;font-style:normal;">
      እኔ <strong>${formData.fullName}</strong>፣ ከላይ የቀረበው መረጃ እውነት እና ትክክል መሆኑን አረጋግጣለሁ።
      እንደ <strong>${categoryInfo.labelAm}</strong> የአባልነት ምደባዬን የሚመለከቱ ሁሉንም ውሎች፣ ሁኔታዎች እና የቅጣት አንቀጾች አንብቤ፣ ተረድቼ እና ተስማምቼያለሁ።
    </p>
  </div>

  <table class="sig-table">
    <tr>
      <td style="width:33%;">
        <div class="sig-line">Member Signature / የአባል ፊርማ</div>
        <p style="font-size:9pt;color:#475569;margin:4px 0;">${signatureData ? '✓ Signed digitally' : '_____________'}</p>
        <p style="font-size:8pt;color:#64748b;">Date / ቀን: ${signatureDate}</p>
      </td>
      <td style="width:33%;text-align:center;">
        <div style="margin-top:30px;padding-top:4px;">
          <p style="font-size:8pt;color:#475569;margin:0;font-weight:700;">SEAL / ማህተም</p>
          <div style="width:60px;height:60px;border:2px solid #0d6b3e;border-radius:50%;margin:6px auto;display:flex;align-items:center;justify-content:center;">
            <span style="font-size:7pt;color:#0d6b3e;font-weight:700;">GOJO<br>EQUIB</span>
          </div>
        </div>
      </td>
      <td style="width:33%;text-align:right;">
        <div class="sig-line">Witness / ምስክር</div>
        <p style="font-size:9pt;color:#475569;margin:4px 0;">Name / ስም: _____________</p>
        <p style="font-size:8pt;color:#64748b;">Date / ቀን: ${signatureDate}</p>
      </td>
    </tr>
  </table>

  <div class="footer">
    <p style="margin:0;">${docId} &bull; Generated on ${today} &bull; Gojo Equb Platform</p>
    <p style="margin:0;">&copy; ${new Date().getFullYear()} Zoe Automotive PLC. All rights reserved.</p>
    <p style="margin:0;">Regulated Under Digital Joint Syndicate Division &bull; በዲጂታል የጋራ መቅረም ክፍል ተቋቋም</p>
  </div>
</body>
</html>`

    try {
      const { base64: rawBase64 } = await Print.printToFileAsync({ html, base64: true })
      const b64 = typeof rawBase64 === 'string' && rawBase64.includes('base64,')
        ? rawBase64.split('base64,')[1] || rawBase64
        : rawBase64
      await Sharing.shareAsync(`data:application/pdf;base64,${b64}`, {
        mimeType: 'application/pdf',
        dialogTitle: lang === 'en' ? 'Save Registration Agreement' : 'የምዝገባ ስምምነት ያስቀምጡ',
      })
      showToast(lang === 'en' ? 'Agreement PDF downloaded' : 'የስምምነት PDF ተወርዷል', 'success')
    } catch {
      showToast(lang === 'en' ? 'Failed to generate PDF' : 'PDF ማመንጨት አልተሳካም', 'error')
    } finally {
      setPdfLoading(false)
    }
  }

  function handlePayNow() {
    setShowUssd(true)
    setUssdStep('dial')
  }

  function handleUssdProceed() {
    if (ussdPin === '1234') {
      setUssdStep('processing')
      setTimeout(() => setUssdStep('success'), 2000)
    } else {
      setUssdError(lang === 'en' ? 'Wrong password' : 'የተሳሳተ የይለፍ ቃል')
      setTimeout(() => setUssdError(''), 1500)
    }
  }

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  })

  const selectedCategory = CATEGORIES.find((c) => c.id === formData.category)
  const randomSlot = Math.floor(Math.random() * 500) + 1
  const regId = `EQ-${Date.now().toString(36).toUpperCase()}`

  function renderStepIndicator() {
    return (
      <View style={styles.stepBar}>
        <View style={styles.stepBg}>
          <Animated.View style={[styles.stepFill, { width: progressWidth }]} />
        </View>
        <Text style={styles.stepLabel}>
          {lang === 'en' ? `Step ${step + 1} of 5` : `ደረጃ ${step + 1} ከ 5`}
        </Text>
      </View>
    )
  }

  function renderHeader(iconName: string, title: string, subtitle: string) {
    return (
      <Animated.View style={{ opacity: headerOpacity, transform: [{ translateY: headerTranslate }] }}>
        <LinearGradient
          colors={['#059669', '#047857', '#065f46']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={step === 0 ? () => navigate('portal') : goBack} style={styles.backBtn} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleLanguage} style={styles.langToggle} activeOpacity={0.7}>
              <Ionicons name="language-outline" size={18} color="#fff" />
              <Text style={styles.langText}>{lang === 'en' ? 'አማ' : 'EN'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.headerContent}>
            <Animated.View style={{ transform: [{ scale: iconScale }] }}>
              <Animated.View style={[styles.iconCircle, { transform: [{ scale: iconPulse }] }]}>
                <Ionicons name={iconName as any} size={28} color={colors.primary} />
              </Animated.View>
            </Animated.View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
        </LinearGradient>
      </Animated.View>
    )
  }

  const stepIcons = ['home-outline', 'id-card-outline', 'person-outline', 'document-text-outline', 'checkmark-circle-outline']

  return (
    <View style={styles.root}>
      {renderHeader(
        stepIcons[step],
        [onboarding.welcome, onboarding.faydaTitle, onboarding.accountTitle, onboarding.agreement, onboarding.success][step],
        [onboarding.welcomeSub, onboarding.faydaSub, onboarding.accountSub, onboarding.agreementSub, onboarding.successSub][step]
      )}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.formContainer}>
        <ScrollView ref={scrollRef} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {renderStepIndicator()}

          <Animated.View style={{ opacity: cardOpacity, transform: [{ translateY: cardTranslate }] }}>
            <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
              <Card style={styles.card}>
                {/* Step 0: Welcome */}
                {step === 0 && (
                  <View style={styles.stepContent}>
                    <View style={styles.welcomeLogo}>
                      <Ionicons name="people" size={64} color={colors.primary} />
                    </View>
                    <Text style={styles.welcomeTitle}>{onboarding.welcomeTitle}</Text>
                    <Text style={styles.welcomeDesc}>{onboarding.welcomeDesc}</Text>
                    <View style={styles.welcomeFeatures}>
                      {[
                        lang === 'en' ? 'Safe & Secure Savings' : 'ደህንነቱ የተጠበቀ ቁጠባ',
                        lang === 'en' ? 'Daily Draw Opportunities' : 'ዕለታዊ የዕጣ እድሎች',
                        lang === 'en' ? 'Instant Payouts' : 'ፈጣን ክፍያ',
                        lang === 'en' ? '24/7 Account Access' : 'ሙሉ የአካውንት ተደራሽነት',
                      ].map((f, i) => (
                        <View key={i} style={styles.featureRow}>
                          <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                          <Text style={styles.featureText}>{f}</Text>
                        </View>
                      ))}
                    </View>
                    <TouchableOpacity onPress={() => setStep(1)} activeOpacity={0.8} style={styles.startBtn}>
                      <Text style={styles.startBtnText}>{onboarding.startRegistration}</Text>
                      <Ionicons name="arrow-forward" size={20} color="#fff" />
                    </TouchableOpacity>
                  </View>
                )}

                {/* Step 1: Fayda ID + OTP */}
                {step === 1 && (
                  <View style={styles.stepContent}>
                    <View style={styles.faydaIcon}>
                      <Ionicons name="id-card-outline" size={40} color={colors.primary} />
                    </View>
                    <Text style={styles.fieldDesc}>{onboarding.faydaDesc}</Text>
                    <Input
                      label={onboarding.faydaLabel}
                      placeholder="000000000000"
                      value={formData.faydaId}
                      onChangeText={(val) => { updateField('faydaId', val.replace(/[^0-9]/g, '').slice(0, 12)) }}
                      error={errors.faydaId}
                      keyboardType="number-pad"
                      maxLength={12}
                      leftIcon={<Ionicons name="id-card-outline" size={18} color={colors.mutedForeground} />}
                    />

                    <Button
                      title={loading ? (lang === 'en' ? 'Verifying...' : 'በማረጋገጥ ላይ...') : (lang === 'en' ? 'Verify ID' : 'አረጋግጥ')}
                      onPress={handleVerifyFayda}
                      loading={loading}
                      fullWidth
                      variant="primary"
                      style={styles.fieldMargin}
                    />

                    {formData.faydaId.length === 12 && !loading && (
                      <>
                        <View style={styles.otpSection}>
                          <Text style={styles.otpLabel}>{onboarding.otpLabel}</Text>
                          <RNTextInput
                            ref={faydaOtpRef}
                            style={[styles.otpInput, errors.otp ? { borderColor: colors.destructive } : {}]}
                            value={formData.otp}
                            onChangeText={handleOtpChange}
                            keyboardType="number-pad"
                            maxLength={4}
                            placeholder="_ _ _ _"
                            placeholderTextColor={colors.mutedForeground}
                          />
                          {errors.otp && <Text style={styles.errorText}>{errors.otp}</Text>}
                        </View>
                        <Button
                          title={onboarding.continueBtn}
                          onPress={goNext}
                          fullWidth
                          variant="primary"
                          disabled={formData.otp.length !== 4}
                        />
                      </>
                    )}
                  </View>
                )}

                {/* Step 2: Account + Category */}
                {step === 2 && (
                  <View style={styles.stepContent}>
                    <Input
                      label={onboarding.nameLabel}
                      placeholder={onboarding.namePlaceholder}
                      value={formData.fullName}
                      onChangeText={(val) => updateField('fullName', val)}
                      error={errors.fullName}
                      leftIcon={<Ionicons name="person-outline" size={18} color={colors.mutedForeground} />}
                    />
                    <Input
                      label={onboarding.phoneLabel}
                      placeholder="+251 9XX XXX XXXX"
                      value={formData.phone}
                      onChangeText={(val) => updateField('phone', val.replace(/[^0-9+]/g, ''))}
                      error={errors.phone}
                      keyboardType="phone-pad"
                      leftIcon={<Ionicons name="call-outline" size={18} color={colors.mutedForeground} />}
                    />
                    <Input
                      label={onboarding.passwordLabel}
                      placeholder={onboarding.passwordPlaceholder}
                      value={formData.password}
                      onChangeText={(val) => updateField('password', val)}
                      error={errors.password}
                      secureTextEntry
                      leftIcon={<Ionicons name="lock-closed-outline" size={18} color={colors.mutedForeground} />}
                    />
                    <Input
                      label={onboarding.confirmLabel}
                      placeholder={onboarding.confirmPlaceholder}
                      value={formData.confirmPassword}
                      onChangeText={(val) => updateField('confirmPassword', val)}
                      error={errors.confirmPassword}
                      secureTextEntry
                      leftIcon={<Ionicons name="lock-open-outline" size={18} color={colors.mutedForeground} />}
                    />
                    <Input
                      label={onboarding.workLabel}
                      placeholder={onboarding.workPlaceholder}
                      value={formData.workAddress}
                      onChangeText={(val) => updateField('workAddress', val)}
                      error={errors.workAddress}
                      leftIcon={<Ionicons name="business-outline" size={18} color={colors.mutedForeground} />}
                    />

                    <Text style={styles.sectionLabel}>{onboarding.categoryLabel}</Text>
                    <View style={styles.categoryGrid}>
                      {CATEGORIES.map((cat) => (
                        <TouchableOpacity
                          key={cat.id}
                          style={[styles.categoryCard, formData.category === cat.id && { borderColor: cat.color, borderWidth: 2 }]}
                          onPress={() => handleCategorySelect(cat.id)}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.categoryDot, { backgroundColor: cat.color }]} />
                          <Text style={[styles.categoryName, formData.category === cat.id && { color: cat.color }]}>{cat.label}</Text>
                          <Text style={styles.categoryDaily}>{cat.daily} / {cat.target}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}

                    {formData.category === 'savings' && (
                      <Input
                        label={onboarding.dailySavingsLabel}
                        placeholder="10"
                        value={formData.dailySavings}
                        onChangeText={(val) => updateField('dailySavings', val.replace(/[^0-9]/g, ''))}
                        keyboardType="number-pad"
                        leftIcon={<Ionicons name="cash-outline" size={18} color={colors.mutedForeground} />}
                      />
                    )}

                    <View style={styles.phoneInfo}>
                      <Ionicons name="information-circle" size={18} color={colors.primary} />
                      <Text style={styles.phoneInfoText}>
                        {lang === 'en' ? `Registered phone: ${formData.phone || '+251 9XX XXX XXXX'}` : `የተመዘገበ ስልክ፡ ${formData.phone || '+251 9XX XXX XXXX'}`}
                      </Text>
                    </View>

                    <TouchableOpacity onPress={goNext} activeOpacity={0.8} style={[styles.continueBtn, styles.fieldMargin]}>
                      <Text style={styles.continueBtnText}>{onboarding.continueBtn}</Text>
                      <Ionicons name="arrow-forward" size={20} color="#fff" />
                    </TouchableOpacity>
                  </View>
                )}

                {/* Step 3: Agreement & Signature */}
                {step === 3 && (
                  <View style={styles.stepContent}>
                    <View style={styles.summaryBox}>
                      <Text style={styles.summaryTitle}>{lang === 'en' ? 'Registration Summary' : 'የምዝገባ ማጠቃለያ'}</Text>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>{lang === 'en' ? 'Name' : 'ስም'}</Text>
                        <Text style={styles.summaryValue}>{formData.fullName || '-'}</Text>
                      </View>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>{lang === 'en' ? 'Category' : 'ምድብ'}</Text>
                        <Text style={styles.summaryValue}>{selectedCategory?.label || '-'}</Text>
                      </View>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>{lang === 'en' ? 'Daily Amount' : 'ዕለታዊ መጠን'}</Text>
                        <Text style={styles.summaryValue}>{selectedCategory?.daily || '-'}</Text>
                      </View>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>{lang === 'en' ? 'Phone' : 'ስልክ'}</Text>
                        <Text style={styles.summaryValue}>{formData.phone || '-'}</Text>
                      </View>
                    </View>

                    <Text style={styles.sectionLabel}>{lang === 'en' ? 'Terms & Conditions' : 'ውሎች እና ሁኔታዎች'}</Text>
                    <ScrollView style={styles.termsScroll} nestedScrollEnabled>
                      {(lang === 'en' ? legalTerms.en : legalTerms.am).map((term, i) => (
                        <View key={i} style={styles.termRow}>
                          <Text style={styles.termNum}>{i + 1}.</Text>
                          <Text style={styles.termText}>{term}</Text>
                        </View>
                      ))}
                    </ScrollView>

                    <TouchableOpacity style={styles.checkboxRow} onPress={() => setAgreeToTerms(!agreeToTerms)} activeOpacity={0.7}>
                      <View style={[styles.checkbox, agreeToTerms && styles.checkboxActive]}>
                        {agreeToTerms && <Ionicons name="checkmark" size={16} color="#fff" />}
                      </View>
                      <Text style={styles.checkboxLabel}>
                        {lang === 'en' ? 'I accept the Terms & Conditions' : 'ውሎቹን እና ሁኔታዎቹን ተቀበላለሁ'}
                      </Text>
                    </TouchableOpacity>
                    {errors.agreeToTerms && <Text style={styles.errorText}>{errors.agreeToTerms}</Text>}

                    <SignaturePad
                      onSave={(data) => setSignatureData(data)}
                      onClear={() => setSignatureData(null)}
                    />
                    {errors.signature && <Text style={styles.errorText}>{errors.signature}</Text>}

                    <TouchableOpacity onPress={goNext} activeOpacity={0.8} style={[styles.continueBtn, styles.fieldMargin]}>
                      <Text style={styles.continueBtnText}>{onboarding.completeBtn}</Text>
                      <Ionicons name="arrow-forward" size={20} color="#fff" />
                    </TouchableOpacity>
                  </View>
                )}

                {/* Step 4: Success + Payment + PDF */}
                {step === 4 && (
                  <View style={styles.stepContent}>
                    <View style={styles.successIcon}>
                      <Ionicons name="checkmark-circle" size={72} color={colors.primary} />
                    </View>
                    <Text style={styles.successTitle}>{onboarding.successTitle}</Text>
                    <Text style={styles.successDesc}>{onboarding.successDesc}</Text>

                    <Card style={styles.summaryCard}>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>{lang === 'en' ? 'Full Name' : 'ሙሉ ስም'}</Text>
                        <Text style={styles.summaryValue}>{formData.fullName}</Text>
                      </View>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>{lang === 'en' ? 'Phone' : 'ስልክ'}</Text>
                        <Text style={styles.summaryValue}>{formData.phone}</Text>
                      </View>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>{lang === 'en' ? 'Category' : 'ምድብ'}</Text>
                        <Text style={styles.summaryValue}>{selectedCategory?.label}</Text>
                      </View>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>{lang === 'en' ? 'Slot #' : 'ቦታ #'}</Text>
                        <Text style={[styles.summaryValue, styles.slotBadge]}>{randomSlot}</Text>
                      </View>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Reg ID</Text>
                        <Text style={[styles.summaryValue, styles.regId]}>{regId}</Text>
                      </View>
                    </Card>

                    <View style={styles.successActions}>
                      <Button title={onboarding.payNow} onPress={handlePayNow} fullWidth variant="primary" size="lg" />
                      <Button
                        title={pdfLoading ? (lang === 'en' ? 'Generating PDF...' : 'PDF በማመንጨት ላይ...') : (lang === 'en' ? 'Download Agreement PDF' : 'የስምምነት PDF አውርድ')}
                        onPress={handleGeneratePDF}
                        fullWidth
                        variant="outline"
                        size="lg"
                        loading={pdfLoading}
                        style={styles.fieldMargin}
                      />
                      <Button title={onboarding.goDashboard} onPress={() => navigate('main')} fullWidth variant="ghost" size="lg" style={styles.fieldMargin} />
                    </View>
                  </View>
                )}
              </Card>
            </Animated.View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* USSD Payment Modal */}
      <Modal visible={showUssd} transparent animationType="fade">
        <View style={styles.ussdOverlay}>
          <BlurView intensity={20} style={StyleSheet.absoluteFill} />
          <Card style={styles.ussdCard}>
            {ussdStep === 'dial' && (
              <View style={styles.ussdContent}>
                <View style={styles.ussdIconCircle}>
                  <Ionicons name="call-outline" size={40} color={colors.primary} />
                </View>
                <Text style={styles.ussdTitle}>{lang === 'en' ? 'Dialing USSD' : 'USSD እየደወለ ነው'}</Text>
                <Text style={styles.ussdCode}>*847#</Text>
                <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.lg }} />
                <View style={{ height: 80 }} />
                <Button title={lang === 'en' ? 'Proceed to PIN' : 'ወደ PIN ይቀጥሉ'} onPress={() => setUssdStep('password')} fullWidth variant="primary" />
              </View>
            )}

            {ussdStep === 'password' && (
              <View style={styles.ussdContent}>
                <View style={styles.ussdIconCircle}>
                  <Ionicons name="lock-closed-outline" size={40} color={colors.secondary} />
                </View>
                <Text style={styles.ussdTitle}>{lang === 'en' ? 'Enter USSD PIN' : 'የ USSD ፒን ያስገቡ'}</Text>
                <Text style={styles.ussdHint}>{lang === 'en' ? 'Enter your USSD password to confirm payment' : 'ክፍያውን ለማረጋገጥ የ USSD ይለፍ ቃልዎን ያስገቡ'}</Text>
                <RNTextInput
                  style={[styles.ussdPinInput, ussdError ? { borderColor: colors.destructive } : {}]}
                  value={ussdPin}
                  onChangeText={(val) => { setUssdPin(val.replace(/[^0-9]/g, '').slice(0, 4)); setUssdError('') }}
                  keyboardType="number-pad"
                  maxLength={4}
                  placeholder="_ _ _ _"
                  placeholderTextColor={colors.mutedForeground}
                  secureTextEntry
                />
                {ussdError ? <Text style={styles.ussdError}>{ussdError}</Text> : null}
                <Button title={lang === 'en' ? 'Confirm Payment' : 'ክፍያውን ያረጋግጡ'} onPress={handleUssdProceed} fullWidth variant="primary" disabled={ussdPin.length !== 4} style={{ marginTop: spacing.md }} />
                <TouchableOpacity onPress={() => setShowUssd(false)} style={{ marginTop: spacing.md }}>
                  <Text style={styles.ussdCancel}>{lang === 'en' ? 'Cancel' : 'ሰርዝ'}</Text>
                </TouchableOpacity>
              </View>
            )}

            {ussdStep === 'processing' && (
              <View style={styles.ussdContent}>
                <View style={[styles.ussdIconCircle, { backgroundColor: colors.secondary + '20' }]}>
                  <Ionicons name="sync-outline" size={40} color={colors.secondary} />
                </View>
                <Text style={styles.ussdTitle}>{lang === 'en' ? 'Processing Payment' : 'ክፍያ በሂደት ላይ'}</Text>
                <Text style={styles.ussdHint}>{lang === 'en' ? 'Please wait while your payment is being processed' : 'ክፍያዎ እየተከናወነ እያለ እባክዎ ይጠብቁ'}</Text>
                <ActivityIndicator size="large" color={colors.secondary} style={{ marginTop: spacing.lg }} />
              </View>
            )}

            {ussdStep === 'success' && (
              <View style={styles.ussdContent}>
                <View style={[styles.ussdIconCircle, { backgroundColor: colors.primary + '20' }]}>
                  <Ionicons name="checkmark-circle" size={40} color={colors.primary} />
                </View>
                <Text style={styles.ussdTitle}>{lang === 'en' ? 'Payment Successful!' : 'ክፍያ ተሳክቷል!'}</Text>
                <Text style={styles.ussdHint}>
                  {lang === 'en' ? `Your registration fee has been processed. Ref: ${regId}` : `የምዝገባ ክፍያዎ ተከናውኗል። ማጣቀሻ፡ ${regId}`}
                </Text>
                <Button
                  title={pdfLoading ? (lang === 'en' ? 'Generating...' : 'በማመንጨት ላይ...') : (lang === 'en' ? 'Download Agreement PDF' : 'የስምምነት PDF አውርድ')}
                  onPress={handleGeneratePDF}
                  fullWidth
                  variant="primary"
                  loading={pdfLoading}
                  style={{ marginTop: spacing.xl }}
                />
                <Button title={onboarding.goDashboard} onPress={() => { setShowUssd(false); navigate('main') }} fullWidth variant="ghost" style={{ marginTop: spacing.sm }} />
              </View>
            )}
          </Card>
        </View>
      </Modal>
    </View>
  )
}

const BlurView = ({ style, children }: { style?: any; children?: React.ReactNode; intensity?: number }) => (
  <View style={[{ backgroundColor: 'rgba(0,0,0,0.5)' }, style]}>{children}</View>
)

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  headerGradient: {
    paddingTop: 0,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingHorizontal: spacing.xl,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing['2xl'],
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  langToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  langText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  headerContent: { alignItems: 'center', marginTop: spacing.xl },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { color: '#fff', fontSize: 24, fontWeight: '700', marginTop: spacing.lg, textAlign: 'center' },
  subtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: spacing.xs, textAlign: 'center' },
  formContainer: { flex: 1 },
  scrollContent: { padding: spacing.xl, paddingBottom: spacing['6xl'] },
  card: { padding: spacing.xl },
  stepContent: { gap: spacing.lg },
  stepBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  stepBg: { flex: 1, height: 6, backgroundColor: '#e2e8f0', borderRadius: 3, overflow: 'hidden' },
  stepFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 3 },
  stepLabel: { fontSize: 12, color: colors.mutedForeground, fontWeight: '500' },
  fieldMargin: { marginTop: spacing.sm },

  /* Welcome step */
  welcomeLogo: { alignItems: 'center', marginVertical: spacing.xl },
  welcomeTitle: { fontSize: 22, fontWeight: '700', textAlign: 'center', color: colors.foreground },
  welcomeDesc: { fontSize: 14, color: colors.mutedForeground, textAlign: 'center', lineHeight: 20 },
  welcomeFeatures: { gap: spacing.md, marginTop: spacing.lg },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  featureText: { fontSize: 15, color: colors.foreground },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: colors.radius.md,
    marginTop: spacing.xl,
  },
  startBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },

  /* Fayda step */
  faydaIcon: { alignItems: 'center', marginVertical: spacing.md },
  fieldDesc: { fontSize: 14, color: colors.mutedForeground, textAlign: 'center', lineHeight: 20 },
  otpSection: { gap: spacing.sm, marginTop: spacing.md },
  otpLabel: { fontSize: 14, fontWeight: '600', color: colors.foreground, textAlign: 'center' },
  otpInput: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: colors.radius.md,
    paddingVertical: spacing.lg,
    fontSize: 28,
    letterSpacing: 12,
    textAlign: 'center',
    color: colors.foreground,
    fontWeight: '700',
  },
  errorText: { color: colors.destructive, fontSize: 13 },

  /* Continue button */
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: colors.radius.md,
  },
  continueBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  /* Category grid */
  sectionLabel: { fontSize: 15, fontWeight: '700', color: colors.foreground, marginTop: spacing.sm },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  categoryCard: {
    width: '47%',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: colors.radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  categoryDot: { width: 12, height: 12, borderRadius: 6 },
  categoryName: { fontSize: 15, fontWeight: '700', color: colors.foreground },
  categoryDaily: { fontSize: 12, color: colors.mutedForeground },
  phoneInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.primary + '10', borderRadius: colors.radius.md },
  phoneInfoText: { fontSize: 13, color: colors.primary, flex: 1 },

  /* Agreement step */
  summaryBox: {
    backgroundColor: colors.muted,
    borderRadius: colors.radius.md,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  summaryTitle: { fontSize: 16, fontWeight: '700', color: colors.foreground, marginBottom: spacing.xs },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 13, color: colors.mutedForeground },
  summaryValue: { fontSize: 14, fontWeight: '600', color: colors.foreground },
  termsScroll: { maxHeight: 200, borderWidth: 1, borderColor: colors.border, borderRadius: colors.radius.md, padding: spacing.md },
  termRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.sm },
  termNum: { fontSize: 12, color: colors.mutedForeground, width: 18 },
  termText: { fontSize: 12, color: colors.foreground, flex: 1, lineHeight: 18 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkboxLabel: { fontSize: 14, color: colors.foreground, flex: 1 },

  /* Success step */
  successIcon: { alignItems: 'center', marginVertical: spacing.md },
  successTitle: { fontSize: 22, fontWeight: '700', textAlign: 'center', color: colors.foreground },
  successDesc: { fontSize: 14, color: colors.mutedForeground, textAlign: 'center' },
  summaryCard: { backgroundColor: colors.muted, padding: spacing.lg, gap: spacing.md },
  slotBadge: { backgroundColor: colors.primary + '20', color: colors.primary, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
  regId: { fontSize: 12, fontFamily: 'monospace', letterSpacing: 0.5 },
  successActions: { marginTop: spacing.lg },

  /* USSD modal */
  ussdOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  ussdCard: { width: '100%', padding: spacing.xl },
  ussdContent: { alignItems: 'center', gap: spacing.md },
  ussdIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  ussdTitle: { fontSize: 20, fontWeight: '700', color: colors.foreground, textAlign: 'center' },
  ussdCode: { fontSize: 24, fontWeight: '700', color: colors.primary, letterSpacing: 4 },
  ussdHint: { fontSize: 14, color: colors.mutedForeground, textAlign: 'center', lineHeight: 20 },
  ussdPinInput: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: colors.radius.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    fontSize: 28,
    letterSpacing: 12,
    textAlign: 'center',
    color: colors.foreground,
    fontWeight: '700',
    width: '100%',
  },
  ussdError: { color: colors.destructive, fontSize: 13 },
  ussdCancel: { color: colors.mutedForeground, fontSize: 14, fontWeight: '500' },
})
