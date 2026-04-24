'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addIncome } from '@/app/dashboard/income/actions'
import { Database } from '@stashflow/core'
import { YStack, XStack, Text, Input, TextArea, Button, Label, Spinner } from 'tamagui'

type IncomeFrequency = Database['public']['Enums']['income_frequency']

const FREQUENCIES: IncomeFrequency[] = ['one-time', 'weekly', 'monthly']

export default function IncomeForm({ onSuccess }: { onSuccess?: () => void }) {
  const router = useRouter()
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
      onSuccess?.()
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
              <Label htmlFor="amount" fontSize={12} fontWeight="700" color="$brandPrimary" textTransform="uppercase" letterSpacing={1.5} marginBottom={4}>Amount</Label>
              <Input 
                id="amount"
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
              <Label htmlFor="currency" fontSize={12} fontWeight="700" color="$brandPrimary" textTransform="uppercase" letterSpacing={1.5} marginBottom={4}>Currency</Label>
              <select 
                id="currency"
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
              <Label htmlFor="source" fontSize={12} fontWeight="700" color="$brandPrimary" textTransform="uppercase" letterSpacing={1.5} marginBottom={4}>Source</Label>
              <Input 
                id="source"
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
              <Label htmlFor="frequency" fontSize={12} fontWeight="700" color="$brandPrimary" textTransform="uppercase" letterSpacing={1.5} marginBottom={4}>Frequency</Label>
              <select 
                id="frequency"
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
            <Label htmlFor="date" fontSize={12} fontWeight="700" color="$brandPrimary" textTransform="uppercase" letterSpacing={1.5} marginBottom={4}>Date</Label>
            <Input 
              id="date"
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
            <Label htmlFor="notes" fontSize={12} fontWeight="700" color="$brandPrimary" textTransform="uppercase" letterSpacing={1.5} marginBottom={4}>Notes (Optional)</Label>
            <TextArea 
              id="notes"
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

          <button 
            type="submit"
            disabled={loading}
            style={{
              borderRadius: 0,
              backgroundColor: '#0D3D3D',
              border: 'none',
              padding: '12px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? (
              <Spinner color="$brandWhite" />
            ) : (
              <Text color="$brandWhite" fontWeight="700" letterSpacing={1} textTransform="uppercase">
                Add Income
              </Text>
            )}
          </button>
        </YStack>
      </form>
    </YStack>
  )
}
