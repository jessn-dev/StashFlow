import './globals.css'
import '@tamagui/core/reset.css'
import TamaguiClientProvider from '@/components/TamaguiClientProvider'

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <TamaguiClientProvider>
          {children}
        </TamaguiClientProvider>
      </body>
    </html>
  )
}
