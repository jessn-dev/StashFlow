import { ActivityIndicator, View } from 'react-native'
import { TamaguiProvider, YStack, XStack, Text, Button, Circle } from 'tamagui'
import { tamaguiConfig } from '@stashflow/theme'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { LoginScreen } from './screens/LoginScreen'
import { DashboardScreen } from './screens/DashboardScreen'
import { useState } from 'react'
import { LayoutDashboard, Landmark, CreditCard, TrendingUp, Target } from 'lucide-react-native'

// Placeholder screens for now
const LoansScreen = () => <View style={{ flex: 1, backgroundColor: '#EFEFEF' }}><Text padding={40}>Loans Screen (Coming Soon)</Text></View>
const SpendingScreen = () => <View style={{ flex: 1, backgroundColor: '#EFEFEF' }}><Text padding={40}>Spending Screen (Coming Soon)</Text></View>
const IncomeScreen = () => <View style={{ flex: 1, backgroundColor: '#EFEFEF' }}><Text padding={40}>Income Screen (Coming Soon)</Text></View>
const GoalsScreen = () => <View style={{ flex: 1, backgroundColor: '#EFEFEF' }}><Text padding={40}>Goals Screen (Coming Soon)</Text></View>

type Screen = 'dashboard' | 'loans' | 'spending' | 'income' | 'goals'

function RootNavigator() {
  const { session, isLoading } = useAuth()
  const [activeScreen, setActiveScreen] = useState<Screen>('dashboard')

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5' }}>
        <ActivityIndicator size="large" color="#0D3D3D" />
      </View>
    )
  }

  if (!session?.user) return <LoginScreen />

  const renderScreen = () => {
    switch (activeScreen) {
      case 'dashboard': return <DashboardScreen />
      case 'loans':     return <LoansScreen />
      case 'spending':  return <SpendingScreen />
      case 'income':    return <IncomeScreen />
      case 'goals':     return <GoalsScreen />
      default:          return <DashboardScreen />
    }
  }

  return (
    <YStack flex={1}>
      <View style={{ flex: 1 }}>
        {renderScreen()}
      </View>
      
      {/* Bottom Tab Bar */}
      <XStack 
        height={70} 
        backgroundColor="$white" 
        borderTopWidth={1} 
        borderColor="rgba(13,61,61,0.08)"
        paddingBottom={10}
        paddingHorizontal={10}
        alignItems="center"
        justifyContent="space-around"
      >
        {[
          { id: 'dashboard', label: 'Home',     Icon: LayoutDashboard },
          { id: 'spending',  label: 'Spending', Icon: CreditCard },
          { id: 'income',    label: 'Income',   Icon: TrendingUp },
          { id: 'loans',     label: 'Loans',    Icon: Landmark },
          { id: 'goals',     label: 'Goals',    Icon: Target },
        ].map((tab) => (
          <Button
            key={tab.id}
            chromeless
            onPress={() => setActiveScreen(tab.id as Screen)}
            paddingVertical={8}
            paddingHorizontal={4}
            flex={1}
          >
            <YStack alignItems="center" gap={4}>
              <tab.Icon size={20} color={activeScreen === tab.id ? '#1A7A7A' : '#9ca3af'} />
              <Text 
                fontSize={10} 
                fontWeight={activeScreen === tab.id ? '700' : '500'} 
                color={activeScreen === tab.id ? '#1A7A7A' : '#9ca3af'}
              >
                {tab.label}
              </Text>
            </YStack>
          </Button>
        ))}
      </XStack>
    </YStack>
  )
}

export default function App() {
  return (
    <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </TamaguiProvider>
  )
}