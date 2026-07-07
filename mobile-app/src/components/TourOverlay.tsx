import { View, StyleSheet, Modal, TouchableOpacity, Dimensions, ScrollView } from 'react-native'
import { useTour } from '../context/TourContext'
import { useTranslation } from '../i18n/useTranslation'
import { colors, spacing } from '../theme'
import { Text } from './ui/AppText'
import { Ionicons } from '@expo/vector-icons'
import { tourSteps } from '../data/tourSteps'

const TOOLTIP_WIDTH = 280
const ARROW_SIZE = 12

export function TourOverlay() {
  const { activeTour, currentStep, totalSteps, nextStep, prevStep, endTour, targetLayouts, currentTarget } = useTour()
  const { t, lang } = useTranslation()
  const tourT = t.tour

  if (!activeTour) return null

  const step = tourSteps[activeTour][currentStep]
  const isFirst = currentStep === 0
  const isLast = currentStep === totalSteps - 1
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window')

  const stepLabel = tourT.stepOf
    .replace('{current}', String(currentStep + 1))
    .replace('{total}', String(totalSteps))

  const targetLayout = currentTarget ? targetLayouts.get(currentTarget) : null

  type TooltipPos = { top: number; left: number; arrow?: 'top' | 'bottom' | 'left' | 'right'; arrowLeft?: number; arrowTop?: number }
  const getTooltipPosition = (): TooltipPos => {
    if (!targetLayout) {
      return { top: screenHeight / 2 - 100, left: screenWidth / 2 - TOOLTIP_WIDTH / 2 }
    }

    switch (step.position) {
      case 'top': {
        const top = Math.max(20, targetLayout.y - 220)
        const left = Math.max(16, Math.min(targetLayout.x + targetLayout.width / 2 - TOOLTIP_WIDTH / 2, screenWidth - TOOLTIP_WIDTH - 16))
        return { top, left, arrow: 'bottom', arrowLeft: TOOLTIP_WIDTH / 2 }
      }
      case 'bottom': {
        const top = targetLayout.y + targetLayout.height + ARROW_SIZE + 16
        const left = Math.max(16, Math.min(targetLayout.x + targetLayout.width / 2 - TOOLTIP_WIDTH / 2, screenWidth - TOOLTIP_WIDTH - 16))
        return { top, left, arrow: 'top', arrowLeft: TOOLTIP_WIDTH / 2 }
      }
      case 'left': {
        const top = Math.max(20, Math.min(targetLayout.y + targetLayout.height / 2 - 100, screenHeight - 240))
        const left = Math.max(16, targetLayout.x - TOOLTIP_WIDTH - 16)
        return { top, left, arrow: 'right', arrowTop: 100 }
      }
      case 'right': {
        const top = Math.max(20, Math.min(targetLayout.y + targetLayout.height / 2 - 100, screenHeight - 240))
        const left = targetLayout.x + targetLayout.width + 16
        return { top, left, arrow: 'left', arrowTop: 100 }
      }
    }
  }

  const pos = getTooltipPosition()

  const renderCutout = () => {
    if (!targetLayout) return null
    return (
      <>
        {/* Top strip */}
        <View style={[styles.cutoutStrip, { top: 0, left: 0, right: 0, height: targetLayout.y }]} />
        {/* Left strip */}
        <View style={[styles.cutoutStrip, { top: targetLayout.y, left: 0, width: targetLayout.x, height: targetLayout.height }]} />
        {/* Right strip */}
        <View style={[styles.cutoutStrip, { top: targetLayout.y, left: targetLayout.x + targetLayout.width, right: 0, height: targetLayout.height }]} />
        {/* Bottom strip */}
        <View style={[styles.cutoutStrip, { top: targetLayout.y + targetLayout.height, left: 0, right: 0, bottom: 0 }]} />
      </>
    )
  }

  const renderArrow = () => {
    if (!pos || !('arrow' in pos)) return null
    const arrow = pos.arrow
    const arrowLeft = pos.arrowLeft!
    const arrowTop = pos.arrowTop!
    if (arrow === 'top') {
      return (
        <View style={[styles.arrowBox, { top: -ARROW_SIZE, left: arrowLeft - ARROW_SIZE }]}>
          <View style={[styles.arrow, { borderBottomColor: '#fff', borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: 'transparent', borderBottomWidth: ARROW_SIZE, borderLeftWidth: ARROW_SIZE, borderRightWidth: ARROW_SIZE }]} />
        </View>
      )
    }
    if (arrow === 'bottom') {
      return (
        <View style={[styles.arrowBox, { bottom: -ARROW_SIZE, left: arrowLeft - ARROW_SIZE }]}>
          <View style={[styles.arrow, { borderTopColor: '#fff', borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: 'transparent', borderTopWidth: ARROW_SIZE, borderLeftWidth: ARROW_SIZE, borderRightWidth: ARROW_SIZE }]} />
        </View>
      )
    }
    if (arrow === 'left') {
      return (
        <View style={[styles.arrowBox, { left: -ARROW_SIZE, top: arrowTop - ARROW_SIZE }]}>
          <View style={[styles.arrow, { borderRightColor: '#fff', borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: 'transparent', borderRightWidth: ARROW_SIZE, borderTopWidth: ARROW_SIZE, borderBottomWidth: ARROW_SIZE }]} />
        </View>
      )
    }
    if (arrow === 'right') {
      return (
        <View style={[styles.arrowBox, { right: -ARROW_SIZE, top: arrowTop - ARROW_SIZE }]}>
          <View style={[styles.arrow, { borderLeftColor: '#fff', borderTopColor: 'transparent', borderBottomColor: 'transparent', borderRightColor: 'transparent', borderLeftWidth: ARROW_SIZE, borderTopWidth: ARROW_SIZE, borderBottomWidth: ARROW_SIZE }]} />
        </View>
      )
    }
    return null
  }

  return (
    <Modal transparent animationType="fade" visible statusBarTranslucent>
      <View style={styles.backdrop}>
        {          renderCutout()}

        <View style={[styles.tooltip, { top: pos.top, left: pos.left, width: TOOLTIP_WIDTH }]}>
          {renderArrow()}

          <View style={styles.tooltipHeader}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>{stepLabel}</Text>
            </View>
            <TouchableOpacity onPress={endTour} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.tooltipBody} showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>
              {activeTour === 'portal' ? tourT.portalTitle : tourT.dashboardTitle}
            </Text>
            <Text style={styles.description}>
              {tourT[activeTour === 'portal' ? `portalStep${currentStep + 1}` as keyof typeof tourT : `dashboardStep${currentStep + 1}` as keyof typeof tourT]}
            </Text>
          </ScrollView>

          <View style={styles.tooltipFooter}>
            {!isFirst ? (
              <TouchableOpacity style={styles.secondaryBtn} onPress={prevStep}>
                <Ionicons name="chevron-back" size={16} color={colors.primary} />
                <Text style={styles.secondaryBtnText}>{tourT.prev}</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ flex: 1 }} />
            )}

            <TouchableOpacity style={styles.skipBtn} onPress={endTour}>
              <Text style={styles.skipBtnText}>{tourT.skip}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.primaryBtn} onPress={isLast ? endTour : nextStep}>
              <Text style={styles.primaryBtnText}>{isLast ? tourT.done : tourT.next}</Text>
              {!isLast && <Ionicons name="chevron-forward" size={16} color="#fff" />}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  cutoutStrip: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  tooltip: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: colors.radius.lg,
    overflow: 'visible',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 20,
  },
  arrowBox: {
    position: 'absolute',
    width: ARROW_SIZE * 2,
    height: ARROW_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  arrow: {
    width: 0,
    height: 0,
  },
  tooltipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
  },
  stepBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  stepBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primaryDark,
  },
  tooltipBody: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    maxHeight: 160,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: 13,
    color: colors.mutedForeground,
    lineHeight: 20,
  },
  tooltipFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.xs,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 4,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 4,
  },
  secondaryBtnText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  skipBtn: {
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  skipBtnText: {
    color: colors.mutedForeground,
    fontSize: 13,
    fontWeight: '500',
  },
})
