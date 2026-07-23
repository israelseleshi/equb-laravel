import { useState, useEffect, useRef, useCallback } from 'react'
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Path, Rect, Ellipse, Defs, LinearGradient as SvgGradient, RadialGradient as SvgRadialGradient, Stop, Polyline } from 'react-native-svg'
import { Text } from './ui/AppText'
import { useTranslation } from '../i18n/useTranslation'

const JAR_BODY = '#007A5E'
const JAR_DARK = '#005C45'
const JAR_DEEP = '#004D38'

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

export interface Prize {
  id: string
  amount: string
  slot: string
  r: string
  color: string
}

export interface Participant {
  id: string
  name: string
  avatarColor: string
}

export interface LuckyJarSectionProps {
  prizes?: Prize[]
  participants?: Participant[]
  eligibleCount?: number
}

const ORBIT_RADIUS = 155
const BADGE_SIZE = 84
const SHAKE_DURATION = 5000

const SHAKE_POINTS = 100
const shakeInputRange = Array.from({ length: SHAKE_POINTS + 1 }, (_, i) => i / SHAKE_POINTS)
const shakeOutputRange = Array.from({ length: SHAKE_POINTS + 1 }, (_, i) => {
  const progress = i / SHAKE_POINTS
  const envelope = Math.min(progress * 2.5, 1)
  const amplitude = 25 * envelope
  const phase = i * 2.5
  return Math.round(Math.sin(phase * Math.PI) * amplitude)
})

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
  item: Prize
  index: number
  total: number
  isOpen: boolean
  releasedIndexes: number[]
  winner?: { name: string; avatarColor: string }
  delay: number
}) {
  const posAnim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current
  const scaleAnim = useRef(new Animated.Value(0)).current
  const opacityAnim = useRef(new Animated.Value(0)).current
  const floatPhase = useRef(new Animated.Value(0)).current
  const isReleased = releasedIndexes.includes(index)

  useEffect(() => {
    if (isReleased && isOpen) {
      const coords = getCircularPosition(index, total)

      const popOut = Animated.parallel([
        Animated.spring(posAnim, {
          toValue: { x: 0, y: -80 },
          stiffness: 180,
          damping: 14,
          delay,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          stiffness: 200,
          damping: 12,
          delay,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 120,
          delay,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])

      const floatToOrbit = Animated.spring(posAnim, {
        toValue: { x: coords.x, y: coords.y },
        stiffness: 40,
        damping: 14,
        useNativeDriver: Platform.OS !== 'web',
      })

      Animated.sequence([popOut, floatToOrbit]).start()
    } else if (!isOpen) {
      Animated.parallel([
        Animated.timing(posAnim, { toValue: { x: 0, y: 0 }, duration: 150, useNativeDriver: Platform.OS !== 'web' }),
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

export function LuckyJarSection({
  prizes: propPrizes,
  participants: propParticipants,
  eligibleCount: propEligibleCount,
}: LuckyJarSectionProps) {
  const { lang } = useTranslation()
  const prizes = propPrizes || DEFAULT_PRIZES
  const participants = propParticipants || DEFAULT_PARTICIPANTS
  const [isOpen, setIsOpen] = useState(false)
  const [isShaking, setIsShaking] = useState(false)
  const [releasedIndexes, setReleasedIndexes] = useState<number[]>([])
  const [isReleasing, setIsReleasing] = useState(false)
  const [assignments, setAssignments] = useState<Record<string, { name: string; avatarColor: string }>>({})

  const lidAnim = useRef(new Animated.Value(0)).current
  const glowAnim = useRef(new Animated.Value(0)).current
  const shakeAnim = useRef(new Animated.Value(0)).current
  const timeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([])
  const lastShakeTime = useRef(0)
  const shakeDetector = useRef<{ remove: () => void } | null>(null)

  const shakeX = shakeAnim.interpolate({
    inputRange: shakeInputRange,
    outputRange: shakeOutputRange,
  })
  const shakeRotate = shakeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '7200deg'],
  })

  const clearTimeouts = useCallback(() => {
    timeoutRefs.current.forEach(clearTimeout)
    timeoutRefs.current = []
  }, [])

  const handleToggle = useCallback(() => {
    if (isReleasing || isShaking) return

    if (!isOpen) {
      setIsShaking(true)
      shakeAnim.setValue(0)

      Animated.timing(shakeAnim, {
        toValue: 1,
        duration: SHAKE_DURATION,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== 'web',
      }).start(() => {
        shakeAnim.setValue(0)
        setIsShaking(false)
        setIsOpen(true)
        setIsReleasing(true)
        setReleasedIndexes([])

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
          const releaseT = setTimeout(() => {
            setReleasedIndexes(prev => [...prev, i])
            const prize = prizes[i]
            const w = newAssignments[prize.id]
            if (i === prizes.length - 1) {
              const doneT = setTimeout(() => {
                setIsReleasing(false)
              }, 2200)
              timeoutRefs.current.push(doneT)
            }
          }, 200 + i * 900)
          timeoutRefs.current.push(releaseT)
        })
      })
    } else {
      clearTimeouts()
      setIsOpen(false)
      setIsReleasing(false)
      setReleasedIndexes([])
      setAssignments({})
      Animated.spring(lidAnim, {
        toValue: 0, stiffness: 300, damping: 20,
        useNativeDriver: Platform.OS !== 'web',
      }).start()
    }
  }, [isOpen, isReleasing, isShaking, prizes, participants, lang, clearTimeouts])

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

  const handleToggleRef = useRef(handleToggle)
  handleToggleRef.current = handleToggle

  useEffect(() => {
    if (Platform.OS === 'web') return
    let sub: { remove: () => void } | null = null
    try {
      const { Accelerometer } = require('expo-sensors')
      if (Accelerometer && Accelerometer.addListener) {
        Accelerometer.setUpdateInterval(150)
        sub = Accelerometer.addListener(({ x, y, z }: { x: number; y: number; z: number }) => {
          const mag = Math.sqrt(x * x + y * y + z * z)
          const now = Date.now()
          if (mag > 2.2 && now - lastShakeTime.current > 1000) {
            lastShakeTime.current = now
            handleToggleRef.current()
          }
        })
      }
    } catch {
      // Accelerometer not available
    }
    return () => {
      sub?.remove()
    }
  }, [])

  const lidY = lidAnim.interpolate({ inputRange: [0, 1], outputRange: [12, -53] })
  const lidRotate = lidAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-15deg'] })
  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.5] })

  return (
    <View style={styles.canvas}>
      <Animated.View style={[styles.arenaGlow, { opacity: glowOpacity }]} />

      {isOpen && <View style={styles.circlePath} />}

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

      <View style={styles.jarSection}>
        <Animated.View
          style={[
            styles.jarShakeContainer,
            isShaking && {
              transform: [
                { translateX: shakeX },
                { rotate: shakeRotate },
              ],
            },
          ]}
        >
          <Animated.View style={[styles.lidWrap, { transform: [{ translateY: lidY }, { rotate: lidRotate }] }]}>
            <View style={styles.lidKnob} />
            <View style={styles.lidCap} />
          </Animated.View>

          <TouchableOpacity onPress={handleToggle} activeOpacity={0.9} style={styles.jarTouch}>
            <View style={styles.jarGlowStripe} />

            <Svg width={208} height={176} viewBox="0 0 200 170">
              <Defs>
                <SvgRadialGradient id="jarBelly" cx="50%" cy="40%" r="55%">
                  <Stop offset="0%" stopColor="#00a86b" />
                  <Stop offset="60%" stopColor="#007a5e" />
                  <Stop offset="100%" stopColor="#003527" />
                </SvgRadialGradient>
                <SvgGradient id="zigZag" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor="#34d399" stopOpacity="0.5" />
                  <Stop offset="100%" stopColor="#004d38" stopOpacity="0.9" />
                </SvgGradient>
              </Defs>

              <Rect x="65" y="22" width="70" height="10" rx="3" fill="#005C45" />
              <Path
                d="M 68,32 L 132,32 C 145,55 178,65 178,105 C 178,145 142,165 100,165 C 58,165 22,145 22,105 C 22,65 55,55 68,32 Z"
                fill="url(#jarBelly)"
              />
              <Polyline
                points="32,80 44,65 56,80 68,65 80,80 92,65 104,80 116,65 128,80 140,65 152,80 164,65 168,80"
                fill="none"
                stroke="url(#zigZag)"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Path d="M 50,115 L 70,140 M 60,115 L 80,140 M 70,115 L 90,140" stroke="#fff" strokeWidth="2.5" strokeOpacity="0.15" strokeLinecap="round" />
              <Path d="M 150,115 L 130,140 M 140,115 L 120,140 M 130,115 L 110,140" stroke="#fff" strokeWidth="2.5" strokeOpacity="0.15" strokeLinecap="round" />
              <Path d="M 35,90 A 60,60 0 0,1 60,45" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.1" />
              <Ellipse cx="100" cy="163" rx="50" ry="4" fill={JAR_DEEP} opacity="0.4" />
            </Svg>

            <View style={styles.jarTextWrap} pointerEvents="none">
              <Text style={styles.jarLabel}>
                {isShaking
                  ? (lang === 'en' ? 'SPINNING...' : 'እየተዘዋወረ ነው...')
                  : isOpen
                    ? (lang === 'en' ? 'TAP TO CLOSE' : 'ለመዝጋት ንካ')
                    : (lang === 'en' ? 'TAP TO SPIN' : 'እጣ አውጣ')}
              </Text>
              <Text style={styles.jarAction}>
                {isShaking
                  ? ''
                  : isOpen
                    ? (lang === 'en' ? 'Open' : 'ክፍት ነው')
                    : (lang === 'en' ? 'Draw' : 'እጣ አውጣ')}
              </Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {isOpen && (
        <View style={styles.statsRow}>
          <View style={styles.statsBadge}>
            <Ionicons name="people" size={14} color="#fff" />
            <Text style={styles.statsBadgeText}>{(propEligibleCount || participants.length)} {lang === 'en' ? 'participants' : 'ተወዳዳሪዎች'}</Text>
          </View>
          <Text style={styles.statsWinners}>{prizes.length} {lang === 'en' ? 'Winners' : 'አሸናፊ'}</Text>
          <Text style={styles.statsSub}>{lang === 'en' ? 'Draw Board' : 'ዕጣ ማውጫ ሰሌዳ'}</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
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
    ...StyleSheet.absoluteFill,
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
  jarShakeContainer: {
    alignItems: 'center',
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
  statusRow: {
    alignItems: 'center',
    paddingVertical: 6,
    marginTop: -10,
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
    marginTop: -2,
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
})
