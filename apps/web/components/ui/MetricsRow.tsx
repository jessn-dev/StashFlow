'use client'

import { XStack, YStack, Text } from 'tamagui'

export interface Metric {
  label: string
  value: string
  trend?: string
  trendPositive?: boolean
}

function MetricCard({ label, value, trend, trendPositive }: Metric) {
  return (
    <YStack
      flex={1}
      minWidth={160}
      backgroundColor="$brandWhite"
      borderRadius={12}
      borderWidth={1}
      borderColor="rgba(13,61,61,0.1)"
      paddingHorizontal={20}
      paddingVertical={18}
      gap={6}
    >
      <Text fontSize={11} fontWeight="700" color="$brandText" opacity={0.5} textTransform="uppercase" letterSpacing={1.2}>
        {label}
      </Text>
      <Text fontSize={22} fontWeight="700" color="$brandPrimary">
        {value}
      </Text>
      {trend && (
        <Text
          fontSize={12}
          fontFamily="$mono"
          color={trendPositive === undefined ? '$brandText' : trendPositive ? '#059669' : '#DC2626'}
        >
          {trend}
        </Text>
      )}
    </YStack>
  )
}

export default function MetricsRow({ metrics }: { metrics: Metric[] }) {
  return (
    <XStack gap={16} flexWrap="wrap">
      {metrics.map((m, i) => (
        <MetricCard key={i} {...m} />
      ))}
    </XStack>
  )
}
