'use client'

import { TamaguiProvider } from 'tamagui'
import tamaguiConfig from '../tamagui.config'

export default function TamaguiClientProvider({ children }: { children: React.ReactNode }) {
  return (
    <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
      {children}
    </TamaguiProvider>
  )
}
