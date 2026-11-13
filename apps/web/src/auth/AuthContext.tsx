import { createContext, ReactNode, useContext, useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import * as client from '../lib/api'

type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

interface AuthContextValue {
  status: AuthStatus
  login: (email: string, password: string, organizationSlug: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<AuthStatus>(() =>
    client.hasStoredSession() ? 'loading' : 'anonymous',
  )

  useEffect(() => {
    const unsubscribe = client.onSessionChange((active) => {
      setStatus(active ? 'authenticated' : 'anonymous')
      if (!active) queryClient.clear()
    })
    // After a reload only the refresh token survives: exchange it for a new access token.
    if (client.hasStoredSession()) void client.refreshSession()
    return unsubscribe
  }, [queryClient])

  const value: AuthContextValue = {
    status,
    login: client.login,
    logout: client.logout,
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
