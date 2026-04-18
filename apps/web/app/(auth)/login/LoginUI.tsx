'use client'

import { useState } from 'react'
import { YStack, XStack, Text, Button, Input, Spinner, View } from 'tamagui'
import { Eye, EyeOff } from 'lucide-react-native'
import { login, signup, forgotPassword } from './actions'
import { createClient } from '@/utils/supabase/client'

// ── Brand SVG icons (not in lucide, so kept as inline SVG) ────────────────
function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" fill="none">
      <path d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" fill="#FFC107"/>
      <path d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" fill="#FF3D00"/>
      <path d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" fill="#4CAF50"/>
      <path d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" fill="#1976D2"/>
    </svg>
  )
}


function AppleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#000">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
    </svg>
  )
}

interface LoginUIProps {
  initialMode?: 'login' | 'signup' | 'forgot'
  message?: string
}

const SOCIAL_PROVIDERS = [
  { provider: 'google', label: 'Continue with Google', Icon: GoogleIcon },
  { provider: 'apple',  label: 'Continue with Apple',  Icon: AppleIcon },
] as const

export default function LoginUI({ initialMode = 'login', message }: LoginUIProps) {
  const [mode, setMode] = useState(initialMode)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)

  async function handleOAuth(provider: 'google' | 'apple') {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/dashboard` },
    })
  }

  const title = mode === 'login' ? 'Log in' : mode === 'signup' ? 'Sign up' : 'Reset password'
  const isSuccess = message?.includes('Success') || message?.includes('reset link')

  return (
    <YStack
      minHeight="100vh"
      backgroundColor="$brandBg"
      alignItems="center"
      justifyContent="center"
      paddingHorizontal="$5"
      paddingVertical="$8"
      position="relative"
      overflow="hidden"
    >
      {/* Background Decorative Text from Landing Page */}
      <div style={{ position: 'absolute', right: '-5%', top: '50%', transform: 'translateY(-50%)', fontSize: '30vw', fontWeight: 900, color: '#0D3D3D', opacity: 0.03, pointerEvents: 'none', userSelect: 'none', lineHeight: 1, fontFamily: 'Georgia, serif', zIndex: 1 }}>
        $
      </div>

      <YStack 
        width="100%" 
        maxWidth={480} 
        gap="$6" 
        backgroundColor="$brandWhite" 
        padding="$8" 
        borderRadius={20} 
        shadowColor="rgba(0,0,0,0.1)" 
        shadowRadius={20} 
        zIndex={10}
        borderWidth={1}
        borderColor="rgba(13,61,61,0.05)"
      >
        <YStack gap="$2" alignItems="center">
          <XStack alignItems="center" gap={8} marginBottom="$2">
            <YStack width={10} height={10} borderRadius={9999} backgroundColor="$brandAccent" />
            <Text fontSize={18} fontWeight="700" color="$brandPrimary" letterSpacing={0.5}>StashFlow</Text>
          </XStack>
          <Text
            fontSize={32}
            fontWeight="900"
            color="$brandPrimary"
            textAlign="center"
            fontFamily="$heading"
            lineHeight={34}
          >
            {title}
          </Text>
        </YStack>

        {/* ── Subtitle / mode toggle ─────────────────────────────────────── */}
        {mode !== 'forgot' ? (
          <XStack justifyContent="center" alignItems="center" gap="$1">
            <Text fontSize={15} color="$brandTextSub">
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            </Text>
            <Button
              chromeless
              padding={0}
              height="auto"
              onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}
            >
              <Text fontSize={15} color="$brandText" textDecorationLine="underline">
                {mode === 'login' ? 'Sign up' : 'Log in'}
              </Text>
            </Button>
          </XStack>
        ) : (
          <Text fontSize={15} color="$brandTextSub" textAlign="center">
            Enter your email to receive a reset link.
          </Text>
        )}

        {/* ── Message banner ─────────────────────────────────────────────── */}
        {message && (
          <YStack
            padding="$3"
            borderRadius="$3"
            backgroundColor={isSuccess ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.08)'}
            borderWidth={1}
            borderColor={isSuccess ? 'rgba(22,163,74,0.3)' : 'rgba(220,38,38,0.3)'}
          >
            <Text
              fontSize={14}
              color={isSuccess ? '#166534' : '#dc2626'}
              textAlign="center"
            >
              {message}
            </Text>
          </YStack>
        )}

        {/* ── Social buttons ─────────────────────────────────────────────── */}
        {mode !== 'forgot' && (
          <>
            <YStack gap="$3">
              {SOCIAL_PROVIDERS.map(({ provider, label, Icon }) => (
                <Button
                  key={provider}
                  onPress={() => handleOAuth(provider)}
                  borderRadius={10}
                  borderWidth={1}
                  borderColor="rgba(13,61,61,0.1)"
                  backgroundColor="$brandWhite"
                  size="$5"
                  hoverStyle={{ backgroundColor: 'rgba(13,61,61,0.03)' }}
                  pressStyle={{ scale: 0.98 }}
                  icon={<Icon />}
                >
                  <Text color="$brandText" fontWeight="600">{label}</Text>
                </Button>
              ))}
            </YStack>

            {/* ── Divider ───────────────────────────────────────────────── */}
            <XStack alignItems="center" gap="$3">
              <View flex={1} height={1} backgroundColor="$gray5" />
              <Text fontSize={14} color="$brandTextSub" fontWeight="600" whiteSpace="nowrap">
                Or continue with email
              </Text>
              <View flex={1} height={1} backgroundColor="$gray5" />
            </XStack>
          </>
        )}

        {/* ── Email / password form ──────────────────────────────────────── */}
        <form
          action={mode === 'login' ? login : mode === 'signup' ? signup : forgotPassword}
          onSubmit={() => setLoading(true)}
          style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
        >
          {/* Email */}
          <YStack gap="$2">
            <Text fontSize={14} color="$brandTextSub">
              {mode === 'login' ? 'Email address or user name' : 'Email address'}
            </Text>
            <Input
              name="email"
              type="email"
              required
              borderRadius={10}
              backgroundColor="$gray1"
              borderColor="$gray5"
              size="$5"
              focusStyle={{ borderColor: '$gray8', backgroundColor: '$brandWhite' }}
            />
          </YStack>

          {/* Password */}
          {mode !== 'forgot' && (
            <YStack gap="$2">
              <XStack justifyContent="space-between" alignItems="center">
                <Text fontSize={14} color="$brandTextSub">Password</Text>
                <Button
                  chromeless
                  padding={0}
                  height="auto"
                  onPress={() => setShowPassword(!showPassword)}
                  icon={showPassword
                    ? <EyeOff size={15} color="#6b7280" />
                    : <Eye size={15} color="#6b7280" />
                  }
                >
                  <Text fontSize={14} color="$brandTextSub">
                    {showPassword ? 'Hide' : 'Show'}
                  </Text>
                </Button>
              </XStack>

              <Input
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                borderRadius={10}
                backgroundColor="$gray1"
                borderColor="$gray5"
                size="$5"
                focusStyle={{ borderColor: '$gray8', backgroundColor: '$brandWhite' }}
              />

              {/* Remember me + Forget password */}
              <XStack justifyContent="space-between" alignItems="center" marginTop="$1">
                <XStack
                  alignItems="center"
                  gap="$2"
                >
                  <input
                    id="remember"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#0D3D3D' }}
                  />
                  <Text fontSize={14} color="$brandText">Remember me</Text>
                </XStack>

                <Button
                  chromeless
                  padding={0}
                  height="auto"
                  onPress={() => setMode('forgot')}
                >
                  <Text fontSize={14} color="$brandText" textDecorationLine="underline">
                    Forget your password?
                  </Text>
                </Button>
              </XStack>
            </YStack>
          )}

          {/* Back link in forgot mode */}
          {mode === 'forgot' && (
            <Button
              chromeless
              padding={0}
              height="auto"
              alignSelf="flex-start"
              onPress={() => setMode('login')}
            >
              <Text fontSize={14} color="$brandTextSub" textDecorationLine="underline">
                ← Back to log in
              </Text>
            </Button>
          )}

          {/* Submit */}
          <Button
            type="submit"
            borderRadius={10}
            backgroundColor="$brandPrimary"
            size="$5"
            disabled={loading}
            opacity={loading ? 0.7 : 1}
            icon={loading ? <Spinner color="white" size="small" /> : undefined}
            hoverStyle={{ backgroundColor: '$brandSecondary' }}
            pressStyle={{ scale: 0.98 }}
            marginTop="$1"
          >
            <Text color="white" fontWeight="700" textTransform="uppercase" letterSpacing={1}>
              {loading
                ? 'Please wait…'
                : mode === 'login' ? 'Log in'
                : mode === 'signup' ? 'Sign up'
                : 'Send reset link'}
            </Text>
          </Button>
        </form>

      </YStack>
    </YStack>
  )
}
