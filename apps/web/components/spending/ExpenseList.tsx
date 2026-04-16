'use client'

import { removeExpense } from '@/app/dashboard/spending/actions'
import { formatCurrency, Database } from '@stashflow/core'
import { useState } from 'react'
import { YStack, XStack, Text, Button, Spinner } from 'tamagui'
import { Trash2 } from 'lucide-react-native'

type Expense = Database['public']['Tables']['expenses']['Row']

interface ExpenseListProps {
  expenses: Expense[]
}

export default function ExpenseList({ expenses }: ExpenseListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this expense?')) return
    
    setDeletingId(id)
    await removeExpense(id)
    setDeletingId(null)
  }

  if (expenses.length === 0) {
    return (
      <YStack backgroundColor="$brandWhite" padding={64} borderStyle="solid" borderWidth={1} borderColor="rgba(13,61,61,0.1)" shadowColor="black" shadowOpacity={0.05} shadowRadius={2} alignItems="center">
        <Text color="$brandText" opacity={0.6} fontFamily="$mono" fontSize={14}>No expenses recorded yet.</Text>
      </YStack>
    )
  }

  return (
    <YStack backgroundColor="$brandWhite" borderWidth={1} borderColor="rgba(13,61,61,0.1)" shadowColor="black" shadowOpacity={0.05} shadowRadius={2} overflow="hidden">
      <YStack padding={32} borderBottomWidth={1} borderColor="rgba(13,61,61,0.1)">
        <Text fontSize={24} fontWeight="700" color="$brandPrimary">Expense History</Text>
      </YStack>
      
      <YStack>
        {/* Header */}
        <XStack paddingHorizontal={32} paddingVertical={24} borderBottomWidth={1} borderColor="rgba(13,61,61,0.05)" backgroundColor="$brandWhite">
          <Text flex={1} fontSize={11} fontWeight="700" color="$brandText" opacity={0.5} textTransform="uppercase" letterSpacing={1.2} fontFamily="$mono">Date</Text>
          <Text flex={2} fontSize={11} fontWeight="700" color="$brandText" opacity={0.5} textTransform="uppercase" letterSpacing={1.2} fontFamily="$mono">Description / Category</Text>
          <Text flex={1} fontSize={11} fontWeight="700" color="$brandText" opacity={0.5} textTransform="uppercase" letterSpacing={1.2} fontFamily="$mono" textAlign="right">Amount</Text>
          <Text width={40}></Text>
        </XStack>

        {expenses.map((expense) => (
          <XStack 
            key={expense.id} 
            paddingHorizontal={32} 
            paddingVertical={20} 
            borderBottomWidth={1} 
            borderColor="rgba(13,61,61,0.05)" 
            alignItems="center"
            hoverStyle={{ backgroundColor: 'rgba(13,61,61,0.02)' }}
          >
            <Text flex={1} fontSize={13} fontFamily="$mono" color="$brandText" opacity={0.7}>
              {new Date(expense.date).toLocaleDateString()}
            </Text>
            <YStack flex={2} gap={2}>
              <Text fontSize={14} fontWeight="700" color="$brandPrimary">{expense.description}</Text>
              <Text fontSize={12} color="$brandText" opacity={0.5} textTransform="capitalize">
                {expense.category} {expense.is_recurring && '• Recurring'}
              </Text>
            </YStack>
            <Text flex={1} fontSize={14} fontWeight="700" color="$brandText" textAlign="right">
              -{formatCurrency(expense.amount, expense.currency)}
            </Text>
            <XStack width={40} justifyContent="flex-end">
              <Button 
                chromeless
                padding={0}
                onPress={() => handleDelete(expense.id)}
                disabled={deletingId === expense.id}
              >
                {deletingId === expense.id ? (
                  <Spinner size="small" color="$red10" />
                ) : (
                  <Trash2 size={18} color="#f87171" />
                )}
              </Button>
            </XStack>
          </XStack>
        ))}
      </YStack>
    </YStack>
  )
}
