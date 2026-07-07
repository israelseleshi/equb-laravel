import { View, StyleSheet, ViewProps } from 'react-native'
import { colors, spacing } from '../../theme'

interface CardProps extends ViewProps {
  children: React.ReactNode
}

export function Card({ children, style, ...props }: CardProps) {
  return (
    <View style={[styles.card, style]} {...props}>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: colors.radius.lg,
    padding: spacing['2xl'],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 5,
  },
})
