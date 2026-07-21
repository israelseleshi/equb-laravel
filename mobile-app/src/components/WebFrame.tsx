import { View, StyleSheet } from 'react-native'
import { colors } from '../theme'

export function WebFrame({ children, centered = false }: { children: React.ReactNode; centered?: boolean }) {
  return (
    <View style={[styles.wrapper, centered && styles.centered]}>
      {children}
    </View>
  )
}

export const WEB_MAX_WIDTH = 1200

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: colors.background,
    width: '100%',
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
})
