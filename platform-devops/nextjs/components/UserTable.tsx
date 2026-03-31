'use client'

import { User } from '@/lib/types'
import { Badge } from './ui/badge'
import { Button } from './ui/button'

interface Props {
  users: User[]
  onView: (email: string) => void
  onDisable: (email: string) => void
  onEnable: (email: string) => void
  loading?: boolean
}

export function UserTable({ users, onView, onDisable, onEnable, loading }: Props) {
  if (loading) {
    return (
      <div className="w-full">
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 rounded bg-gray-100" />
          ))}
        </div>
      </div>
    )
  }

  if (users.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-500">
        No users found.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 bg-white">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Email
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Full Name
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Roles
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Last Login
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {users.map(user => (
            <tr key={user.email} className="hover:bg-gray-50">
              <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                {user.email}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                {user.full_name}
              </td>
              <td className="px-4 py-3 text-sm text-gray-700">
                <div className="flex flex-wrap gap-1">
                  {user.roles.slice(0, 2).map(role => (
                    <Badge key={role} variant="secondary">
                      {role}
                    </Badge>
                  ))}
                  {user.roles.length > 2 && (
                    <Badge variant="secondary">+{user.roles.length - 2}</Badge>
                  )}
                </div>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm">
                <Badge variant={user.enabled ? 'success' : 'secondary'}>
                  {user.enabled ? 'Active' : 'Disabled'}
                </Badge>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                {user.last_login
                  ? new Date(user.last_login).toLocaleString()
                  : '—'}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm">
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => onView(user.email)}>
                    View
                  </Button>
                  {user.enabled ? (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => onDisable(user.email)}
                    >
                      Disable
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onEnable(user.email)}
                    >
                      Enable
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
