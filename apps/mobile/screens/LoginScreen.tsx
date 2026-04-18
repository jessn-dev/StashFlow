import { useState } from 'react'
import {
  YStack,
  XStack,
  Text,
  Heading,
  Button,
  Input,
  ScrollView,
  Spinner,
} from 'tamagui'
import { DollarSign } from 'lucide-react-native'
import { Alert, SafeAreaView } from 'react-native'
import { supabase } from '../utils/supabase'

export function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)

  async function handleAuth() {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields')
      return
    }

    setLoading(true)
    const { error, data } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      Alert.alert('Authentication Error', error.message)
    } else if (isSignUp && !data.session) {
      Alert.alert('Success', 'Please check your email to verify your account.')
    }
    setLoading(false)
  }

  async function handleOAuth(provider: 'google' | 'apple') {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: 'stashflow://auth-callback',
      },
    })
    if (error) Alert.alert('OAuth Error', error.message)
    setLoading(false)
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <YStack flex={1} paddingHorizontal={32} justifyContent="center" backgroundColor="$white">
          {/* Logo / Branding */}
          <XStack alignItems="center" marginBottom={32} gap={8}>
            <YStack width={32} height={32} backgroundColor="$brandPrimary" borderRadius={8} alignItems="center" justifyContent="center">
              <DollarSign color="white" size={16} />
            </YStack>
            <Heading size="$lg" color="$brandPrimary" fontWeight="700">
              StashFlow
            </Heading>
          </XStack>

          {/* Dynamic Headings */}
          <YStack gap={4} marginBottom={32}>
            <Heading size="$xl" color="$brandPrimary">
              {isSignUp ? 'Create an Account' : 'Welcome Back!'}
            </Heading>
            <Text fontSize={14} color="$brandText">
              {isSignUp
                ? 'Sign up to start tracking your net worth and optimizing your finances.'
                : 'Sign in to access your dashboard and continue optimizing your financial process.'}
            </Text>
          </YStack>

          {/* Form */}
          <YStack gap={16}>
            <YStack gap={4}>
              <Text fontSize={11} fontWeight="700" color="$brandPrimary" textTransform="uppercase" letterSpacing={1.5}>
                Email
              </Text>
              <Input 
                placeholder="Enter your email" 
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                borderRadius={8}
                borderColor="#E2E8F0"
              />
            </YStack>

            <YStack gap={4}>
              <Text fontSize={11} fontWeight="700" color="$brandPrimary" textTransform="uppercase" letterSpacing={1.5}>
                Password
              </Text>
              <Input 
                placeholder="Enter your password" 
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                borderRadius={8}
                borderColor="#E2E8F0"
              />
              {!isSignUp && (
                <Button chromeless alignSelf="flex-end" padding={0} marginTop={4}>
                  <Text fontSize={12} color="$brandAccent" fontWeight="600">
                    Forgot Password?
                  </Text>
                </Button>
              )}
            </YStack>

            <Button
              size="$large"
              backgroundColor="$brandPrimary"
              borderRadius={8}
              disabled={loading}
              onPress={handleAuth}
              marginTop={8}
            >
              <XStack gap={8} alignItems="center">
                {loading && <Spinner color="white" />}
                <Text color="white" fontWeight="700" textTransform="uppercase" letterSpacing={1}>
                  {isSignUp ? 'Sign Up' : 'Sign In'}
                </Text>
              </XStack>
            </Button>
          </YStack>

          {/* Divider */}
          <XStack alignItems="center" marginVertical={32} gap={16}>
            <YStack flex={1} height={1} backgroundColor="#E2E8F0" />
            <Text fontSize={11} color="$brandText" fontWeight="700">OR</Text>
            <YStack flex={1} height={1} backgroundColor="#E2E8F0" />
          </XStack>

          {/* OAuth Placeholders */}
          <YStack gap={12}>
            <Button 
              variant="outline" 
              borderColor="#E2E8F0" 
              backgroundColor="white"
              disabled={loading}
              onPress={() => handleOAuth('google')}
            >
              <Text color="$brandText" fontSize={14} fontWeight="500">Continue with Google</Text>
            </Button>
            <Button 
              variant="outline" 
              borderColor="#E2E8F0" 
              backgroundColor="white"
              disabled={loading}
              onPress={() => handleOAuth('apple')}
            >
              <Text color="$brandText" fontSize={14} fontWeight="500">Continue with Apple</Text>
            </Button>
          </YStack>

          {/* Toggle Link */}
          <XStack justifyContent="center" marginTop={32} gap={4}>
            <Text fontSize={14} color="$brandText">
              {isSignUp ? 'Already have an account? ' : "Don't have an Account? "}
            </Text>
            <Button chromeless padding={0} onPress={() => setIsSignUp(!isSignUp)}>
              <Text fontSize={14} color="$brandAccent" fontWeight="700">
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </Text>
            </Button>
          </XStack>
        </YStack>
      </ScrollView>
    </SafeAreaView>
  )
}
