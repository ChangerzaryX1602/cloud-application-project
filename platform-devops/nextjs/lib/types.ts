export interface User {
  email: string
  full_name: string
  enabled: boolean
  last_login: string | null
  last_ip: string | null
  roles: string[]
}

export interface UserCreate {
  email: string
  full_name: string
  send_welcome_email?: boolean
  roles: string[]
}

export interface UserUpdate {
  full_name?: string
  enabled?: boolean
  roles?: string[]
}

export interface Role {
  name: string
}

export interface RoleProfile {
  name: string
  roles: string[]
}

export interface RoleProfileCreate {
  name: string
  roles: string[]
}

export interface AuditLog {
  name: string
  user: string
  operation: string
  reference_doctype: string
  reference_name: string
  creation: string
}

export interface Permission {
  name: string
  doctype: string
  role: string
  permlevel: number
  read: boolean
  write: boolean
  create: boolean
  delete: boolean
  submit: boolean
  cancel: boolean
  amend: boolean
}

export interface PermissionCreate {
  doctype: string
  role: string
  permlevel?: number
  read?: boolean
  write?: boolean
  create?: boolean
  delete?: boolean
  submit?: boolean
  cancel?: boolean
  amend?: boolean
}

export interface PermissionUpdate {
  read?: boolean
  write?: boolean
  create?: boolean
  delete?: boolean
  submit?: boolean
  cancel?: boolean
  amend?: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
}

export interface TokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

export interface AuthorizeUrlResponse {
  url: string
}
