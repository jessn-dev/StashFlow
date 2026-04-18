'use client'

import PageLayout from '@/components/layout/PageLayout'
import CurrencyForm from '@/components/settings/CurrencyForm'
import { YStack, Text } from 'tamagui'
import { Profile } from '@stashflow/core'

interface SettingsUIProps {
  profile: Profile
  userEmail: string
}

export default function SettingsUI({ profile, userEmail }: SettingsUIProps) {
  return (
    <PageLayout 
      title="Settings" 
      userEmail={userEmail}
      backTo={{ label: 'Back to Overview', href: '/dashboard' }}
    >
      <YStack maxWidth={600} gap={32}>
        <CurrencyForm currentCurrency={profile.preferred_currency || 'USD'} />
        
        <YStack backgroundColor="$brandWhite" padding={32} borderRadius={12} borderWidth={1} borderColor="rgba(13,61,61,0.1)">
          <Text fontSize={20} fontWeight="700" color="$brandPrimary" marginBottom={16}>Account Information</Text>
          <YStack gap={12}>
            <YStack>
              <Text fontSize={12} fontWeight="700" color="$brandTextSub" textTransform="uppercase" letterSpacing={1}>Full Name</Text>
              <Text fontSize={16} color="$brandText">{profile.full_name || 'Not set'}</Text>
            </YStack>
            <YStack>
              <Text fontSize={12} fontWeight="700" color="$brandTextSub" textTransform="uppercase" letterSpacing={1}>Email Address</Text>
              <Text fontSize={16} color="$brandText">{profile.email}</Text>
            </YStack>
          </YStack>
        </YStack>
      </YStack>
    </PageLayout>
  )
}
