'use client'

import { useState } from 'react'
import { addExpense } from '@/app/dashboard/spending/actions'
import { Database } from '@stashflow/core'
import { XStack, YStack, Text, Input, Button, Label, TextArea, Spinner } from 'tamagui'

type ExpenseCategory = Database['public']['Enums']['expense_category']

const CATEGORIES: ExpenseCategory[] = [
  'housing', 'food', 'transport', 'utilities', 'healthcare',
  'entertainment', 'education', 'personal', 'other',
]

export default function ExpenseForm() {
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
              <Label {...labelProps}>Amount</Label>
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
              <Label {...labelProps}>Currency</Label>
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
              </select>
            </YStack>
          </XStack>

          {/* Category */}
          <YStack>
            <Label {...labelProps}>Category</Label>
            <select 
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
            <Label {...labelProps}>Description</Label>
            <Input
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
            <Label {...labelProps}>Date</Label>
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
            <Label {...labelProps}>Notes (Optional)</Label>
            <TextArea
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
          <Button
            theme="active"
            disabled={loading}
            onPress={(e) => {
              const form = (e.target as any).closest('form')
              if (form) form.requestSubmit()
            }}
            borderRadius={0}
            backgroundColor="$brandPrimary"
            color="$brandWhite"
            fontWeight="700"
            letterSpacing={1}
            textTransform="uppercase"
            pressStyle={{ opacity: 0.8 }}
          >
            {loading ? <Spinner color="$brandWhite" /> : 'Add Expense'}
          </Button>

        </YStack>
      </form>
    </YStack>
  )
}
