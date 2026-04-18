'use client'

import { removeExpense } from '@/app/dashboard/spending/actions'
import { formatCurrency, Database } from '@stashflow/core'
import { convertCurrency } from '@stashflow/api'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { YStack, XStack, Text, Button, Spinner } from 'tamagui'
import { Trash2 } from 'lucide-react-native'
import ConfirmationModal from '@/components/ui/ConfirmationModal'

type Expense = Database['public']['Tables']['expenses']['Row']

interface ExpenseListProps {
  expenses: Expense[]
  preferredCurrency?: string
  rates?: Record<string, number>
}

export default function ExpenseList({ expenses, preferredCurrency, rates = {} }: ExpenseListProps) {
  const router = useRouter()
  const fmt = (amount: number, currency: string) => {
    if (!preferredCurrency || currency === preferredCurrency) return formatCurrency(amount, currency)
    return formatCurrency(convertCurrency(amount, currency, preferredCurrency, rates), preferredCurrency)
  }
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)

  async function handleDelete() {
    if (!confirmingDeleteId) return
    setDeletingId(confirmingDeleteId)
    await removeExpense(confirmingDeleteId)
    setDeletingId(null)
    setConfirmingDeleteId(null)
    router.refresh()
  }

  if (expenses.length === 0) {
    return (
      <YStack padding={48} alignItems="center">
        <Text color="$brandText" opacity={0.6} fontFamily="$mono" fontSize={14}>No expenses recorded yet.</Text>
      </YStack>
    )
  }

  return (
    <>
      <ConfirmationModal
        isOpen={confirmingDeleteId !== null}
        onClose={() => setConfirmingDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Expense"
        description="Are you sure you want to delete this expense? This action cannot be undone."
        confirmText="Delete"
        isHighRisk={true}
      />

      {/* Header */}
      <XStack paddingHorizontal={24} paddingVertical={12} borderBottomWidth={1} borderColor="rgba(13,61,61,0.05)" backgroundColor="rgba(13,61,61,0.02)">
        <Text flex={1} fontSize={11} fontWeight="700" color="$brandText" opacity={0.5} textTransform="uppercase" letterSpacing={1.2} fontFamily="$mono">Date</Text>
        <Text flex={2} fontSize={11} fontWeight="700" color="$brandText" opacity={0.5} textTransform="uppercase" letterSpacing={1.2} fontFamily="$mono">Description / Category</Text>
        <Text flex={1} fontSize={11} fontWeight="700" color="$brandText" opacity={0.5} textTransform="uppercase" letterSpacing={1.2} fontFamily="$mono" textAlign="right">Amount</Text>
        <Text width={40}></Text>
      </XStack>

      {expenses.map((expense) => (
        <XStack
          key={expense.id}
          paddingHorizontal={24}
          paddingVertical={14}
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
            -{fmt(expense.amount, expense.currency ?? 'USD')}
          </Text>
          <XStack width={40} justifyContent="flex-end">
            <Button
              chromeless
              padding={0}
              onPress={() => setConfirmingDeleteId(expense.id)}
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
    </>
  )
}
