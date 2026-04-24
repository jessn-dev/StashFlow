'use client'

import { useState } from 'react'
import { YStack, XStack, Text, Heading, Button, Input, Label, Circle, Theme, View, Spinner } from 'tamagui'
import { Check, ArrowRight, ArrowLeft, DollarSign, Wallet, Target, Sparkles, LogOut } from 'lucide-react-native'
import { completeOnboarding, OnboardingData } from '../api/onboarding'

interface OnboardingWizardProps {
  onComplete: () => void
  userEmail?: string
}

export default function OnboardingWizard({ onComplete, userEmail }: OnboardingWizardProps) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<OnboardingData>({
    fullName: '',
    preferredCurrency: 'USD',
    monthlyIncome: 0,
    primaryGoal: {
      name: 'Emergency Fund',
      targetAmount: 5000,
      type: 'savings'
    }
  })

  const nextStep = () => setStep(s => s + 1)
  const prevStep = () => setStep(s => s - 1)

  const handleFinish = async () => {
    setLoading(true)
    try {
      await completeOnboarding(formData)
      onComplete()
    } catch (err: any) {
      console.error('Onboarding failed:', err)
      alert(`Onboarding failed: ${err.message || 'Unknown error'}. Please check console.`)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const stepCount = 3
  const progress = (step / stepCount) * 100

  return (
    <Theme name="light">
      <YStack 
        backgroundColor="transparent" 
        alignItems="center" 
        justifyContent="center" 
        padding={20}
      >
        <YStack 
          width="100%" 
          maxWidth={500} 
          backgroundColor="white" 
          borderRadius={24} 
          padding={40} 
          shadowColor="rgba(0,0,0,0.1)" 
          shadowRadius={30}
          gap={32}
        >
          {/* Header & Progress */}
          <YStack gap={12}>
            <XStack justifyContent="space-between" alignItems="center">
              <Heading size="$7" fontWeight="800" color="$brandText">Welcome to StashFlow</Heading>
              <Text fontSize={14} fontWeight="600" color="$brandTextSub">Step {step} of {stepCount}</Text>
            </XStack>
            <View height={6} backgroundColor="rgba(0,0,0,0.05)" borderRadius={3} overflow="hidden">
              <YStack 
                height="100%" 
                backgroundColor="$brandPrimary" 
                width={`${progress}%`} 
              />
            </View>
          </YStack>

          {/* STEP 1: Basic Info */}
          {step === 1 && (
            <YStack gap={24}>
              <YStack gap={8}>
                <Heading size="$5" fontWeight="700">Let's start with your name</Heading>
                <Text color="$brandTextSub">This is how we'll address you in your financial reports.</Text>
              </YStack>
              
              <YStack gap={12}>
                <Label fontWeight="600">Full Name</Label>
                <Input 
                  size="$5" 
                  placeholder="John Doe" 
                  value={formData.fullName}
                  onChangeText={text => setFormData({...formData, fullName: text})}
                  autoFocus
                />
              </YStack>
            </YStack>
          )}

          {/* STEP 2: Currency */}
          {step === 2 && (
            <YStack gap={24}>
              <YStack gap={8}>
                <Heading size="$5" fontWeight="700">Preferred Currency</Heading>
                <Text color="$brandTextSub">Choose your primary currency for all calculations.</Text>
              </YStack>
              
              <XStack gap={12} flexWrap="wrap">
                {['USD', 'EUR', 'GBP', 'PHP', 'SGD'].map(curr => (
                  <Button 
                    key={curr}
                    flex={1}
                    minWidth={100}
                    height={60}
                    borderRadius={12}
                    borderWidth={2}
                    borderColor={formData.preferredCurrency === curr ? '$brandPrimary' : '$borderColor'}
                    backgroundColor={formData.preferredCurrency === curr ? 'rgba(13,61,61,0.05)' : 'white'}
                    onPress={() => setFormData({...formData, preferredCurrency: curr})}
                  >
                    <Text fontWeight="700" color={formData.preferredCurrency === curr ? '$brandPrimary' : '$brandText'}>
                      {curr}
                    </Text>
                  </Button>
                ))}
              </XStack>
            </YStack>
          )}

          {/* STEP 3: Initial Status */}
          {step === 3 && (
            <YStack gap={24}>
              <YStack gap={8}>
                <Heading size="$5" fontWeight="700">Financial Baseline</Heading>
                <Text color="$brandTextSub">Enter your current monthly income to get started.</Text>
              </YStack>

              <YStack gap={20}>
                <YStack gap={8}>
                  <Label fontWeight="600">Monthly Net Income ({formData.preferredCurrency})</Label>
                  <XStack alignItems="center">
                    <View position="absolute" left={16} zIndex={10}>
                      <DollarSign size={16} color="#999" />
                    </View>
                    <Input 
                      flex={1}
                      size="$5" 
                      paddingLeft={40}
                      keyboardType="numeric"
                      placeholder="0.00"
                      value={formData.monthlyIncome.toString()}
                      onChangeText={text => setFormData({...formData, monthlyIncome: parseFloat(text) || 0})}
                    />
                  </XStack>
                </YStack>

                <YStack gap={8}>
                  <Label fontWeight="600">Primary Goal Name</Label>
                  <Input 
                    size="$5" 
                    placeholder="e.g. Emergency Fund" 
                    value={formData.primaryGoal?.name}
                    onChangeText={text => setFormData({
                      ...formData, 
                      primaryGoal: { ...formData.primaryGoal!, name: text }
                    })}
                  />
                </YStack>
              </YStack>
            </YStack>
          )}

          {/* Footer Navigation */}
          <XStack gap={16} justifyContent="space-between">
            {step > 1 ? (
              <Button 
                size="$5" 
                chromeless 
                icon={<ArrowLeft size={18} />} 
                onPress={prevStep}
              >
                Back
              </Button>
            ) : (
               <Button 
                size="$5" 
                chromeless 
                icon={<LogOut size={18} color="$red10" />}
                onPress={handleSignOut}
              >
                Sign Out
              </Button>
            )}

            <Button 
              flex={1}
              size="$5" 
              backgroundColor="$brandPrimary" 
              disabled={step === 1 && !formData.fullName}
              opacity={step === 1 && !formData.fullName ? 0.5 : 1}
              onPress={step === stepCount ? handleFinish : nextStep}
              iconAfter={loading ? <Spinner color="white" /> : (step === stepCount ? <Check size={18} color="white" /> : <ArrowRight size={18} color="white" />)}
            >
              <Text color="white" fontWeight="700">
                {step === stepCount ? 'Complete Setup' : 'Continue'}
              </Text>
            </Button>
          </XStack>

          <XStack justifyContent="center" gap={8} alignItems="center" marginTop={-8}>
             <Sparkles size={14} color="#0D3D3D" opacity={0.5} />
             <Text fontSize={12} color="$brandTextSub" fontWeight="500">Private & Secure</Text>
          </XStack>
        </YStack>
      </YStack>
    </Theme>
  )
}
