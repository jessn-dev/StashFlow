import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getExpenses, getExpensesByCategory } from '@fintrack/api'
import ExpenseForm from '@/components/spending/ExpenseForm'
import ExpenseList from '@/components/spending/ExpenseList'
import CategoryBreakdown from '@/components/spending/CategoryBreakdown'
import { YStack, XStack, Text, Heading } from 'tamagui'
import Link from 'next/link'

export default async function SpendingPage() {
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    redirect('/login')
  }

  const [expenses, breakdown] = await Promise.all([
    getExpenses(supabase),
    getExpensesByCategory(supabase)
  ])

  return (
    <YStack minHeight="100vh" backgroundColor="$brandBg">
      {/* Navbar */}
      <XStack backgroundColor="$brandWhite" paddingHorizontal={32} paddingVertical={20} borderBottomWidth={1} borderColor="rgba(13,61,61,0.1)">
        <XStack width="100%" maxWidth={1152} marginHorizontal="auto" justifyContent="space-between" alignItems="center">
          <Link href="/dashboard" style={{ textDecoration: 'none' }}>
            <XStack alignItems="center" gap={8}>
              <YStack width={8} height={8} borderRadius={9999} backgroundColor="$brandAccent" />
              <Text fontSize={16} fontWeight="700" color="$brandPrimary">FinTrack</Text>
            </XStack>
          </Link>
          <XStack alignItems="center" gap={24}>
            <Text fontSize={14} color="$brandText" opacity={0.7} fontFamily="$mono">{user.email}</Text>
            <form action="/auth/signout" method="post">
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, color: '#1A7A7A' }}>
                Sign Out
              </button>
            </form>
          </XStack>
        </XStack>
      </XStack>

      {/* Main Content */}
      <YStack maxWidth={1152} width="100%" marginHorizontal="auto" paddingHorizontal={32} paddingVertical={48} gap={40}>
        <XStack justifyContent="space-between" alignItems="flex-end">
          <YStack gap={4}>
            <Link href="/dashboard" style={{ textDecoration: 'none' }}>
              <Text fontSize={12} fontWeight="700" color="$brandAccent" textTransform="uppercase" letterSpacing={1} marginBottom={8} display="block">
                ← Back to Overview
              </Text>
            </Link>
            <Heading size="$2xl" color="$brandPrimary" fontWeight="700">Spending</Heading>
          </YStack>
        </XStack>

        <XStack gap={32} flexWrap="wrap">
          {/* Left Column: Form & History */}
          <YStack flex={2} minWidth={350} gap={32}>
            <ExpenseForm />
            <ExpenseList expenses={expenses} />
          </YStack>

          {/* Right Column: Breakdown */}
          <YStack flex={1} minWidth={350} gap={32}>
            <CategoryBreakdown data={breakdown} />
            
            {/* Quick Tips Card */}
            <YStack backgroundColor="$brandPrimary" padding={32} gap={16}>
              <Text fontSize={20} fontWeight="700" color="$brandWhite">Financial Tip</Text>
              <Text fontSize={14} fontFamily="$mono" color="$brandWhite" opacity={0.8} lineHeight={22}>
                Try to keep your &apos;Other&apos; category below 10% of your total spending. 
                Detailed categorization leads to better financial clarity and easier budgeting.
              </Text>
            </YStack>
          </YStack>
        </XStack>
      </YStack>
    </YStack>
  )
}
