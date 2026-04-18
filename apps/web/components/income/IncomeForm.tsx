'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addIncome } from '@/app/dashboard/income/actions'
import { Database } from '@stashflow/core'
import { YStack, XStack, Text, Input, TextArea, Button, Label, Spinner } from 'tamagui'

type IncomeFrequency = Database['public']['Enums']['income_frequency']

const FREQUENCIES: IncomeFrequency[] = ['one-time', 'weekly', 'monthly']

export default function IncomeForm() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setMessage(null)

    const result = await addIncome(formData)

    if (result.error) {
      setMessage({ type: 'error', text: result.error })
    } else {
      setMessage({ type: 'success', text: 'Income added successfully!' })
      const form = document.getElementById('income-form') as HTMLFormElement
      form?.reset()
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <YStack backgroundColor="$brandWhite" padding={32} borderWidth={1} borderColor="rgba(13,61,61,0.1)" shadowColor="black" shadowOpacity={0.05} shadowRadius={2} shadowOffset={{ width: 0, height: 1 }}>
      <Text fontSize={24} fontWeight="700" color="$brandPrimary" marginBottom={24}>Log New Income</Text>
      
      <form id="income-form" action={handleSubmit}>
        <YStack gap={16}>
          <XStack gap={16} flexWrap="wrap">
            <YStack flex={1} minWidth={200}>
              <Label fontSize={12} fontWeight="700" color="$brandPrimary" textTransform="uppercase" letterSpacing={1.5} marginBottom={4}>Amount</Label>
              <Input 
                name="amount" 
                inputMode="decimal"
                placeholder="0.00" 
                borderRadius={0}
                borderColor="rgba(13,61,61,0.2)"
                focusStyle={{ borderColor: '$brandAccent', outlineStyle: 'none' }}
                required 
              />
            </YStack>

            <YStack flex={1} minWidth={200}>
              <Label fontSize={12} fontWeight="700" color="$brandPrimary" textTransform="uppercase" letterSpacing={1.5} marginBottom={4}>Currency</Label>
              <select 
                name="currency" 
                defaultValue="USD"
                style={{
                  height: 44,
                  padding: '0 16px',
                  borderRadius: 0,
                  border: '1px solid rgba(13,61,61,0.2)',
                  backgroundColor: '#FFFFFF',
                  fontSize: 14,
                  color: '#444444',
                  outline: 'none',
                }}
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="JPY">JPY (¥)</option>
                <option value="PHP">PHP (₱)</option>
                <option value="SGD">SGD ($)</option>
              </select>
            </YStack>
          </XStack>

          <XStack gap={16} flexWrap="wrap">
            <YStack flex={1} minWidth={200}>
              <Label fontSize={12} fontWeight="700" color="$brandPrimary" textTransform="uppercase" letterSpacing={1.5} marginBottom={4}>Source</Label>
              <Input 
                type="text" 
                name="source" 
                placeholder="e.g. Monthly Salary" 
                borderRadius={0}
                borderColor="rgba(13,61,61,0.2)"
                focusStyle={{ borderColor: '$brandAccent', outlineStyle: 'none' }}
                required 
              />
            </YStack>

            <YStack flex={1} minWidth={200}>
              <Label fontSize={12} fontWeight="700" color="$brandPrimary" textTransform="uppercase" letterSpacing={1.5} marginBottom={4}>Frequency</Label>
              <select 
                name="frequency" 
                required
                style={{
                  height: 44,
                  padding: '0 16px',
                  borderRadius: 0,
                  border: '1px solid rgba(13,61,61,0.2)',
                  backgroundColor: '#FFFFFF',
                  fontSize: 14,
                  color: '#444444',
                  outline: 'none',
                }}
              >
                {FREQUENCIES.map(freq => (
                  <option key={freq} value={freq} style={{ textTransform: 'capitalize' }}>{freq}</option>
                ))}
              </select>
            </YStack>
          </XStack>

          <YStack>
            <Label fontSize={12} fontWeight="700" color="$brandPrimary" textTransform="uppercase" letterSpacing={1.5} marginBottom={4}>Date</Label>
            <Input 
              type="date" 
              name="date" 
              defaultValue={new Date().toISOString().split('T')[0]}
              borderRadius={0}
              borderColor="rgba(13,61,61,0.2)"
              focusStyle={{ borderColor: '$brandAccent', outlineStyle: 'none' }}
              required 
            />
          </YStack>

          <YStack>
            <Label fontSize={12} fontWeight="700" color="$brandPrimary" textTransform="uppercase" letterSpacing={1.5} marginBottom={4}>Notes (Optional)</Label>
            <TextArea 
              name="notes" 
              placeholder="Add any extra details..."
              height={96}
              borderRadius={0}
              borderColor="rgba(13,61,61,0.2)"
              focusStyle={{ borderColor: '$brandAccent', outlineStyle: 'none' }}
            />
          </YStack>

          {message && (
            <YStack padding={16} backgroundColor={message.type === 'success' ? 'rgba(54,211,153,0.1)' : 'rgba(248,114,114,0.1)'}>
              <Text fontSize={14} fontFamily="$mono" color={message.type === 'success' ? '#059669' : '#DC2626'}>
                {message.text}
              </Text>
            </YStack>
          )}

          <Button 
            disabled={loading}
            onPress={(e) => {
              // Workaround for Tamagui Button in form: it doesn't always submit automatically
              const form = (e.target as any).closest('form')
              if (form) form.requestSubmit()
            }}
            borderRadius={0}
            backgroundColor="$brandPrimary"
            pressStyle={{ opacity: 0.8 }}
          >
            {loading ? (
              <Spinner color="$brandWhite" />
            ) : (
              <Text color="$brandWhite" fontWeight="700" letterSpacing={1} textTransform="uppercase">
                Add Income
              </Text>
            )}
          </Button>
        </YStack>
      </form>
    </YStack>
  )
}
