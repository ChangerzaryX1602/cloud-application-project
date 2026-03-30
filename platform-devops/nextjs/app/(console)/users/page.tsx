'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { usersApi, rolesApi } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { UserTable } from '@/components/UserTable'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import type { User, Role } from '@/lib/types'

const PAGE_SIZE = 20

export default function UsersPage() {
  const router = useRouter()
  const { token } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const res = await usersApi.list(
        { page, page_size: PAGE_SIZE, search: search || undefined, role: roleFilter || undefined },
        token
      )
      setUsers(res.data)
      setTotal(res.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [token, page, search, roleFilter])

  useEffect(() => {
    if (!token) return
    rolesApi.list(token).then(res => setRoles(res.data)).catch(() => {})
  }, [token])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  async function handleDisable(email: string) {
    if (!token) return
    if (!confirm(`Disable user ${email}?`)) return
    try {
      await usersApi.disable(email, token)
      fetchUsers()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to disable user')
    }
  }

  async function handleEnable(email: string) {
    if (!token) return
    if (!confirm(`Enable user ${email}?`)) return
    try {
      await usersApi.enable(email, token)
      fetchUsers()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to enable user')
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const roleOptions = [
    { value: '', label: 'All Roles' },
    ...roles.map(r => ({ value: r.name, label: r.name })),
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Users</h2>
          <p className="mt-1 text-sm text-gray-500">{total} total users</p>
        </div>
        <Button onClick={() => router.push('/users/new')}>New User</Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-72">
          <Input
            label="Search"
            placeholder="Search by email or name..."
            value={search}
            onChange={e => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <div className="w-48">
          <Select
            label="Role"
            options={roleOptions}
            value={roleFilter}
            onChange={e => {
              setRoleFilter(e.target.value)
              setPage(1)
            }}
          />
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      <UserTable
        users={users}
        loading={loading}
        onView={email => router.push(`/users/${encodeURIComponent(email)}`)}
        onDisable={handleDisable}
        onEnable={handleEnable}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
