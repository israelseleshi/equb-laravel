import { View, StyleSheet } from 'react-native'
import { colors, spacing, fonts } from '../../theme'
import { Text } from './AppText'

interface DividerProps {
  text?: string
}

export function Divider({ text }: DividerProps) {
  if (text) {
    return (
      <View style={styles.withText}>
        <View style={styles.line} />
        <Text style={styles.text}>{text}</Text>
        <View style={styles.line} />
      </View>
    )
  }

  return <View style={styles.line} />
}

const styles = StyleSheet.create({
  line: {
    height: 1,
    backgroundColor: colors.border,
    flex: 1,
  },
  withText: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  text: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.mutedForeground,
    fontWeight: '500',
  },
})
