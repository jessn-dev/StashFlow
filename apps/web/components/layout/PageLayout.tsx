'use client'

import Link from 'next/link'
import { YStack, XStack, Text, Heading } from 'tamagui'

interface PageLayoutProps {
  title: string
  userEmail: string
  children: React.ReactNode
  backTo?: {
    label: string
    href: string
  }
}

export default function PageLayout({ title, userEmail, children, backTo }: PageLayoutProps) {
  return (
    <YStack minHeight="100vh" backgroundColor="$brandBg">
      {/* Navbar */}
      <XStack backgroundColor="$brandWhite" paddingHorizontal={32} paddingVertical={20} borderBottomWidth={1} borderColor="rgba(13,61,61,0.1)">
        <XStack width="100%" maxWidth={1152} marginHorizontal="auto" justifyContent="space-between" alignItems="center">
          <Link href="/dashboard" style={{ textDecoration: 'none' }}>
            <XStack alignItems="center" gap={8}>
              <YStack width={8} height={8} borderRadius={9999} backgroundColor="$brandAccent" />
              <Text fontSize={16} fontWeight="700" color="$brandPrimary">StashFlow</Text>
            </XStack>
          </Link>
          <XStack alignItems="center" gap={24}>
            <Text fontSize={14} color="$brandText" opacity={0.7} fontFamily="$mono">{userEmail}</Text>
            <form action="/auth/signout" method="post">
              <button type="submit" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#1A7A7A' }}>
                Sign Out
              </button>
            </form>
          </XStack>
        </XStack>
      </XStack>

      {/* Main Content */}
      <YStack maxWidth={1152} width="100%" marginHorizontal="auto" paddingHorizontal={32} paddingVertical={48} gap={40}>
        <YStack gap={4}>
          {backTo && (
            <Link href={backTo.href} style={{ textDecoration: 'none' }}>
              <Text fontSize={12} fontWeight="700" color="$brandAccent" textTransform="uppercase" letterSpacing={1} marginBottom={8} display="block">
                ← {backTo.label}
              </Text>
            </Link>
          )}
          <Heading size="$2xl" color="$brandPrimary" fontWeight="700">{title}</Heading>
        </YStack>

        {children}
      </YStack>
    </YStack>
  )
}
