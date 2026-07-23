import { useState, useEffect, useRef, useCallback } from 'react'
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Easing,
  Platform,
  ScrollView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Path, Rect, Circle, Ellipse, Defs, LinearGradient as SvgGradient, Stop, Polyline } from 'react-native-svg'
import { colors } from '../theme'
import { Text } from '../components/ui/AppText'
import { useNavigation } from '../context/NavigationContext'
import { useTranslation } from '../i18n/useTranslation'

const JAR_BODY = '#007A5E'
const JAR_DARK = '#005C45'
const JAR_DEEP = '#004D38'
const BG = '#f4faf8'

const DEFAULT_PRIZES = [
  { id: '1', amount: '5000 ETB', slot: 'SLOT #5', r: 'R-1', color: '#00b080' },
  { id: '2', amount: '2000 ETB', slot: 'SLOT #4', r: 'R-1', color: '#00a375' },
  { id: '3', amount: '1000 ETB', slot: 'SLOT #3', r: 'R-2', color: '#10b981' },
  { id: '4', amount: '500 ETB', slot: 'SLOT #2', r: 'R-3', color: '#00c27a' },
  { id: '5', amount: '100 ETB', slot: 'SLOT #1', r: 'R-1', color: '#008f6b' },
]

const DEFAULT_PARTICIPANTS = [
  { id: 'p1', name: 'Almaz', avatarColor: '#34d399' },
  { id: 'p2', name: 'Bekele', avatarColor: '#60a5fa' },
  { id: 'p3', name: 'Chala', avatarColor: '#f472b6' },
  { id: 'p4', name: 'Desta', avatarColor: '#fbbf24' },
  { id: 'p5', name: 'Etenesh', avatarColor: '#a78bfa' },
]

const ORBIT_RADIUS = 155

function getCircularPosition(index: number, total: number) {
  const angle = (index / total) * 2 * Math.PI - Math.PI / 2
  return { x: Math.cos(angle) * ORBIT_RADIUS, y: Math.sin(angle) * ORBIT_RADIUS - 45 }
}

function Badge({
  item,
  index,
  total,
  isOpen,
  releasedIndexes,
  winner,
  delay,
}: {
  item: (typeof DEFAULT_PRIZES)[number]
  index: number
  total: number
  isOpen: boolean
  releasedIndexes: number[]
  winner?: { name: string; avatarColor: string }
  delay: number
}) {
  const posAnim = useRef(new Animated.ValueXY({ x: 0, y: 120 })).current
  const scaleAnim = useRef(new Animated.Value(0)).current
  const opacityAnim = useRef(new Animated.Value(0)).current
  const floatPhase = useRef(new Animated.Value(0)).current
  const isReleased = releasedIndexes.includes(index)

  useEffect(() => {
    if (isReleased && isOpen) {
      const coords = getCircularPosition(index, total)
      Animated.parallel([
        Animated.spring(posAnim, {
          toValue: { x: coords.x, y: coords.y },
          stiffness: 55,
          damping: 11,
          delay,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          stiffness: 70,
          damping: 12,
          delay,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          delay,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start()
    } else if (!isOpen) {
      Animated.parallel([
        Animated.timing(posAnim, { toValue: { x: 0, y: 120 }, duration: 150, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(scaleAnim, { toValue: 0, duration: 150, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(opacityAnim, { toValue: 0, duration: 100, useNativeDriver: Platform.OS !== 'web' }),
      ]).start()
    }
  }, [isReleased, isOpen])

  useEffect(() => {
    if (!isReleased || !isOpen) return
    floatPhase.setValue(0)
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatPhase, { toValue: 1, duration: 3000 + index * 400, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(floatPhase, { toValue: 0, duration: 3000 + index * 400, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web' }),
      ]),
    ).start()
    return () => floatPhase.stopAnimation?.()
  }, [isReleased, isOpen])

  const floatY = floatPhase.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, -8, 0],
  })

  return (
    <Animated.View
      style={[
        styles.badgeOuter,
        {
          opacity: opacityAnim,
          transform: [
            { translateX: posAnim.x },
            { translateY: Animated.add(posAnim.y, floatY) },
            { scale: scaleAnim },
          ],
        },
      ]}
    >
      <View>
        <LinearGradient
          colors={[item.color || '#10b981', JAR_DARK]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.badgeCircle}
        >
          <View style={styles.badgeGloss} />
          <Text style={styles.badgeAmount}>{item.amount}</Text>
          <Text style={styles.badgeSlot}>{item.slot}</Text>
          <Text style={styles.badgeR}>{item.r}</Text>
        </LinearGradient>

        {winner && (
          <View style={styles.winnerTag}>
            <View style={[styles.winnerAvatar, { backgroundColor: winner.avatarColor }]}>
              <Text style={styles.winnerAvatarText}>{winner.name[0]}</Text>
            </View>
            <Text style={styles.winnerName}>{winner.name}</Text>
          </View>
        )}
      </View>
    </Animated.View>
  )
}

export function LuckyJarScreen() {
  const { navigate } = useNavigation()
  const { lang } = useTranslation()
  const [prizes] = useState(DEFAULT_PRIZES)
  const [participants] = useState(DEFAULT_PARTICIPANTS)
  const [isOpen, setIsOpen] = useState(false)
  const [releasedIndexes, setReleasedIndexes] = useState<number[]>([])
  const [isReleasing, setIsReleasing] = useState(false)
  const [assignments, setAssignments] = useState<Record<string, { name: string; avatarColor: string }>>({})
  const [revealedWinners, setRevealedWinners] = useState<{ prize: (typeof DEFAULT_PRIZES)[number]; winner: { name: string; avatarColor: string } }[]>([])
  const [statusText, setStatusText] = useState(lang === 'en' ? 'Welcome! Tap to draw' : 'እንኳን ደህና መጡ! ይጫኑ')

  const lidAnim = useRef(new Animated.Value(0)).current
  const glowAnim = useRef(new Animated.Value(0)).current

  const handleToggle = useCallback(() => {
    if (isReleasing) return

    if (!isOpen) {
      setIsOpen(true)
      setIsReleasing(true)
      setReleasedIndexes([])
      setRevealedWinners([])
      setStatusText(lang === 'en' ? 'Drawing...' : 'ዕጣ እየወጣ ነው...')

      const shuffled = [...participants].sort(() => 0.5 - Math.random())
      const newAssignments: Record<string, { name: string; avatarColor: string }> = {}
      prizes.forEach((p, i) => {
        newAssignments[p.id] = shuffled[i] || { name: `${lang === 'en' ? 'Player' : 'ተወዳዳሪ'} #${i + 1}`, avatarColor: '#10b981' }
      })
      setAssignments(newAssignments)

      Animated.spring(lidAnim, {
        toValue: 1, stiffness: 80, damping: 10,
        useNativeDriver: Platform.OS !== 'web',
      }).start()

      prizes.forEach((_, i) => {
        setTimeout(() => {
          setReleasedIndexes(prev => [...prev, i])
          const prize = prizes[i]
          const w = newAssignments[prize.id]
          if (w) {
            setRevealedWinners(prev => [...prev, { prize, winner: w }])
            setStatusText(lang === 'en' ? `🎉 ${w.name} won ${prize.amount}!` : `🎉 ${w.name} ${prize.amount} አሸነፉ!`)
          }
          if (i === prizes.length - 1) {
            setTimeout(() => {
              setIsReleasing(false)
              setStatusText(lang === 'en' ? 'All prizes drawn! 🥳' : 'ሁሉም ዕጣዎች ወጥተዋል! እንኳን ደስ አላችሁ! 🥳')
            }, 400)
          }
        }, 200 + i * 900)
      })
    } else {
      setIsOpen(false)
      setIsReleasing(false)
      setReleasedIndexes([])
      setRevealedWinners([])
      setAssignments({})
      setStatusText(lang === 'en' ? 'Welcome! Tap to draw' : 'እንኳን ደህና መጡ! ይጫኑ')
      Animated.spring(lidAnim, {
        toValue: 0, stiffness: 80, damping: 10,
        useNativeDriver: Platform.OS !== 'web',
      }).start()
    }
  }, [isOpen, isReleasing, prizes, participants, lang])

  const handleReset = useCallback(() => {
    setIsOpen(false)
    setIsReleasing(false)
    setReleasedIndexes([])
    setRevealedWinners([])
    setAssignments({})
    setStatusText(lang === 'en' ? 'Reset. Tap to draw' : 'ተመልሷል። ይጫኑ')
    lidAnim.setValue(0)
  }, [lang])

  useEffect(() => {
    if (isOpen && !isReleasing) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web' }),
          Animated.timing(glowAnim, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web' }),
        ]),
      ).start()
    } else {
      glowAnim.stopAnimation?.()
      Animated.timing(glowAnim, { toValue: 0, duration: 200, useNativeDriver: Platform.OS !== 'web' }).start()
    }
  }, [isOpen, isReleasing])

  const lidY = lidAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -65] })
  const lidRotate = lidAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-15deg'] })
  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.5] })

  return (
    <View style={styles.screen}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigate('portal')} activeOpacity={0.7}>
        <Ionicons name="arrow-back" size={22} color={JAR_DARK} />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.canvas}>
          {/* Glow behind jar */}
          <Animated.View style={[styles.arenaGlow, { opacity: glowOpacity }]} />

          {/* Perfect circle path outline */}
          {isOpen && <View style={styles.circlePath} />}

          {/* Prize badges */}
          <View style={styles.orbitArea}>
            {prizes.map((item, i) => (
              <Badge
                key={item.id}
                item={item}
                index={i}
                total={prizes.length}
                isOpen={isOpen}
                releasedIndexes={releasedIndexes}
                winner={assignments[item.id]}
                delay={i * 50}
              />
            ))}
          </View>

          {/* Jar + Lid */}
          <View style={styles.jarSection}>
            <Animated.View style={[styles.lidWrap, { transform: [{ translateY: lidY }, { rotate: lidRotate }] }]}>
              <View style={styles.lidKnob} />
              <View style={styles.lidCap} />
            </Animated.View>

            <TouchableOpacity onPress={handleToggle} activeOpacity={0.9} style={styles.jarTouch}>
              <View style={styles.jarGlowStripe} />

              <Svg width={208} height={176} viewBox="0 0 200 170">
                <Defs>
                  <SvgGradient id="jarBelly" cx="50%" cy="40%" r="55%">
                    <Stop offset="0%" stopColor="#00a86b" />
                    <Stop offset="60%" stopColor="#007a5e" />
                    <Stop offset="100%" stopColor="#003527" />
                  </SvgGradient>
                  <SvgGradient id="zigZag" x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0%" stopColor="#34d399" stopOpacity="0.5" />
                    <Stop offset="100%" stopColor="#004d38" stopOpacity="0.9" />
                  </SvgGradient>
                </Defs>

                {/* Rim */}
                <Rect x="65" y="22" width="70" height="10" rx="3" fill="#005C45" />

                {/* Pot body */}
                <Path
                  d="M 68,32 L 132,32 C 145,55 178,65 178,105 C 178,145 142,165 100,165 C 58,165 22,145 22,105 C 22,65 55,55 68,32 Z"
                  fill="url(#jarBelly)"
                />

                {/* Zigzag band */}
                <Polyline
                  points="32,80 44,65 56,80 68,65 80,80 92,65 104,80 116,65 128,80 140,65 152,80 164,65 168,80"
                  fill="none"
                  stroke="url(#zigZag)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Carved accent lines left */}
                <Path d="M 50,115 L 70,140 M 60,115 L 80,140 M 70,115 L 90,140" stroke="#fff" strokeWidth="2.5" strokeOpacity="0.15" strokeLinecap="round" />
                {/* Carved accent lines right */}
                <Path d="M 150,115 L 130,140 M 140,115 L 120,140 M 130,115 L 110,140" stroke="#fff" strokeWidth="2.5" strokeOpacity="0.15" strokeLinecap="round" />

                {/* Gloss highlight */}
                <Path d="M 35,90 A 60,60 0 0,1 60,45" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.1" />

                {/* Shadow base */}
                <Ellipse cx="100" cy="163" rx="50" ry="4" fill={JAR_DEEP} opacity="0.4" />
              </Svg>

              {/* Open glow */}
              {isOpen && (
                <Animated.View style={[styles.jarInnerGlow, { opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.6] }) }]} pointerEvents="none" />
              )}

              {/* Center text */}
              <View style={styles.jarTextWrap} pointerEvents="none">
                <Text style={styles.jarLabel}>
                  {isOpen
                    ? (lang === 'en' ? 'TAP TO CLOSE' : 'ለመዝጋት ንካ')
                    : (lang === 'en' ? 'TAP TO SPIN' : 'እጣ አውጣ')}
                </Text>
                <Text style={styles.jarAction}>
                  {isOpen ? (lang === 'en' ? 'Open' : 'ክፍት ነው') : (lang === 'en' ? 'Draw' : 'እጣ አውጣ')}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Results panel */}
        {isOpen && revealedWinners.length > 0 && (
          <View style={styles.resultsPanel}>
            <View style={styles.resultsHeader}>
              <Ionicons name="trophy" size={14} color={JAR_DARK} />
              <Text style={styles.resultsTitle}>
                {lang === 'en' ? 'Results Live' : 'ዕጣዎችና አሸናፊዎች'}
              </Text>
              <Text style={styles.resultsCount}>{revealedWinners.length} / {prizes.length}</Text>
            </View>
            {revealedWinners.map((item, idx) => (
              <View key={idx} style={styles.resultRow}>
                <View style={styles.resultRowLeft}>
                  <View style={[styles.resultAvatar, { backgroundColor: item.winner.avatarColor }]}>
                    <Text style={styles.resultAvatarText}>{item.winner.name[0]}</Text>
                  </View>
                  <Text style={styles.resultName}>{item.winner.name}</Text>
                </View>
                <View style={styles.resultRowRight}>
                  <Text style={styles.resultSlot}>{item.prize.slot}</Text>
                  <Text style={styles.resultAmount}>{item.prize.amount}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Status text */}
        <View style={styles.statusRow}>
          <Text style={styles.statusText}>{statusText}</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statsBadge}>
            <Ionicons name="people" size={14} color="#fff" />
            <Text style={styles.statsBadgeText}>{participants.length} {lang === 'en' ? 'participants' : 'ተወዳዳሪዎች'}</Text>
          </View>
          <Text style={styles.statsWinners}>{prizes.length} {lang === 'en' ? 'Winners' : 'አሸናፊ'}</Text>
          <Text style={styles.statsSub}>{lang === 'en' ? 'Draw Board' : 'ዕጣ ማውጫ ሰሌዳ'}</Text>
        </View>

        {/* Footer buttons */}
        <View style={styles.footerRow}>
          <TouchableOpacity
            onPress={handleToggle}
            disabled={isReleasing}
            activeOpacity={0.85}
            style={[styles.mainBtn, isOpen && styles.mainBtnClose]}
          >
            <Text style={[styles.mainBtnText, isOpen && styles.mainBtnTextClose]}>
              {isOpen
                ? (lang === 'en' ? 'CLOSE JAR' : 'ማሰሮውን ዝጋ')
                : (lang === 'en' ? 'OPEN & DRAW' : 'እጣዎቹን አውጣ')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleReset} activeOpacity={0.8} style={styles.resetBtn}>
            <Ionicons name="refresh-outline" size={20} color={JAR_DARK} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  )
}

const BADGE_SIZE = 84

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BG,
  },
  backBtn: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 16 : 56,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 60,
  },
  scroll: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'web' ? 60 : 100,
    paddingBottom: 40,
  },
  canvas: {
    width: '100%',
    maxWidth: 420,
    height: 520,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  arenaGlow: {
    position: 'absolute',
    top: '45%',
    left: '50%',
    marginLeft: -160,
    marginTop: -160,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(52,211,153,0.15)',
    zIndex: 0,
  },
  circlePath: {
    position: 'absolute',
    top: '42%',
    left: '50%',
    marginLeft: -155,
    marginTop: -155,
    width: 310,
    height: 310,
    borderRadius: 155,
    borderWidth: 2,
    borderColor: 'rgba(16,185,129,0.2)',
    borderStyle: 'dashed',
    zIndex: 1,
  },
  orbitArea: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  badgeOuter: {
    position: 'absolute',
    width: BADGE_SIZE,
    height: BADGE_SIZE + 28,
  },
  badgeCircle: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.75)',
    shadowColor: '#002819',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
    overflow: 'hidden',
  },
  badgeGloss: {
    position: 'absolute',
    top: 4,
    left: 12,
    width: 48,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  badgeAmount: {
    fontSize: 12,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  badgeSlot: {
    fontSize: 8,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  badgeR: {
    fontSize: 7,
    fontWeight: '700',
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 2,
  },
  winnerTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 6,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#d1fae5',
  },
  winnerAvatar: {
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  winnerAvatarText: {
    fontSize: 7,
    fontWeight: '900',
    color: '#fff',
  },
  winnerName: {
    fontSize: 9,
    fontWeight: '900',
    color: '#1e293b',
  },
  jarSection: {
    alignItems: 'center',
    zIndex: 10,
    marginBottom: 20,
  },
  lidWrap: {
    alignItems: 'center',
    zIndex: 20,
    marginBottom: -2,
  },
  lidKnob: {
    width: 32,
    height: 16,
    backgroundColor: JAR_DEEP,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 2,
    borderColor: '#34d399',
  },
  lidCap: {
    width: 96,
    height: 22,
    backgroundColor: JAR_DARK,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    borderBottomWidth: 4,
    borderBottomColor: JAR_DEEP,
    alignItems: 'center',
    justifyContent: 'center',
  },
  jarTouch: {
    position: 'relative',
    alignItems: 'center',
  },
  jarGlowStripe: {
    position: 'absolute',
    top: -6,
    width: 56,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(52,211,153,0.3)',
    zIndex: 5,
  },
  jarInnerGlow: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(52,211,153,0.25)',
  },
  jarTextWrap: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  jarLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#6ee7b7',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  jarAction: {
    fontSize: 16,
    fontWeight: '900',
    color: '#fff',
    marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  resultsPanel: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#d1fae5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
    marginTop: 8,
    gap: 6,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 8,
  },
  resultsTitle: {
    flex: 1,
    fontSize: 10,
    fontWeight: '900',
    color: JAR_DARK,
    letterSpacing: 0.5,
  },
  resultsCount: {
    fontSize: 9,
    fontWeight: '700',
    color: JAR_DARK,
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(236,253,245,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(209,250,229,0.5)',
  },
  resultRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resultAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultAvatarText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#fff',
  },
  resultName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1e293b',
  },
  resultRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resultSlot: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
  resultAmount: {
    fontSize: 11,
    fontWeight: '900',
    color: JAR_DARK,
    backgroundColor: 'rgba(209,250,229,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  statusRow: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#064e3b',
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#d1fae5',
  },
  statsRow: {
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  statsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#00966C',
    paddingHorizontal: 32,
    paddingVertical: 8,
    borderRadius: 999,
  },
  statsBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.5,
  },
  statsWinners: {
    fontSize: 20,
    fontWeight: '900',
    color: JAR_DEEP,
    marginTop: 4,
  },
  statsSub: {
    fontSize: 9,
    fontWeight: '800',
    color: 'rgba(0,92,69,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    width: '100%',
    maxWidth: 380,
  },
  mainBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: JAR_DARK,
    alignItems: 'center',
  },
  mainBtnClose: {
    backgroundColor: '#1e293b',
  },
  mainBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.5,
  },
  mainBtnTextClose: {
    color: '#fff',
  },
  resetBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1fae5',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
