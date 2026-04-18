'use client'

import { useState } from 'react'
import { updateCurrencyAction } from '@/app/dashboard/settings/actions'
import { YStack, XStack, Text, Button, Label, Spinner } from 'tamagui'

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar ($)' },
  { code: 'EUR', name: 'Euro (€)' },
  { code: 'GBP', name: 'British Pound (£)' },
  { code: 'JPY', name: 'Japanese Yen (¥)' },
  { code: 'PHP', name: 'Philippine Peso (₱)' },
  { code: 'SGD', name: 'Singapore Dollar ($)' },
]

export default function CurrencyForm({ currentCurrency }: { currentCurrency: string }) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setMessage(null)
    
    const result = await updateCurrencyAction(formData)
    
    if (result.error) {
      setMessage({ type: 'error', text: result.error })
    } else {
      setMessage({ type: 'success', text: 'Preferred currency updated!' })
    }
    setLoading(false)
  }

  return (
    <YStack backgroundColor="$brandWhite" padding={32} borderRadius={12} borderWidth={1} borderColor="rgba(13,61,61,0.1)" shadowColor="black" shadowOpacity={0.05} shadowRadius={2}>
      <Text fontSize={20} fontWeight="700" color="$brandPrimary" marginBottom={24}>Preferred Currency</Text>
      
      <form action={handleSubmit}>
        <YStack gap={16}>
          <YStack>
            <Label fontSize={12} fontWeight="700" color="$brandPrimary" textTransform="uppercase" letterSpacing={1.5} marginBottom={4}>Select Currency</Label>
            <select 
              name="currency" 
              defaultValue={currentCurrency}
              style={{
                height: 48,
                padding: '0 16px',
                borderRadius: 8,
                border: '1px solid rgba(13,61,61,0.2)',
                backgroundColor: '#FFFFFF',
                fontSize: 16,
                color: '#111827',
                outline: 'none',
                width: '100%'
              }}
            >
              {CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </YStack>

          {message && (
            <YStack padding={16} backgroundColor={message.type === 'success' ? 'rgba(54,211,153,0.1)' : 'rgba(248,114,114,0.1)'}>
              <Text fontSize={14} color={message.type === 'success' ? '#059669' : '#DC2626'}>
                {message.text}
              </Text>
            </YStack>
          )}

          <Button 
            disabled={loading}
            onPress={(e) => {
              const form = (e.target as any).closest('form')
              if (form) form.requestSubmit()
            }}
            borderRadius={8}
            backgroundColor="$brandPrimary"
            pressStyle={{ opacity: 0.8 }}
            height={48}
          >
            {loading ? (
              <Spinner color="$brandWhite" />
            ) : (
              <Text color="$brandWhite" fontWeight="700" letterSpacing={1} textTransform="uppercase">
                Save Changes
              </Text>
            )}
          </Button>
        </YStack>
      </form>
    </YStack>
  )
}
