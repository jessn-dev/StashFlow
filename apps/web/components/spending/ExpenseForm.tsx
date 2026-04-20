'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addExpense } from '@/app/dashboard/spending/actions'
import { Database } from '@stashflow/core'
import { XStack, YStack, Text, Input, Button, Label, TextArea, Spinner } from 'tamagui'

type ExpenseCategory = Database['public']['Enums']['expense_category']

const CATEGORIES: ExpenseCategory[] = [
  'housing', 'food', 'transport', 'utilities', 'healthcare',
  'entertainment', 'education', 'personal', 'other',
]

export default function ExpenseForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setMessage(null)
    const result = await addExpense(formData)
    if (result.error) {
      setMessage({ type: 'error', text: result.error })
    } else {
      setMessage({ type: 'success', text: 'Expense added successfully!' })
      const form = document.getElementById('expense-form') as HTMLFormElement
      form?.reset()
      router.refresh()
    }
    setLoading(false)
  }

  const labelProps = {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
    color: '$brandPrimary',
    marginBottom: 4,
  }

  return (
    <YStack
      backgroundColor="$brandWhite"
      padding={32}
      borderWidth={1}
      borderColor="rgba(13,61,61,0.1)"
      gap={24}
    >
      <Text fontSize={22} fontWeight="700" color="$brandPrimary">Log New Expense</Text>

      <form id="expense-form" action={handleSubmit}>
        <YStack gap={16}>

          {/* Amount + Currency */}
          <XStack gap={16} flexWrap="wrap">
            <YStack flex={1} minWidth={200}>
              <Label htmlFor="amount" {...labelProps}>Amount</Label>
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
              <Label htmlFor="currency" {...labelProps}>Currency</Label>
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

          {/* Category */}
          <YStack>
            <Label htmlFor="category" {...labelProps}>Category</Label>
            <select 
              id="category"
              name="category" 
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
                textTransform: 'capitalize',
              }}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </YStack>

          {/* Description */}
          <YStack>
            <Label htmlFor="description" {...labelProps}>Description</Label>
            <Input
              id="description"
              name="description"
              placeholder="e.g. Weekly Groceries"
              borderRadius={0}
              borderColor="rgba(13,61,61,0.2)"
              focusStyle={{ borderColor: '$brandAccent', outlineStyle: 'none' }}
              required
            />
          </YStack>

          {/* Date */}
          <YStack>
            <Label htmlFor="date" {...labelProps}>Date</Label>
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

          {/* Recurring */}
          <XStack alignItems="center" gap={12}>
            <input
              type="checkbox"
              name="is_recurring"
              id="is_recurring"
              style={{ width: 18, height: 18, accentColor: '#0D3D3D', cursor: 'pointer' }}
            />
            <Label htmlFor="is_recurring" {...labelProps} marginBottom={0} cursor="pointer">
              Recurring Expense
            </Label>
          </XStack>

          {/* Notes */}
          <YStack>
            <Label htmlFor="notes" {...labelProps}>Notes (Optional)</Label>
            <TextArea
              id="notes"
              name="notes"
              placeholder="Add any extra details..."
              height={80}
              borderRadius={0}
              borderColor="rgba(13,61,61,0.2)"
              focusStyle={{ borderColor: '$brandAccent', outlineStyle: 'none' }}
            />
          </YStack>

          {/* Feedback */}
          {message && (
            <YStack
              padding={16}
              backgroundColor={message.type === 'success' ? 'rgba(54,211,153,0.1)' : 'rgba(248,114,114,0.1)'}
            >
              <Text
                fontSize={14}
                color={message.type === 'success' ? '#059669' : '#DC2626'}
                fontFamily="$mono"
              >
                {message.text}
              </Text>
            </YStack>
          )}

          {/* Submit */}
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
              <Text
                color="$brandWhite"
                fontWeight="700"
                letterSpacing={1}
                textTransform="uppercase"
              >
                Add Expense
              </Text>
            )}
          </button>

        </YStack>
      </form>
    </YStack>
  )
}
