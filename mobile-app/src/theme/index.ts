export const colors = {
  primary: '#059669',
  primaryLight: '#34d399',
  primaryDark: '#047857',
  primaryForeground: '#ffffff',

  secondary: '#f59e0b',
  secondaryLight: '#fbbf24',

  background: '#f8fafc',
  foreground: '#0f172a',

  card: '#ffffff',
  cardForeground: '#0f172a',

  muted: '#f1f5f9',
  mutedForeground: '#64748b',

  accent: '#f1f5f9',
  accentForeground: '#0f172a',

  destructive: '#ef4444',
  destructiveForeground: '#ffffff',

  border: '#e2e8f0',
  input: '#e2e8f0',
  ring: '#059669',

  radius: {
    sm: 6,
    md: 10,
    lg: 16,
    xl: 24,
  },

  shadow: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
    },
  },
}

export const fonts = {
  regular: 'InterTight_400Regular',
  medium: 'InterTight_500Medium',
  semiBold: 'InterTight_600SemiBold',
  bold: 'InterTight_700Bold',
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 64,
}

export const typography = {
  h1: {
    fontFamily: fonts.bold,
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  h2: {
    fontFamily: fonts.semiBold,
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
    letterSpacing: -0.3,
  },
  h3: {
    fontFamily: fonts.semiBold,
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  h4: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 22,
  },
  bodySmall: {
    fontFamily: fonts.regular,
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 18,
  },
  caption: {
    fontFamily: fonts.regular,
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 20,
  },
}
