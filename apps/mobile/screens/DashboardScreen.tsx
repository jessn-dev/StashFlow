import { View, Text, Button, StyleSheet } from 'react-native'
import { supabase } from '../utils/supabase'
import { useAuth } from '../contexts/AuthContext'

export function DashboardScreen() {
  const { session } = useAuth()

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Welcome Back!</Text>
      <Text style={styles.email}>{session?.user?.email}</Text>

      <View style={{ marginTop: 40 }}>
        <Button title="Sign Out" onPress={() => supabase.auth.signOut()} color="#D4522A" />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#F5F5F5' },
  header: { fontSize: 24, fontWeight: 'bold', color: '#0D3D3D' },
  email: { fontSize: 16, color: '#444444', marginTop: 10 },
})