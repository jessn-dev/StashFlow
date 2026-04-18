import { createTamagui, createFont } from 'tamagui'
import { shorthands } from '@tamagui/shorthands'
import { themes, tokens } from '@tamagui/themes'

// Custom font configuration using CSS variables from Next.js fonts
const headingFont = createFont({
  family: 'var(--font-google-sans)',
  size: {
    1: 12,
    2: 14,
    3: 16,
    4: 18,
    5: 22,
    6: 26,
    7: 32,
    8: 40,
    9: 52,
    10: 66,
  },
  lineHeight: {
    1: 16,
    2: 20,
    3: 24,
    4: 26,
    5: 30,
    6: 34,
    7: 40,
  },
  weight: {
    1: '100',
    2: '200',
    3: '300',
    4: '400',
    5: '500',
    6: '600',
    7: '700',
    8: '800',
    9: '900',
  },
  letterSpacing: {
    4: 0,
    7: -0.5,
  },
})

const bodyFont = createFont({
  family: 'var(--font-google-sans)',
  size: {
    1: 13,
    2: 15,
    3: 17,
    4: 19,
    5: 21,
    6: 24,
    7: 30,
  },
  lineHeight: {
    1: 18,
    2: 22,
    3: 26,
    4: 28,
    5: 32,
  },
  weight: {
    1: '100',
    2: '200',
    3: '300',
    4: '400',
    5: '500',
    6: '600',
    7: '700',
    8: '800',
    9: '900',
  },
  letterSpacing: {
    4: 0,
    7: -0.2,
  },
})

const monoFont = createFont({
  family: 'var(--font-mono)',
  size: {
    1: 11,
    2: 13,
    3: 15,
    4: 17,
  },
  lineHeight: {
    1: 16,
    2: 20,
    3: 24,
  },
})

const serifFont = createFont({
  family: 'Georgia, serif',
  size: {
    1: 12, 2: 14, 3: 16, 4: 18, 5: 22, 6: 26, 7: 32, 8: 40, 9: 52, 10: 66,
  },
  lineHeight: {
    1: 16, 2: 20, 3: 24, 4: 26, 5: 30, 6: 34, 7: 40,
  },
  weight: {
    1: '100', 2: '200', 3: '300', 4: '400', 5: '500', 6: '600', 7: '700', 8: '800', 9: '900',
  },
  letterSpacing: { 4: 0 },
})

export const theme = {
  brandPrimary: '#0D3D3D',
  brandSecondary: '#1A7A7A',
  brandAccent: '#1A7A7A',
  brandBg: '#F0F2F5',
  brandWhite: '#FFFFFF',
  brandText: '#111827',
  brandTextSub: '#6B7280',

  // Standard Tamagui compatibility tokens
  background: '#FFFFFF',
  color: '#111827',
  borderColor: 'rgba(13,61,61,0.1)',
  outlineColor: 'rgba(13,61,61,0.2)',
  shadowColor: 'rgba(0,0,0,0.1)',
}

export const darkTheme = {
  brandPrimary: '#1A7A7A',
  brandSecondary: '#4ECDC4',
  brandAccent: '#4ECDC4',
  brandBg: '#0d1117',
  brandWhite: '#1c2333',
  brandText: '#e6edf3',
  brandTextSub: '#8b949e',

  background: '#0d1117',
  color: '#e6edf3',
  borderColor: 'rgba(255,255,255,0.1)',
  outlineColor: 'rgba(255,255,255,0.2)',
  shadowColor: 'rgba(0,0,0,0.4)',
}

export const tamaguiConfig = createTamagui({
  media: {
    xs: { maxWidth: 660 },
    sm: { maxWidth: 800 },
    md: { maxWidth: 1020 },
    lg: { maxWidth: 1280 },
    xl: { maxWidth: 1420 },
    xxl: { maxWidth: 1600 },
    gtXs: { minWidth: 660 + 1 },
    gtSm: { minWidth: 800 + 1 },
    gtMd: { minWidth: 1020 + 1 },
    gtLg: { minWidth: 1280 + 1 },
    short: { maxHeight: 820 },
    tall: { minHeight: 820 },
    hoverNone: { hover: 'none' },
    pointerCoarse: { pointer: 'coarse' },
  },
  themes: {
    light: {
      ...themes.light,
      ...theme,
    },
    dark: {
      ...themes.dark,
      ...darkTheme,
    },
  },
  tokens,
  shorthands,
  fonts: {
    heading: headingFont,
    body: bodyFont,
    mono: monoFont,
    serif: serifFont,
  },
})

export type Conf = typeof tamaguiConfig

declare module 'tamagui' {
  interface TamaguiCustomConfig extends Conf {}
}

export default tamaguiConfig
