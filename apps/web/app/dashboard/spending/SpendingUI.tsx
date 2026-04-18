'use client'

import { useState } from 'react'
import ExpenseForm from '@/components/spending/ExpenseForm'
import ExpenseList from '@/components/spending/ExpenseList'
import CategoryBreakdown from '@/components/spending/CategoryBreakdown'
import { YStack, XStack, Text, Button } from 'tamagui'
import { Expense } from '@stashflow/core'
import { ChevronLeft, ChevronRight } from 'lucide-react-native'

interface SpendingUIProps {
  expenses: Expense[]
  breakdown: { category: string; amount: number }[]
  preferredCurrency: string
  rates: Record<string, number>
}

export default function SpendingUI({ expenses, breakdown, preferredCurrency, rates }: SpendingUIProps) {
  const [page, setPage] = useState(1)
  const pageSize = 10
  const totalPages = Math.ceil(expenses.length / pageSize)
  const paginatedExpenses = expenses.slice((page - 1) * pageSize, page * pageSize)

  return (
    <XStack gap={32} flexWrap="wrap" alignItems="flex-start" alignSelf="flex-start" width="100%">
      {/* Left Column: Table */}
      <YStack flex={2.5} minWidth={400} gap={20}>
        <YStack backgroundColor="$brandWhite" borderRadius={12} borderWidth={1} borderColor="rgba(13,61,61,0.1)" overflow="hidden">
          <XStack paddingHorizontal={24} paddingVertical={16} borderBottomWidth={1} borderColor="rgba(13,61,61,0.05)" backgroundColor="rgba(13,61,61,0.01)" justifyContent="space-between" alignItems="center">
            <Text fontSize={15} fontWeight="700" color="$brandPrimary">Spending History</Text>
          </XStack>
          <ExpenseList 
            expenses={paginatedExpenses} 
            preferredCurrency={preferredCurrency} 
            rates={rates} 
          />
          
          {totalPages > 1 && (
            <XStack padding={16} justifyContent="center" alignItems="center" gap={20} borderTopWidth={1} borderColor="rgba(13,61,61,0.05)">
              <Button 
                size="$2" 
                circular 
                disabled={page === 1} 
                onPress={() => setPage(p => p - 1)}
                icon={<ChevronLeft size={16} />} 
              />
              <Text fontSize={13} color="$brandTextSub">Page {page} of {totalPages}</Text>
              <Button 
                size="$2" 
                circular 
                disabled={page === totalPages} 
                onPress={() => setPage(p => p + 1)}
                icon={<ChevronRight size={16} />} 
              />
            </XStack>
          )}
        </YStack>
      </YStack>

      {/* Right Column: Breakdown + Form */}
      <YStack flex={1} minWidth={320} gap={24}>
        <CategoryBreakdown data={breakdown} />
        
        <YStack backgroundColor="$brandPrimary" padding={24} borderRadius={12} gap={12}>
          <Text fontSize={16} fontWeight="700" color="$brandWhite">Spending Advice</Text>
          <Text fontSize={13} fontFamily="$mono" color="$brandWhite" opacity={0.8} lineHeight={20}>
            Detailed categorization leads to better financial clarity and easier budgeting.
          </Text>
        </YStack>

        <ExpenseForm />
      </YStack>
    </XStack>
  )
}
