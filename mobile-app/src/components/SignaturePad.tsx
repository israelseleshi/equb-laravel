import { useState, useRef, useCallback } from 'react'
import { View, StyleSheet, PanResponder, Dimensions } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing } from '../theme'
import { Text } from './ui/AppText'

interface Point {
  x: number
  y: number
}

interface Stroke {
  points: Point[]
  color: string
  width: number
}

interface SignaturePadProps {
  onSave?: (svgPathData: string) => void
  onClear?: () => void
  width?: number
  height?: number
}

export function SignaturePad({
  onSave,
  onClear,
  width = Dimensions.get('window').width - 64,
  height = 180,
}: SignaturePadProps) {
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [currentStroke, setCurrentStroke] = useState<Point[]>([])
  const currentStrokeRef = useRef<Point[]>([])

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent
        const point = { x: locationX, y: locationY }
        currentStrokeRef.current = [point]
        setCurrentStroke([point])
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent
        const point = { x: locationX, y: locationY }
        currentStrokeRef.current = [...currentStrokeRef.current, point]
        setCurrentStroke((prev) => [...prev, point])
      },
      onPanResponderRelease: () => {
        const pts = currentStrokeRef.current
        if (pts.length > 1) {
          setStrokes((prev) => [...prev, { points: pts, color: '#0f172a', width: 3 }])
        }
        currentStrokeRef.current = []
        setCurrentStroke([])
      },
    })
  ).current

  const strokeToPath = (stroke: Stroke): string => {
    if (stroke.points.length < 2) return ''
    return stroke.points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
      .join(' ')
  }

  const currentPath = currentStroke
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ')

  const generateSvgData = useCallback((): string => {
    return strokes.map((s) => strokeToPath(s)).join(' ')
  }, [strokes])

  const handleClear = () => {
    setStrokes([])
    setCurrentStroke([])
    currentStrokeRef.current = []
    onClear?.()
  }

  const handleSave = () => {
    const data = generateSvgData()
    onSave?.(data)
  }

  const hasContent = strokes.length > 0 || currentStroke.length > 1

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <Text style={styles.title}>Signature</Text>
        <View style={styles.actions}>
          {hasContent && (
            <Ionicons
              name="checkmark-circle"
              size={28}
              color={colors.primary}
              onPress={handleSave}
              style={styles.actionBtn}
            />
          )}
          <Ionicons
            name="trash-outline"
            size={24}
            color={colors.destructive}
            onPress={handleClear}
            style={styles.actionBtn}
          />
        </View>
      </View>
      <View
        style={[styles.pad, { width, height }]}
        {...panResponder.panHandlers}
      >
        {strokes.length === 0 && currentStroke.length === 0 && (
          <Text style={styles.placeholder}>Sign here</Text>
        )}
        <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
          {strokes.map((stroke, i) => (
            <Path
              key={i}
              d={strokeToPath(stroke)}
              stroke={stroke.color}
              strokeWidth={stroke.width}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {currentStroke.length > 1 && (
            <Path
              d={currentPath}
              stroke="#0f172a"
              strokeWidth={3}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </Svg>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 14,
    color: colors.mutedForeground,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtn: {
    padding: 4,
  },
  pad: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: colors.radius.md,
    backgroundColor: '#fafafa',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  placeholder: {
    color: colors.mutedForeground,
    fontSize: 16,
    opacity: 0.5,
  },
})
