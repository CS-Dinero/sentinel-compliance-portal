import { useEffect, useState, createContext, useContext } from 'react'
import { supabase, isSupabaseConfigured } from './supabase'
import { api, setGatewayToken, clearGatewayToken, getGatewayToken } from './api'
import type { User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  gatewayUser: { email: string; client_name: string } | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signInWithMagicLink: (email: string) => Promise<void>
  signOut: () => Promise<void>
  isAuthenticated: boolean
  isSupabaseReady: boolean
  setGatewayAuthenticated: (user: { email: string; client_name: string }) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [gatewayUser, setGatewayUser] = useState<{ email: string; client_name: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [gatewayAuthenticated, setGatewayAuthenticatedState] = useState(!!getGatewayToken())

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user && getGatewayToken()) {
        // If we have a session and a token, we assume authenticated
        // In a real app, we might want to verify the gateway token here
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const newUser = session?.user ?? null
      setUser(newUser)
      
      if (newUser && !getGatewayToken()) {
        // Exchange Supabase email for Gateway JWT
        try {
          const res = await api.login(newUser.email!)
          setGatewayToken(res.token)
          setGatewayUser({ email: res.email, client_name: res.client_name })
        } catch (error) {
          console.error('Failed to obtain Gateway JWT:', error)
        }
      }
      
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithGoogle = async () => {
    if (!isSupabaseConfigured) {
      throw new Error('Authentication service not configured. Please contact your administrator to set up Supabase credentials.')
    }
    await supabase.auth.signInWithOAuth({ provider: 'google' })
  }

  const signInWithMagicLink = async (email: string) => {
    if (!isSupabaseConfigured) {
      throw new Error('Authentication service not configured. Please contact your administrator to set up Supabase credentials.')
    }
    const { error } = await supabase.auth.signInWithOtp({ 
      email,
      options: {
        emailRedirectTo: window.location.origin
      }
    })
    if (error) throw error
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    clearGatewayToken()
    setUser(null)
    setGatewayUser(null)
    window.location.href = '/login'
  }

  // Allow authentication if either:
  // 1. Supabase user + Gateway token (normal flow)
  // 2. Gateway token only (admin direct login)
  const hasValidAuth = gatewayAuthenticated || !!getGatewayToken()

  // Method for admin direct login to set auth state
  const setGatewayAuthenticated = (gwUser: { email: string; client_name: string }) => {
    setGatewayUser(gwUser)
    setGatewayAuthenticatedState(true)
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      gatewayUser, 
      loading, 
      signInWithGoogle, 
      signInWithMagicLink, 
      signOut,
      isAuthenticated: hasValidAuth,
      isSupabaseReady: isSupabaseConfigured,
      setGatewayAuthenticated
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
