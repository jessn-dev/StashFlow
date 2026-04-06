import { useState } from 'react'
import { View, TextInput, Button, Text, StyleSheet, Alert } from 'react-native'
import { supabase } from '../utils/supabase'

export default function MobileAuthScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function signInWithEmail() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) Alert.alert('Login Failed', error.message)
    else Alert.alert('Success', 'Secure session created!')
    setLoading(false)
  }

  async function signUpWithEmail() {
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) Alert.alert('Sign Up Failed', error.message)
    else Alert.alert('Success', 'Account created!')
    setLoading(false)
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>FinTrack Mobile</Text>
      <TextInput
        style={styles.input}
        onChangeText={(text) => setEmail(text)}
        value={email}
        placeholder="Email"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        onChangeText={(text) => setPassword(text)}
        value={password}
        secureTextEntry={true}
        placeholder="Password"
        autoCapitalize="none"
      />
      <View style={styles.buttonContainer}>
        <Button title="Sign In" disabled={loading} onPress={signInWithEmail} />
      </View>
      <View style={styles.buttonContainer}>
        <Button title="Sign Up" disabled={loading} onPress={signUpWithEmail} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#F5F5F5',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 40,
    color: '#0D3D3D',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CCCCCC',
    padding: 15,
    marginBottom: 20,
    borderRadius: 8,
  },
  buttonContainer: {
    marginBottom: 10,
  },
})