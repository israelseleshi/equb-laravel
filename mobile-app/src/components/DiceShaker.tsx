import { useState, useRef, useCallback, useEffect, useImperativeHandle, forwardRef, useMemo } from 'react'
import { View, StyleSheet, Animated, Easing, Vibration, Dimensions, Platform } from 'react-native'
import { Accelerometer } from 'expo-sensors'
import Svg, { Path, Rect, Circle, Ellipse, Text as SvgText, Defs, LinearGradient, Stop, G } from 'react-native-svg'
import { colors } from '../theme'
import { Text } from './ui/AppText'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const CUP_SIZE = Math.min(SCREEN_WIDTH * 0.58, 210)

const BRAND_GREEN = '#059669'
const BRAND_GREEN_MID = '#047857'
const BRAND_GREEN_DARK = '#065f46'
const BRAND_GREEN_LIGHT = '#10b981'
const DARK_GREEN = '#1B725A'

const CONFETTI_COLORS = ['#059669', '#10b981', '#34d399', '#f59e0b', '#fbbf24', '#fff']
const CONFETTI_COUNT = 28

const ORBIT_RADIUS = CUP_SIZE * 0.7
const ORBIT_SLOTS = [
  { id: 1, label: '1', angle: 0, color: '#059669' },
  { id: 2, label: '2', angle: 72, color: '#10b981' },
  { id: 3, label: '3', angle: 144, color: '#34d399' },
  { id: 4, label: '4', angle: 216, color: '#047857' },
  { id: 5, label: '5', angle: 288, color: '#065f46' },
]

const SHAKE_THRESHOLD = 2.0
const SHAKE_DEBOUNCE_MS = 800

interface ShakeWinner {
  slot_id: number
  slot_number: number
  user_name?: string
  category: string
  round_id: number | null
  user_id: number
  round?: number
  round_number?: number
}

interface ShakeResult {
  draw: unknown
  winner: ShakeWinner
  winners?: ShakeWinner[]
  total_eligible: number
}

export interface DiceShakerHandle {
  shake: () => void
  shakeWithResult: (result: ShakeResult) => void
}

interface DiceShakerProps {
  onShake?: () => Promise<ShakeResult>
  onShakeStart?: () => void
  onShakeEnd?: (result: ShakeResult) => void
  eligibleCount?: number
  disabled?: boolean
  category?: string
  isAmharic?: boolean
}

type Phase = 'idle' | 'shaking' | 'reveal' | 'result'

export const DiceShaker = forwardRef<DiceShakerHandle, DiceShakerProps>(function DiceShaker({
  onShake,
  onShakeStart,
  onShakeEnd,
  eligibleCount = 0,
  disabled = false,
  category,
  isAmharic = false,
}, ref) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [result, setResult] = useState<ShakeResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const shakeAnim = useRef(new Animated.Value(0)).current
  const revealProgress = useRef(new Animated.Value(0)).current
  const confettiAnim = useRef(new Animated.Value(0)).current
  const orbitAnim = useRef(new Animated.Value(0)).current
  const floatPhase = useRef(new Animated.Value(0)).current
  const winnersOrbitAnim = useRef(new Animated.Value(0)).current
  const lidAnim = useRef(new Animated.Value(0)).current
  const tokenPopAnim = useRef(new Animated.Value(0)).current
  const isAnimating = useRef(false)
  const lastShakeTime = useRef(0)
  const resultRef = useRef(result)

  resultRef.current = result

  const allWinners = result?.winners ?? (result?.winner ? [result.winner] : [])

  /* ─── Confetti particles ─── */
  const confettiParticles = useMemo(() =>
    Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
      id: i,
      x: Math.random() * SCREEN_WIDTH * 0.9 - SCREEN_WIDTH * 0.45,
      y: -(Math.random() * 200 + 50),
      rotation: Math.random() * 360,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      delay: Math.random() * 500,
      duration: 2000 + Math.random() * 1500,
      size: 6 + Math.random() * 8,
      wobble: Math.random() * 20 - 10,
    })),
  [])

  const totalWinners = allWinners.length

  const shakeInterpolation = shakeAnim.interpolate({
    inputRange: [0, 0.1, 0.2, 0.4, 0.6, 0.75, 0.85, 0.95, 1],
    outputRange: ['0deg', '360deg', '720deg', '1080deg', '1440deg', '1800deg', '1080deg', '360deg', '0deg'],
  })

  const floatOffsetY = floatPhase.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, -8, 0],
  })

  const WINNER_TOKEN_COLORS = [
    ['#059669', '#047857'],
    ['#10b981', '#059669'],
    ['#34d399', '#10b981'],
    ['#047857', '#065f46'],
    ['#0d9488', '#0f766e'],
    ['#065f46', '#047857'],
    ['#059669', '#065f46'],
    ['#10b981', '#047857'],
    ['#34d399', '#059669'],
    ['#0d9488', '#059669'],
  ]

  const isIdle = phase === 'idle'
  const isShaking = phase === 'shaking'
  const isRevealing = phase === 'reveal'
  const isResult = phase === 'result'
  const showButton = isIdle || isResult

  const startConfetti = useCallback(() => {
    confettiAnim.setValue(0)
    Animated.timing(confettiAnim, {
      toValue: 1,
      duration: 3000,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start()
  }, [confettiAnim])

  const startFloatLoop = useCallback(() => {
    floatPhase.setValue(0)
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatPhase, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(floatPhase, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
      { iterations: -1 },
    ).start()
  }, [floatPhase])

  const startOrbitLoop = useCallback(() => {
    orbitAnim.setValue(0)
    Animated.loop(
      Animated.timing(orbitAnim, {
        toValue: 1,
        duration: 1400,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start()
  }, [orbitAnim])

  const stopOrbitLoop = useCallback(() => {
    orbitAnim.setValue(0)
  }, [orbitAnim])

  const orbitAngle = orbitAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  const startWinnersOrbit = useCallback(() => {
    winnersOrbitAnim.setValue(0)
    Animated.loop(
      Animated.timing(winnersOrbitAnim, {
        toValue: 1,
        duration: 6000 + totalWinners * 500,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start()
  }, [winnersOrbitAnim, totalWinners])

  const stopWinnersOrbit = useCallback(() => {
    winnersOrbitAnim.setValue(0)
  }, [winnersOrbitAnim])

  const winnersOrbitAngle = winnersOrbitAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  const winnersCounterAngle = winnersOrbitAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-360deg'],
  })

  const lidAngle = lidAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-22deg'],
  })

  const lidTranslateY = lidAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -2],
  })

  const tokenPopY = tokenPopAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, -30, -65],
  })

  const tokenPopScale = tokenPopAnim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0.2, 0.7, 1],
  })

  const tokenPopOpacity = tokenPopAnim.interpolate({
    inputRange: [0, 0.25, 0.6, 1],
    outputRange: [0, 0, 1, 1],
  })

  function getWinnerOrbitRadius(total: number): number {
    if (total <= 1) return 0
    if (total <= 2) return 62
    if (total <= 3) return 74
    if (total <= 4) return 82
    if (total <= 6) return 92
    return 100
  }

  function getWinnerBaseAngle(index: number, total: number): number {
    if (total === 1) return -90
    if (total === 2) return index === 0 ? -90 : 90
    return (index / total) * 360 - 90
  }

  const revealAllWinners = useCallback(() => {
    startConfetti()
    Vibration.vibrate(60)
    revealProgress.setValue(0)

    Animated.spring(revealProgress, {
      toValue: 1,
      stiffness: 60,
      damping: 14,
      useNativeDriver: true,
    }).start(() => {
      setPhase('result')
      isAnimating.current = false
      startFloatLoop()
      startWinnersOrbit()
    })
  }, [revealProgress, startConfetti, startFloatLoop, startWinnersOrbit])

  const animateToReveal = useCallback(() => {
    Vibration.vibrate(200)
    revealProgress.setValue(0)
    lidAnim.setValue(0)
    tokenPopAnim.setValue(0)
    setPhase('shaking')
    startOrbitLoop()

    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 150,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(lidAnim, {
        toValue: 1,
        duration: 350,
        easing: Easing.out(Easing.circle),
        useNativeDriver: true,
      }),
      Animated.spring(tokenPopAnim, {
        toValue: 1,
        stiffness: 100,
        damping: 12,
        useNativeDriver: true,
      }),
      Animated.delay(600),
    ]).start(() => {
      stopOrbitLoop()
      setPhase('reveal')
      Vibration.vibrate(100)
      revealAllWinners()
    })
  }, [shakeAnim, revealProgress, revealAllWinners, startOrbitLoop, stopOrbitLoop, lidAnim, tokenPopAnim])

  const startShake = useCallback(async () => {
    if (isAnimating.current || disabled) return
    isAnimating.current = true
    setResult(null)
    setError(null)

    if (onShake) {
      try {
        const res = await onShake()
        if (!res || !res.winner || !res.winners || res.winners.length === 0) {
          setError(isAmharic ? 'ዕጣ አልተገኘም' : 'No draw result')
          isAnimating.current = false
          return
        }
        setResult(res)
        onShakeStart?.()
        animateToReveal()
        onShakeEnd?.(res)
      } catch (e: any) {
        setError(e?.message || (isAmharic ? 'ዕጣ ማውጣት አልተሳካም' : 'Draw failed'))
        isAnimating.current = false
      }
    } else {
      onShakeStart?.()
      animateToReveal()
    }
  }, [disabled, onShake, onShakeStart, onShakeEnd, animateToReveal])

  useEffect(() => {
    let subscription: { remove: () => void } | null = null

    const handleMotion = ({ x, y, z }: { x: number; y: number; z: number }) => {
      const magnitude = Math.sqrt(x * x + y * y + z * z)
      const now = Date.now()

      if (magnitude > SHAKE_THRESHOLD && now - lastShakeTime.current > SHAKE_DEBOUNCE_MS) {
        lastShakeTime.current = now
        if (!isAnimating.current && !disabled && phase === 'idle') {
          Vibration.vibrate(50)
          startShake()
        }
      }
    }

    if (Platform.OS !== 'web') {
      subscription = Accelerometer.addListener(handleMotion)
      Accelerometer.setUpdateInterval(100)
    }

    return () => {
      subscription?.remove()
    }
  }, [disabled, phase, startShake])

  const shakeWithResult = useCallback((result: ShakeResult) => {
    if (isAnimating.current) return
    isAnimating.current = true
    setResult(result)
    setError(null)
    onShakeStart?.()
    animateToReveal()
    onShakeEnd?.(result)
  }, [animateToReveal, onShakeStart, onShakeEnd])

  useImperativeHandle(ref, () => ({
    shake: startShake,
    shakeWithResult,
  }), [startShake, shakeWithResult])

  const shakeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearShakeTimeout = useCallback(() => {
    if (shakeTimeoutRef.current) {
      clearTimeout(shakeTimeoutRef.current)
      shakeTimeoutRef.current = null
    }
  }, [])

  const safeResetAnimating = useCallback(() => {
    isAnimating.current = false
    clearShakeTimeout()
  }, [clearShakeTimeout])

  useEffect(() => {
    if (isAnimating.current) {
      const timeoutMs = 3000 + 150 + 400 + 500 + 600 + 2500 + allWinners.length * 250
      shakeTimeoutRef.current = setTimeout(() => {
        safeResetAnimating()
        setPhase('idle')
      }, timeoutMs)
    }
    return clearShakeTimeout
  }, [phase, allWinners.length, safeResetAnimating, clearShakeTimeout])

  const handleShakePress = useCallback(() => {
    clearShakeTimeout()
    startShake()
  }, [startShake, clearShakeTimeout])

  const handleReset = useCallback(() => {
    clearShakeTimeout()
    setPhase('idle')
    setResult(null)
    setError(null)
    isAnimating.current = false
    shakeAnim.setValue(0)
    revealProgress.setValue(0)
    floatPhase.setValue(0)
    orbitAnim.setValue(0)
    winnersOrbitAnim.setValue(0)
    lidAnim.setValue(0)
    tokenPopAnim.setValue(0)
  }, [shakeAnim, revealProgress, floatPhase, orbitAnim, winnersOrbitAnim, lidAnim, tokenPopAnim, clearShakeTimeout])

  const cupContent = (() => {
    if (isShaking) {
      return (
        <View style={styles.tokenCluster}>
          {[0, 1, 2].map(i => (
            <Animated.View
              key={i}
              style={[
                styles.miniToken,
                {
                  backgroundColor: [BRAND_GREEN, '#10b981', '#34d399'][i],
                  transform: [{ translateY: shakeAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, -4 + i * 3, 0],
                  }) }],
                },
              ]}
            />
          ))}
        </View>
      )
    }
    return (
      <View style={styles.tokenCluster}>
        <View style={[styles.miniToken, { backgroundColor: BRAND_GREEN }]} />
        <View style={[styles.miniToken, { backgroundColor: '#10b981' }]} />
        <View style={[styles.miniToken, { backgroundColor: '#34d399' }]} />
      </View>
    )
  })()

  return (
    <View style={styles.container}>
      {/* ─── Confetti Overlay ─── */}
      {isRevealing || isResult ? (
        <View style={styles.confettiOverlay} pointerEvents="none">
          {confettiParticles.map((p) => {
            const particleY = confettiAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [p.y, 400 + p.y],
            })
            const particleRotate = confettiAnim.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [`${p.rotation}deg`, `${p.rotation + 180}deg`, `${p.rotation + 360}deg`],
            })
            const particleOpacity = confettiAnim.interpolate({
              inputRange: [0, 0.6, 1],
              outputRange: [1, 1, 0],
            })
            return (
              <Animated.View
                key={p.id}
                style={{
                  position: 'absolute',
                  left: `50%`,
                  width: p.size,
                  height: p.size * 0.6,
                  backgroundColor: p.color,
                  borderRadius: 2,
                  opacity: particleOpacity,
                  transform: [
                    { translateX: p.x + p.wobble },
                    { translateY: particleY },
                    { rotate: particleRotate },
                  ],
                }}
              />
            )
          })}
        </View>
      ) : null}

      <View style={styles.cupArea}>
        <Animated.View
          style={[
            styles.cupWrapper,
            isShaking && { transform: [{ rotate: shakeInterpolation }] },
          ]}
        >
            {/* ─── Clay Pot Body ─── */}
            <Svg width={CUP_SIZE} height={CUP_SIZE * 1.26} viewBox="0 0 200 200">
              <Defs>
                <LinearGradient id="clayBodyGrad" x1="0.15" y1="0.1" x2="0.8" y2="0.95">
                  <Stop offset="0%" stopColor={BRAND_GREEN_LIGHT} />
                  <Stop offset="35%" stopColor={BRAND_GREEN} />
                  <Stop offset="75%" stopColor={BRAND_GREEN_MID} />
                  <Stop offset="100%" stopColor={BRAND_GREEN_DARK} />
                </LinearGradient>
              </Defs>

              {/* Background drop shadow of neck rim inside the pot opening */}
              <Ellipse cx="100" cy="54" rx="28" ry="4.5" fill={BRAND_GREEN_DARK} />

              {/* Main Bulbous Clay Shakla Pot Body */}
              <Path
                d="M 74 54 C 74 54, 70 54, 66 54 C 61 54, 58 58, 62 64 L 72 80 C 72 80, 20 94, 20 138 C 20 184, 58 194, 100 194 C 142 194, 180 184, 180 138 C 180 94, 128 80, 128 80 L 138 64 C 142 58, 139 54, 134 54 C 130 54, 126 54, 126 54 Z"
                fill="url(#clayBodyGrad)"
                stroke={BRAND_GREEN_DARK}
                strokeWidth="2.5"
              />

              {/* Flared Outer Collar/Neck Lip of the pot */}
              <Path
                d="M 64 54 Q 100 58 136 54 C 140 54, 141 57, 136 60 Q 100 64 64 60 C 59 57, 60 54, 64 54 Z"
                fill={BRAND_GREEN}
                stroke={BRAND_GREEN_DARK}
                strokeWidth="1.5"
              />

              {/* Neck concentric rings (grooves) */}
              <Path d="M 71 70 Q 100 74 129 70" stroke={BRAND_GREEN_DARK} strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.8" />
              <Path d="M 71 71 Q 100 75 129 71" stroke="#fff" strokeWidth="0.75" strokeLinecap="round" fill="none" opacity="0.4" />
              <Path d="M 69 76 Q 100 81 131 76" stroke={BRAND_GREEN_DARK} strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.8" />
              <Path d="M 69 77 Q 100 82 131 77" stroke="#fff" strokeWidth="0.75" strokeLinecap="round" fill="none" opacity="0.4" />

              {/* Shoulder Band of Etched Zigzags */}
              <Path
                d="M 44 98 L 55 83 L 66 99 L 78 84 L 90 100 L 102 85 L 114 100 L 126 84 L 138 99 L 149 83 L 160 98"
                stroke={BRAND_GREEN_DARK}
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                opacity="0.9"
              />
              <Path
                d="M 44 99 L 55 84 L 66 100 L 78 85 L 90 101 L 102 86 L 114 101 L 126 85 L 138 100 L 149 84 L 160 99"
                stroke="#fff"
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                opacity="0.45"
              />

              {/* Middle Belly Horizontal Concentric Groove Band */}
              <Path d="M 23 118 Q 100 128 177 118" stroke={BRAND_GREEN_DARK} strokeWidth="3" fill="none" opacity="0.95" />
              <Path d="M 23 119 Q 100 129 177 119" stroke="#fff" strokeWidth="1" fill="none" opacity="0.5" />
              <Path d="M 22 125 Q 100 135 178 125" stroke={BRAND_GREEN_DARK} strokeWidth="3" fill="none" opacity="0.95" />
              <Path d="M 22 126 Q 100 136 178 126" stroke="#fff" strokeWidth="1" fill="none" opacity="0.5" />

              {/* Lower Belly Diagonal Chevron Hatching */}
              <Path d="M 36 156 L 48 138" stroke={BRAND_GREEN_DARK} strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />
              <Path d="M 36.5 157 L 48.5 139" stroke="#fff" strokeWidth="0.75" strokeLinecap="round" opacity="0.3" />
              <Path d="M 42 159 L 54 141" stroke={BRAND_GREEN_DARK} strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />
              <Path d="M 42.5 160 L 54.5 142" stroke="#fff" strokeWidth="0.75" strokeLinecap="round" opacity="0.3" />
              <Path d="M 48 162 L 60 144" stroke={BRAND_GREEN_DARK} strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />
              <Path d="M 48.5 163 L 60.5 145" stroke="#fff" strokeWidth="0.75" strokeLinecap="round" opacity="0.3" />
              <Path d="M 64 144 L 76 162" stroke={BRAND_GREEN_DARK} strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />
              <Path d="M 64.5 145 L 76.5 163" stroke="#fff" strokeWidth="0.75" strokeLinecap="round" opacity="0.3" />
              <Path d="M 70 141 L 82 159" stroke={BRAND_GREEN_DARK} strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />
              <Path d="M 70.5 142 L 82.5 160" stroke="#fff" strokeWidth="0.75" strokeLinecap="round" opacity="0.3" />
              <Path d="M 76 138 L 88 156" stroke={BRAND_GREEN_DARK} strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />
              <Path d="M 76.5 139 L 88.5 157" stroke="#fff" strokeWidth="0.75" strokeLinecap="round" opacity="0.3" />
              <Path d="M 92 163 L 104 145" stroke={BRAND_GREEN_DARK} strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />
              <Path d="M 92.5 164 L 104.5 146" stroke="#fff" strokeWidth="0.75" strokeLinecap="round" opacity="0.3" />
              <Path d="M 98 163 L 110 145" stroke={BRAND_GREEN_DARK} strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />
              <Path d="M 98.5 164 L 110.5 146" stroke="#fff" strokeWidth="0.75" strokeLinecap="round" opacity="0.3" />
              <Path d="M 104 163 L 116 145" stroke={BRAND_GREEN_DARK} strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />
              <Path d="M 104.5 164 L 116.5 146" stroke="#fff" strokeWidth="0.75" strokeLinecap="round" opacity="0.3" />
              <Path d="M 120 145 L 132 163" stroke={BRAND_GREEN_DARK} strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />
              <Path d="M 120.5 146 L 132.5 164" stroke="#fff" strokeWidth="0.75" strokeLinecap="round" opacity="0.3" />
              <Path d="M 126 141 L 138 159" stroke={BRAND_GREEN_DARK} strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />
              <Path d="M 126.5 142 L 138.5 160" stroke="#fff" strokeWidth="0.75" strokeLinecap="round" opacity="0.3" />
              <Path d="M 132 138 L 144 156" stroke={BRAND_GREEN_DARK} strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />
              <Path d="M 132.5 139 L 144.5 157" stroke="#fff" strokeWidth="0.75" strokeLinecap="round" opacity="0.3" />
              <Path d="M 148 162 L 160 144" stroke={BRAND_GREEN_DARK} strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />
              <Path d="M 148.5 163 L 160.5 145" stroke="#fff" strokeWidth="0.75" strokeLinecap="round" opacity="0.3" />
              <Path d="M 154 159 L 166 141" stroke={BRAND_GREEN_DARK} strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />
              <Path d="M 154.5 160 L 166.5 142" stroke="#fff" strokeWidth="0.75" strokeLinecap="round" opacity="0.3" />
              <Path d="M 160 156 L 172 138" stroke={BRAND_GREEN_DARK} strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />
              <Path d="M 160.5 157 L 172.5 139" stroke="#fff" strokeWidth="0.75" strokeLinecap="round" opacity="0.3" />

              {/* Matte glare highlight on left shoulder */}
              <Path d="M 40 102 C 32 118, 32 144, 52 168" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" opacity="0.16" fill="none" />

              {/* Grounding contact shadow */}
              <Ellipse cx="100" cy="191" rx="42" ry="3.5" fill={BRAND_GREEN_DARK} opacity="0.6" />
            </Svg>

            {/* ─── Animated Clay Lid ─── */}
          <Animated.View
            style={[
              styles.lidWrap,
              {
                transform: [
                  { perspective: 700 },
                  { rotateX: lidAngle },
                  { translateY: lidTranslateY },
                ],
              },
            ]}
            pointerEvents="none"
          >
            <Svg width={CUP_SIZE} height={CUP_SIZE * 0.28} viewBox="0 0 200 60">
              <Defs>
                <LinearGradient id="clayLidGrad" x1="0.2" y1="0" x2="0.8" y2="1">
                  <Stop offset="0%" stopColor={BRAND_GREEN_LIGHT} />
                  <Stop offset="40%" stopColor={BRAND_GREEN} />
                  <Stop offset="90%" stopColor={BRAND_GREEN_MID} />
                  <Stop offset="100%" stopColor={BRAND_GREEN_DARK} />
                </LinearGradient>
              </Defs>

              {/* Lid Top Knob */}
              <Circle cx="100" cy="18" r="7" fill="url(#clayLidGrad)" stroke={BRAND_GREEN_DARK} strokeWidth="1.75" />
              <Circle cx="97.5" cy="16" r="2.2" fill="#fff" opacity="0.35" />

              {/* Lid Neck/Collar support under knob */}
              <Path d="M 92 25 C 92 25, 95 21, 100 21 C 105 21, 108 25, 108 25 Z" fill={BRAND_GREEN_MID} stroke={BRAND_GREEN_DARK} strokeWidth="1.2" />

              {/* Main Lid Dome */}
              <Path d="M 64 42 C 64 20, 136 20, 136 42 Z" fill="url(#clayLidGrad)" stroke={BRAND_GREEN_DARK} strokeWidth="2.2" />

              {/* Concentric Step/Ridge on Lid */}
              <Path d="M 76 34 C 76 24, 124 24, 124 34" stroke={BRAND_GREEN_DARK} strokeWidth="2" fill="none" opacity="0.85" />
              <Path d="M 76 34 C 76 24, 124 24, 124 34" stroke={BRAND_GREEN_LIGHT} strokeWidth="0.75" fill="none" opacity="0.5" />

              {/* Lid Flared Base Lip */}
              <Path d="M 58 42 C 58 40, 142 40, 142 42 L 138 48 C 138 48, 130 50, 100 50 C 70 50, 62 48, 62 48 Z" fill="url(#clayLidGrad)" stroke={BRAND_GREEN_DARK} strokeWidth="2.2" />

              {/* Soft light highlight on left curve of lid */}
              <Path d="M 68 40 C 68 30, 88 26, 100 26" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.3" />
            </Svg>
          </Animated.View>

          <View style={[styles.eligibleBadge, eligibleCount === 0 && { backgroundColor: '#94a3b8' }]}>
            <Text style={styles.eligibleCount}>{eligibleCount}</Text>
            <Text style={styles.eligibleLabel}>{isAmharic ? 'ተፎካካሪ' : 'entries'}</Text>
          </View>
        </Animated.View>

        {/* ─── Orbiting Slot Dice ─── */}
        {isShaking ? (
          <Animated.View style={[styles.orbitRing, { transform: [{ rotate: orbitAngle }] }]} pointerEvents="none">
            {ORBIT_SLOTS.map((slot) => {
              const angleRad = (slot.angle * Math.PI) / 180
              return (
                <Animated.View
                  key={slot.id}
                  style={[
                    styles.orbitDice,
                    {
                      backgroundColor: slot.color,
                      transform: [
                        { translateX: Math.cos(angleRad) * ORBIT_RADIUS },
                        { translateY: Math.sin(angleRad) * ORBIT_RADIUS },
                      ],
                    },
                  ]}
                >
                  <Text style={styles.orbitDiceText}>{slot.label}</Text>
                </Animated.View>
              )
            })}
          </Animated.View>
        ) : null}

        {/* ─── Winner Tokens Pop-out from Jar ─── */}
        {isRevealing || isResult ? (
          <View style={styles.winnersArena} pointerEvents="none">
            {allWinners.map((w, i) => {
              const colors = WINNER_TOKEN_COLORS[i % WINNER_TOKEN_COLORS.length]
              const delay = i * 0.12

              const revealOpacity = revealProgress.interpolate({
                inputRange: [delay, delay + 0.2],
                outputRange: [0, 1],
                extrapolate: 'clamp',
              })
              const revealTranslateY = revealProgress.interpolate({
                inputRange: [delay, delay + 0.35],
                outputRange: [0, -(70 + i * 72)],
                extrapolate: 'clamp',
              })
              const revealScale = revealProgress.interpolate({
                inputRange: [delay, delay + 0.3],
                outputRange: [0.2, 1],
                extrapolate: 'clamp',
              })

              return (
                <Animated.View
                  key={w.slot_id}
                  style={[
                    styles.winnerPopAnchor,
                    {
                      opacity: revealOpacity,
                      transform: [
                        { translateY: revealTranslateY },
                        { scale: revealScale },
                      ],
                    },
                  ]}
                >
                  <View style={[styles.winnerDice, { backgroundColor: colors[0], shadowColor: colors[0] }]}>
                    <View style={[styles.winnerDiceGloss, { borderColor: colors[1] }]} />
                    <Text style={styles.winnerDiceCategory}>{w.category} ETB</Text>
                    <Text style={styles.winnerDiceSlot}>SLOT #{w.slot_number}</Text>
                    <Text style={styles.winnerDiceRound}>R-{w.round_number ?? 1}</Text>
                  </View>
                </Animated.View>
              )
            })}
          </View>
        ) : null}

        {/* ─── Result Banner ─── */}
        {isResult ? (
          <Animated.View
            style={[
              styles.resultBanner,
              {
                opacity: revealProgress.interpolate({
                  inputRange: [0.5, 0.8],
                  outputRange: [0, 1],
                  extrapolate: 'clamp',
                }),
              },
            ]}
          >
            <Text style={styles.resultBannerText}>
              {totalWinners} {isAmharic ? 'አሸናፊ' : totalWinners === 1 ? 'Winner' : 'Winners'}
            </Text>
            <Text style={styles.resultBannerMeta}>
              {result?.total_eligible ?? 0} {isAmharic ? 'ተፎካካሪዎች' : 'eligible entries'}
            </Text>
          </Animated.View>
        ) : null}
      </View>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : null}

      {isIdle && !disabled && (
        <View style={styles.shakeHint}>
          <Text style={styles.shakeHintText}>
            {isAmharic ? 'ስልክዎን ያንቀሳቁ' : 'Shake your phone to draw'}
          </Text>
        </View>
      )}
    </View>
  )
})

export { DiceShaker as DiceShakerComponent }
export type { ShakeResult }

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
    gap: 16,
  },
  cupArea: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: CUP_SIZE * 1.18 + 160,
    width: '100%',
  },
  cupWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  lidWrap: {
    position: 'absolute',
    top: CUP_SIZE * 0.12,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  cupInner: {
    position: 'absolute',
    top: CUP_SIZE * 0.28,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tokenCluster: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniToken: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: DARK_GREEN,
  },
  eligibleBadge: {
    position: 'absolute',
    bottom: -10,
    backgroundColor: BRAND_GREEN,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  eligibleCount: {
    fontSize: 16,
    fontWeight: '900',
    color: '#fff',
  },
  eligibleLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
  },
  poppedToken: {
    position: 'absolute',
    top: CUP_SIZE * 0.12,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  poppedTokenInner: {
    width: 90,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignItems: 'center',
    gap: 2,
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.5)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  poppedTokenGlow: {
    position: 'absolute',
    top: -6,
    left: 18,
    right: 18,
    height: 14,
    borderRadius: 14,
    opacity: 0.3,
  },
  poppedTokenCategory: {
    fontSize: 14,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.3,
  },
  poppedTokenSlot: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
    opacity: 0.95,
  },
  poppedTokenRound: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    opacity: 0.85,
  },
  winnersArena: {
    position: 'absolute',
    top: CUP_SIZE * 0.05,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 15,
  },
  winnerPopAnchor: {
    position: 'absolute',
    top: CUP_SIZE * 0.42,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  winnerDice: {
    width: 78,
    height: 78,
    borderRadius: 39,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
    overflow: 'hidden',
  },
  winnerDiceGloss: {
    position: 'absolute',
    top: 4,
    left: 6,
    right: 6,
    height: 30,
    borderRadius: 30,
    borderWidth: 2,
    opacity: 0.18,
  },
  winnerDiceCategory: {
    fontSize: 13,
    fontWeight: '900',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  winnerDiceSlot: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
    opacity: 0.96,
    marginTop: 1,
  },
  winnerDiceRound: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    opacity: 0.85,
  },
  resultBanner: {
    marginTop: 8,
    alignItems: 'center',
    gap: 2,
  },
  resultBannerText: {
    fontSize: 13,
    fontWeight: '800',
    color: DARK_GREEN,
  },
  resultBannerMeta: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
  shakeHint: {
    marginTop: 8,
    backgroundColor: '#E6F4EA',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shakeHintText: {
    fontSize: 13,
    fontWeight: '700',
    color: BRAND_GREEN_DARK,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 12,
    color: colors.destructive,
    textAlign: 'center',
  },
  confettiOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 50,
    overflow: 'hidden',
  },
  orbitRing: {
    position: 'absolute',
    top: CUP_SIZE * 0.5 - 16,
    left: CUP_SIZE * 0.5 - 16,
    width: 32,
    height: 32,
    zIndex: 5,
  },
  orbitDice: {
    position: 'absolute',
    top: -12,
    left: -12,
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  orbitDiceText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#fff',
  },
})
