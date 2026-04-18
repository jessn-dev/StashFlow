'use client'

import { useState } from 'react'
import GoalForm from '@/components/goals/GoalForm'
import GoalList from '@/components/goals/GoalList'
import { YStack, XStack, Text, Button } from 'tamagui'
import { Goal } from '@stashflow/core'
import { ChevronLeft, ChevronRight } from 'lucide-react-native'

interface GoalsUIProps {
  goals: Goal[]
  userEmail: string
  onRefresh?: () => void
}

export default function GoalsUI({ goals, userEmail, onRefresh }: GoalsUIProps) {
  const [page, setPage] = useState(1)
  const pageSize = 10
  const totalPages = Math.ceil(goals.length / pageSize)
  const paginatedGoals = goals.slice((page - 1) * pageSize, page * pageSize)

  return (
    <XStack gap={32} flexWrap="wrap" alignItems="flex-start">
      {/* Left Column: List */}
      <YStack flex={2.5} minWidth={400} gap={20}>
        <YStack gap={24}>
          <Text fontSize={18} fontWeight="700" color="$brandPrimary">Active Targets</Text>
          <GoalList goals={paginatedGoals} />
          
          {totalPages > 1 && (
            <XStack padding={16} justifyContent="center" alignItems="center" gap={20}>
              <Button size="$2" circular disabled={page === 1} onPress={() => setPage(p => p - 1)} icon={<ChevronLeft size={16} />} />
              <Text fontSize={13} color="$brandTextSub">Page {page} of {totalPages}</Text>
              <Button size="$2" circular disabled={page === totalPages} onPress={() => setPage(p => p + 1)} icon={<ChevronRight size={16} />} />
            </XStack>
          )}
        </YStack>
      </YStack>

      {/* Right Column: Tips + Form */}
      <YStack flex={1} minWidth={320} gap={24}>
        <YStack backgroundColor="$brandPrimary" padding={24} borderRadius={12} gap={12}>
          <Text fontSize={16} fontWeight="700" color="$brandWhite">Integrated Tracking</Text>
          <Text fontSize={13} fontFamily="$mono" color="$brandWhite" opacity={0.7} lineHeight={20}>
            Your targets are integrated into your monthly budgets. Prioritize your future alongside daily spending.
          </Text>
        </YStack>

        <GoalForm onSuccess={onRefresh} />
      </YStack>
    </XStack>
  )
}
