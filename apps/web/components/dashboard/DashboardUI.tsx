'use client'

import { formatCurrency, DashboardSummary, Transaction } from '@stashflow/core'
import Link from 'next/link'
import { XStack, YStack, Text, Button, Separator } from 'tamagui'
import { Plus, LayoutDashboard, ArrowUpRight, ArrowDownRight } from 'lucide-react-native'

interface DashboardUIProps {
  userEmail: string | undefined
  summary: DashboardSummary
  transactions: Transaction[]
}

export default function DashboardUI({ userEmail, summary, transactions }: DashboardUIProps) {
  return (
    <YStack minHeight="100vh" backgroundColor="$brandBg">

      {/* Navbar */}
      <XStack
        backgroundColor="$brandWhite"
        paddingHorizontal={32}
        paddingVertical={20}
        borderBottomWidth={1}
        borderColor="rgba(13,61,61,0.1)"
      >
        <XStack
          width="100%"
          maxWidth={1152}
          marginHorizontal="auto"
          justifyContent="space-between"
          alignItems="center"
        >
          <Link href="/dashboard" style={{ textDecoration: 'none' }}>
            <XStack alignItems="center" gap={8}>
              <YStack width={8} height={8} borderRadius={9999} backgroundColor="$brandAccent" />
              <Text fontSize={16} fontWeight="700" color="$brandPrimary">StashFlow</Text>
            </XStack>
          </Link>

          <XStack alignItems="center" gap={24}>
            <Text fontSize={14} color="$brandText" opacity={0.7} fontFamily="$mono">{userEmail}</Text>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  color: '#1A7A7A',
                }}
              >
                Sign Out
              </button>
            </form>
          </XStack>
        </XStack>
      </XStack>

      {/* Main content */}
      <YStack
        maxWidth={1152}
        width="100%"
        marginHorizontal="auto"
        paddingHorizontal={32}
        paddingVertical={48}
        gap={48}
      >
        {/* Header */}
        <XStack justifyContent="space-between" alignItems="flex-end">
          <YStack gap={4}>
            <Text fontSize={12} fontWeight="700" color="$brandAccent" textTransform="uppercase" letterSpacing={2} marginBottom={4}>
              Dashboard
            </Text>
            <Text fontSize={36} fontWeight="700" color="$brandPrimary">Overview</Text>
          </YStack>
          <Link href="/dashboard/spending" style={{ textDecoration: 'none' }}>
            <Button
              backgroundColor="$brandPrimary"
              color="$brandWhite"
              borderRadius={0}
              fontWeight="700"
              textTransform="uppercase"
              letterSpacing={1}
              icon={<Plus size={16} color="white" />}
            >
              Log Entry
            </Button>
          </Link>
        </XStack>

        {/* Summary cards */}
        <XStack gap={16} flexWrap="wrap" $gtMd={{ flexDirection: 'row' }} flexDirection="column">

          {/* Net Worth */}
          <YStack
            flex={1}
            backgroundColor="$brandWhite"
            padding={32}
            borderWidth={1}
            borderColor="rgba(13,61,61,0.1)"
            gap={12}
            shadowColor="black"
            shadowOpacity={0.05}
            shadowRadius={10}
          >
            <Text
              fontSize={11}
              fontWeight="700"
              color="$brandPrimary"
              opacity={0.6}
              textTransform="uppercase"
              letterSpacing={1.5}
            >
              Net Worth
            </Text>
            <Text fontSize={36} fontWeight="700" color="$brandPrimary">
              {formatCurrency(summary.netWorth)}
            </Text>
            <Text fontSize={12} color="$brandAccent" fontFamily="$mono">
              {summary.netWorth === 0 ? 'Connect accounts to begin' : 'Your total financial value'}
            </Text>
          </YStack>

          {/* Total Income */}
          <Link href="/dashboard/income" style={{ flex: 1, textDecoration: 'none' }}>
            <YStack
              flex={1}
              backgroundColor="$brandWhite"
              padding={32}
              borderWidth={1}
              borderColor="rgba(13,61,61,0.1)"
              gap={12}
              hoverStyle={{ backgroundColor: 'rgba(13,61,61,0.02)' }}
              shadowColor="black"
              shadowOpacity={0.05}
              shadowRadius={10}
            >
              <Text
                fontSize={11}
                fontWeight="700"
                color="$brandPrimary"
                opacity={0.6}
                textTransform="uppercase"
                letterSpacing={1.5}
              >
                Total Income
              </Text>
              <XStack alignItems="center" gap={8}>
                <Text fontSize={30} fontWeight="700" color="$brandPrimary">
                  {formatCurrency(summary.totalAssets)}
                </Text>
                <ArrowUpRight size={20} color="#059669" />
              </XStack>
            </YStack>
          </Link>

          {/* Total Debt */}
          <Link href="/dashboard/loans" style={{ flex: 1, textDecoration: 'none' }}>
            <YStack
              flex={1}
              backgroundColor="$brandWhite"
              padding={32}
              borderWidth={1}
              borderColor="rgba(13,61,61,0.1)"
              gap={12}
              hoverStyle={{ backgroundColor: 'rgba(13,61,61,0.02)' }}
              shadowColor="black"
              shadowOpacity={0.05}
              shadowRadius={10}
            >
              <Text
                fontSize={11}
                fontWeight="700"
                color="$brandPrimary"
                opacity={0.6}
                textTransform="uppercase"
                letterSpacing={1.5}
              >
                Total Debt
              </Text>
              <XStack alignItems="center" gap={8}>
                <Text fontSize={30} fontWeight="700" color="$brandText" opacity={0.8}>
                  {formatCurrency(summary.totalLiabilities)}
                </Text>
                <ArrowDownRight size={20} color="#DC2626" />
              </XStack>
            </YStack>
          </Link>
        </XStack>

        {/* Transactions */}
        <YStack 
          backgroundColor="$brandWhite" 
          borderWidth={1} 
          borderColor="rgba(13,61,61,0.1)"
          shadowColor="black"
          shadowOpacity={0.05}
          shadowRadius={10}
        >

          {/* Table header */}
          <XStack
            padding={32}
            borderBottomWidth={1}
            borderColor="rgba(13,61,61,0.1)"
            justifyContent="space-between"
            alignItems="center"
          >
            <Text fontSize={20} fontWeight="700" color="$brandPrimary">Recent Transactions</Text>
            <XStack gap={24}>
              <Link href="/dashboard/income" style={{ textDecoration: 'none' }}>
                <Text
                  fontSize={12}
                  fontWeight="700"
                  color="$brandAccent"
                  textTransform="uppercase"
                  letterSpacing={1}
                >
                  Manage Income
                </Text>
              </Link>
              <Link href="/dashboard/spending" style={{ textDecoration: 'none' }}>
                <Text
                  fontSize={12}
                  fontWeight="700"
                  color="$brandAccent"
                  textTransform="uppercase"
                  letterSpacing={1}
                >
                  Manage Spending
                </Text>
              </Link>
            </XStack>
          </XStack>

          {transactions.length > 0 ? (
            <YStack>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(13,61,61,0.05)' }}>
                      {['Date', 'Description / Source', 'Type', 'Amount'].map((h, i) => (
                        <th
                          key={h}
                          style={{
                            textAlign: i === 3 ? 'right' : 'left',
                            padding: '20px 32px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            letterSpacing: '0.12em',
                            textTransform: 'uppercase',
                            color: 'rgba(13,61,61,0.5)',
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx.id} style={{ borderBottom: '1px solid rgba(13,61,61,0.05)' }}>
                        <td style={{ padding: '18px 32px', fontSize: '13px', fontFamily: 'monospace', color: 'rgba(13,61,61,0.7)' }}>
                          {new Date(tx.date).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '18px 32px' }}>
                          <div style={{ fontWeight: 'bold', color: '#0D3D3D', fontSize: '14px' }}>
                            {tx.type === 'income' ? tx.source : tx.description}
                          </div>
                          <div style={{ fontSize: '12px', color: 'rgba(13,61,61,0.5)', textTransform: 'capitalize' }}>
                            {tx.type === 'income' ? 'Income' : tx.category}
                          </div>
                        </td>
                        <td style={{ padding: '18px 32px' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            borderRadius: '3px',
                            backgroundColor: tx.type === 'income' ? 'rgba(54,211,153,0.15)' : 'rgba(248,114,114,0.15)',
                            color: tx.type === 'income' ? '#059669' : '#DC2626',
                          }}>
                            {tx.type}
                          </span>
                        </td>
                        <td style={{ padding: '18px 32px', textAlign: 'right', fontWeight: 'bold', color: tx.type === 'income' ? '#059669' : '#0D3D3D', fontSize: '14px' }}>
                          {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, tx.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <XStack padding={32} borderTopWidth={1} borderColor="rgba(13,61,61,0.05)" justifyContent="center">
                <Link href="/dashboard/spending" style={{ textDecoration: 'none' }}>
                  <Text
                    fontSize={12}
                    fontWeight="700"
                    color="$brandAccent"
                    textTransform="uppercase"
                    letterSpacing={1}
                  >
                    View All Transactions
                  </Text>
                </Link>
              </XStack>
            </YStack>
          ) : (
            <YStack padding={64} alignItems="center" justifyContent="center" gap={24}>
              <YStack
                width={64}
                height={64}
                borderRadius={9999}
                backgroundColor="$brandBg"
                borderWidth={1}
                borderColor="rgba(13,61,61,0.1)"
                alignItems="center"
                justifyContent="center"
              >
                <Plus size={24} color="#1A7A7A" />
              </YStack>
              <YStack gap={4} alignItems="center">
                <Text fontSize={16} fontWeight="700" color="$brandPrimary">No data available</Text>
                <Text fontSize={14} color="$brandText" opacity={0.6} textAlign="center" maxWidth={384}>
                  You haven&apos;t added any transactions yet. Start tracking your expenses to see your insights here.
                </Text>
              </YStack>
              <Link href="/dashboard/spending" style={{ textDecoration: 'none' }}>
                <Button
                  backgroundColor="$brandPrimary"
                  color="$brandWhite"
                  borderRadius={0}
                  fontWeight="700"
                  textTransform="uppercase"
                  letterSpacing={1}
                >
                  Add Entry
                </Button>
              </Link>
            </YStack>
          )}
        </YStack>
      </YStack>
    </YStack>
  )
}
