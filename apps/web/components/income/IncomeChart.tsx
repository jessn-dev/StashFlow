'use client'

import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts'
import { YStack, Text, Heading, XStack } from 'tamagui'
import { formatCurrency } from '@stashflow/core'

interface IncomeChartProps {
  data: { month: string; total: number }[]
  currency: string
}

const CustomTooltip = ({ active, payload, label, currency }: any) => {
  if (active && payload && payload.length) {
    return (
      <YStack backgroundColor="white" padding={12} borderRadius={8} borderWidth={1} borderColor="#e5e7eb" shadowColor="black" shadowOpacity={0.05} shadowRadius={5}>
        <Text fontSize={12} fontWeight="700" color="#6b7280" textTransform="uppercase">{label}</Text>
        <Text fontSize={16} fontWeight="800" color="#1A7A7A" marginTop={4}>
          {formatCurrency(payload[0].value, currency)}
        </Text>
      </YStack>
    )
  }
  return null
}

export default function IncomeChart({ data = [], currency }: IncomeChartProps) {
  if (!data || data.length === 0) return null

  return (
    <YStack 
      backgroundColor="$brandWhite" 
      padding={24} 
      borderRadius={12} 
      borderWidth={1} 
      borderColor="rgba(13,61,61,0.1)" 
      gap={20}
      height={320}
    >
      <XStack justifyContent="space-between" alignItems="center">
        <Heading size="$xs" color="$brandPrimary" textTransform="uppercase" letterSpacing={1.5}>Income Trend</Heading>
        <Text fontSize={11} color="$brandTextSub" fontWeight="600">Last 12 Months ({currency})</Text>
      </XStack>

      <div style={{ width: '100%', height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1A7A7A" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#1A7A7A" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(13,61,61,0.05)" />
            <XAxis 
              dataKey="month" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 11, fill: '#6b7280', fontWeight: 500 }} 
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 11, fill: '#6b7280', fontWeight: 500 }}
              tickFormatter={(v) => `$${v}`}
            />
            <Tooltip content={<CustomTooltip currency={currency} />} cursor={{ stroke: '#1A7A7A', strokeWidth: 1, strokeDasharray: '4 4' }} />
            <Area 
              type="monotone" 
              dataKey="total" 
              stroke="#1A7A7A" 
              strokeWidth={2.5}
              fillOpacity={1} 
              fill="url(#colorIncome)" 
              animationDuration={1500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </YStack>
  )
}
