'use client'

import { useState, useEffect } from 'react'
import { getToken, parseJwt } from '@/lib/auth'

interface AuthUser {
  email: string
  name?: string
  roles?: string[]
}

interface UseAuthReturn {
  token: string | undefined
  user: AuthUser | null
}

export function useAuth(): UseAuthReturn {
  const [token, setToken] = useState<string | undefined>(undefined)
  const [user, setUser] = useState<AuthUser | null>(null)

  useEffect(() => {
    const t = getToken()
    setToken(t)
    if (t) {
      const payload = parseJwt(t)
      if (payload) {
        setUser({
          email: (payload.sub as string) || (payload.email as string) || '',
          name: payload.name as string | undefined,
          roles: payload.roles as string[] | undefined,
        })
      }
    }
  }, [])

  return { token, user }
}
