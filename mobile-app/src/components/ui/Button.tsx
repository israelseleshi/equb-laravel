import {
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native'
import { colors, spacing, typography, fonts } from '../../theme'
import { Text } from './AppText'

interface ButtonProps {
  title: string
  onPress: () => void
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  fullWidth?: boolean
  style?: any
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading

  const containerStyles = [
    styles.base,
    styles[`variant_${variant}`],
    styles[`size_${size}`],
    fullWidth && styles.fullWidth,
    isDisabled && styles.disabled,
    style,
  ]

  const textStyles = [
    styles.text,
    styles[`text_${variant}`],
    styles[`textSize_${size}`],
  ]

  return (
    <TouchableOpacity
      style={containerStyles}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? '#fff' : colors.primary}
          size="small"
        />
      ) : (
        <Text style={textStyles}>{title}</Text>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    gap: spacing.sm,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },

  variant_primary: {
    backgroundColor: colors.primary,
  },
  variant_secondary: {
    backgroundColor: colors.secondary,
  },
  variant_outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  variant_ghost: {
    backgroundColor: 'transparent',
  },

  size_sm: {
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
  },
  size_md: {
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
  },
  size_lg: {
    paddingVertical: 16,
    paddingHorizontal: spacing['2xl'],
  },

  text: {
    fontFamily: fonts.semiBold,
    fontWeight: '600',
  },
  text_primary: {
    color: colors.primaryForeground,
  },
  text_secondary: {
    color: '#fff',
  },
  text_outline: {
    color: colors.primary,
  },
  text_ghost: {
    color: colors.primary,
  },

  textSize_sm: {
    fontSize: 14,
  },
  textSize_md: {
    fontSize: 15,
  },
  textSize_lg: {
    fontSize: 16,
  },
})
