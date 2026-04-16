'use client'

import { formatCurrency, DashboardSummary, Transaction } from '@stashflow/core'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { XStack, YStack, Text, Button, Circle, View } from 'tamagui'
import {
  LayoutDashboard,
  TrendingUp,
  CreditCard,
  Landmark,
  Settings,
  LogOut,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  ChevronRight,
  DollarSign,
} from 'lucide-react-native'

interface DashboardUIProps {
  userEmail: string | undefined
  summary: DashboardSummary
  transactions: Transaction[]
}

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard',          Icon: LayoutDashboard },
  { label: 'Income',    href: '/dashboard/income',   Icon: TrendingUp },
  { label: 'Spending',  href: '/dashboard/spending', Icon: CreditCard },
  { label: 'Loans',     href: '/dashboard/loans',    Icon: Landmark },
] as const

// ── Sidebar nav item ───────────────────────────────────────────────────────
function NavItem({
  href, label, Icon, active,
}: { href: string; label: string; Icon: React.ElementType; active: boolean }) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <XStack
        alignItems="center"
        gap={10}
        paddingHorizontal={12}
        paddingVertical={10}
        borderRadius={8}
        backgroundColor={active ? 'rgba(255,255,255,0.13)' : 'transparent'}
        hoverStyle={{ backgroundColor: active ? 'rgba(255,255,255,0.13)' : 'rgba(255,255,255,0.06)' }}
        pressStyle={{ scale: 0.98 }}
      >
        {/* @ts-ignore – lucide icon type mismatch with react-native */}
        <Icon size={16} color={active ? '#ffffff' : 'rgba(255,255,255,0.5)'} />
        <Text
          fontSize={14}
          fontWeight={active ? '600' : '400'}
          color={active ? 'white' : 'rgba(255,255,255,0.5)'}
          flex={1}
        >
          {label}
        </Text>
        {active && (
          <Circle size={6} backgroundColor="$brandAccent" />
        )}
      </XStack>
    </Link>
  )
}

// ── Stat card ──────────────────────────────────────────────────────────────
function StatCard({
  label, value, sub, dark, Icon, trend,
}: {
  label: string
  value: string
  sub: string
  dark?: boolean
  Icon: React.ElementType
  trend?: 'up' | 'down' | null
}) {
  return (
    <YStack
      flex={1}
      minWidth={160}
      backgroundColor={dark ? '$brandPrimary' : '$brandWhite'}
      borderRadius={14}
      padding={22}
      gap={14}
      shadowColor="rgba(0,0,0,0.08)"
      shadowOpacity={1}
      shadowRadius={16}
      shadowOffset={{ width: 0, height: 4 }}
    >
      <XStack justifyContent="space-between" alignItems="center">
        <Text
          fontSize={11}
          fontWeight="700"
          letterSpacing={0.8}
          textTransform="uppercase"
          color={dark ? 'rgba(255,255,255,0.55)' : '$brandTextSub'}
        >
          {label}
        </Text>
        <YStack
          width={34}
          height={34}
          borderRadius={9}
          backgroundColor={dark ? 'rgba(255,255,255,0.1)' : 'rgba(13,61,61,0.06)'}
          alignItems="center"
          justifyContent="center"
        >
          {/* @ts-ignore */}
          <Icon size={15} color={dark ? 'rgba(255,255,255,0.75)' : '#0D3D3D'} />
        </YStack>
      </XStack>

      <Text
        fontSize={26}
        fontWeight="700"
        color={dark ? 'white' : '$brandText'}
        letterSpacing={-0.5}
      >
        {value}
      </Text>

      <XStack alignItems="center" gap={4}>
        {trend === 'up' && <ArrowUpRight size={12} color={dark ? 'rgba(255,255,255,0.6)' : '#059669'} />}
        {trend === 'down' && <ArrowDownRight size={12} color={dark ? 'rgba(255,255,255,0.6)' : '#DC2626'} />}
        <Text
          fontSize={12}
          color={dark ? 'rgba(255,255,255,0.45)' : '$brandTextSub'}
          flex={1}
          numberOfLines={1}
        >
          {sub}
        </Text>
      </XStack>
    </YStack>
  )
}

// ── Main component ─────────────────────────────────────────────────────────
export default function DashboardUI({ userEmail, summary, transactions }: DashboardUIProps) {
  const pathname = usePathname()

  const initials = (userEmail?.[0] ?? 'U').toUpperCase()
  const username = userEmail?.split('@')[0] ?? 'User'

  return (
    <XStack minHeight="100vh" backgroundColor="#F0F2F5">

      {/* ══ SIDEBAR ══════════════════════════════════════════════════════ */}
      <YStack
        width={220}
        backgroundColor="$brandPrimary"
        paddingTop={28}
        paddingHorizontal={14}
        paddingBottom={20}
        justifyContent="space-between"
        style={{ position: 'sticky', top: 0, height: '100vh', overflowY: 'auto', flexShrink: 0 }}
      >
        {/* Top section */}
        <YStack gap={28}>

          {/* Logo */}
          <XStack alignItems="center" gap={10} paddingHorizontal={8} marginBottom={4}>
            <YStack
              width={32}
              height={32}
              borderRadius={8}
              backgroundColor="$brandAccent"
              alignItems="center"
              justifyContent="center"
            >
              <DollarSign size={16} color="white" />
            </YStack>
            <Text fontSize={16} fontWeight="700" color="white" letterSpacing={0.3}>
              StashFlow
            </Text>
          </XStack>

          {/* Nav */}
          <YStack gap={2}>
            {NAV_ITEMS.map(({ label, href, Icon }) => {
              const active = href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(href)
              return (
                <NavItem key={href} href={href} label={label} Icon={Icon} active={active} />
              )
            })}
          </YStack>
        </YStack>

        {/* Bottom section */}
        <YStack gap={2}>
          <Link href="/settings" style={{ textDecoration: 'none' }}>
            <XStack
              alignItems="center"
              gap={10}
              paddingHorizontal={12}
              paddingVertical={10}
              borderRadius={8}
              hoverStyle={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
            >
              <Settings size={16} color="rgba(255,255,255,0.45)" />
              <Text fontSize={14} color="rgba(255,255,255,0.45)">Settings</Text>
            </XStack>
          </Link>

          {/* Divider */}
          <View
            height={1}
            backgroundColor="rgba(255,255,255,0.08)"
            marginVertical={10}
            marginHorizontal={4}
          />

          {/* User avatar row */}
          <XStack alignItems="center" gap={10} paddingHorizontal={10} paddingVertical={6}>
            <Circle size={32} backgroundColor="$brandAccent">
              <Text fontSize={13} fontWeight="700" color="white">{initials}</Text>
            </Circle>
            <YStack flex={1} overflow="hidden">
              <Text fontSize={13} fontWeight="600" color="rgba(255,255,255,0.9)" numberOfLines={1}>
                {username}
              </Text>
              <Text fontSize={10} color="rgba(255,255,255,0.35)" numberOfLines={1}>
                {userEmail}
              </Text>
            </YStack>
          </XStack>

          {/* Sign out */}
          <form action="/auth/signout" method="post" style={{ margin: 0 }}>
            <button
              type="submit"
              style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', padding: 0 }}
            >
              <XStack
                alignItems="center"
                gap={10}
                paddingHorizontal={12}
                paddingVertical={10}
                borderRadius={8}
                hoverStyle={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
              >
                <LogOut size={15} color="rgba(255,255,255,0.35)" />
                <Text fontSize={14} color="rgba(255,255,255,0.35)">Sign out</Text>
              </XStack>
            </button>
          </form>
        </YStack>
      </YStack>

      {/* ══ MAIN CONTENT ═════════════════════════════════════════════════ */}
      <YStack flex={1} padding={32} gap={24} style={{ minWidth: 0 }}>

        {/* Page header */}
        <XStack justifyContent="space-between" alignItems="center">
          <YStack gap={2}>
            <Text fontSize={22} fontWeight="700" color="$brandText" letterSpacing={-0.3}>
              Dashboard
            </Text>
            <Text fontSize={13} color="$brandTextSub">
              Welcome back, {username}
            </Text>
          </YStack>
          <Link href="/dashboard/spending" style={{ textDecoration: 'none' }}>
            <Button
              backgroundColor="$brandPrimary"
              color="white"
              borderRadius={9}
              size="$4"
              fontWeight="600"
              icon={<Plus size={15} color="white" />}
              hoverStyle={{ backgroundColor: '$brandAccent' }}
              pressStyle={{ scale: 0.97 }}
            >
              New Entry
            </Button>
          </Link>
        </XStack>

        {/* ── Stat cards ───────────────────────────────────────────────── */}
        <XStack gap={14} flexWrap="wrap">
          <StatCard
            label="Net Worth"
            value={formatCurrency(summary.netWorth)}
            sub={summary.netWorth >= 0 ? 'Total financial value' : 'Net negative — keep going'}
            dark
            Icon={Wallet}
            trend={summary.netWorth >= 0 ? 'up' : 'down'}
          />
          <StatCard
            label="Total Income"
            value={formatCurrency(summary.totalAssets)}
            sub="Lifetime earnings logged"
            Icon={TrendingUp}
            trend="up"
          />
          <StatCard
            label="Total Debt"
            value={formatCurrency(summary.totalLiabilities)}
            sub="Active loan principals"
            Icon={Landmark}
            trend={summary.totalLiabilities > 0 ? 'down' : null}
          />
          <StatCard
            label="Transactions"
            value={String(transactions.length)}
            sub="Recent entries shown"
            Icon={CreditCard}
          />
        </XStack>

        {/* ── Transactions table ────────────────────────────────────────── */}
        <YStack
          backgroundColor="$brandWhite"
          borderRadius={14}
          shadowColor="rgba(0,0,0,0.07)"
          shadowOpacity={1}
          shadowRadius={16}
          shadowOffset={{ width: 0, height: 4 }}
          overflow="hidden"
        >
          {/* Table header */}
          <XStack
            paddingHorizontal={24}
            paddingVertical={20}
            borderBottomWidth={1}
            borderColor="rgba(13,61,61,0.07)"
            justifyContent="space-between"
            alignItems="center"
          >
            <Text fontSize={16} fontWeight="700" color="$brandText">
              Recent Transactions
            </Text>
            <XStack gap={20}>
              <Link href="/dashboard/income" style={{ textDecoration: 'none' }}>
                <Text fontSize={13} fontWeight="600" color="$brandAccent">
                  + Add Income
                </Text>
              </Link>
              <Link href="/dashboard/spending" style={{ textDecoration: 'none' }}>
                <Text fontSize={13} fontWeight="600" color="$brandAccent">
                  + Add Expense
                </Text>
              </Link>
            </XStack>
          </XStack>

          {transactions.length > 0 ? (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'rgba(13,61,61,0.02)' }}>
                      {['Date', 'Description', 'Type', 'Amount'].map((h, i) => (
                        <th
                          key={h}
                          style={{
                            padding: '11px 24px',
                            textAlign: i === 3 ? 'right' : 'left',
                            fontSize: '11px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.07em',
                            color: 'rgba(13,61,61,0.4)',
                            borderBottom: '1px solid rgba(13,61,61,0.06)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx, idx) => (
                      <tr
                        key={tx.id}
                        style={{
                          borderBottom: idx < transactions.length - 1
                            ? '1px solid rgba(13,61,61,0.05)'
                            : 'none',
                          transition: 'background-color 0.1s',
                          cursor: 'default',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(13,61,61,0.018)')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        {/* Date */}
                        <td style={{ padding: '15px 24px', fontSize: '13px', color: 'rgba(13,61,61,0.5)', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                          {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>

                        {/* Description */}
                        <td style={{ padding: '15px 24px', maxWidth: 260 }}>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {tx.type === 'income' ? tx.source : tx.description}
                          </div>
                          <div style={{ fontSize: '12px', color: 'rgba(13,61,61,0.4)', marginTop: 2, textTransform: 'capitalize' }}>
                            {tx.type === 'income' ? 'Income' : tx.category}
                          </div>
                        </td>

                        {/* Type badge */}
                        <td style={{ padding: '15px 24px', whiteSpace: 'nowrap' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '4px 10px',
                            borderRadius: 20,
                            fontSize: '11px',
                            fontWeight: 700,
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            backgroundColor: tx.type === 'income' ? 'rgba(5,150,105,0.1)' : 'rgba(220,38,38,0.08)',
                            color: tx.type === 'income' ? '#059669' : '#DC2626',
                          }}>
                            {tx.type === 'income' ? '↑' : '↓'} {tx.type}
                          </span>
                        </td>

                        {/* Amount */}
                        <td style={{ padding: '15px 24px', textAlign: 'right', fontWeight: 700, fontSize: '14px', color: tx.type === 'income' ? '#059669' : '#111827', whiteSpace: 'nowrap' }}>
                          {tx.type === 'income' ? '+' : '−'}{formatCurrency(tx.amount, tx.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Table footer */}
              <XStack
                paddingHorizontal={24}
                paddingVertical={14}
                borderTopWidth={1}
                borderColor="rgba(13,61,61,0.06)"
                justifyContent="space-between"
                alignItems="center"
              >
                <Text fontSize={13} color="$brandTextSub">
                  Showing {transactions.length} most recent entries
                </Text>
                <Link href="/dashboard/spending" style={{ textDecoration: 'none' }}>
                  <XStack alignItems="center" gap={4} hoverStyle={{ opacity: 0.7 }}>
                    <Text fontSize={13} fontWeight="600" color="$brandAccent">View all</Text>
                    <ChevronRight size={14} color="#1A7A7A" />
                  </XStack>
                </Link>
              </XStack>
            </>
          ) : (

            /* Empty state */
            <YStack padding={72} alignItems="center" justifyContent="center" gap={16}>
              <YStack
                width={60}
                height={60}
                borderRadius={9999}
                backgroundColor="rgba(13,61,61,0.06)"
                alignItems="center"
                justifyContent="center"
              >
                <Plus size={24} color="#1A7A7A" />
              </YStack>
              <YStack gap={6} alignItems="center">
                <Text fontSize={16} fontWeight="700" color="$brandText">No transactions yet</Text>
                <Text fontSize={13} color="$brandTextSub" textAlign="center" maxWidth={340} lineHeight={20}>
                  Start by logging your income or expenses. Your financial overview will appear here.
                </Text>
              </YStack>
              <XStack gap={12} marginTop={4}>
                <Link href="/dashboard/income" style={{ textDecoration: 'none' }}>
                  <Button
                    backgroundColor="$brandPrimary"
                    color="white"
                    borderRadius={9}
                    size="$4"
                    fontWeight="600"
                    hoverStyle={{ backgroundColor: '$brandAccent' }}
                  >
                    Add Income
                  </Button>
                </Link>
                <Link href="/dashboard/spending" style={{ textDecoration: 'none' }}>
                  <Button
                    borderWidth={1}
                    borderColor="$brandPrimary"
                    backgroundColor="transparent"
                    color="$brandPrimary"
                    borderRadius={9}
                    size="$4"
                    fontWeight="600"
                    hoverStyle={{ backgroundColor: 'rgba(13,61,61,0.04)' }}
                  >
                    Add Expense
                  </Button>
                </Link>
              </XStack>
            </YStack>
          )}
        </YStack>
      </YStack>
    </XStack>
  )
}
