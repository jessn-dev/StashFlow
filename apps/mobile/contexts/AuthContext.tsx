import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../utils/supabase'

type AuthContextType = {
  session: Session | null
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType>({ session: null, isLoading: true })

export function AuthProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // 1. Check for active session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setIsLoading(false)
    })

    // 2. Listen for login/logout events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const value = useMemo(() => ({ session, isLoading }), [session, isLoading])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)