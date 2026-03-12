'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { rolesApi } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import type { Role } from '@/lib/types'

export default function RolesPage() {
  const { token } = useAuth()
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    rolesApi
      .list(token)
      .then(res => setRoles(res.data))
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load roles'))
      .finally(() => setLoading(false))
  }, [token])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Roles</h2>
          <p className="mt-1 text-sm text-gray-500">
            Roles are managed in ERPNext. Use profiles to group roles for easy assignment.
          </p>
        </div>
        <Link href="/roles/profiles">
          <Button variant="outline">Manage Role Profiles</Button>
        </Link>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="animate-pulse space-y-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-10 rounded bg-gray-100" />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Role Name
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {roles.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-sm text-gray-500">
                    No roles found.
                  </td>
                </tr>
              ) : (
                roles.map(role => (
                  <tr key={role.name} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {role.name}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
            <p className="text-xs text-gray-500">
              {roles.length} role{roles.length !== 1 ? 's' : ''} (managed in ERPNext)
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
