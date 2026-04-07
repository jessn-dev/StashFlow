import { useState } from 'react'
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  SafeAreaView
} from 'react-native'
import { supabase } from '../utils/supabase'

export function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)

  async function handleAuth() {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields')
      return
    }

    setLoading(true)
    const { error, data } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      Alert.alert('Authentication Error', error.message)
    } else if (isSignUp && !data.session) {
      Alert.alert('Success', 'Please check your email to verify your account.')
    }
    setLoading(false)
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.container}>
          {/* Logo / Branding */}
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <Text style={styles.logoIconText}>$</Text>
            </View>
            <Text style={styles.logoText}>FinTrack</Text>
          </View>

          {/* Dynamic Headings */}
          <Text style={styles.title}>
            {isSignUp ? 'Create an Account' : 'Welcome Back!'}
          </Text>
          <Text style={styles.subtitle}>
            {isSignUp
              ? 'Sign up to start tracking your net worth and optimizing your finances.'
              : 'Sign in to access your dashboard and continue optimizing your financial process.'}
          </Text>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                onChangeText={setEmail}
                value={email}
                placeholder="Enter your email"
                placeholderTextColor="#999"
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                onChangeText={setPassword}
                value={password}
                secureTextEntry
                placeholder="Enter your password"
                placeholderTextColor="#999"
                autoCapitalize="none"
                editable={!loading}
              />
              {!isSignUp && (
                <TouchableOpacity style={styles.forgotPassword}>
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={styles.mainButton}
              onPress={handleAuth}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.mainButtonText}>
                  {isSignUp ? 'Sign Up' : 'Sign In'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* OAuth Placeholders */}
          <View style={styles.oauthContainer}>
            <TouchableOpacity style={styles.oauthButton}>
              <Text style={styles.oauthButtonText}>Continue with Google</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.oauthButton}>
              <Text style={styles.oauthButtonText}>Continue with Apple</Text>
            </TouchableOpacity>
          </View>

          {/* Toggle Link */}
          <View style={styles.toggleContainer}>
            <Text style={styles.toggleText}>
              {isSignUp ? 'Already have an account? ' : "Don't have an Account? "}
            </Text>
            <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
              <Text style={styles.toggleLink}>
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 32,
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  logoIcon: {
    width: 32,
    height: 32,
    backgroundColor: '#0D3D3D',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  logoIconText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 18,
  },
  logoText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0D3D3D',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0D3D3D',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#444444',
    marginBottom: 32,
    lineHeight: 20,
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#444444',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFEFEF',
    padding: 16,
    borderRadius: 8,
    color: '#444444',
    fontSize: 16,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  forgotPasswordText: {
    color: '#1A7A7A',
    fontSize: 12,
    fontWeight: '600',
  },
  mainButton: {
    backgroundColor: '#0D3D3D',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  mainButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 32,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#EFEFEF',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 12,
    color: '#444444',
    fontWeight: 'bold',
  },
  oauthContainer: {
    gap: 12,
  },
  oauthButton: {
    borderWidth: 1,
    borderColor: '#EFEFEF',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  oauthButtonText: {
    color: '#444444',
    fontSize: 14,
    fontWeight: '500',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  toggleText: {
    color: '#444444',
    fontSize: 14,
  },
  toggleLink: {
    color: '#1A7A7A',
    fontSize: 14,
    fontWeight: 'bold',
  },
})
