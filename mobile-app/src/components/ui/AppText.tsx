import { Text as RNText, type TextProps, StyleSheet } from 'react-native'
import { useTranslation } from '../../i18n/useTranslation'

type FontWeight = 'regular' | 'medium' | 'semiBold' | 'bold'

interface AppTextProps extends TextProps {
  font?: FontWeight
}

export function Text({ style, font, ...rest }: AppTextProps) {
  const { fonts } = useTranslation()
  let weight: FontWeight = 'regular'
  if (font) {
    weight = font
  } else if (style) {
    const flat = StyleSheet.flatten(style)
    if (flat.fontWeight === '700' || flat.fontWeight === 'bold') {
      weight = 'bold'
    } else if (flat.fontWeight === '600') {
      weight = 'semiBold'
    } else if (flat.fontWeight === '500') {
      weight = 'medium'
    }
  }
  return <RNText style={[style, { fontFamily: fonts[weight] }]} {...rest} />
}
