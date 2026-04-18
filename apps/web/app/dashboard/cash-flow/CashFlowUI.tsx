'use client'

import { YStack, XStack, Text, Circle } from 'tamagui'
import { CashFlowPayload } from '@stashflow/api'
import { formatCurrency } from '@stashflow/core'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react-native'

interface CashFlowUIProps {
  payload: CashFlowPayload
  userEmail: string
}

export default function CashFlowUI({ payload, userEmail }: CashFlowUIProps) {
  const { projections, currency } = payload

  return (
    <YStack gap={32}>
      {/* Visual Chart */}
      <YStack backgroundColor="$brandWhite" padding={32} borderRadius={12} borderWidth={1} borderColor="rgba(13,61,61,0.1)" gap={24}>
         <XStack justifyContent="space-between" alignItems="center">
           <Text fontSize={18} fontWeight="700" color="$brandPrimary">12-Month Outlook</Text>
           <XStack gap={16}>
             <XStack gap={6} alignItems="center"><Circle size={10} backgroundColor="#1A7A7A" /><Text fontSize={12} color="$brandTextSub">Income</Text></XStack>
             <XStack gap={6} alignItems="center"><Circle size={10} backgroundColor="#ff8a80" /><Text fontSize={12} color="$brandTextSub">Debt/Exp</Text></XStack>
           </XStack>
         </XStack>

         <XStack height={200} alignItems="flex-end" justifyContent="space-between" paddingHorizontal={10} gap={8}>
            {projections.map((p, i) => {
              const max = Math.max(...projections.map(x => Math.max(x.income, x.expenses + x.debt, 1000)))
              const incH = (p.income / max) * 100
              const expH = ((p.expenses + p.debt) / max) * 100
              return (
                <YStack key={i} gap={8} alignItems="center" flex={1}>
                  <XStack gap={2} alignItems="flex-end">
                    <YStack width={12} height={`${incH}%`} minHeight={2} backgroundColor="#1A7A7A" borderRadius={2} />
                    <YStack width={12} height={`${expH}%`} minHeight={2} backgroundColor="#ff8a80" borderRadius={2} />
                  </XStack>
                  <Text fontSize={10} color="$brandTextSub" textAlign="center">{p.month}</Text>
                </YStack>
              )
            })}
         </XStack>
      </YStack>

      {/* Detailed Table */}
      <YStack backgroundColor="$brandWhite" borderRadius={12} borderWidth={1} borderColor="rgba(13,61,61,0.1)" overflow="hidden">
         <XStack padding={24} backgroundColor="rgba(13,61,61,0.02)" borderBottomWidth={1} borderColor="rgba(13,61,61,0.05)">
           <Text fontSize={16} fontWeight="700" color="$brandPrimary">Monthly Breakdown</Text>
         </XStack>
         <div style={{ overflowX: 'auto' }}>
           <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Month', 'Est. Income', 'Recurring Exp', 'Loan Debt', 'Net Cash Flow'].map((h, i) => (
                    <th key={h} style={{
                      padding: '12px 24px',
                      textAlign: i >= 1 ? 'right' : 'left',
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.07em',
                      color: 'rgba(13,61,61,0.4)',
                      borderBottom: '1px solid rgba(13,61,61,0.06)'
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {projections.map((p, idx) => (
                  <tr key={p.period} style={{ borderBottom: idx < projections.length - 1 ? '1px solid rgba(13,61,61,0.04)' : 'none' }}>
                    <td style={{ padding: '16px 24px', fontSize: 14, fontWeight: 600, color: '#111827' }}>{p.month}</td>
                    <td style={{ padding: '16px 24px', textAlign: 'right', fontSize: 14, color: '#059669', fontWeight: 600 }}>{formatCurrency(p.income, currency)}</td>
                    <td style={{ padding: '16px 24px', textAlign: 'right', fontSize: 14, color: '#666666' }}>{formatCurrency(p.expenses, currency)}</td>
                    <td style={{ padding: '16px 24px', textAlign: 'right', fontSize: 14, color: '#DC2626' }}>{formatCurrency(p.debt, currency)}</td>
                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                      <XStack justifyContent="flex-end" alignItems="center" gap={8}>
                         {p.net > 0 ? <TrendingUp size={14} color="#059669" /> : p.net < 0 ? <TrendingDown size={14} color="#DC2626" /> : <Minus size={14} color="#9ca3af" />}
                         <Text fontSize={15} fontWeight="700" color={p.net >= 0 ? '#059669' : '#DC2626'}>
                           {formatCurrency(p.net, currency)}
                         </Text>
                      </XStack>
                    </td>
                  </tr>
                ))}
              </tbody>
           </table>
         </div>
      </YStack>
    </YStack>
  )
}
