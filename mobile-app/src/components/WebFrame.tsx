import { View, ScrollView, StyleSheet } from 'react-native'
import { colors, spacing } from '../theme'

const MAX_WIDTH = 1280

export function WebFrame({ children, centered = false }: { children: React.ReactNode; centered?: boolean }) {
  return (
    <View style={styles.page}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, centered && styles.scrollCentered]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.inner, centered && styles.innerCentered]}>
          {children}
        </View>
      </ScrollView>
    </View>
  )
}

export const WEB_MAX_WIDTH = MAX_WIDTH

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background,
    width: '100%',
  },
  scroll: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    minHeight: '100%',
  },
  scrollCentered: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  inner: {
    flex: 1,
    width: '100%',
    maxWidth: MAX_WIDTH,
    alignSelf: 'center',
  },
  innerCentered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
})
