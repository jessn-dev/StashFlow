import './globals.css'
import '@tamagui/core/reset.css'
import TamaguiClientProvider from '@/components/TamaguiClientProvider'
import { Roboto_Mono } from 'next/font/google'
import localFont from 'next/font/local'

const googleSansFlex = localFont({
  src: '../public/fonts/Google_Sans_Flex/GoogleSansFlex-VariableFont_GRAD,ROND,opsz,slnt,wdth,wght.ttf',
  variable: '--font-google-sans',
  display: 'swap',
  weight: '100 900',
})

const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${googleSansFlex.variable} ${robotoMono.variable}`}>
      <body suppressHydrationWarning>
        <TamaguiClientProvider>
          {children}
        </TamaguiClientProvider>
      </body>
    </html>
  )
}
