'use client'

import { YStack, Text } from 'tamagui'

interface InsightsPanelProps {
  insights: string[]
  title?: string
}

export default function InsightsPanel({ insights, title = 'Key Insights' }: InsightsPanelProps) {
  if (insights.length === 0) return null

  return (
    <YStack
      backgroundColor="#F9FAFB"
      borderRadius={12}
      borderWidth={1}
      borderColor="rgba(13,61,61,0.08)"
      padding={20}
      gap={12}
    >
      <Text fontSize={11} fontWeight="700" color="$brandPrimary" textTransform="uppercase" letterSpacing={1.2}>
        {title}
      </Text>
      <YStack gap={10}>
        {insights.map((insight, i) => (
          <Text key={i} fontSize={13} color="$brandText" lineHeight={20}>
            • {insight}
          </Text>
        ))}
      </YStack>
    </YStack>
  )
}
