'use client'

import React, { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { XStack, YStack, Text, Input, Button, Circle, Spinner } from 'tamagui'
import { resetPassword } from '../login/actions'

function ResetPasswordContent() {
  const searchParams = useSearchParams()
  const message = searchParams.get('message')

  return (
    <YStack
      minHeight="100vh"
      backgroundColor="$brandBg"
      flexDirection="row"
    >
      {/* Left side: Form */}
      <YStack
        flex={1}
        backgroundColor="$brandWhite"
        justifyContent="center"
        paddingHorizontal={48}
        $gtMd={{ paddingHorizontal: 96 }}
      >
        <YStack maxWidth={400} width="100%" marginHorizontal="auto">
          {/* Logo */}
          <XStack alignItems="center" gap={8} marginBottom={32}>
            <YStack
              width={32}
              height={32}
              backgroundColor="$brandPrimary"
              borderRadius={8}
              alignItems="center"
              justifyContent="center"
            >
              <Text color="$brandWhite" fontSize={16} fontWeight="700">$</Text>
            </YStack>
            <Text color="$brandPrimary" fontSize={20} fontWeight="700">StashFlow</Text>
          </XStack>

          {/* Heading */}
          <YStack gap={8} marginBottom={32}>
            <Text color="$brandPrimary" fontSize={28} fontWeight="700">
              Set New Password
            </Text>
            <Text color="$brandText" fontSize={14} lineHeight={20} opacity={0.8}>
              Please enter your new password below to regain access to your account.
            </Text>
          </YStack>

          {/* Form */}
          <form action={resetPassword}>
            <YStack gap={16}>
              {/* Password */}
              <YStack gap={6}>
                <Text fontSize={14} fontWeight="700" color="$brandPrimary" textTransform="uppercase" letterSpacing={1.2}>New Password</Text>
                <Input
                  name="password"
                  type="password"
                  placeholder="Enter new password"
                  borderRadius={0}
                  borderColor="rgba(13,61,61,0.2)"
                  focusStyle={{ borderColor: '$brandAccent', outlineStyle: 'none' }}
                  required
                />
              </YStack>

              {/* Confirm Password */}
              <YStack gap={6}>
                <Text fontSize={14} fontWeight="700" color="$brandPrimary" textTransform="uppercase" letterSpacing={1.2}>Confirm Password</Text>
                <Input
                  name="confirmPassword"
                  type="password"
                  placeholder="Confirm your new password"
                  borderRadius={0}
                  borderColor="rgba(13,61,61,0.2)"
                  focusStyle={{ borderColor: '$brandAccent', outlineStyle: 'none' }}
                  required
                />
              </YStack>

              {/* Message */}
              {message && (
                <YStack
                  backgroundColor={message.includes('successfully') ? 'rgba(54,211,153,0.08)' : 'rgba(220,38,38,0.08)'}
                  padding={12}
                  borderRadius={0}
                >
                  <Text fontSize={14} color={message.includes('successfully') ? '#059669' : '#991B1B'} textAlign="center">{message}</Text>
                </YStack>
              )}

              <Button
                borderRadius={0}
                backgroundColor="$brandPrimary"
                marginTop={8}
                onPress={(e) => {
                  const form = (e.target as any).closest('form')
                  if (form) form.requestSubmit()
                }}
              >
                <Text color="$brandWhite" fontWeight="700" textTransform="uppercase" letterSpacing={1}>Reset Password</Text>
              </Button>
            </YStack>
          </form>
        </YStack>
      </YStack>

      {/* Right side: Branding (Hidden on mobile) */}
      <YStack
        flex={1}
        backgroundColor="$brandBg"
        display="none"
        $gtMd={{ display: 'flex' }}
        padding={96}
        justifyContent="space-between"
        position="relative"
        overflow="hidden"
        borderLeftWidth={1}
        borderColor="rgba(13,61,61,0.1)"
      >
        {/* Subtle grid background */}
        <YStack
          position="absolute"
          fullscreen
          className="bg-grid"
          opacity={0.6}
          pointerEvents="none"
        />
        <style dangerouslySetInnerHTML={{__html: `
          .bg-grid {
            background-image: linear-gradient(rgba(13,61,61,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(13,61,61,0.06) 1px, transparent 1px);
            background-size: 60px 60px;
          }
        `}} />

        <YStack position="relative" zIndex={10} paddingTop={32}>
          <XStack alignItems="center" gap={16} marginBottom={32}>
            <YStack width={40} height={1} backgroundColor="$brandAccent" />
            <Text fontSize={14} fontWeight="700" color="$brandAccent" textTransform="uppercase" letterSpacing={3} fontFamily="$mono">
              Secure Your Future
            </Text>
          </XStack>
          <Text fontSize={96} fontWeight="900" color="$brandPrimary" lineHeight={90} fontFamily="$serif">
            Total<br />
            <Text fontStyle="italic" fontWeight="300" color="$brandAccent">Control.</Text><br />
            Peace of<br />
            Mind.
          </Text>
        </YStack>
      </YStack>
    </YStack>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<YStack fullscreen alignItems="center" justifyContent="center"><Spinner size="large" color="$brandPrimary" /></YStack>}>
      <ResetPasswordContent />
    </Suspense>
  )
}
