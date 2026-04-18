'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addGoalAction } from '@/app/dashboard/goals/actions'
import { YStack, XStack, Text, Input, Button, Label, Spinner } from 'tamagui'

interface GoalFormProps {
  onSuccess?: () => void
}

export default function GoalForm({ onSuccess }: GoalFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setMessage(null)

    const result = await addGoalAction(formData)

    if (result.error) {
      setMessage({ type: 'error', text: result.error })
    } else {
      setMessage({ type: 'success', text: 'Goal added successfully!' })
      const form = document.getElementById('goal-form') as HTMLFormElement
      form?.reset()
      onSuccess?.()
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <YStack backgroundColor="$brandWhite" padding={32} borderRadius={12} borderWidth={1} borderColor="rgba(13,61,61,0.1)" shadowColor="black" shadowOpacity={0.05} shadowRadius={2}>
      <Text fontSize={20} fontWeight="700" color="$brandPrimary" marginBottom={24}>Set New Financial Goal</Text>
      
      <form id="goal-form" action={handleSubmit}>
        <YStack gap={16}>
          <YStack gap={6}>
            <Label fontSize={11} fontWeight="700" color="$brandTextSub" textTransform="uppercase" letterSpacing={1}>Goal Name</Label>
            <Input 
              name="name" 
              placeholder="e.g. Emergency Fund or Home Downpayment" 
              borderRadius={8}
              borderColor="rgba(13,61,61,0.15)"
              focusStyle={{ borderColor: '$brandAccent' }}
              required 
            />
          </YStack>

          <XStack gap={16} flexWrap="wrap">
            <YStack flex={1} minWidth={150} gap={6}>
              <Label fontSize={11} fontWeight="700" color="$brandTextSub" textTransform="uppercase" letterSpacing={1}>Target Amount</Label>
              <Input 
                name="target_amount" 
                inputMode="decimal"
                placeholder="0.00" 
                borderRadius={8}
                borderColor="rgba(13,61,61,0.15)"
                focusStyle={{ borderColor: '$brandAccent' }}
                required 
              />
            </YStack>
            <YStack flex={1} minWidth={150} gap={6}>
              <Label fontSize={11} fontWeight="700" color="$brandTextSub" textTransform="uppercase" letterSpacing={1}>Type</Label>
              <select 
                name="type" 
                style={{
                  height: 44,
                  padding: '0 16px',
                  borderRadius: 8,
                  border: '1px solid rgba(13,61,61,0.15)',
                  backgroundColor: '#FFFFFF',
                  fontSize: 14,
                  color: '#111827',
                  outline: 'none',
                }}
              >
                <option value="savings">Savings Goal</option>
                <option value="debt">Debt Payoff</option>
              </select>
            </YStack>
          </XStack>

          <XStack gap={16} flexWrap="wrap">
            <YStack flex={1} minWidth={150} gap={6}>
              <Label fontSize={11} fontWeight="700" color="$brandTextSub" textTransform="uppercase" letterSpacing={1}>Deadline (Optional)</Label>
              <Input 
                type="date"
                name="deadline" 
                borderRadius={8}
                borderColor="rgba(13,61,61,0.15)"
                focusStyle={{ borderColor: '$brandAccent' }}
              />
            </YStack>
            <YStack flex={1} minWidth={150} gap={6}>
              <Label fontSize={11} fontWeight="700" color="$brandTextSub" textTransform="uppercase" letterSpacing={1}>Currency</Label>
              <select 
                name="currency" 
                defaultValue="USD"
                style={{
                  height: 44,
                  padding: '0 16px',
                  borderRadius: 8,
                  border: '1px solid rgba(13,61,61,0.15)',
                  backgroundColor: '#FFFFFF',
                  fontSize: 14,
                  color: '#111827',
                  outline: 'none',
                }}
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="PHP">PHP (₱)</option>
                <option value="SGD">SGD ($)</option>
              </select>
            </YStack>
          </XStack>

          {message && (
            <YStack padding={12} backgroundColor={message.type === 'success' ? 'rgba(5,150,105,0.08)' : 'rgba(220,38,38,0.08)'} borderRadius={6}>
              <Text fontSize={13} color={message.type === 'success' ? '#059669' : '#DC2626'}>{message.text}</Text>
            </YStack>
          )}

          <Button 
            disabled={loading}
            onPress={(e) => {
              const form = (e.target as any).closest('form')
              if (form) form.requestSubmit()
            }}
            backgroundColor="$brandPrimary"
            height={48}
            borderRadius={8}
          >
            {loading ? <Spinner color="white" /> : <Text color="white" fontWeight="700">CREATE GOAL</Text>}
          </Button>
        </YStack>
      </form>
    </YStack>
  )
}
