import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getLoans } from '@stashflow/api'
import { formatCurrency } from '@stashflow/core'
import { YStack, XStack, Text, Heading } from 'tamagui'
import Link from 'next/link'

function StatusBadge({ status }: { status: string | null }) {
  const color = status === 'active' ? '#059669' : status === 'paid' ? '#6b7280' : '#d97706'
  const bg = status === 'active' ? 'rgba(5,150,105,0.1)' : status === 'paid' ? 'rgba(107,114,128,0.1)' : 'rgba(217,119,6,0.1)'
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 700,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.05em',
      backgroundColor: bg,
      color,
    }}>
      {status ?? 'unknown'}
    </span>
  )
}

export default async function LoansPage() {
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const loans = await getLoans(supabase)

  const totalPrincipal = (loans ?? []).reduce((s, l) => s + l.principal, 0)
  const activeLoans = (loans ?? []).filter(l => l.status === 'active')

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
        <XStack width="100%" maxWidth={1152} marginHorizontal="auto" justifyContent="space-between" alignItems="center">
          <Link href="/dashboard" style={{ textDecoration: 'none' }}>
            <XStack alignItems="center" gap={8}>
              <YStack width={8} height={8} borderRadius={9999} backgroundColor="$brandAccent" />
              <Text fontSize={16} fontWeight="700" color="$brandPrimary">StashFlow</Text>
            </XStack>
          </Link>
          <XStack alignItems="center" gap={24}>
            <Text fontSize={14} color="$brandText" opacity={0.7} fontFamily="$mono">{user.email}</Text>
            <form action="/auth/signout" method="post">
              <button type="submit" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#1A7A7A' }}>
                Sign Out
              </button>
            </form>
          </XStack>
        </XStack>
      </XStack>

      {/* Main content */}
      <YStack maxWidth={1152} width="100%" marginHorizontal="auto" paddingHorizontal={32} paddingVertical={48} gap={40}>

        {/* Page header */}
        <YStack gap={4}>
          <Link href="/dashboard" style={{ textDecoration: 'none' }}>
            <Text fontSize={12} fontWeight="700" color="$brandAccent" textTransform="uppercase" letterSpacing={1} marginBottom={8} display="block">
              ← Back to Overview
            </Text>
          </Link>
          <Heading size="$2xl" color="$brandPrimary" fontWeight="700">Loans</Heading>
        </YStack>

        {/* Summary cards */}
        <XStack gap={16} flexWrap="wrap">
          {[
            { label: 'Total Debt',    value: formatCurrency(totalPrincipal), sub: 'Combined principal' },
            { label: 'Active Loans',  value: String(activeLoans.length),     sub: 'Currently repaying' },
            { label: 'Total Loans',   value: String((loans ?? []).length),   sub: 'All time' },
          ].map((card) => (
            <YStack
              key={card.label}
              flex={1}
              minWidth={180}
              backgroundColor="$brandWhite"
              padding={28}
              borderWidth={1}
              borderColor="rgba(13,61,61,0.08)"
              borderRadius={12}
              gap={8}
              shadowColor="black"
              shadowOpacity={0.04}
              shadowRadius={10}
            >
              <Text fontSize={11} fontWeight="700" color="$brandPrimary" opacity={0.5} textTransform="uppercase" letterSpacing={1.5}>
                {card.label}
              </Text>
              <Text fontSize={30} fontWeight="700" color="$brandPrimary">{card.value}</Text>
              <Text fontSize={12} color="$brandAccent" fontFamily="$mono">{card.sub}</Text>
            </YStack>
          ))}
        </XStack>

        {/* Loans table */}
        <YStack
          backgroundColor="$brandWhite"
          borderWidth={1}
          borderColor="rgba(13,61,61,0.08)"
          borderRadius={12}
          overflow="hidden"
          shadowColor="black"
          shadowOpacity={0.04}
          shadowRadius={10}
        >
          <XStack
            paddingHorizontal={28}
            paddingVertical={20}
            borderBottomWidth={1}
            borderColor="rgba(13,61,61,0.07)"
            justifyContent="space-between"
            alignItems="center"
          >
            <Text fontSize={16} fontWeight="700" color="$brandText">All Loans</Text>
          </XStack>

          {(loans ?? []).length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <style>{`
                .loan-row { transition: background-color 0.1s; }
                .loan-row:hover { background-color: rgba(13,61,61,0.018); }
              `}</style>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: 'rgba(13,61,61,0.02)' }}>
                    {['Name', 'Principal', 'Interest Rate', 'Installment', 'Duration', 'End Date', 'Status'].map((h, i) => (
                      <th key={h} style={{
                        padding: '11px 24px',
                        textAlign: i >= 1 && i <= 4 ? 'right' : 'left',
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: 'uppercase' as const,
                        letterSpacing: '0.07em',
                        color: 'rgba(13,61,61,0.4)',
                        borderBottom: '1px solid rgba(13,61,61,0.06)',
                        whiteSpace: 'nowrap' as const,
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(loans ?? []).map((loan, idx) => (
                    <tr
                      key={loan.id}
                      className="loan-row"
                      style={{
                        borderBottom: idx < (loans ?? []).length - 1 ? '1px solid rgba(13,61,61,0.05)' : 'none',
                      }}
                    >
                      <td style={{ padding: '15px 24px', fontSize: 14, fontWeight: 600, color: '#111827' }}>
                        {loan.name}
                      </td>
                      <td style={{ padding: '15px 24px', textAlign: 'right', fontSize: 14, fontWeight: 700, color: '#DC2626' }}>
                        {formatCurrency(loan.principal, loan.currency)}
                      </td>
                      <td style={{ padding: '15px 24px', textAlign: 'right', fontSize: 13, color: 'rgba(13,61,61,0.6)', fontFamily: 'monospace' }}>
                        {loan.interest_rate}%
                      </td>
                      <td style={{ padding: '15px 24px', textAlign: 'right', fontSize: 13, color: 'rgba(13,61,61,0.7)', fontFamily: 'monospace' }}>
                        {formatCurrency(loan.installment_amount, loan.currency)}/mo
                      </td>
                      <td style={{ padding: '15px 24px', textAlign: 'right', fontSize: 13, color: 'rgba(13,61,61,0.6)', fontFamily: 'monospace' }}>
                        {loan.duration_months}mo
                      </td>
                      <td style={{ padding: '15px 24px', fontSize: 13, color: 'rgba(13,61,61,0.55)', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                        {new Date(loan.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td style={{ padding: '15px 24px' }}>
                        <StatusBadge status={loan.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <YStack padding={64} alignItems="center" gap={12}>
              <Text fontSize={15} fontWeight="700" color="$brandText">No loans recorded</Text>
              <Text fontSize={13} color="$brandTextSub" textAlign="center" maxWidth={340}>
                Your active and paid loans will appear here once added.
              </Text>
            </YStack>
          )}
        </YStack>

        {/* Info card */}
        <YStack backgroundColor="$brandPrimary" padding={32} borderRadius={12} gap={12}>
          <Text fontSize={18} fontWeight="700" color="$brandWhite">Debt-to-Income (DTI)</Text>
          <Text fontSize={14} fontFamily="$mono" color="$brandWhite" opacity={0.75} lineHeight={22}>
            Your DTI ratio compares your total monthly debt payments to your gross monthly income.
            A ratio below 36% is generally considered healthy. Keeping your active loan installments
            manageable relative to your income improves your financial flexibility.
          </Text>
        </YStack>

      </YStack>
    </YStack>
  )
}
