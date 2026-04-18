'use client'

import BudgetProgress from '@/components/budgets/BudgetProgress'
import BudgetSetupWizard from '@/components/budgets/BudgetSetupWizard'
import { YStack, Text, Button } from 'tamagui'
import { BudgetPeriod, Profile } from '@stashflow/core'
import { updateBudgetSettingsAction } from './actions'

interface BudgetsUIProps {
  periods: BudgetPeriod[]
  profile: Profile
  onEnable: () => void
  userEmail: string
}

export default function BudgetsUI({ periods, profile, onEnable, userEmail }: BudgetsUIProps) {
  const enabled = (profile as any).budgeting_enabled || false

  async function handleEnable() {
    await updateBudgetSettingsAction({ budgeting_enabled: true })
    onEnable()
  }

  return (
    <YStack gap={32}>
      {enabled ? (
        periods.length > 0 ? (
          <BudgetProgress periods={periods} currency={profile.preferred_currency || 'USD'} />
        ) : (
          <BudgetSetupWizard onSuccess={onEnable} />
        )
      ) : (
        <YStack padding={64} alignItems="center" gap={16} backgroundColor="rgba(13,61,61,0.02)" borderRadius={12} borderStyle="dashed" borderWidth={1} borderColor="rgba(13,61,61,0.1)">
           <Text fontSize={18} fontWeight="700" color="$brandPrimary">Budgeting is turned off</Text>
           <Text fontSize={14} color="$brandTextSub" textAlign="center" maxWidth={400}>
             Enable budgeting to set monthly spending limits, track category progress, and carry over unused funds.
           </Text>
           <Button backgroundColor="$brandPrimary" onPress={handleEnable}>
             <Text color="white" fontWeight="700">Enable Now</Text>
           </Button>
        </YStack>
      )}
    </YStack>
  )
}
