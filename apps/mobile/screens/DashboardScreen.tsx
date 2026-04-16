import { useEffect, useState, useCallback } from 'react'
import {
  YStack,
  XStack,
  Text,
  Heading,
  Button,
  ScrollView,
  Spinner,
  Circle,
} from 'tamagui'
import { Plus } from 'lucide-react-native'
import { Alert, SafeAreaView, RefreshControl, ActivityIndicator } from 'react-native'
import { supabase } from '../utils/supabase'
import { useAuth } from '../contexts/AuthContext'
import { getDashboardSummary, getRecentTransactions } from '@fintrack/api'
import { formatCurrency, DashboardSummary, Transaction } from '@fintrack/core'

export function DashboardScreen() {
  const { session } = useAuth()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])

  const fetchData = useCallback(async () => {
    try {
      const [summaryData, txData] = await Promise.all([
        getDashboardSummary(supabase),
        getRecentTransactions(supabase)
      ])
      setSummary(summaryData)
      setTransactions(txData)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchData()
  }, [fetchData])

  if (loading && !refreshing) {
    return (
      <YStack flex={1} backgroundColor="$white" alignItems="center" justifyContent="center">
        <ActivityIndicator size="large" color="#0D3D3D" />
      </YStack>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#EFEFEF' }}>
      {/* Navbar Mirror */}
      <XStack 
        height={64} 
        backgroundColor="$white" 
        paddingHorizontal={20} 
        borderBottomWidth={1} 
        borderColor="rgba(13,61,61,0.1)" 
        alignItems="center" 
        justifyContent="space-between"
      >
        <XStack alignItems="center" gap={8}>
          <Circle size={8} backgroundColor="$brandAccent" />
          <Heading size="$md" color="$brandPrimary" fontWeight="700">
            FinTrack
          </Heading>
        </XStack>
        <Button 
          chromeless
          onPress={async () => {
            const { error } = await supabase.auth.signOut()
            if (error) Alert.alert('Sign Out Failed', error.message)
          }}
        >
          <Text fontSize={12} fontWeight="700" color="$brandAccent" textTransform="uppercase" letterSpacing={1}>
            Sign Out
          </Text>
        </Button>
      </XStack>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0D3D3D" />
        }
      >
        <Text fontSize={12} color="$brandText" opacity={0.7} marginBottom={4} fontWeight="500">
          {session?.user?.email}
        </Text>
        <Heading size="$2xl" color="$brandPrimary" fontWeight="700" marginBottom={24}>
          Overview
        </Heading>

        {/* Wealth Summary Cards */}
        <YStack gap={16} marginBottom={24}>
          <YStack 
            backgroundColor="$white" 
            padding={24} 
            borderWidth={1} 
            borderColor="rgba(13,61,61,0.05)" 
          >
            <Text fontSize={11} fontWeight="700" color="$brandText" opacity={0.6} textTransform="uppercase" letterSpacing={1.5} marginBottom={8}>
              Net Worth
            </Text>
            <Heading size="$3xl" color="$brandPrimary" fontWeight="700">
              {summary ? formatCurrency(summary.netWorth) : '$0.00'}
            </Heading>
            <Text fontSize={12} color="$brandAccent" marginTop={12} fontWeight="600">
              {summary?.netWorth === 0 ? 'Connect accounts to begin' : 'Your total financial value'}
            </Text>
          </YStack>

          <XStack gap={16}>
            <YStack 
              flex={1} 
              backgroundColor="$white" 
              padding={24} 
              borderWidth={1} 
              borderColor="rgba(13,61,61,0.05)"
            >
              <Text fontSize={11} fontWeight="700" color="$brandText" opacity={0.6} textTransform="uppercase" letterSpacing={1.5} marginBottom={8}>
                Total Income
              </Text>
              <Heading size="$lg" color="$brandPrimary" fontWeight="700">
                {summary ? formatCurrency(summary.totalAssets) : '$0.00'}
              </Heading>
            </YStack>
            <YStack 
              flex={1} 
              backgroundColor="$white" 
              padding={24} 
              borderWidth={1} 
              borderColor="rgba(13,61,61,0.05)"
            >
              <Text fontSize={11} fontWeight="700" color="$brandText" opacity={0.6} textTransform="uppercase" letterSpacing={1.5} marginBottom={8}>
                Total Debt
              </Text>
              <Heading size="$lg" color="$brandText" opacity={0.8} fontWeight="700">
                {summary ? formatCurrency(summary.totalLiabilities) : '$0.00'}
              </Heading>
            </YStack>
          </XStack>
        </YStack>

        {/* Recent Transactions Module */}
        <YStack backgroundColor="$white" borderWidth={1} borderColor="rgba(13,61,61,0.05)">
          <YStack padding={20} borderBottomWidth={1} borderColor="rgba(13,61,61,0.1)">
            <Heading size="$md" color="$brandPrimary" fontWeight="700">
              Recent Transactions
            </Heading>
          </YStack>

          {transactions.length > 0 ? (
            <YStack>
              {transactions.map((tx) => (
                <XStack key={tx.id} padding={16} borderBottomWidth={1} borderColor="rgba(13,61,61,0.05)" alignItems="center" justifyContent="space-between">
                  <YStack flex={1}>
                    <Text fontSize={14} fontWeight="700" color="$brandPrimary">
                      {tx.type === 'income' ? tx.source : tx.description}
                    </Text>
                    <Text fontSize={12} color="$brandText" opacity={0.5} marginTop={4}>
                      {new Date(tx.date).toLocaleDateString()} • {tx.type === 'income' ? 'Income' : tx.category}
                    </Text>
                  </YStack>
                  <Text fontSize={14} fontWeight="700" color={tx.type === 'income' ? '$brandAccent' : '$brandText'}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, tx.currency)}
                  </Text>
                </XStack>
              ))}
              <Button chromeless padding={20}>
                <Text fontSize={12} fontWeight="700" color="$brandAccent" textTransform="uppercase" letterSpacing={1}>
                  View All Transactions
                </Text>
              </Button>
            </YStack>
          ) : (
            <YStack padding={40} alignItems="center" gap={20}>
              <YStack width={48} height={48} borderRadius={999} backgroundColor="$brandBg" borderWidth={1} borderColor="rgba(13,61,61,0.1)" alignItems="center" justifyContent="center">
                <Plus size={24} color="#1A7A7A" strokeWidth={1.5} />
              </YStack>
              <YStack gap={4} alignItems="center">
                <Heading size="$sm" color="$brandPrimary">No data available</Heading>
                <Text fontSize={12} color="$brandText" opacity={0.6} textAlign="center" lineHeight={18}>
                  You haven&apos;t added any transactions yet. Start tracking your expenses to see your insights here.
                </Text>
              </YStack>
              <Button size="$small" backgroundColor="$brandPrimary" borderRadius={0}>
                <Text color="$white" fontSize={12} fontWeight="700" textTransform="uppercase" letterSpacing={1}>
                  Add Transaction
                </Text>
              </Button>
            </YStack>
          )}
        </YStack>
      </ScrollView>
    </SafeAreaView>
  )
}
