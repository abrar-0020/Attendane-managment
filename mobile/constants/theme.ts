export const lightTheme = {
  colors: {
    primary: '#5a7d6f',
    primaryDark: '#4a6d5f',
    onPrimary: '#ffffff',
    primaryContainer: '#e6f0eb',
    onPrimaryContainer: '#2c4238',
    secondary: '#059669',
    onSecondary: '#ffffff',
    secondaryContainer: '#d1fae5',
    onSecondaryContainer: '#065f46',
    tertiary: '#d4183d', // destructive
    onTertiary: '#ffffff',
    tertiaryContainer: '#fce8ec',
    onTertiaryContainer: '#991b1b',
    error: '#d4183d',
    onError: '#ffffff',
    errorContainer: '#fce8ec',
    onErrorContainer: '#991b1b',
    background: '#ffffff', // exact from design
    onBackground: '#252525', // approximate oklch(0.145 0 0)
    surface: '#ffffff',
    onSurface: '#252525',
    surfaceVariant: '#ececf0', // muted from design
    onSurfaceVariant: '#717182', // muted-foreground from design
    surfaceContainerLowest: '#ffffff',
    surfaceContainerLow: '#fbfbfc',
    surfaceContainer: '#f3f3f5', // input-background from design
    surfaceContainerHigh: '#ececf0',
    surfaceContainerHighest: '#cbced4',
    outline: 'rgba(0, 0, 0, 0.1)', // border from design
    outlineVariant: 'rgba(0, 0, 0, 0.05)',
  }
};

export const darkTheme = {
  colors: {
    primary: '#5a7d6f',
    primaryDark: '#4a6d5f',
    onPrimary: '#ffffff',
    primaryContainer: '#2c4238',
    onPrimaryContainer: '#e6f0eb',
    secondary: '#34d399',
    onSecondary: '#064e3b',
    secondaryContainer: '#065f46',
    onSecondaryContainer: '#d1fae5',
    tertiary: '#d4183d',
    onTertiary: '#ffffff',
    tertiaryContainer: '#991b1b',
    onTertiaryContainer: '#fce8ec',
    error: '#d4183d',
    onError: '#ffffff',
    errorContainer: '#991b1b',
    onErrorContainer: '#fce8ec',
    background: '#252525',
    onBackground: '#ffffff',
    surface: '#252525',
    onSurface: '#ffffff',
    surfaceVariant: '#383838',
    onSurfaceVariant: '#a0a0a0',
    surfaceContainerLowest: '#1a1a1a',
    surfaceContainerLow: '#202020',
    surfaceContainer: '#2a2a2a',
    surfaceContainerHigh: '#303030',
    surfaceContainerHighest: '#383838',
    outline: 'rgba(255, 255, 255, 0.1)',
    outlineVariant: 'rgba(255, 255, 255, 0.05)',
  }
};

export const typography = {
  displayMetric: { fontSize: 48, fontWeight: '700', lineHeight: 56, letterSpacing: -1 },
  headlineLg: { fontSize: 32, fontWeight: '600', lineHeight: 40 },
  headlineLgMobile: { fontSize: 24, fontWeight: '600', lineHeight: 32 },
  titleMd: { fontSize: 18, fontWeight: '600', lineHeight: 24 },
  bodyMd: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
  labelSm: { fontSize: 12, fontWeight: '500', lineHeight: 16, letterSpacing: 0.5 },
};

export const spacing = {
  xs: 4,
  sm: 12,
  base: 8,
  md: 24,
  lg: 40,
  xl: 64,
  gutter: 24,
  marginMobile: 16,
  marginDesktop: 48,
};

export const shape = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};
