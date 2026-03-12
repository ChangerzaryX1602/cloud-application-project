import Cookies from 'js-cookie'

const TOKEN_KEY = 'platform_token'

export function getToken(): string | undefined {
  return Cookies.get(TOKEN_KEY)
}

export function setToken(token: string, expiresIn: number): void {
  Cookies.set(TOKEN_KEY, token, {
    expires: expiresIn / 86400,
    secure: true,
    sameSite: 'strict',
    // httpOnly cannot be set from JS — set it server-side in route handler
  })
}

export function removeToken(): void {
  Cookies.remove(TOKEN_KEY)
}

export function parseJwt(token: string): Record<string, unknown> | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(base64))
  } catch {
    return null
  }
}

export function isTokenExpired(token: string): boolean {
  const payload = parseJwt(token)
  if (!payload || !payload.exp) return true
  return Date.now() >= (payload.exp as number) * 1000
}
