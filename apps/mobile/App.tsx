import { ActivityIndicator, View } from 'react-native'
import { TamaguiProvider } from 'tamagui'
import { tamaguiConfig } from '@stashflow/theme'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { LoginScreen } from './screens/LoginScreen'
import { DashboardScreen } from './screens/DashboardScreen'

// This component actually consumes the context
function RootNavigator() {
  const { session, isLoading } = useAuth()

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5' }}>
        <ActivityIndicator size="large" color="#0D3D3D" />
      </View>
    )
  }

  // If we have a session, show Dashboard. Otherwise, show Login.
  return session?.user ? <DashboardScreen /> : <LoginScreen />
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