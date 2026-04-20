'use client'

import CurrencyForm from '@/components/settings/CurrencyForm'
import { YStack, XStack, Text, Switch, Spinner, Circle } from 'tamagui'
import { Profile } from '@stashflow/core'
import { useState } from 'react'
import { updateContingencyAction } from '@/app/dashboard/settings/actions'
import { AlertTriangle, Info } from 'lucide-react-native'

interface SettingsUIProps {
  profile: Profile
}

export default function SettingsUI({ profile }: SettingsUIProps) {
  const [isContingencyActive, setIsContingencyActive] = useState(profile.contingency_mode_active || false)
  const [loading, setLoading] = useState(false)

  const handleContingencyToggle = async (val: boolean) => {
    setLoading(true)
    try {
      await updateContingencyAction(val)
      setIsContingencyActive(val)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <YStack gap={32} padding={12}>
      {/* 1. Currency Settings */}
      <CurrencyForm currentCurrency={profile.preferred_currency || 'USD'} />
      
      {/* 2. Contingency Protocol */}
      <YStack backgroundColor="$brandWhite" padding={24} borderRadius={12} borderWidth={1} borderColor="rgba(220,38,38,0.1)" gap={16}>
        <XStack justifyContent="space-between" alignItems="center">
          <XStack gap={12} alignItems="center">
            <Circle size={32} backgroundColor="rgba(220,38,38,0.1)">
              <AlertTriangle size={18} color="#DC2626" />
            </Circle>
            <YStack>
              <Text fontSize={16} fontWeight="700" color="#DC2626">Contingency Protocol</Text>
              <Text fontSize={12} color="$brandTextSub">Activate "Survival Mode" for high volatility periods.</Text>
            </YStack>
          </XStack>
          <XStack alignItems="center" gap={12}>
            {loading && <Spinner size="small" color="#DC2626" />}
            <Switch 
              size="$3" 
              checked={isContingencyActive} 
              onCheckedChange={handleContingencyToggle}
              backgroundColor={isContingencyActive ? '#DC2626' : '$gray5'}
            >
              <Switch.Thumb animation="quick" />
            </Switch>
          </XStack>
        </XStack>
        <Text fontSize={13} color="$brandText" opacity={0.7} lineHeight={20}>
          When active, StashFlow will pause all discretionary savings goals and recalculate your "Free to Spend" amount based strictly on essential categories (Housing, Utilities, Food).
        </Text>
      </YStack>

      {/* 3. Account Information */}
      <YStack backgroundColor="$brandWhite" padding={24} borderRadius={12} borderWidth={1} borderColor="rgba(13,61,61,0.1)">
        <Text fontSize={18} fontWeight="700" color="$brandPrimary" marginBottom={16}>Account Information</Text>
        <YStack gap={12}>
          <YStack>
            <Text fontSize={11} fontWeight="700" color="$brandTextSub" textTransform="uppercase" letterSpacing={1}>Full Name</Text>
            <Text fontSize={15} color="$brandText">{profile.full_name || 'Not set'}</Text>
          </YStack>
          <YStack>
            <Text fontSize={11} fontWeight="700" color="$brandTextSub" textTransform="uppercase" letterSpacing={1}>Email Address</Text>
            <Text fontSize={15} color="$brandText">{profile.email}</Text>
          </YStack>
        </YStack>
      </YStack>
    </YStack>
  )
}
