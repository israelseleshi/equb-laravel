import { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react'
import { View, StyleSheet, Animated, Easing } from 'react-native'
import Svg, { G, Path, Text as SvgText, Circle, Polygon } from 'react-native-svg'
import { colors } from '../theme'
import { Text } from './ui/AppText'

interface Sector {
  label: string
  fill: string
}

export interface SpinWheelHandle {
  spin: (slotNumber: number) => void
}

interface SpinWheelProps {
  onSpinEnd?: () => void
}

const SECTORS: Sector[] = [
  { label: '1-100', fill: '#0F4C3A' },
  { label: '101-200', fill: '#0B261E' },
  { label: '201-300', fill: '#1B725A' },
  { label: '301-400', fill: '#E6B022' },
  { label: '401-500', fill: '#0F4C3A' },
  { label: '501-600', fill: '#0B261E' },
  { label: '601-700', fill: '#1B725A' },
  { label: '701-800', fill: '#FFE28F' },
  { label: '801-900', fill: '#0F4C3A' },
  { label: '901-1000', fill: '#E6B022' },
]

const TOTAL = SECTORS.length
const SECTOR_ANGLE = 360 / TOTAL
const SIZE = 220
const RADIUS = SIZE / 2 - 6
const CENTER = SIZE / 2

function polarToCartesian(cx: number, cy: number, r: number, a: number) {
  return {
    x: cx + r * Math.cos((a * Math.PI) / 180),
    y: cy + r * Math.sin((a * Math.PI) / 180),
  }
}

function SectorPath({ index, total, radius, center }: { index: number; total: number; radius: number; center: number }) {
  const s = index * (360 / total) - 90
  const e = (index + 1) * (360 / total) - 90
  const p1 = polarToCartesian(center, center, radius, s)
  const p2 = polarToCartesian(center, center, radius, e)
  return `M${center},${center} L${p1.x},${p1.y} A${radius},${radius} 0 0,1 ${p2.x},${p2.y} Z`
}

const GOLD = '#E6B022'
const DARK_GREEN = '#1B725A'

export const SpinWheel = forwardRef<SpinWheelHandle, SpinWheelProps>(function SpinWheel({ onSpinEnd }, ref) {
  const rotation = useRef(new Animated.Value(0)).current
  const isAnimating = useRef(false)

  const animateToSlot = useCallback((slotNumber: number) => {
    const targetSector = Math.min(Math.max(Math.floor((slotNumber - 1) / 100), 0), TOTAL - 1)
    const baseAngle = 270 - targetSector * SECTOR_ANGLE - SECTOR_ANGLE / 2
    const fullSpins = 1800
    const target = baseAngle + fullSpins
    isAnimating.current = true
    rotation.setValue(0)
    Animated.timing(rotation, {
      toValue: target,
      duration: 3500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      isAnimating.current = false
      onSpinEnd?.()
    })
  }, [rotation, onSpinEnd])

  useImperativeHandle(ref, () => ({
    spin: (slotNumber: number) => {
      if (isAnimating.current) return
      animateToSlot(slotNumber)
    },
  }), [animateToSlot])

  const spinInterpolation = rotation.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  })

  return (
    <View style={styles.container}>
      <View style={styles.wheelWrap}>
        <View style={styles.wheelBorder}>
          <View style={styles.wheelInner}>
            <Animated.View style={{ transform: [{ rotate: spinInterpolation }] }}>
              <Svg width={SIZE - 24} height={SIZE - 24} viewBox={`0 0 ${SIZE} ${SIZE}`}>
                {SECTORS.map((s, i) => (
                  <G key={i}>
                    <Path
                      d={SectorPath({ index: i, total: TOTAL, radius: RADIUS, center: CENTER })}
                      fill={s.fill}
                      stroke="rgba(255,255,255,0.15)"
                      strokeWidth="0.5"
                    />
                    <SvgText
                      x={CENTER + RADIUS * 0.68 * Math.cos(((i * SECTOR_ANGLE + SECTOR_ANGLE / 2 - 90) * Math.PI) / 180)}
                      y={CENTER + RADIUS * 0.68 * Math.sin(((i * SECTOR_ANGLE + SECTOR_ANGLE / 2 - 90) * Math.PI) / 180)}
                      fill="#fff"
                      fontSize="8"
                      fontWeight="700"
                      textAnchor="middle"
                      alignmentBaseline="middle"
                    >
                      {s.label}
                    </SvgText>
                  </G>
                ))}
                <Circle cx={CENTER} cy={CENTER} r={22} fill={DARK_GREEN} />
                <Circle cx={CENTER} cy={CENTER} r={14} fill={GOLD} />
                <SvgText
                  x={CENTER} y={CENTER + 2} fill="#0B3327" fontSize="7"
                  fontWeight="800" textAnchor="middle" alignmentBaseline="middle"
                >
                  ዕቁቤ
                </SvgText>
              </Svg>
            </Animated.View>
            <View style={styles.pointer}>
              <Svg width="16" height="14" viewBox="0 0 16 14">
                <Polygon points="8,14 2,0 14,0" fill={GOLD} />
              </Svg>
            </View>
          </View>
        </View>
      </View>
    </View>
  )
})

export function SpinResultCard({ result }: { result: { slots: number[]; amount: number; category: string; round: number; date: string } | null }) {
  const formatDate = (ts: string) => {
    if (!ts) return ''
    const d = new Date(ts)
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`
  }

  const slotText = result
    ? result.slots.length === 1
      ? `Slot ${result.slots[0]}`
      : result.slots.map((s) => `Slot ${s}`).join(' & ')
    : ''

  if (result) {
    return (
      <View style={styles.resultCard}>
        <View style={styles.resultHeader}>
          <View style={[styles.categoryBadge]}>
            <Text style={styles.categoryBadgeText}>{result.category} ETB</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>11:00 Official Draw</Text>
          </View>
        </View>
        <Text style={styles.slotLabel}>{slotText}</Text>
        <Text style={styles.amountValue}>₿{result.amount.toLocaleString()}</Text>
        <Text style={styles.winnerDate}>{formatDate(result.date)}</Text>
      </View>
    )
  }

  return (
    <View style={styles.idleCard}>
      <Text style={styles.idleTitle}>No Draw Result</Text>
      <Text style={styles.idleDesc}>Waiting for admin to perform the 11:00 draw.</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', width: '100%' },
  wheelWrap: {
    width: SIZE, height: SIZE, borderRadius: SIZE / 2,
    backgroundColor: '#F1F5F9', padding: 6,
    alignItems: 'center', justifyContent: 'center',
  },
  wheelBorder: {
    width: SIZE - 12, height: SIZE - 12, borderRadius: (SIZE - 12) / 2,
    borderWidth: 3, borderColor: GOLD,
    overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
  },
  wheelInner: {
    width: SIZE - 18, height: SIZE - 18, borderRadius: (SIZE - 18) / 2,
    overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
  },
  pointer: { position: 'absolute', top: -2, zIndex: 10 },
  resultCard: {
    width: '100%', backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1, borderColor: '#E2E8F0', padding: 12, marginTop: 12,
    alignItems: 'center', gap: 6,
  },
  resultHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  categoryBadge: {
    backgroundColor: '#059669', borderRadius: 12,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  categoryBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  badge: {
    backgroundColor: '#EBF5F0', borderRadius: 16,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  badgeText: { fontSize: 9, fontWeight: '700', color: '#1B725A' },
  slotLabel: { fontSize: 20, fontWeight: '800', color: '#1B725A', marginTop: 4 },
  amountValue: { fontSize: 16, fontWeight: '700', color: '#E6B022' },
  winnerDate: { fontSize: 9, color: '#888' },
  idleCard: {
    width: '100%', backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1, borderColor: '#E2E8F0', padding: 16, marginTop: 12,
    alignItems: 'center',
  },
  idleTitle: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  idleDesc: { fontSize: 10, color: '#888', textAlign: 'center', marginTop: 4 },
})
