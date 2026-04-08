import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react-native'
import { LoginScreen } from '../LoginScreen'
import { supabase } from '../../utils/supabase'
import { Alert } from 'react-native'

// Mock Supabase
vi.mock('../../utils/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
    },
  },
}))

// Mock Alert
vi.spyOn(Alert, 'alert')

describe('LoginScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders correctly', () => {
    const { getByPlaceholderText, getByText } = render(<LoginScreen />)
    expect(getByPlaceholderText('Enter your email')).toBeTruthy()
    expect(getByPlaceholderText('Enter your password')).toBeTruthy()
    expect(getByText('Sign In')).toBeTruthy()
  })

  it('shows error if fields are empty', async () => {
    const { getByText } = render(<LoginScreen />)
    fireEvent.press(getByText('Sign In'))
    
    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please fill in all fields')
  })

  it('calls signInWithPassword on login', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({ data: {}, error: null } as any)
    
    const { getByPlaceholderText, getByText } = render(<LoginScreen />)
    
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com')
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123')
    fireEvent.press(getByText('Sign In'))

    await waitFor(() => {
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
    })
  })

  it('toggles to sign up mode', () => {
    const { getByText, queryByText } = render(<LoginScreen />)
    
    fireEvent.press(getByText('Sign Up'))
    
    expect(getByText('Create an Account')).toBeTruthy()
    expect(queryByText('Forgot Password?')).toBeNull()
  })

  it('calls signUp on registration', async () => {
    vi.mocked(supabase.auth.signUp).mockResolvedValue({ data: { session: null }, error: null } as any)
    
    const { getByPlaceholderText, getByText } = render(<LoginScreen />)
    
    fireEvent.press(getByText('Sign Up'))
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'new@example.com')
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123')
    fireEvent.press(getByText('SIGN UP')) // Uppercase due to styled button text

    await waitFor(() => {
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'password123',
      })
      expect(Alert.alert).toHaveBeenCalledWith('Success', expect.stringContaining('check your email'))
    })
  })
})
