'use client'

import { formatCurrency, BudgetPeriod } from '@stashflow/core'
import { YStack, XStack, Text, Circle } from 'tamagui'
import { AlertCircle, CheckCircle2 } from 'lucide-react-native'

interface BudgetProgressProps {
  periods: BudgetPeriod[]
  currency: string
}

export default function BudgetProgress({ periods, currency }: BudgetProgressProps) {
  const totalBudgeted = (periods as any[]).reduce((s: number, p: any) => s + Number(p.budgeted ?? 0), 0)
  const totalSpent    = (periods as any[]).reduce((s: number, p: any) => s + Number(p.spent ?? 0), 0)
  const totalRollover = (periods as any[]).reduce((s: number, p: any) => s + Number(p.rolled_over_amount ?? 0), 0)
  
  const available = (totalBudgeted + totalRollover) - totalSpent
  const isOverBudget = available < 0

  if (periods.length === 0) {
    return (
      <YStack backgroundColor="$brandWhite" padding={32} borderRadius={12} borderWidth={1} borderColor="rgba(13,61,61,0.1)" alignItems="center">
        <Text color="$brandTextSub">No active budgets for this period.</Text>
      </YStack>
    )
  }

  return (
    <YStack gap={32}>
      {/* Summary Row */}
      <XStack gap={20} flexWrap="wrap">
        <YStack flex={1} minWidth={200} backgroundColor="$brandWhite" padding={24} borderRadius={12} borderWidth={1} borderColor="rgba(13,61,61,0.1)">
          <Text fontSize={10} fontWeight="700" color="$brandTextSub" textTransform="uppercase" letterSpacing={1.5}>Free to Spend</Text>
          <Text fontSize={28} fontWeight="900" color={isOverBudget ? '#DC2626' : '#059669'}>{formatCurrency(available, currency)}</Text>
        </YStack>
        <YStack flex={1} minWidth={200} backgroundColor="$brandWhite" padding={24} borderRadius={12} borderWidth={1} borderColor="rgba(13,61,61,0.1)">
          <Text fontSize={10} fontWeight="700" color="$brandTextSub" textTransform="uppercase" letterSpacing={1.5}>Total Rollover</Text>
          <Text fontSize={28} fontWeight="900" color="$brandPrimary">{formatCurrency(totalRollover, currency)}</Text>
        </YStack>
      </XStack>

      {/* Category List */}
      <YStack backgroundColor="$brandWhite" padding={32} borderRadius={12} borderWidth={1} borderColor="rgba(13,61,61,0.1)" gap={24}>
        <Text fontSize={18} fontWeight="700" color="$brandPrimary">Category Budgets</Text>
        
        <YStack gap={28}>
          {periods.map((p) => {
            const limit = Number(p.budgeted) + Number(p.rolled_over_amount)
            const spent = Number(p.spent)
            const remaining = limit - spent
            const percent = limit > 0 ? (spent / limit) * 100 : 0
            const isExceeded = remaining < 0
            
            return (
              <YStack key={p.category} gap={10}>
                <XStack justifyContent="space-between" alignItems="flex-end">
                  <YStack gap={2}>
                    <Text fontSize={12} fontWeight="700" color="$brandPrimary" textTransform="uppercase" letterSpacing={1}>{p.category}</Text>
                    <XStack gap={8} alignItems="center">
                      <Text fontSize={11} color="$brandTextSub">Limit: {formatCurrency(limit, currency)}</Text>
                      {Number(p.rolled_over_amount) !== 0 && (
                        <Text fontSize={10} color="$brandAccent" fontWeight="600">(Incl. {formatCurrency(p.rolled_over_amount, currency)} rollover)</Text>
                      )}
                    </XStack>
                  </YStack>
                  <YStack alignItems="flex-end">
                    <Text fontSize={14} fontWeight="700" color={isExceeded ? '#DC2626' : '$brandText'}>
                      {formatCurrency(spent, currency)} spent
                    </Text>
                    <XStack gap={4} alignItems="center">
                      {isExceeded ? <AlertCircle size={10} color="#DC2626" /> : <CheckCircle2 size={10} color="#059669" />}
                      <Text fontSize={10} color={isExceeded ? '#DC2626' : '#059669'} fontWeight="700">
                        {isExceeded ? `${formatCurrency(Math.abs(remaining), currency)} OVER` : `${formatCurrency(remaining, currency)} LEFT`}
                      </Text>
                    </XStack>
                  </YStack>
                </XStack>

                <YStack height={10} backgroundColor="$brandBg" borderRadius={999} overflow="hidden">
                   <YStack 
                    height="100%" 
                    width={`${Math.min(percent, 100)}%`} 
                    backgroundColor={isExceeded ? '#DC2626' : (percent > 85 ? '#EAB308' : '#1A7A7A')}
                    borderRadius={999}
                    {...({ style: { transition: 'width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)' } } as any)}
                   />
                </YStack>
              </YStack>
            )
          })}
        </YStack>
      </YStack>
    </YStack>
  )
}
