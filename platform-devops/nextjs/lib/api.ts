import type {
  User,
  UserCreate,
  UserUpdate,
  Role,
  RoleProfile,
  RoleProfileCreate,
  AuditLog,
  Permission,
  PermissionCreate,
  PermissionUpdate,
  TokenResponse,
  AuthorizeUrlResponse,
} from './types'

const BASE_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000'

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

async function fetchApi<T>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }))
    throw new ApiError(response.status, error.detail || 'Request failed')
  }

  if (response.status === 204) return {} as T
  return response.json()
}

// Users
export const usersApi = {
  list: (
    params: { page?: number; page_size?: number; search?: string; role?: string },
    token: string
  ) => {
    const query = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== '' && v !== null)
        .map(([k, v]) => [k, String(v)])
    )
    return fetchApi<{ data: User[]; total: number }>(`/users/?${query}`, {}, token)
  },
  get: (email: string, token: string) =>
    fetchApi<User>(`/users/${encodeURIComponent(email)}`, {}, token),
  create: (data: UserCreate, token: string) =>
    fetchApi<User>('/users/', { method: 'POST', body: JSON.stringify(data) }, token),
  update: (email: string, data: UserUpdate, token: string) =>
    fetchApi<User>(
      `/users/${encodeURIComponent(email)}`,
      { method: 'PUT', body: JSON.stringify(data) },
      token
    ),
  disable: (email: string, token: string) =>
    fetchApi<{ message: string }>(
      `/users/${encodeURIComponent(email)}`,
      { method: 'DELETE' },
      token
    ),
  enable: (email: string, token: string) =>
    fetchApi<User>(
      `/users/${encodeURIComponent(email)}`,
      { method: 'PUT', body: JSON.stringify({ enabled: 1 }) },
      token
    ),
}

// Roles
export const rolesApi = {
  list: (token: string) => fetchApi<{ data: Role[] }>('/roles/', {}, token),
  listProfiles: (token: string) =>
    fetchApi<{ data: RoleProfile[] }>('/roles/profiles/', {}, token),
  createProfile: (data: RoleProfileCreate, token: string) =>
    fetchApi<RoleProfile>(
      '/roles/profiles/',
      { method: 'POST', body: JSON.stringify(data) },
      token
    ),
  updateProfile: (name: string, data: { roles: string[] }, token: string) =>
    fetchApi<RoleProfile>(
      `/roles/profiles/${encodeURIComponent(name)}`,
      { method: 'PUT', body: JSON.stringify(data) },
      token
    ),
}

// Audit
export const auditApi = {
  list: (
    params: {
      user?: string
      operation?: string
      start_date?: string
      end_date?: string
      page?: number
      page_size?: number
    },
    token: string
  ) => {
    const query = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== '' && v !== null)
        .map(([k, v]) => [k, String(v)])
    )
    return fetchApi<{ data: AuditLog[]; total: number }>(`/audit-logs/?${query}`, {}, token)
  },
  listTypes: (token: string) =>
    fetchApi<string[]>('/audit-logs/types/', {}, token),
  listPermissionLogs: (
    params: { doctype?: string; user?: string; page?: number; page_size?: number },
    token: string
  ) => {
    const query = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== '' && v !== null)
        .map(([k, v]) => [k, String(v)])
    )
    return fetchApi<{ data: AuditLog[]; total: number }>(`/audit-logs/permissions/?${query}`, {}, token)
  },
}

// Permissions
export const permissionsApi = {
  list: (
    params: { doctype?: string; role?: string; page?: number; page_size?: number },
    token: string
  ) => {
    const query = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== '' && v !== null)
        .map(([k, v]) => [k, String(v)])
    )
    return fetchApi<{ data: Permission[]; total: number }>(`/permissions/?${query}`, {}, token)
  },
  create: (data: PermissionCreate, token: string) =>
    fetchApi<Permission>('/permissions/', { method: 'POST', body: JSON.stringify(data) }, token),
  update: (name: string, data: PermissionUpdate, token: string) =>
    fetchApi<Permission>(
      `/permissions/${encodeURIComponent(name)}`,
      { method: 'PUT', body: JSON.stringify(data) },
      token
    ),
  remove: (name: string, token: string) =>
    fetchApi<void>(`/permissions/${encodeURIComponent(name)}`, { method: 'DELETE' }, token),
}

// Auth
export const authApi = {
  getAuthorizeUrl: (redirectUri: string, state: string, codeChallenge: string) =>
    fetchApi<AuthorizeUrlResponse>(
      `/auth/authorize-url?redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}&code_challenge=${encodeURIComponent(codeChallenge)}`
    ),
  exchangeToken: (code: string, redirectUri: string, codeVerifier: string) =>
    fetchApi<TokenResponse>('/auth/token', {
      method: 'POST',
      body: JSON.stringify({ code, redirect_uri: redirectUri, code_verifier: codeVerifier }),
    }),
  logout: (token: string) =>
    fetchApi<{ message: string }>(
      '/auth/logout',
      { method: 'POST', body: JSON.stringify({ token }) },
      token
    ),
}
