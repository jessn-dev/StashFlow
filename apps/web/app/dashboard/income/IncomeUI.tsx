'use client'

import { useState } from 'react'
import IncomeForm from '@/components/income/IncomeForm'
import IncomeList from '@/components/income/IncomeList'
import { YStack, XStack, Text, Button } from 'tamagui'
import { Income } from '@stashflow/core'
import { ChevronLeft, ChevronRight } from 'lucide-react-native'

interface IncomeUIProps {
  incomes: Income[]
  preferredCurrency: string
  rates: Record<string, number>
}

export default function IncomeUI({ incomes, preferredCurrency, rates }: IncomeUIProps) {
  const [page, setPage] = useState(1)
  const pageSize = 10
  const totalPages = Math.ceil(incomes.length / pageSize)
  const paginatedIncomes = incomes.slice((page - 1) * pageSize, page * pageSize)

  return (
    <XStack gap={32} flexWrap="wrap" alignItems="flex-start" alignSelf="flex-start" width="100%">
      {/* Left Column: Table (Fully Utilized) */}
      <YStack flex={2.5} minWidth={400} gap={20}>
        <YStack backgroundColor="$brandWhite" borderRadius={12} borderWidth={1} borderColor="rgba(13,61,61,0.1)" overflow="hidden">
          <XStack paddingHorizontal={24} paddingVertical={16} borderBottomWidth={1} borderColor="rgba(13,61,61,0.05)" backgroundColor="rgba(13,61,61,0.01)" justifyContent="space-between" alignItems="center">
            <Text fontSize={15} fontWeight="700" color="$brandPrimary">Income Sources</Text>
          </XStack>
          <IncomeList 
            incomes={paginatedIncomes} 
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

      {/* Right Column: Tips + Form */}
      <YStack flex={1} minWidth={320} gap={24}>
        <YStack backgroundColor="$brandPrimary" padding={24} borderRadius={12} gap={12}>
          <Text fontSize={16} fontWeight="700" color="$brandWhite">Income Tracking</Text>
          <Text fontSize={13} fontFamily="$mono" color="$brandWhite" opacity={0.8} lineHeight={20}>
            Tracking all sources of income provides a more accurate picture of your DTI ratio.
          </Text>
        </YStack>

        <IncomeForm />
      </YStack>
    </XStack>
  )
}
