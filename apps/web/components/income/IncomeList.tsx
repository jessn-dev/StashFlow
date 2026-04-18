'use client'

import { removeIncome } from '@/app/dashboard/income/actions'
import { formatCurrency, Database } from '@stashflow/core'
import { convertCurrency } from '@stashflow/api'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { YStack, XStack, Text, Button, Spinner } from 'tamagui'
import { Trash2 } from 'lucide-react-native'
import ConfirmationModal from '@/components/ui/ConfirmationModal'

type Income = Database['public']['Tables']['incomes']['Row']

interface IncomeListProps {
  incomes: Income[]
  preferredCurrency?: string
  rates?: Record<string, number>
}

export default function IncomeList({ incomes, preferredCurrency, rates = {} }: IncomeListProps) {
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
    await removeIncome(confirmingDeleteId)
    setDeletingId(null)
    setConfirmingDeleteId(null)
    router.refresh()
  }

  if (incomes.length === 0) {
    return (
      <YStack padding={48} alignItems="center">
        <Text color="$brandText" opacity={0.6} fontFamily="$mono" fontSize={14}>No income entries recorded yet.</Text>
      </YStack>
    )
  }

  return (
    <>
      <ConfirmationModal
        isOpen={confirmingDeleteId !== null}
        onClose={() => setConfirmingDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Income Entry"
        description="Are you sure you want to delete this income entry? This action cannot be undone."
        confirmText="Delete"
        isHighRisk={true}
      />

      {/* Header */}
      <XStack paddingHorizontal={24} paddingVertical={12} borderBottomWidth={1} borderColor="rgba(13,61,61,0.05)" backgroundColor="rgba(13,61,61,0.02)">
        <Text flex={1} fontSize={11} fontWeight="700" color="$brandText" opacity={0.5} textTransform="uppercase" letterSpacing={1.2} fontFamily="$mono">Date</Text>
        <Text flex={2} fontSize={11} fontWeight="700" color="$brandText" opacity={0.5} textTransform="uppercase" letterSpacing={1.2} fontFamily="$mono">Source / Frequency</Text>
        <Text flex={1} fontSize={11} fontWeight="700" color="$brandText" opacity={0.5} textTransform="uppercase" letterSpacing={1.2} fontFamily="$mono" textAlign="right">Amount</Text>
        <Text width={40}></Text>
      </XStack>

      {incomes.map((income) => (
        <XStack
          key={income.id}
          paddingHorizontal={24}
          paddingVertical={14}
          borderBottomWidth={1}
          borderColor="rgba(13,61,61,0.05)"
          alignItems="center"
          hoverStyle={{ backgroundColor: 'rgba(13,61,61,0.02)' }}
        >
          <Text flex={1} fontSize={13} fontFamily="$mono" color="$brandText" opacity={0.7}>
            {new Date(income.date).toLocaleDateString()}
          </Text>
          <YStack flex={2} gap={2}>
            <Text fontSize={14} fontWeight="700" color="$brandPrimary">{income.source}</Text>
            <Text fontSize={12} color="$brandText" opacity={0.5} textTransform="capitalize">{income.frequency}</Text>
          </YStack>
          <Text flex={1} fontSize={14} fontWeight="700" color="$brandAccent" textAlign="right">
            +{fmt(income.amount, income.currency ?? 'USD')}
          </Text>
          <XStack width={40} justifyContent="flex-end">
            <Button
              chromeless
              padding={0}
              onPress={() => setConfirmingDeleteId(income.id)}
              disabled={deletingId === income.id}
            >
              {deletingId === income.id ? (
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
