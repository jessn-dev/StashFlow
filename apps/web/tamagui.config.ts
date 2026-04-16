import { createTamagui } from 'tamagui'
import { createInterFont } from '@tamagui/font-inter'
import { shorthands } from '@tamagui/shorthands'
import { themes, tokens } from '@tamagui/themes'

const headingFont = createInterFont()
const bodyFont = createInterFont()
const monoFont = createInterFont({ family: 'monospace' })

export const theme = {
  brandPrimary: '#0D3D3D',
  brandSecondary: '#1A7A7A',
  brandAccent: '#1A7A7A',
  brandBg: '#EFEFEF',
  brandWhite: '#FFFFFF',
  brandText: '#111827',
  brandTextSub: '#6B7280',

  // Standard Tamagui compatibility
  background: '#FFFFFF',
  color: '#111827',
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
      ...theme,
    },
  },
  tokens,
  shorthands,
  fonts: {
    heading: headingFont,
    body: bodyFont,
    mono: monoFont,
  },
})

export type Conf = typeof tamaguiConfig

declare module 'tamagui' {
  interface TamaguiCustomConfig extends Conf {}
}

export default tamaguiConfig
