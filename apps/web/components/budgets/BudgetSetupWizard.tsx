'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { YStack, XStack, Text, Input, Button, Label, Spinner } from 'tamagui'
import { ExpenseCategory } from '@stashflow/core'
import { upsertBudgetAction } from '@/app/dashboard/budgets/actions'

const CATEGORIES: ExpenseCategory[] = [
  'housing', 'food', 'transport', 'utilities', 
  'healthcare', 'entertainment', 'education', 'personal', 'other'
]

interface BudgetSetupWizardProps {
  onSuccess?: () => void
}

export default function BudgetSetupWizard({ onSuccess }: BudgetSetupWizardProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [amounts, setAmounts] = useState<Record<string, string>>({})
  const [success, setSuccess] = useState(false)

  async function handleSave() {
    setLoading(true)
    try {
      for (const cat of CATEGORIES) {
        const val = Number(amounts[cat])
        if (val > 0) {
          await upsertBudgetAction(cat, val)
        }
      }
      setSuccess(true)
      onSuccess?.()
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <YStack backgroundColor="$brandWhite" padding={40} borderRadius={12} borderWidth={1} borderColor="rgba(13,61,61,0.1)" alignItems="center" gap={16}>
        <Text fontSize={20} fontWeight="700" color="$brandPrimary">Budgets Set Successfully!</Text>
        <Text fontSize={14} color="$brandTextSub" textAlign="center">Your monthly limits are now active and will track your spending.</Text>
      </YStack>
    )
  }

  return (
    <YStack backgroundColor="$brandWhite" padding={32} borderRadius={12} borderWidth={1} borderColor="rgba(13,61,61,0.1)" gap={24}>
      <YStack gap={4}>
        <Text fontSize={20} fontWeight="700" color="$brandPrimary">Set Monthly Limits</Text>
        <Text fontSize={13} color="$brandTextSub">Define your baseline spending budget for each category.</Text>
      </YStack>

      <YStack gap={16}>
        <XStack flexWrap="wrap" gap={16}>
          {CATEGORIES.map((cat) => (
            <YStack key={cat} flex={1} minWidth={200} gap={6}>
              <Label fontSize={11} fontWeight="700" color="$brandTextSub" textTransform="uppercase" letterSpacing={1}>{cat}</Label>
              <Input 
                value={amounts[cat] || ''}
                onChangeText={(val) => setAmounts(prev => ({ ...prev, [cat]: val }))}
                placeholder="0.00" 
                inputMode="decimal"
                borderRadius={8}
                borderColor="rgba(13,61,61,0.15)"
                focusStyle={{ borderColor: '$brandAccent' }}
              />
            </YStack>
          ))}
        </XStack>

        <Button 
          disabled={loading}
          backgroundColor="$brandPrimary"
          height={48}
          borderRadius={8}
          marginTop={16}
          onPress={handleSave}
        >
          {loading ? <Spinner color="white" /> : <Text color="white" fontWeight="700">SAVE ALL BUDGETS</Text>}
        </Button>
      </YStack>
    </YStack>
  )
}
