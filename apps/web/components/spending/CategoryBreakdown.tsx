'use client'

import { formatCurrency } from '@fintrack/core'
import { YStack, XStack, Text } from 'tamagui'

interface CategoryData {
  category: string
  amount: number
}

interface CategoryBreakdownProps {
  data: CategoryData[]
}

export default function CategoryBreakdown({ data }: CategoryBreakdownProps) {
  const total = data.reduce((sum, item) => sum + item.amount, 0)
  const sortedData = [...data].sort((a, b) => b.amount - a.amount)

  if (total === 0) {
    return (
      <YStack backgroundColor="$brandWhite" padding={32} borderWidth={1} borderColor="rgba(13,61,61,0.1)" shadowColor="black" shadowOpacity={0.05} shadowRadius={2}>
        <Text fontSize={24} fontWeight="700" color="$brandPrimary" marginBottom={24}>Spending Breakdown</Text>
        <Text color="$brandText" opacity={0.6} fontFamily="$mono" fontSize={14}>No data to display.</Text>
      </YStack>
    )
  }

  return (
    <YStack backgroundColor="$brandWhite" padding={32} borderWidth={1} borderColor="rgba(13,61,61,0.1)" shadowColor="black" shadowOpacity={0.05} shadowRadius={2}>
      <Text fontSize={24} fontWeight="700" color="$brandPrimary" marginBottom={24}>Spending Breakdown</Text>
      
      <YStack gap={24}>
        {sortedData.map((item) => {
          const percentage = (item.amount / total) * 100
          return (
            <YStack key={item.category} gap={8}>
              <XStack justifyContent="space-between" alignItems="flex-end">
                <Text fontSize={11} fontWeight="700" color="$brandPrimary" textTransform="uppercase" letterSpacing={1.2}>
                  {item.category}
                </Text>
                <Text fontSize={12} fontFamily="$mono" color="$brandText" opacity={0.7}>
                  {formatCurrency(item.amount)} ({percentage.toFixed(1)}%)
                </Text>
              </XStack>
              <YStack width="100%" backgroundColor="$brandBg" height={8} overflow="hidden">
                <YStack 
                  backgroundColor="$brandAccent" 
                  height="100%" 
                  width={`${percentage}%`}
                  {...({ style: { transition: 'width 0.5s ease-in-out' } } as any)}
                />
              </YStack>
            </YStack>
          )
        })}
      </YStack>

      <XStack marginTop={40} paddingTop={24} borderTopWidth={1} borderColor="rgba(13,61,61,0.1)" justifyContent="space-between" alignItems="center">
        <Text fontSize={12} fontWeight="700" color="$brandPrimary" textTransform="uppercase" letterSpacing={1.5}>Total Spending</Text>
        <Text fontSize={24} fontWeight="700" color="$brandPrimary">{formatCurrency(total)}</Text>
      </XStack>
    </YStack>
  )
}
