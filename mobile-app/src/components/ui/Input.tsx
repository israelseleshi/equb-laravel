import { useState } from 'react'
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  TextInputProps,
} from 'react-native'
import { colors, spacing, typography, fonts } from '../../theme'
import { Text } from './AppText'

interface InputProps extends TextInputProps {
  label: string
  error?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  onRightIconPress?: () => void
}

export function Input({
  label,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const containerStyles = [
    styles.container,
    isFocused && styles.containerFocused,
    error && styles.containerError,
  ]

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={containerStyles}>
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        <TextInput
          style={[
            styles.input,
            !!leftIcon && styles.inputWithLeftIcon,
            !!(rightIcon || onRightIconPress) && styles.inputWithRightIcon,
          ]}
          placeholderTextColor={colors.mutedForeground}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
        {rightIcon && (
          <TouchableOpacity
            style={styles.rightIcon}
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
          >
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 6,
  },
  label: {
    ...typography.label,
    color: colors.foreground,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.input,
    borderRadius: 12,
    minHeight: 52,
  },
  containerFocused: {
    borderColor: colors.ring,
  },
  containerError: {
    borderColor: colors.destructive,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.foreground,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
  },
  inputWithLeftIcon: {
    paddingLeft: spacing.sm,
  },
  inputWithRightIcon: {
    paddingRight: spacing.sm,
  },
  leftIcon: {
    paddingLeft: spacing.lg,
  },
  rightIcon: {
    paddingRight: spacing.lg,
  },
  error: {
    ...typography.caption,
    color: colors.destructive,
  },
})
