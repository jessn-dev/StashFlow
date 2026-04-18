import { useState, useMemo } from 'react'
import { YStack, XStack, Text, Input, Label, Circle } from 'tamagui'
import { simulateDTI, formatCurrency } from '@stashflow/core'
import { TrendingUp, Landmark, Calculator } from 'lucide-react-native'

interface DTISimulatorProps {
  currentMonthlyIncome: number
  currentMonthlyDebt: number
  currency: string
}

export default function DTISimulator({ currentMonthlyIncome, currentMonthlyDebt, currency }: DTISimulatorProps) {
  const [addLoan, setAddLoan] = useState<string>('')
  const [addIncome, setAddIncome] = useState<string>('')
  const [payOff, setPayOff] = useState<string>('')

  const simulation = useMemo(() => {
    return simulateDTI({
      monthlyIncome: currentMonthlyIncome,
      monthlyDebt: currentMonthlyDebt,
      currency: currency,
      addLoanMonthly: Number(addLoan) || 0,
      addIncomeMonthly: Number(addIncome) || 0,
      payOffLoanMonthly: Number(payOff) || 0,
    })
  }, [currentMonthlyIncome, currentMonthlyDebt, currency, addLoan, addIncome, payOff])

  const changeText = simulation.diffPpt > 0 
    ? `+${simulation.diffPpt.toFixed(1)} percentage points`
    : simulation.diffPpt < 0 
      ? `${simulation.diffPpt.toFixed(1)} percentage points`
      : 'No change'

  const changeColor = simulation.diffPpt > 0 ? '#DC2626' : simulation.diffPpt < 0 ? '#059669' : '$brandTextSub'

  return (
    <YStack backgroundColor="$brandWhite" padding={28} borderRadius={14} gap={24} borderWidth={1} borderColor="rgba(13,61,61,0.08)" shadowColor="black" shadowOpacity={0.04} shadowRadius={10}>
      <XStack alignItems="center" gap={12}>
        <YStack width={36} height={36} borderRadius={8} backgroundColor="rgba(26,122,122,0.1)" alignItems="center" justifyContent="center">
          <Calculator size={18} color="#1A7A7A" />
        </YStack>
        <Text fontSize={18} fontWeight="700" color="$brandPrimary">DTI "What-If" Simulator</Text>
      </XStack>

      <YStack gap={16}>
        <XStack gap={16} flexWrap="wrap">
          <YStack flex={1} minWidth={200} gap={6}>
            <Label fontSize={11} fontWeight="700" color="$brandTextSub" textTransform="uppercase" letterSpacing={1}>Potential New Monthly Debt</Label>
            <Input 
              value={addLoan}
              onChangeText={setAddLoan}
              placeholder="e.g. 500" 
              keyboardType="numeric"
              borderRadius={8}
              borderColor="rgba(13,61,61,0.15)"
              focusStyle={{ borderColor: '$brandAccent' }}
            />
          </YStack>
          <YStack flex={1} minWidth={200} gap={6}>
            <Label fontSize={11} fontWeight="700" color="$brandTextSub" textTransform="uppercase" letterSpacing={1}>Potential Monthly Income Increase</Label>
            <Input 
              value={addIncome}
              onChangeText={setAddIncome}
              placeholder="e.g. 1000" 
              keyboardType="numeric"
              borderRadius={8}
              borderColor="rgba(13,61,61,0.15)"
              focusStyle={{ borderColor: '$brandAccent' }}
            />
          </YStack>
        </XStack>

        <YStack gap={6}>
          <Label fontSize={11} fontWeight="700" color="$brandTextSub" textTransform="uppercase" letterSpacing={1}>Monthly Debt to Pay Off</Label>
          <Input 
            value={payOff}
            onChangeText={setPayOff}
            placeholder="e.g. 200" 
            keyboardType="numeric"
            borderRadius={8}
            borderColor="rgba(13,61,61,0.15)"
            focusStyle={{ borderColor: '$brandAccent' }}
          />
        </YStack>
      </YStack>

      <YStack backgroundColor="#F9FAFB" padding={20} borderRadius={12} gap={16} borderWidth={1} borderColor="rgba(0,0,0,0.03)">
        <XStack justifyContent="space-between" alignItems="center">
          <Text fontSize={13} fontWeight="600" color="$brandTextSub">Projected DTI Ratio</Text>
          <XStack gap={10} alignItems="center">
             <Text fontSize={24} fontWeight="700" color={simulation.newColor}>{simulation.projected.toFixed(1)}%</Text>
             <YStack paddingHorizontal={8} paddingVertical={2} borderRadius={4} backgroundColor={changeColor + '10'}>
               <Text fontSize={11} fontWeight="700" color={changeColor}>{changeText}</Text>
             </YStack>
          </XStack>
        </XStack>

        <XStack justifyContent="space-between" alignItems="center">
          <Text fontSize={13} fontWeight="600" color="$brandTextSub">New Health Status</Text>
          <XStack gap={8} alignItems="center">
            <Circle size={10} backgroundColor={simulation.newColor} />
            <Text fontSize={14} fontWeight="700" color={simulation.newColor} textTransform="uppercase">{simulation.newStatus}</Text>
          </XStack>
        </XStack>

        <YStack height={6} borderRadius={999} backgroundColor="rgba(0,0,0,0.05)" overflow="hidden" marginTop={4}>
          <YStack height="100%" width={`${Math.min(simulation.projected, 100)}%`} backgroundColor={simulation.newColor} borderRadius={999} style={{ transition: 'width 0.4s ease' }} />
        </YStack>
      </YStack>

      <Text fontSize={12} color="$brandTextSub" textAlign="center" fontStyle="italic">
        * This is a simulation based on your current data ({simulation.current.toFixed(1)}%). Actual results may vary.
      </Text>
    </YStack>
  )
}
