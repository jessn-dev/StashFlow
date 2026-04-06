import { useState } from 'react'
import { View, TextInput, Button, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native'
import { supabase } from '../utils/supabase'

export function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleAuth(action: 'login' | 'signup') {
    setLoading(true)
    const { error } = action === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password })

    if (error) Alert.alert('Error', error.message)
    setLoading(false)
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>FinTrack Mobile</Text>

      <TextInput
        style={styles.input}
        onChangeText={setEmail}
        value={email}
        placeholder="Email"
        autoCapitalize="none"
        editable={!loading}
      />
      <TextInput
        style={styles.input}
        onChangeText={setPassword}
        value={password}
        secureTextEntry
        placeholder="Password"
        autoCapitalize="none"
        editable={!loading}
      />

      {loading ? (
        <ActivityIndicator size="large" color="#0D3D3D" style={{ marginTop: 20 }} />
      ) : (
        <>
          <View style={styles.buttonContainer}>
            <Button title="Sign In" onPress={() => handleAuth('login')} color="#0D3D3D" />
          </View>
          <View style={styles.buttonContainer}>
            <Button title="Sign Up" onPress={() => handleAuth('signup')} color="#1A7A7A" />
          </View>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#F5F5F5' },
  header: { fontSize: 28, fontWeight: '900', textAlign: 'center', marginBottom: 40, color: '#0D3D3D' },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CCCCCC', padding: 15, marginBottom: 20, borderRadius: 8 },
  buttonContainer: { marginBottom: 15 },
})